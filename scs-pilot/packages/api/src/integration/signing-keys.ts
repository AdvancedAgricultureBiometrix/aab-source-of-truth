// Test fixture: signing keys through the public-key registry (AAB-PLATFORM-09),
// as a deployment registers them — never by writing registry rows directly, so
// every record it leaves is genuinely signed and re-verifies (the integrity
// verifier checks the whole registry).
//
// A country registry is bootstrapped by its representative, co-signed by a
// Platform Owner whose key, and the control plane's attestation key, this
// fixture holds offline: the country verifies the co-signature from attested
// evidence alone, as it does for real. Then the representative registers each
// test actor's key.
//
// Requires the server to serve keyRegistryRoutes, and the actors file to name
// KEY_REGISTRAR_ACTOR with the KEY_REGISTRAR role and an accountable name.

import { createHash, generateKeyPairSync, randomUUID, sign, type KeyObject } from "node:crypto";

import { canonicalJson } from "../foundation/canonical.js";
import { attestedContent, publicKeyDigestOf, type KeyVerificationEvidence } from "../platform/key-registry/registry.js";

export interface TestKey {
  readonly keyId: string;
  readonly publicKey: string;
  readonly privateKey: KeyObject;
}

export interface RegistryAccess {
  readonly base: string;
  /** The bearer token of an actor in the server's actors file. */
  token(actorId: string): string;
  readonly issuer: { issuerType: "COUNTRY_TENANCY"; countryCode: string };
}

/** The actor that bootstraps the country registry and registers every test key. */
export const KEY_REGISTRAR_ACTOR = "key-registrar";

/** An actors-file entry for the key registrar, given a token hasher. */
export const keyRegistrarEntry = (tokenSha256: string) => ({
  tokenSha256,
  actor: { actorId: KEY_REGISTRAR_ACTOR, actorType: "HUMAN", roles: ["KEY_REGISTRAR"], authenticationMethod: "STATIC_TOKEN" },
  accountableName: "Named key registrar",
});

export function newKeyPair(): { publicKey: string; privateKey: KeyObject } {
  const k = generateKeyPairSync("ed25519");
  return { publicKey: k.publicKey.export({ format: "der", type: "spki" }).toString("base64"), privateKey: k.privateKey };
}

export const signWith = (privateKey: KeyObject, statement: unknown): string =>
  sign(null, Buffer.from(canonicalJson(statement), "utf8"), privateKey).toString("base64");

/** A statement as version 2 (AAB-PLATFORM-04, third amendment), naming the key, and its signature with it. */
export function signedV2<T extends object>(key: TestKey, statement: T): { statement: T & { statementVersion: "2"; signingKeyId: string }; signature: string } {
  const v2 = { ...statement, statementVersion: "2" as const, signingKeyId: key.keyId };
  return { statement: v2, signature: signWith(key.privateKey, v2) };
}

