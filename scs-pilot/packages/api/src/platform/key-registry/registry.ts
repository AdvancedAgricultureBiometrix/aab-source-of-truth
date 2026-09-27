// AAB-PLATFORM-09 Governed Public-Key Registry: what the platform derives from
// a key's registration and history, for every domain whose records are signed.
//
//   * state        — PENDING, ACTIVE, SUSPENDED, RETIRED or COMPROMISED at a
//                    time, derived when read, never stored (section 4)
//   * retiredAt    — from a RETIRED event, or a replacing key's activeFrom
//   * exposure     — the compromise window: from the earliest suspected start,
//                    never narrowed, to the first compromise record (section 8)
//   * verification — the five results for a signed record, against the key its
//                    statement names, as at the server's acceptedAt (section 7)
//   * evidence     — another issuer's key, from its attested verification
//                    evidence, against a pinned attestation key (section 9)
//
// Platform code, pure: no database, no domain types. The registry's tables are
// read by store.ts; callers pass what it returns.

import { createHash, type KeyObject } from "node:crypto";

import { parseSigningPublicKey, verifyStatementSignature } from "../../foundation/signatures.js";

export interface RegistryIssuer {
  readonly issuerType: "PLATFORM_CONTROL_PLANE" | "COUNTRY_TENANCY";
  readonly countryCode?: string;
}

/** A key's registration, as the registry holds it (section 3). */
export interface KeyRegistrationView {
  readonly keyId: string;
  readonly issuer: RegistryIssuer;
  readonly actorId: string;
  readonly algorithm: "Ed25519";
  readonly publicKey: string;                 // SPKI DER, base64
  readonly publicKeyDigest: string;
  readonly activeFrom: string;
  readonly registeredAt: string;
  readonly replacesKeyId?: string;
  readonly registrationDigest: string;
}

/** A retirement, suspension or reinstatement (section 4). */
export interface KeyEventView {
  readonly eventType: "SUSPENDED" | "REINSTATED" | "RETIRED";
  readonly effectiveAt: string;
  readonly recordedAt: string;
}

/** A compromise record, or another issuer's compromise notice (sections 8 and 9). */
export interface KeyCompromiseView {
  readonly suspectedExposureFrom: string;
  readonly recordedAt: string;
}

/** Everything the registry knows about one key. */
export interface KeyHistory {
  readonly registration: KeyRegistrationView;
  readonly events: readonly KeyEventView[];
  readonly compromises: readonly KeyCompromiseView[];
  /** The activeFrom of the key that replaced this one, if any: the rotation that retires it. */
  readonly replacedFrom?: string;
}

export type KeyState = "PENDING" | "ACTIVE" | "SUSPENDED" | "RETIRED" | "COMPROMISED";

const t = (iso: string): number => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`not a timestamp: ${iso}`);
  return ms;
};

// ── State (section 4) ────────────────────────────────────────────────────────

/** When the key was retired, by a RETIRED event or by a replacing key, whichever came first; undefined if it has not been. */
export function retiredAt(history: KeyHistory): string | undefined {
  const times = [
    ...history.events.filter((e) => e.eventType === "RETIRED").map((e) => e.effectiveAt),
    ...(history.replacedFrom === undefined ? [] : [history.replacedFrom]),
  ];
  return times.length === 0 ? undefined : times.reduce((a, b) => (t(a) <= t(b) ? a : b));
}

/**
 * The key's state at `at`. Precedence: a compromise recorded by then is final,
 * whatever else has happened; then retirement; then not yet active; then the
 * latest suspension or reinstatement in effect.
 */
export function keyStateAt(history: KeyHistory, at: string): KeyState {
  const now = t(at);
  if (history.compromises.some((c) => t(c.recordedAt) <= now)) return "COMPROMISED";
  const retired = retiredAt(history);
  if (retired !== undefined && t(retired) <= now) return "RETIRED";
  if (now < t(history.registration.activeFrom)) return "PENDING";
  const inEffect = history.events
    .filter((e) => e.eventType !== "RETIRED" && t(e.effectiveAt) <= now)
    .sort((a, b) => t(a.effectiveAt) - t(b.effectiveAt) || t(a.recordedAt) - t(b.recordedAt));
  const last = inEffect[inEffect.length - 1];
  return last?.eventType === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
}

/** The keys among `histories` that are ACTIVE at `at`. An actor has at most one (section 3). */
export function activeKeysAt(histories: readonly KeyHistory[], at: string): KeyHistory[] {
  return histories.filter((h) => keyStateAt(h, at) === "ACTIVE");
}

