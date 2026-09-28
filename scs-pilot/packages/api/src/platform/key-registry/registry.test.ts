// AAB-PLATFORM-09: key state, exposure windows, the five verification results
// and cross-issuer evidence, with real Ed25519 keys signing outside the
// "server", as signers do.

import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";

import { canonicalJson } from "../../foundation/canonical.js";
import {
  activeKeysAt,
  attestedContent,
  checkVerificationEvidence,
  EVIDENCE_MAX_AGE_MS,
  exposureWindow,
  keyStateAt,
  mayBeReliedOn,
  publicKeyDigestOf,
  retiredAt,
  verifySignedRecord,
  type KeyHistory,
  type KeyVerificationEvidence,
  type RegistryIssuer,
  type SignedRecord,
} from "./registry.js";

const TH: RegistryIssuer = { issuerType: "COUNTRY_TENANCY", countryCode: "TH" };
const PLATFORM: RegistryIssuer = { issuerType: "PLATFORM_CONTROL_PLANE" };
const at = (minute: number) => new Date(Date.UTC(2026, 8, 28, 1, minute)).toISOString();

interface Signer { readonly publicKey: string; readonly privateKey: KeyObject }
function signer(): Signer {
  const k = generateKeyPairSync("ed25519");
  return { publicKey: k.publicKey.export({ format: "der", type: "spki" }).toString("base64"), privateKey: k.privateKey };
}
const signed = (s: Signer, statement: unknown) => sign(null, Buffer.from(canonicalJson(statement), "utf8"), s.privateKey).toString("base64");

function history(s: Signer, o: Partial<KeyHistory> & { activeFrom?: string; issuer?: RegistryIssuer; actorId?: string; keyId?: string } = {}): KeyHistory {
  return {
    registration: {
      keyId: o.keyId ?? "11111111-1111-4111-8111-111111111111",
      issuer: o.issuer ?? TH,
      actorId: o.actorId ?? "officer",
      algorithm: "Ed25519",
      publicKey: s.publicKey,
      publicKeyDigest: publicKeyDigestOf(s.publicKey),
      activeFrom: o.activeFrom ?? at(1),
      registeredAt: o.activeFrom ?? at(1),
      registrationDigest: "sha256:" + "0".repeat(64),
    },
    events: o.events ?? [],
    compromises: o.compromises ?? [],
    ...(o.replacedFrom === undefined ? {} : { replacedFrom: o.replacedFrom }),
  };
}

function record(s: Signer, acceptedAt: string, statement: unknown = { statementType: "TEST", signingKeyId: "11111111-1111-4111-8111-111111111111" }): SignedRecord {
  return { statement, signature: signed(s, statement), signer: { issuer: TH, actorId: "officer" }, acceptedAt };
}

// ── State ────────────────────────────────────────────────────────────────────

test("state: PENDING before activeFrom, then ACTIVE", () => {
  const h = history(signer(), { activeFrom: at(5) });
  assert.equal(keyStateAt(h, at(4)), "PENDING");
  assert.equal(keyStateAt(h, at(5)), "ACTIVE");
});

test("state: suspension and reinstatement take effect when they say; the latest in effect wins", () => {
  const h = history(signer(), {
    events: [
      { eventType: "SUSPENDED", effectiveAt: at(10), recordedAt: at(10) },
      { eventType: "REINSTATED", effectiveAt: at(20), recordedAt: at(19) },
    ],
  });
  assert.equal(keyStateAt(h, at(9)), "ACTIVE");
  assert.equal(keyStateAt(h, at(10)), "SUSPENDED");
  assert.equal(keyStateAt(h, at(19)), "SUSPENDED", "a reinstatement recorded early takes effect only when it says");
  assert.equal(keyStateAt(h, at(20)), "ACTIVE");
});

test("state: retirement by event or by a replacing key, whichever is first, and final", () => {
  const byEvent = history(signer(), { events: [{ eventType: "RETIRED", effectiveAt: at(30), recordedAt: at(29) }] });
  assert.equal(retiredAt(byEvent), at(30));
  assert.equal(keyStateAt(byEvent, at(29)), "ACTIVE");
  assert.equal(keyStateAt(byEvent, at(30)), "RETIRED");
  const both = history(signer(), { replacedFrom: at(25), events: [{ eventType: "RETIRED", effectiveAt: at(30), recordedAt: at(29) }] });
  assert.equal(retiredAt(both), at(25));
  const suspendedThenRetired = history(signer(), {
    events: [{ eventType: "SUSPENDED", effectiveAt: at(10), recordedAt: at(10) }, { eventType: "RETIRED", effectiveAt: at(12), recordedAt: at(12) }],
  });
  assert.equal(keyStateAt(suspendedThenRetired, at(40)), "RETIRED");
});

