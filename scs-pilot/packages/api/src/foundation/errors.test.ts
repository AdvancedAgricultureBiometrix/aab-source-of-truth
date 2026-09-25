import { test } from "node:test";
import assert from "node:assert/strict";

import { asScsFailure, CAPABILITY_BOUNDARY_FLAGS, platformFailure, ScsFailure, toEnvelope } from "./errors.js";

test("CAP-01 envelope matches the contract failure shape plus correlationId", () => {
  const failure = new ScsFailure({ capabilityId: "SCS-CAP-01", code: "REGISTRANT_NOT_AUTHORISED", reasons: ["no role"], httpStatus: 403 });
  assert.deepEqual(toEnvelope(failure, "corr-12345678"), {
    ok: false,
    capabilityId: "SCS-CAP-01",
    result: "FAIL_CLOSED",
    error: "REGISTRANT_NOT_AUTHORISED",
    reasons: ["no role"],
    correlationId: "corr-12345678",
    noWrites: true,
    noFrameworkRegistered: true,
  });
});

test("boundary flags are copied from each contract: CAP-06/08/09 have no noWrites", () => {
  for (const id of ["SCS-CAP-06", "SCS-CAP-08", "SCS-CAP-09"] as const) {
    assert.equal("noWrites" in CAPABILITY_BOUNDARY_FLAGS[id], false, id);
  }
  const env = toEnvelope(new ScsFailure({ capabilityId: "SCS-CAP-06", code: "X", reasons: ["r"], httpStatus: 422 }), "corr-12345678");
  assert.equal("noWrites" in env, false);
  assert.equal(env.noEvaluationProduced, true);
  assert.deepEqual(CAPABILITY_BOUNDARY_FLAGS["SCS-CAP-08"], { noPackageCompiled: true, noPartialPackage: true });
});

test("envelope and its reasons are frozen", () => {
  const env = toEnvelope(platformFailure("ROUTE_NOT_FOUND", ["nope"]), "corr-12345678");
  assert.ok(Object.isFrozen(env));
  assert.ok(Object.isFrozen(env.reasons));
  assert.throws(() => {
    (env as { ok: boolean }).ok = true;
  });
});

test("ScsFailure refuses empty or blank reasons and non-error statuses", () => {
  assert.throws(() => new ScsFailure({ capabilityId: "SCS-CAP-01", code: "X", reasons: [], httpStatus: 400 }));
  assert.throws(() => new ScsFailure({ capabilityId: "SCS-CAP-01", code: "X", reasons: ["  "], httpStatus: 400 }));
  assert.throws(() => new ScsFailure({ capabilityId: "SCS-CAP-01", code: "X", reasons: ["r"], httpStatus: 200 }));
  assert.throws(() => new ScsFailure({ capabilityId: "SCS-CAP-01", code: "X", reasons: ["r"], httpStatus: 600 }));
});

test("unexpected errors become INTERNAL_ERROR without leaking the original message", () => {
  const failure = asScsFailure(new Error("password=hunter2 at db.ts:42"), "SCS-CAP-02");
  assert.equal(failure.code, "INTERNAL_ERROR");
  assert.equal(failure.httpStatus, 500);
  assert.equal(failure.capabilityId, "SCS-CAP-02");
  assert.ok(!failure.reasons.join(" ").includes("hunter2"));
});

test("an existing ScsFailure passes through asScsFailure unchanged", () => {
  const original = platformFailure("UNAUTHENTICATED", ["missing bearer token"]);
  assert.equal(asScsFailure(original), original);
});

test("platform codes carry fixed statuses and SCS-PLATFORM noWrites", () => {
  assert.equal(platformFailure("IDEMPOTENCY_KEY_CONFLICT", ["x"]).httpStatus, 409);
  assert.equal(platformFailure("UNAUTHENTICATED", ["x"]).httpStatus, 401);
  assert.equal(platformFailure("ROUTE_NOT_FOUND", ["x"]).httpStatus, 404);
  assert.equal(toEnvelope(platformFailure("MALFORMED_JSON", ["x"]), "corr-12345678").noWrites, true);
});