// ── Exposure (section 8) ─────────────────────────────────────────────────────

export interface ExposureWindow {
  readonly from: string;
  readonly until: string;
}

/**
 * The compromise window, or undefined if the key has no compromise record.
 * From the earliest suspected start any record gives (a later record can
 * widen it, nothing narrows it) to the first compromise record, after which
 * the key never signs again. A start the declarer could not estimate is
 * recorded as the key's activeFrom.
 */
export function exposureWindow(history: KeyHistory): ExposureWindow | undefined {
  if (history.compromises.length === 0) return undefined;
  const earliest = (xs: string[]) => xs.reduce((a, b) => (t(a) <= t(b) ? a : b));
  return {
    from: earliest(history.compromises.map((c) => c.suspectedExposureFrom)),
    until: earliest(history.compromises.map((c) => c.recordedAt)),
  };
}

// ── Verification (sections 6 and 7) ──────────────────────────────────────────

export type VerificationResult =
  | "VERIFIED"
  | "UNDER_COMPROMISE_REVIEW"
  | "AFFIRMED_AFTER_COMPROMISE"
  | "REPUDIATED"
  | "NOT_VERIFIABLE";

export interface Verification {
  readonly result: VerificationResult;
  /** Why, for NOT_VERIFIABLE; the window, for the compromise results. */
  readonly reason?: string;
}

/** Only these may be relied on where a record's authority is required (section 7). Every other result fails closed. */
export const mayBeReliedOn = (result: VerificationResult): boolean => result === "VERIFIED" || result === "AFFIRMED_AFTER_COMPROMISE";

export interface SignedRecord {
  /** The statement as signed. */
  readonly statement: unknown;
  readonly signature: string;
  /** Who the record says signed it. */
  readonly signer: { readonly issuer: RegistryIssuer; readonly actorId: string };
  /** The server's own time of acceptance, from the record's receipt: never a time the signer supplied. */
  readonly acceptedAt: string;
}

export interface VerifyInput {
  readonly record: SignedRecord;
  /** The key the statement names, as the registry (or verification evidence) holds it; null when it cannot be resolved. */
  readonly key: KeyHistory | null;
  /** The human assessment of this record, if one has been made (section 8). */
  readonly assessment?: "AFFIRM" | "REPUDIATE";
}

const sameIssuer = (a: RegistryIssuer, b: RegistryIssuer): boolean =>
  a.issuerType === b.issuerType && (a.countryCode ?? null) === (b.countryCode ?? null);

/**
 * The five results (section 7). The record is verified against the historical
 * key its statement names, as at acceptedAt. Later events do not change the
 * result, except a compromise whose window covers acceptedAt. REPUDIATED (a
 * person's finding) and NOT_VERIFIABLE (no finding can be made) are distinct.
 */
export function verifySignedRecord(input: VerifyInput): Verification {
  const { record, key, assessment } = input;
  if (key === null) return { result: "NOT_VERIFIABLE", reason: "the key the statement names cannot be resolved" };
  const reg = key.registration;
  if (reg.actorId !== record.signer.actorId || !sameIssuer(reg.issuer, record.signer.issuer)) {
    return { result: "NOT_VERIFIABLE", reason: `key ${reg.keyId} is not registered for the signer` };
  }
  let publicKey: KeyObject;
  try {
    publicKey = parseSigningPublicKey(reg.publicKey);
  } catch {
    return { result: "NOT_VERIFIABLE", reason: `key ${reg.keyId} is not a usable Ed25519 public key` };
  }
  if (publicKeyDigestOf(reg.publicKey) !== reg.publicKeyDigest) {
    return { result: "NOT_VERIFIABLE", reason: `key ${reg.keyId} does not match its registered digest` };
  }
  if (!verifyStatementSignature(record.statement, record.signature, publicKey)) {
    return { result: "NOT_VERIFIABLE", reason: `the signature does not verify with key ${reg.keyId}` };
  }
  const state = keyStateAt(key, record.acceptedAt);
  if (state !== "ACTIVE") {
    return { result: "NOT_VERIFIABLE", reason: `key ${reg.keyId} was ${state} when the record was accepted` };
  }
  const window = exposureWindow(key);
  if (window !== undefined && t(window.from) <= t(record.acceptedAt) && t(record.acceptedAt) <= t(window.until)) {
    const reason = `accepted inside key ${reg.keyId}'s exposure window, ${window.from} to ${window.until}`;
    if (assessment === "AFFIRM") return { result: "AFFIRMED_AFTER_COMPROMISE", reason };
    if (assessment === "REPUDIATE") return { result: "REPUDIATED", reason };
    return { result: "UNDER_COMPROMISE_REVIEW", reason };
  }
  return { result: "VERIFIED" };
}

