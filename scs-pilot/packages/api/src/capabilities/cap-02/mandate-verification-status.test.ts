import { test } from "node:test";
import assert from "node:assert/strict";

import { deriveMandateVerificationStatus, type MandateAssessmentSummary } from "./mandate-verification-status.js";

const a = (id: string, status: string, recordedAt: string, o: { expiresAt?: string; supersedes?: string } = {}): MandateAssessmentSummary => ({
  assessmentId: id, verificationStatus: status, recordedAt, expiresAt: o.expiresAt ?? null, supersedesAssessmentId: o.supersedes ?? null,
});
const at = (iso: string) => new Date(iso);

test("no assessment: CLAIMED_UNVERIFIED", () => {
  assert.deepEqual(deriveMandateVerificationStatus([], at("2026-10-01T00:00:00Z")), { status: "CLAIMED_UNVERIFIED", assessmentId: null });
});

test("the latest standing assessment decides; a superseded one never counts", () => {
  const verified = a("a1", "VERIFIED_FOR_DECLARED_SCOPE", "2026-10-01T00:00:00Z");
  const disputed = a("a2", "DISPUTED", "2026-10-02T00:00:00Z");
  assert.equal(deriveMandateVerificationStatus([disputed, verified], at("2026-10-03T00:00:00Z")).status, "DISPUTED", "the newest finding is never hidden by an older one");
  const replaced = a("a3", "PARTIALLY_VERIFIED", "2026-10-03T00:00:00Z", { supersedes: "a2" });
  assert.deepEqual(deriveMandateVerificationStatus([verified, disputed, replaced], at("2026-10-04T00:00:00Z")), { status: "PARTIALLY_VERIFIED", assessmentId: "a3" });
  // superseding the only assessment leaves its successor
  const only = a("b1", "VERIFIED_FOR_DECLARED_SCOPE", "2026-10-01T00:00:00Z");
  const fail = a("b2", "FAIL_CLOSED", "2026-10-02T00:00:00Z", { supersedes: "b1" });
  assert.equal(deriveMandateVerificationStatus([only, fail], at("2026-10-03T00:00:00Z")).status, "FAIL_CLOSED");
});

test("VERIFICATION_EXPIRED once the deciding assessment's expiresAt has passed; an older one does not stand in for it", () => {
  const older = a("c1", "VERIFIED_FOR_DECLARED_SCOPE", "2026-10-01T00:00:00Z");
  const newer = a("c2", "VERIFIED_FOR_DECLARED_SCOPE", "2026-10-02T00:00:00Z", { expiresAt: "2026-11-01T00:00:00Z" });
  assert.equal(deriveMandateVerificationStatus([older, newer], at("2026-10-31T23:59:59Z")).status, "VERIFIED_FOR_DECLARED_SCOPE");
  assert.deepEqual(deriveMandateVerificationStatus([older, newer], at("2026-11-01T00:00:00Z")), { status: "VERIFICATION_EXPIRED", assessmentId: "c2" });
});

test("only assessments recorded by `at` count", () => {
  const first = a("d1", "PARTIALLY_VERIFIED", "2026-10-01T00:00:00Z");
  const later = a("d2", "VERIFIED_FOR_DECLARED_SCOPE", "2026-10-05T00:00:00Z", { supersedes: "d1" });
  assert.equal(deriveMandateVerificationStatus([first, later], at("2026-10-02T00:00:00Z")).status, "PARTIALLY_VERIFIED");
  assert.equal(deriveMandateVerificationStatus([first, later], at("2026-10-05T00:00:00Z")).status, "VERIFIED_FOR_DECLARED_SCOPE");
});
