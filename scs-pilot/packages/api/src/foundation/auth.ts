// Actor context: who is making this request.
//
// Capability code only ever sees an ActorReference, obtained through the
// Authenticator interface. How the bearer token is checked is behind that
// interface:
//   * pilot: StaticTokenAuthenticator — a fixed token per actor
//   * later: an OIDC authenticator (verify the JWT, map claims to an
//     ActorReference) implements the same interface; no capability changes.
//     The ActorReference shape stays the same: only authenticationMethod
//     changes, from "STATIC_TOKEN" to "OIDC".
//
// Static tokens are never stored in the clear: the actors file holds the
// SHA-256 of each token. A presented token is hashed and compared with every
// entry in constant time. Tokens shorter than MIN_TOKEN_LENGTH are refused
// outright. Each actor entry is validated against the ActorReference schema
// when the file is loaded — a malformed file stops the API from starting.
//
// Actors file (path in SCS_AUTH_STATIC_ACTORS_FILE):
//   { "actors": [ { "tokenSha256": "<64 hex>", "actor": { …ActorReference… } } ] }
// Hash a token with:
//   node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<token>"
//
// Roles: an actor's roles are strings matching the ActorReference pattern;
// there is no central list. Each capability names the roles it accepts as its
// own constant (e.g. REGISTRANT_ROLE = "COMPLIANCE_OFFICER" in CAP-02).
// TODO(role-registry): once the platform has more than a handful of roles
// (VERIFICATION_OFFICER is next), keep one registry of recognised roles and
// refuse an actors file that names an unknown one.

import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { IncomingHttpHeaders } from "node:http";

import { platformFailure } from "./errors.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ActorReference } from "../types/shared.js";
import { runWithCorrelation } from "./correlation.js";
import { validate } from "./validation.js";

export type { ActorReference };

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

// ── Pilot: static tokens ─────────────────────────────────────────────────────

interface StaticActorEntry {
  readonly tokenSha256: Buffer;
  readonly actor: ActorReference;
}

export class StaticTokenAuthenticator implements Authenticator {
  readonly #entries: readonly StaticActorEntry[];

  private constructor(entries: readonly StaticActorEntry[]) {
    this.#entries = entries;
  }

  /** Validate and load actors. Throws, listing every problem, if anything is wrong. */
  static fromConfig(config: unknown): StaticTokenAuthenticator {
    const problems: string[] = [];
    const list = (config as { actors?: unknown } | null)?.actors;
    if (config === null || typeof config !== "object" || !Array.isArray(list) || Object.keys(config).length !== 1) {
      throw new Error('Static actors config must be exactly { "actors": [ … ] }');
    }

    const entries: StaticActorEntry[] = [];
    const seenHashes = new Set<string>();
    const seenActors = new Set<string>();
    list.forEach((raw: unknown, i: number) => {
      const entry = raw as { tokenSha256?: unknown; actor?: unknown } | null;
      if (entry === null || typeof entry !== "object" || Object.keys(entry).some((k) => k !== "tokenSha256" && k !== "actor")) {
        problems.push(`actors[${i}] must be { tokenSha256, actor }`);
        return;
      }
      const hash = entry.tokenSha256;
      if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
        problems.push(`actors[${i}].tokenSha256 must be 64 lowercase hex characters`);
        return;
      }
      if (seenHashes.has(hash)) problems.push(`actors[${i}].tokenSha256 duplicates an earlier entry`);
      seenHashes.add(hash);

      const checked = runWithCorrelation("startup-auth-config", () =>
        validate<ActorReference, "SCS-PLATFORM">("SCS-PLATFORM", SCHEMAS.actorReference, entry.actor),
      );
      if (!checked.ok) {
        problems.push(...checked.envelope.reasons.map((r) => `actors[${i}].actor${r.replace(/^\(root\)/, "")}`));
        return;
      }
      if (checked.value.authenticationMethod !== "STATIC_TOKEN") {
        problems.push(`actors[${i}].actor.authenticationMethod must be STATIC_TOKEN`);
      }
      if (seenActors.has(checked.value.actorId)) problems.push(`actors[${i}].actor.actorId duplicates an earlier entry`);
      seenActors.add(checked.value.actorId);
      entries.push({ tokenSha256: Buffer.from(hash, "hex"), actor: Object.freeze({ ...checked.value, roles: Object.freeze([...checked.value.roles]) }) as ActorReference });
    });

    if (entries.length === 0 && problems.length === 0) problems.push("no actors configured");
    if (problems.length > 0) throw new Error(`Invalid static actors config: ${problems.join("; ")}`);
    return new StaticTokenAuthenticator(Object.freeze(entries));
  }

  static async fromFile(path: string): Promise<StaticTokenAuthenticator> {
    const text = await readFile(path, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Static actors file ${path} is not valid JSON`);
    }
    return StaticTokenAuthenticator.fromConfig(parsed);
  }

  async authenticate(bearerToken: string): Promise<ActorReference | null> {
    const presented = createHash("sha256").update(bearerToken, "utf8").digest();
    let found: ActorReference | null = null;
    // Compare against every entry, so timing does not reveal which (if any) matched.
    for (const entry of this.#entries) {
      if (timingSafeEqual(presented, entry.tokenSha256) && found === null) found = entry.actor;
    }
    return found;
  }
}