// ── Keys ─────────────────────────────────────────────────────────────────────

/** "sha256:" over a public key's SPKI DER bytes: the form of publicKeyDigest (section 3). */
export function publicKeyDigestOf(spkiBase64: string): string {
  return `sha256:${createHash("sha256").update(Buffer.from(spkiBase64, "base64")).digest("hex")}`;
}

// ── Another issuer's key: verification evidence (section 9) ──────────────────

/** KeyVerificationEvidence, as the issuing registry exports and attests it. */
export interface KeyVerificationEvidence {
  readonly issuer: RegistryIssuer;
  readonly keyId: string;
  readonly registration: KeyRegistrationView;
  readonly eventsAtAcceptance: readonly KeyEventView[];
  readonly compromisedAtAcceptance: false;
  readonly attestedAt: string;
  readonly attestation: string;
  readonly attestationKeyId: string;
}

/** A pinned attestation key (second amendment). */
export interface PinnedAttestationKey {
  readonly attestedIssuer: RegistryIssuer;
  readonly attestationKeyId: string;
  readonly publicKey: string;
}

/** How old verification evidence may be when a record relying on it is accepted: 60 minutes (section 9, third amendment). */
export const EVIDENCE_MAX_AGE_MS = 60 * 60_000;

/** What the attestation signs: every field above it (section 9). */
export function attestedContent(evidence: KeyVerificationEvidence): unknown {
  const { issuer, keyId, registration, eventsAtAcceptance, compromisedAtAcceptance, attestedAt } = evidence;
  return { issuer, keyId, registration, eventsAtAcceptance, compromisedAtAcceptance, attestedAt };
}

export type EvidenceCheck = { readonly ok: true; readonly history: KeyHistory } | { readonly ok: false; readonly reason: string };

/**
 * Checks another issuer's verification evidence against the domain's pinned
 * attestation keys, with no call outside the domain, and returns the key's
 * history as the evidence shows it. Compromise notices recorded later are
 * added by the caller (section 9).
 */
export function checkVerificationEvidence(
  evidence: KeyVerificationEvidence,
  pinned: readonly PinnedAttestationKey[],
  acceptedAt: string,
): EvidenceCheck {
  const pin = pinned.find((p) => p.attestationKeyId === evidence.attestationKeyId);
  if (pin === undefined) return { ok: false, reason: `attestation key ${evidence.attestationKeyId} is not pinned` };
  if (!sameIssuer(pin.attestedIssuer, evidence.issuer)) {
    return { ok: false, reason: `attestation key ${pin.attestationKeyId} attests another issuer's keys` };
  }
  let attestationKey: KeyObject;
  try {
    attestationKey = parseSigningPublicKey(pin.publicKey);
  } catch {
    return { ok: false, reason: `pinned attestation key ${pin.attestationKeyId} is not a usable Ed25519 public key` };
  }
  if (!verifyStatementSignature(attestedContent(evidence), evidence.attestation, attestationKey)) {
    return { ok: false, reason: "the attestation does not verify against the pinned key" };
  }
  if (evidence.compromisedAtAcceptance !== false) return { ok: false, reason: "the evidence shows the key compromised" };
  if (evidence.keyId !== evidence.registration.keyId || !sameIssuer(evidence.issuer, evidence.registration.issuer)) {
    return { ok: false, reason: "the evidence's registration is not for the key it names" };
  }
  // At or before acceptance, and at most 60 minutes before it (section 9,
  // third amendment): evidence arrives with the request, so it cannot be
  // attested after the server accepts it.
  const age = t(acceptedAt) - t(evidence.attestedAt);
  if (age < 0) return { ok: false, reason: "the evidence is attested after the record was accepted" };
  if (age > EVIDENCE_MAX_AGE_MS) return { ok: false, reason: `the evidence was attested more than ${EVIDENCE_MAX_AGE_MS / 60_000} minutes before acceptance` };
  return { ok: true, history: { registration: evidence.registration, events: evidence.eventsAtAcceptance, compromises: [] } };
}