test("state: a compromise is final, whatever else has happened, from when it is recorded", () => {
  const h = history(signer(), {
    events: [{ eventType: "RETIRED", effectiveAt: at(10), recordedAt: at(10) }],
    compromises: [{ suspectedExposureFrom: at(2), recordedAt: at(20) }],
  });
  assert.equal(keyStateAt(h, at(15)), "RETIRED");
  assert.equal(keyStateAt(h, at(20)), "COMPROMISED");
});

test("one active key per actor: activeKeysAt finds exactly the key in effect", () => {
  const a = signer();
  const b = signer();
  const old = history(a, { keyId: "a", replacedFrom: at(30) });
  const next = history(b, { keyId: "b", activeFrom: at(30) });
  assert.deepEqual(activeKeysAt([old, next], at(29)).map((h) => h.registration.keyId), ["a"]);
  assert.deepEqual(activeKeysAt([old, next], at(30)).map((h) => h.registration.keyId), ["b"]);
});

// ── Exposure ─────────────────────────────────────────────────────────────────

test("exposure: from the earliest suspected start to the first record; widened, never narrowed", () => {
  const s = signer();
  assert.equal(exposureWindow(history(s)), undefined);
  const first = { suspectedExposureFrom: at(10), recordedAt: at(20) };
  assert.deepEqual(exposureWindow(history(s, { compromises: [first] })), { from: at(10), until: at(20) });
  const widened = { suspectedExposureFrom: at(5), recordedAt: at(40) };
  assert.deepEqual(exposureWindow(history(s, { compromises: [first, widened] })), { from: at(5), until: at(20) });
  const narrower = { suspectedExposureFrom: at(15), recordedAt: at(50) };
  assert.deepEqual(exposureWindow(history(s, { compromises: [first, narrower] })), { from: at(10), until: at(20) }, "a later, narrower start changes nothing");
});

// ── The five results ─────────────────────────────────────────────────────────

test("VERIFIED: the named key, active at acceptance; later retirement and suspension change nothing", () => {
  const s = signer();
  const r = record(s, at(5));
  assert.deepEqual(verifySignedRecord({ record: r, key: history(s) }), { result: "VERIFIED" });
  const later = history(s, {
    events: [{ eventType: "SUSPENDED", effectiveAt: at(10), recordedAt: at(10) }, { eventType: "RETIRED", effectiveAt: at(20), recordedAt: at(20) }],
  });
  assert.equal(verifySignedRecord({ record: r, key: later }).result, "VERIFIED", "rotation never invalidates what was accepted");
});

test("NOT_VERIFIABLE: no key, another actor's key, a bad signature, a substituted public key", () => {
  const s = signer();
  const r = record(s, at(5));
  assert.equal(verifySignedRecord({ record: r, key: null }).result, "NOT_VERIFIABLE");
  assert.equal(verifySignedRecord({ record: r, key: history(s, { actorId: "someone-else" }) }).result, "NOT_VERIFIABLE");
  assert.equal(verifySignedRecord({ record: r, key: history(s, { issuer: PLATFORM }) }).result, "NOT_VERIFIABLE");
  assert.equal(verifySignedRecord({ record: { ...r, signature: signed(signer(), r.statement) }, key: history(s) }).result, "NOT_VERIFIABLE");
  const swapped = history(s);
  const other = signer();
  const tampered: KeyHistory = { ...swapped, registration: { ...swapped.registration, publicKey: other.publicKey } };
  assert.match(verifySignedRecord({ record: record(other, at(5)), key: tampered }).reason ?? "", /does not match its registered digest/);
});

test("NOT_VERIFIABLE: a key not ACTIVE at acceptance, whatever the statement claims", () => {
  const s = signer();
  const retired = history(s, { events: [{ eventType: "RETIRED", effectiveAt: at(10), recordedAt: at(10) }] });
  const claimsEarlier = record(s, at(11), { statementType: "TEST", signedAt: at(9) });
  assert.match(verifySignedRecord({ record: claimsEarlier, key: retired }).reason ?? "", /was RETIRED/);
  assert.match(verifySignedRecord({ record: record(s, at(0)), key: history(s, { activeFrom: at(1) }) }).reason ?? "", /was PENDING/);
  const suspended = history(s, { events: [{ eventType: "SUSPENDED", effectiveAt: at(3), recordedAt: at(3) }] });
  assert.match(verifySignedRecord({ record: record(s, at(4)), key: suspended }).reason ?? "", /was SUSPENDED/);
});

