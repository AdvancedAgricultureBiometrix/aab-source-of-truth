import { test } from "node:test";
import assert from "node:assert/strict";

import { withDatabaseErrors } from "./db-errors.js";
import { ScsFailure } from "./errors.js";

const pgError = (code: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(`pg ${code}`), { code, ...extra });
const failWith = (err: unknown) => () => Promise.reject(err);

test("connection loss, shutdown, resource exhaustion and timeouts → DEPENDENCY_UNAVAILABLE (503)", async () => {
  for (const code of ["08006", "08003", "57P01", "53300", "57014"]) {
    await assert.rejects(withDatabaseErrors("SCS-CAP-01", failWith(pgError(code))), (e: unknown) => {
      assert.ok(e instanceof ScsFailure, code);
      assert.equal(e.code, "DEPENDENCY_UNAVAILABLE");
      assert.equal(e.httpStatus, 503);
      assert.equal(e.capabilityId, "SCS-CAP-01");
      return true;
    });
  }
});

test("an integrity constraint violation → INTERNAL_ERROR (500) naming the constraint, not the data", async () => {
  await assert.rejects(
    withDatabaseErrors("SCS-CAP-02", failWith(pgError("23514", { constraint: "party_identity_version_positive_ck", detail: "Failing row contains (secret)" }))),
    (e: unknown) => {
      assert.ok(e instanceof ScsFailure);
      assert.equal(e.code, "INTERNAL_ERROR");
      assert.equal(e.httpStatus, 500);
      assert.deepEqual(e.reasons, ["A database constraint rejected the write (party_identity_version_positive_ck); nothing was recorded."]);
      assert.ok(!e.reasons.join(" ").includes("secret"));
      return true;
    },
  );
});

test("ScsFailures pass through unchanged; other errors are rethrown untouched", async () => {
  const failure = new ScsFailure({ capabilityId: "SCS-CAP-01", code: "REGISTRANT_NOT_AUTHORISED", reasons: ["x"], httpStatus: 403 });
  await assert.rejects(withDatabaseErrors("SCS-CAP-01", failWith(failure)), (e: unknown) => e === failure);
  const other = pgError("42P01");
  await assert.rejects(withDatabaseErrors("SCS-CAP-01", failWith(other)), (e: unknown) => e === other);
  assert.equal(await withDatabaseErrors("SCS-CAP-01", async () => 42), 42);
});
