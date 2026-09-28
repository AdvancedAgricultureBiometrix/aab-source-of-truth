// Actor context: who is making this request.
//
// Capability code only ever sees an ActorReference, obtained through the
// Authenticator interface. How the bearer token is checked is behind that
// interface:
//   * pilot: StaticTokenAuthenticator — a fixed token per actor
//   * later: an OIDC authenticator (verify the JWT, map claims to an
//     ActorReference) implements the same interface; no capability changes.
//     Only authenticationMethod changes, from "STATIC_TOKEN" to "OIDC".
//
// Every reference issued is ActorReference version 2 (AAB-PLATFORM-03).
// Records stored earlier keep version 1 references, and every reference is
// read through foundation/actor.ts, never by reading roles or issuer directly.
//
// Static tokens are never stored in the clear: the actors file holds the
// SHA-256 of each token. A presented token is hashed and compared with every
// entry in constant time. Tokens shorter than MIN_TOKEN_LENGTH are refused
// outright. The whole file is validated when it is loaded — a malformed file
// stops the API from starting.
//
// Actors file (path in SCS_AUTH_STATIC_ACTORS_FILE):
//   { "actors": [ {
//       "tokenSha256": "<64 hex>",
//       "actor": { "actorId", "actorType", "roles", "authenticationMethod" },
//       "accountableName": "…",          optional; HUMAN only
//       "subjectGrants": [ { "role", "scopeId": "<domain>:<subjectType>:<subjectId>" } ]   optional
//   } ] }
// Hash a token with:
//   node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<token>"
//
// How the version 2 reference is built:
//   * issuer: COUNTRY_TENANCY, with the country from configuration
//     (SCS_ACTOR_ISSUER_COUNTRY). The pilot has one issuer per deployment.
//     The control plane's registry instance (AAB-PLATFORM-09, second
//     amendment of 2026-09-28) issues PLATFORM_CONTROL_PLANE instead, with the
//     deployment scope AAB-CONTROL-PLANE.
//   * authorityBasis: each of `roles` with scopeType DEPLOYMENT and the
//     deployment's scope id (deploymentScopeId), and each subject grant with
//     scopeType SUBJECT. None has a grantId: the pilot has no grant records.
//     Pilot limitation (SCS-CAP-02): these grants are operator configuration,
//     not signed, evidenced or receipted.
//   * Signing keys are not here. They are registered in the public-key
//     registry (AAB-PLATFORM-09), with their history, and a signature is
//     verified against the key its statement names, as at the time the server
//     accepted it. An actors file that still carries a signingPublicKey stops
//     the API from starting, so that a key is never silently ignored.
//   * accountableName is NOT put in the reference. It is personal data,
//     recorded only on governance decisions; a capability asks the
//     ActorDirectory for it when it records one.
//   * organizationId is refused: version 2 has no such field. An actor acts
//     for an organisation through an actor–party link (AAB-PLATFORM-04).
//
// Roles: an actor's roles are strings matching the ActorReference pattern;
// there is no central list. Each capability names the roles it accepts as its
// own constant (e.g. REGISTRANT_ROLE = "COMPLIANCE_OFFICER" in CAP-02).
// TODO(role-registry): once the platform has more than a handful of roles,
// keep one registry of recognised roles and refuse an actors file that names
// an unknown one.

import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { IncomingHttpHeaders } from "node:http";

import { platformFailure } from "./errors.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ActorReference, ActorReferenceV1, ActorReferenceV2 } from "../types/shared.js";
import { sameActor } from "./actor.js";
import { runWithCorrelation } from "./correlation.js";
import { validate } from "./validation.js";

export type { ActorReference, ActorReferenceV2 };

export const MIN_TOKEN_LENGTH = 32;

/** The seam between request handling and identity. OIDC will implement this too. */
export interface Authenticator {
  /** The actor for a bearer token, or null if the token is not recognised. */
  authenticate(bearerToken: string): Promise<ActorReference | null>;
}

/**
 * The bearer token from an Authorization header, or null when absent.
 * Anything other than exactly one "Bearer <token>" header is refused.
 */
export function extractBearerToken(headers: IncomingHttpHeaders): string | null {
  const value = headers["authorization"];
  if (value === undefined) return null;
  const match = /^Bearer ([\x21-\x7e]+)$/.exec(value);
  if (!match) throw platformFailure("UNAUTHENTICATED", ["The Authorization header must be: Bearer <token>."]);
  return match[1]!;
}

/** Resolve the request's actor, or throw UNAUTHENTICATED. Reasons never say whether a token exists. */
export async function authenticateRequest(headers: IncomingHttpHeaders, authenticator: Authenticator): Promise<ActorReference> {
  const token = extractBearerToken(headers);
  if (token === null) throw platformFailure("UNAUTHENTICATED", ["A bearer token is required."]);
  const actor = token.length >= MIN_TOKEN_LENGTH ? await authenticator.authenticate(token) : null;
  if (actor === null) throw platformFailure("UNAUTHENTICATED", ["The bearer token is not valid."]);
  return actor;
}