test("compromise: inside the window, under review until a person assesses it; before it, unaffected", () => {
  const s = signer();
  const h = history(s, { compromises: [{ suspectedExposureFrom: at(10), recordedAt: at(20) }] });
  assert.equal(verifySignedRecord({ record: record(s, at(9)), key: h }).result, "VERIFIED");
  assert.equal(verifySignedRecord({ record: record(s, at(10)), key: h }).result, "UNDER_COMPROMISE_REVIEW");
  assert.equal(verifySignedRecord({ record: record(s, at(15)), key: h, assessment: "AFFIRM" }).result, "AFFIRMED_AFTER_COMPROMISE");
  assert.equal(verifySignedRecord({ record: record(s, at(15)), key: h, assessment: "REPUDIATE" }).result, "REPUDIATED");
  assert.equal(verifySignedRecord({ record: record(s, at(20)), key: h }).result, "NOT_VERIFIABLE", "accepted as the compromise was recorded: the key was COMPROMISED");
});

test("reliance: only VERIFIED and AFFIRMED_AFTER_COMPROMISE", () => {
  assert.deepEqual(
    (["VERIFIED", "UNDER_COMPROMISE_REVIEW", "AFFIRMED_AFTER_COMPROMISE", "REPUDIATED", "NOT_VERIFIABLE"] as const).filter(mayBeReliedOn),
    ["VERIFIED", "AFFIRMED_AFTER_COMPROMISE"],
  );
});

// ── Another issuer's key ─────────────────────────────────────────────────────

function evidence(owner: Signer, attester: Signer, o: Partial<KeyVerificationEvidence> = {}): KeyVerificationEvidence {
  const h = history(owner, { issuer: PLATFORM, actorId: "platform-owner", keyId: "control-plane-key-1" });
  const base = {
    issuer: PLATFORM, keyId: "control-plane-key-1", registration: h.registration, eventsAtAcceptance: [], compromisedAtAcceptance: false as const,
    attestedAt: at(4), attestationKeyId: "attestation-1", ...o,
  };
  return { ...base, attestation: o.attestation ?? signed(attester, attestedContent({ ...base, attestation: "" })) };
}

test("evidence: verified offline against a pinned attestation key, then used as the key's history", () => {
  const owner = signer();
  const attester = signer();
  const pinned = [{ attestedIssuer: PLATFORM, attestationKeyId: "attestation-1", publicKey: attester.publicKey }];
  const ok = checkVerificationEvidence(evidence(owner, attester), pinned, at(5));
  assert.ok(ok.ok);
  const r: SignedRecord = { statement: { s: 1 }, signature: signed(owner, { s: 1 }), signer: { issuer: PLATFORM, actorId: "platform-owner" }, acceptedAt: at(5) };
  assert.equal(verifySignedRecord({ record: r, key: ok.history }).result, "VERIFIED");
});

test("evidence: refused if not pinned, not attested by the pin, attested for another issuer, or stale", () => {
  const owner = signer();
  const attester = signer();
  const pinned = [{ attestedIssuer: PLATFORM, attestationKeyId: "attestation-1", publicKey: attester.publicKey }];
  const reason = (e: KeyVerificationEvidence, when = at(5), pins = pinned) => {
    const r = checkVerificationEvidence(e, pins, when);
    return r.ok ? "accepted" : r.reason;
  };
  assert.match(reason(evidence(owner, attester, { attestationKeyId: "attestation-2" })), /not pinned/);
  assert.match(reason(evidence(owner, signer())), /does not verify/);
  assert.match(reason(evidence(owner, attester), at(5), [{ attestedIssuer: TH, attestationKeyId: "attestation-1", publicKey: attester.publicKey }]), /another issuer/);
  assert.match(reason(evidence(owner, attester, { attestedAt: at(6) })), /after the record was accepted/);
  const old = new Date(Date.parse(at(5)) - EVIDENCE_MAX_AGE_MS - 60_000).toISOString();
  assert.match(reason(evidence(owner, attester, { attestedAt: old })), /more than 60 minutes/);
});