async function post(r: RegistryAccess, who: string, path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(r.base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${r.token(who)}`, "content-type": "application/json", "idempotency-key": `signing-keys-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (res.status !== 201) throw new Error(`${path} as ${who}: ${res.status} ${JSON.stringify(json)}`);
  return json["decision"] as Record<string, unknown>;
}

async function challenge(r: RegistryAccess, who: string, purpose: "BOOTSTRAP" | "REGISTRATION", actorId: string) {
  const d = await post(r, who, "/aab/v1/key-registration-challenges", { purpose, actorId });
  return { challengeId: d["challengeId"] as string, keyId: d["keyId"] as string, nonce: d["nonce"] as string };
}

function statements(r: RegistryAccess, actorId: string, c: { challengeId: string; keyId: string; nonce: string }, key: { publicKey: string; privateKey: KeyObject }, authority: string, authorityKey: { privateKey: KeyObject }, authorityKeyId: string, replacesKeyId?: string) {
  const issuer = r.issuer;
  const publicKeyDigest = publicKeyDigestOf(key.publicKey);
  const possessionStatement = { statementType: "SIGNING_KEY_POSSESSION", keyId: c.keyId, actorId, issuer, publicKeyDigest, challengeId: c.challengeId, nonce: c.nonce };
  const registrationStatement = {
    statementType: "SIGNING_KEY_REGISTRATION", keyId: c.keyId, actorId, issuer, publicKeyDigest, algorithm: "Ed25519", challengeId: c.challengeId,
    signingKeyId: authorityKeyId, registrationAuthority: { issuer, actorId: authority }, ...(replacesKeyId === undefined ? {} : { replacesKeyId }),
  };
  return {
    publicKey: key.publicKey,
    possessionStatement, possessionSignature: signWith(key.privateKey, possessionStatement),
    registrationStatement, registrationSignature: signWith(authorityKey.privateKey, registrationStatement),
  };
}

/** Bootstraps the country registry: the registrar's first key, co-signed by an offline Platform Owner. Returns the registrar's key. */
export async function bootstrapCountryRegistry(r: RegistryAccess): Promise<TestKey> {
  const platformOwner = newKeyPair();
  const attestation = newKeyPair();
  const PLATFORM = { issuerType: "PLATFORM_CONTROL_PLANE" as const };
  const now = new Date().toISOString();
  const poKeyId = "test-control-plane-key";
  const registration = {
    keyId: poKeyId, issuer: PLATFORM, actorId: "test-platform-owner", algorithm: "Ed25519" as const, publicKey: platformOwner.publicKey,
    publicKeyDigest: publicKeyDigestOf(platformOwner.publicKey), activeFrom: now, registeredAt: now,
    registrationDigest: `sha256:${createHash("sha256").update(`test-control-plane-registration-${platformOwner.publicKey}`).digest("hex")}`,
  };
  const unattested = { issuer: PLATFORM, keyId: poKeyId, registration, eventsAtAcceptance: [], compromisedAtAcceptance: false as const, attestedAt: now, attestationKeyId: "test-control-plane-attestation" };
  const evidence: KeyVerificationEvidence = { ...unattested, attestation: signWith(attestation.privateKey, attestedContent({ ...unattested, attestation: "" })) };

  const key = newKeyPair();
  const c = await challenge(r, KEY_REGISTRAR_ACTOR, "BOOTSTRAP", KEY_REGISTRAR_ACTOR);
  const body = statements(r, KEY_REGISTRAR_ACTOR, c, key, KEY_REGISTRAR_ACTOR, key, c.keyId);
  const ceremonyStatement = {
    statementType: "KEY_BOOTSTRAP_CEREMONY", registry: r.issuer, holder: { issuer: r.issuer, actorId: KEY_REGISTRAR_ACTOR },
    keyId: c.keyId, challengeId: c.challengeId, publicKeyDigest: publicKeyDigestOf(key.publicKey),
    record: { present: ["Test key registrar", "Test Platform Owner"], procedure: "Test fixture: keys generated in the test process.", performedAt: now },
    pinnedAttestationKey: { attestationKeyId: "test-control-plane-attestation", publicKey: attestation.publicKey },
    cosigner: { actor: { issuer: PLATFORM, actorId: "test-platform-owner" }, accountableName: "Named test platform owner", signingKeyId: poKeyId },
  };
  await post(r, KEY_REGISTRAR_ACTOR, "/aab/v1/key-bootstrap-ceremonies", {
    ...body, ceremonyStatement, holderSignature: signWith(key.privateKey, ceremonyStatement),
    cosignature: signWith(platformOwner.privateKey, ceremonyStatement), cosignerKeyEvidence: evidence,
  });
  return { keyId: c.keyId, ...key };
}

/** Registers a key for `actorId`, by the key registrar; optionally replacing one (rotation). */
export async function registerTestKey(r: RegistryAccess, registrarKey: TestKey, actorId: string, o: { replaces?: string } = {}): Promise<TestKey> {
  const key = newKeyPair();
  const c = await challenge(r, KEY_REGISTRAR_ACTOR, "REGISTRATION", actorId);
  await post(r, KEY_REGISTRAR_ACTOR, "/aab/v1/signing-keys", statements(r, actorId, c, key, KEY_REGISTRAR_ACTOR, registrarKey, registrarKey.keyId, o.replaces));
  return { keyId: c.keyId, ...key };
}

/** Bootstraps the registry and registers a key for each actor. */
export async function registerTestKeys<A extends string>(r: RegistryAccess, actorIds: readonly A[]): Promise<{ registrar: TestKey; keys: Record<A, TestKey> }> {
  const registrar = await bootstrapCountryRegistry(r);
  const keys = {} as Record<A, TestKey>;
  for (const a of actorIds) keys[a] = await registerTestKey(r, registrar, a);
  return { registrar, keys };
}