// ── The actor's records: accountable name ───────────────────────────────────

/**
 * What the identity domain records about an actor beyond the reference: the
 * name for governance decisions. Signing keys are the public-key registry's
 * (AAB-PLATFORM-09), not the directory's. OIDC will implement this from the
 * issuer's records.
 */
export interface ActorDirectory {
  /** The issuer every actor of this deployment is issued by. */
  readonly issuer: ActorReferenceV2["issuer"];
  /** An actor of this deployment by actorId, as issued; null if there is none. For naming a key holder, who is not the requester. */
  actorOf(actorId: string): ActorReferenceV2 | null;
  /** The actor's accountable name, or null if none is recorded. */
  accountableNameOf(actor: ActorReference): string | null;
}


// ── Pilot: static tokens ─────────────────────────────────────────────────────

export interface StaticActorOptions {
  /** A country deployment's issuer country (SCS_ACTOR_ISSUER_COUNTRY), ISO 3166-1 alpha-2. */
  readonly issuerCountry?: string;
  /** The control plane's registry instance: actors are issued by PLATFORM_CONTROL_PLANE. Exactly one of the two. */
  readonly controlPlane?: true;
}

/** The scopeId of the control plane's DEPLOYMENT grants. */
export const CONTROL_PLANE_SCOPE_ID = "AAB-CONTROL-PLANE";

/**
 * The scopeId of the pilot's DEPLOYMENT grants. The pilot has one deployment
 * per country tenancy, so the deployment is named by its country.
 */
export function deploymentScopeId(issuerCountry: string): string {
  return `SCS-PILOT-${issuerCountry}`;
}

interface StaticActorEntry {
  readonly tokenSha256: Buffer;
  readonly actor: ActorReferenceV2;
  readonly accountableName: string | null;
}

const ENTRY_KEYS = new Set(["tokenSha256", "actor", "accountableName", "signingPublicKey", "subjectGrants"]);
const ROLE = /^[A-Z][A-Z0-9_]{1,63}$/;
const SUBJECT_SCOPE = /^[A-Z][A-Z0-9_]{0,31}:[A-Z][A-Z0-9_]{0,63}:[^:\s]\S{0,127}$/;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

export class StaticTokenAuthenticator implements Authenticator, ActorDirectory {
  readonly #entries: readonly StaticActorEntry[];
  readonly issuer: ActorReferenceV2["issuer"];

  private constructor(entries: readonly StaticActorEntry[], issuer: ActorReferenceV2["issuer"]) {
    this.#entries = entries;
    this.issuer = issuer;
  }

  /** Validate and load actors. Throws, listing every problem, if anything is wrong. */
  static fromConfig(config: unknown, options: StaticActorOptions): StaticTokenAuthenticator {
    let issuer: ActorReferenceV2["issuer"];
    let deployment: string;
    if (options?.controlPlane === true) {
      if (options.issuerCountry !== undefined) throw new Error("A deployment has one issuer: a country, or the control plane, not both");
      issuer = { issuerType: "PLATFORM_CONTROL_PLANE" };
      deployment = CONTROL_PLANE_SCOPE_ID;
    } else {
      if (typeof options?.issuerCountry !== "string" || !/^[A-Z]{2}$/.test(options.issuerCountry)) {
        throw new Error("The actor issuer country must be an ISO 3166-1 alpha-2 code, e.g. TH");
      }
      issuer = { issuerType: "COUNTRY_TENANCY", countryCode: options.issuerCountry };
      deployment = deploymentScopeId(options.issuerCountry);
    }

    const problems: string[] = [];
    const list = (config as { actors?: unknown } | null)?.actors;
    if (config === null || typeof config !== "object" || !Array.isArray(list) || Object.keys(config).length !== 1) {
      throw new Error('Static actors config must be exactly { "actors": [ … ] }');
    }

    const entries: StaticActorEntry[] = [];
    const seenHashes = new Set<string>();
    const seenActors = new Set<string>();
    list.forEach((raw: unknown, i: number) => {
      const entry = raw as { tokenSha256?: unknown; actor?: unknown; accountableName?: unknown; signingPublicKey?: unknown; subjectGrants?: unknown } | null;
      if (entry === null || typeof entry !== "object" || Object.keys(entry).some((k) => !ENTRY_KEYS.has(k))) {
        problems.push(`actors[${i}] must be { tokenSha256, actor } with optional accountableName, signingPublicKey and subjectGrants`);
        return;
      }
      const hash = entry.tokenSha256;
      if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
        problems.push(`actors[${i}].tokenSha256 must be 64 lowercase hex characters`);
        return;
      }
      if (seenHashes.has(hash)) problems.push(`actors[${i}].tokenSha256 duplicates an earlier entry`);
      seenHashes.add(hash);

      if (entry.actor !== null && typeof entry.actor === "object" && "organizationId" in entry.actor) {
        problems.push(`actors[${i}].actor.organizationId is not part of ActorReference version 2; an actor acts for an organisation through an actor–party link`);
        return;
      }
      const checked = runWithCorrelation("startup-auth-config", () =>
        validate<ActorReferenceV1, "SCS-PLATFORM">("SCS-PLATFORM", SCHEMAS.actorReferenceV1, entry.actor),
      );
      if (!checked.ok) {
        problems.push(...checked.envelope.reasons.map((r) => `actors[${i}].actor${r.replace(/^\(root\)/, "")}`));
        return;
      }
      const configured = checked.value;
      if (configured.authenticationMethod !== "STATIC_TOKEN") {
        problems.push(`actors[${i}].actor.authenticationMethod must be STATIC_TOKEN`);
      }
      if (seenActors.has(configured.actorId)) problems.push(`actors[${i}].actor.actorId duplicates an earlier entry`);
      seenActors.add(configured.actorId);
      const human = configured.actorType === "HUMAN";

      let accountableName: string | null = null;
      if (entry.accountableName !== undefined) {
        if (!human) problems.push(`actors[${i}].accountableName is for HUMAN actors only`);
        else if (typeof entry.accountableName !== "string" || entry.accountableName.trim() === "" || entry.accountableName.length > 256) {
          problems.push(`actors[${i}].accountableName must be a non-blank string of at most 256 characters`);
        } else accountableName = entry.accountableName;
      }

      if (entry.signingPublicKey !== undefined) {
        problems.push(`actors[${i}].signingPublicKey is no longer read: signing keys are registered in the public-key registry (AAB-PLATFORM-09, POST /aab/v1/signing-keys). Remove it from the actors file`);
      }

      const subjectGrants: Array<{ role: string; scopeType: "SUBJECT"; scopeId: string }> = [];
      if (entry.subjectGrants !== undefined) {
        if (!Array.isArray(entry.subjectGrants)) problems.push(`actors[${i}].subjectGrants must be an array`);
        else {
          const seen = new Set<string>();
          entry.subjectGrants.forEach((g: unknown, j: number) => {
            const grant = g as { role?: unknown; scopeId?: unknown } | null;
            if (grant === null || typeof grant !== "object" || Object.keys(grant).some((k) => k !== "role" && k !== "scopeId")
              || typeof grant.role !== "string" || !ROLE.test(grant.role)
              || typeof grant.scopeId !== "string" || !SUBJECT_SCOPE.test(grant.scopeId)) {
              problems.push(`actors[${i}].subjectGrants[${j}] must be { role, scopeId: "<domain>:<subjectType>:<subjectId>" }`);
              return;
            }
            const key = `${grant.role} ${grant.scopeId}`;
            if (seen.has(key)) problems.push(`actors[${i}].subjectGrants[${j}] duplicates an earlier grant`);
            seen.add(key);
            subjectGrants.push({ role: grant.role, scopeType: "SUBJECT", scopeId: grant.scopeId });
          });
        }
      }

      const actor: ActorReferenceV2 = {
        referenceVersion: "2",
        actorId: configured.actorId,
        issuer: { ...issuer },
        actorType: configured.actorType,
        authenticationMethod: configured.authenticationMethod,
        authorityBasis: [
          ...configured.roles.map((role) => ({ role, scopeType: "DEPLOYMENT" as const, scopeId: deployment })),
          ...subjectGrants,
        ],
      };
      // What is issued must itself be a valid version 2 reference.
      const issued = runWithCorrelation("startup-auth-config", () =>
        validate<ActorReferenceV2, "SCS-PLATFORM">("SCS-PLATFORM", SCHEMAS.actorReferenceV2, actor),
      );
      if (!issued.ok) {
        problems.push(...issued.envelope.reasons.map((r) => `actors[${i}] issues an invalid reference: ${r}`));
        return;
      }
      entries.push({ tokenSha256: Buffer.from(hash, "hex"), actor: deepFreeze(actor), accountableName });
    });

    if (entries.length === 0 && problems.length === 0) problems.push("no actors configured");
    if (problems.length > 0) throw new Error(`Invalid static actors config: ${problems.join("; ")}`);
    return new StaticTokenAuthenticator(Object.freeze(entries), deepFreeze({ ...issuer }));
  }

  static async fromFile(path: string, options: StaticActorOptions): Promise<StaticTokenAuthenticator> {
    const text = await readFile(path, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Static actors file ${path} is not valid JSON`);
    }
    return StaticTokenAuthenticator.fromConfig(parsed, options);
  }

  async authenticate(bearerToken: string): Promise<ActorReferenceV2 | null> {
    const presented = createHash("sha256").update(bearerToken, "utf8").digest();
    let found: ActorReferenceV2 | null = null;
    // Compare against every entry, so timing does not reveal which (if any) matched.
    for (const entry of this.#entries) {
      if (timingSafeEqual(presented, entry.tokenSha256) && found === null) found = entry.actor;
    }
    return found;
  }

  actorOf(actorId: string): ActorReferenceV2 | null {
    return this.#entries.find((e) => e.actor.actorId === actorId)?.actor ?? null;
  }

  accountableNameOf(actor: ActorReference): string | null {
    return this.#entries.find((e) => sameActor(e.actor, actor))?.accountableName ?? null;
  }

}
