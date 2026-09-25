import { test } from "node:test";
import assert from "node:assert/strict";

import { runWithCorrelation } from "./correlation.js";
import { validate, type JsonSchema } from "./validation.js";

const schema: JsonSchema = {
  $id: "urn:scs:test:validation:thing",
  type: "object",
  additionalProperties: false,
  required: ["id", "kind", "count", "on"],
  properties: {
    id: { type: "string", format: "uuid" },
    kind: { enum: ["A", "B"] },
    count: { type: "integer", minimum: 0 },
    on: { type: "string", format: "date" },
  },
};

type Thing = { id: string; kind: "A" | "B"; count: number; on: string };

const good: Thing = { id: "6f1d2c3a-0b7e-4f5a-9c1d-2e3f4a5b6c7d", kind: "A", count: 2, on: "2026-09-24" };

test("a valid value passes through unchanged", () =>
  runWithCorrelation("req-valid001", () => {
    const result = validate<Thing, "SCS-CAP-01">("SCS-CAP-01", schema, good);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value, good);
  }));

test("every problem is reported in the canonical envelope; no coercion; unknown fields rejected", () =>
  runWithCorrelation("req-invalid1", () => {
    const result = validate<Thing, "SCS-CAP-01">("SCS-CAP-01", schema, {
      id: "not-a-uuid",
      kind: "C",
      count: "5",
      on: "24/09/2026",
      extra: 1,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.failure.httpStatus, 400);
    assert.equal(result.envelope.ok, false);
    assert.equal(result.envelope.result, "FAIL_CLOSED");
    assert.equal(result.envelope.error, "REQUEST_VALIDATION_FAILED");
    assert.equal(result.envelope.capabilityId, "SCS-CAP-01");
    assert.equal(result.envelope.correlationId, "req-invalid1");
    assert.equal(result.envelope.noFrameworkRegistered, true);
    const text = result.envelope.reasons.join("\n");
    for (const expected of [
      '(root): unknown property "extra" is not allowed',
      '/id: must match format "uuid"',
      '/kind: must be one of ["A","B"]',
      "/count: must be integer",
      '/on: must match format "date"',
    ]) {
      assert.ok(text.includes(expected), `missing: ${expected}\n${text}`);
    }
  }));

test("a missing required property is named", () =>
  runWithCorrelation("req-invalid2", () => {
    const result = validate("SCS-CAP-01", schema, { kind: "A", count: 1, on: "2026-01-01" });
    assert.ok(!result.ok);
    assert.ok(!result.ok && result.envelope.reasons.includes('(root): missing required property "id"'));
  }));

test("reasons are capped at 50 with a count of the rest", () =>
  runWithCorrelation("req-invalid3", () => {
    const empty: JsonSchema = { $id: "urn:scs:test:validation:empty", type: "object", additionalProperties: false, properties: {} };
    const result = validate("SCS-CAP-01", empty, Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k${i}`, i])));
    assert.ok(!result.ok);
    if (result.ok) return;
    assert.equal(result.envelope.reasons.length, 51);
    assert.equal(result.envelope.reasons[50], "…and 30 more validation errors");
  }));

test("reusing a schema $id with different content is refused", () =>
  runWithCorrelation("req-schema01", () => {
    validate("SCS-CAP-01", schema, good);
    assert.throws(() => validate("SCS-CAP-01", { ...schema, required: ["id"] }, good), /already compiled with different content/);
  }));

test("strict mode refuses a schema with an unknown keyword", () =>
  runWithCorrelation("req-schema02", () => {
    assert.throws(() => validate("SCS-CAP-01", { $id: "urn:scs:test:validation:bad", type: "object", notAKeyword: true }, {}), /strict mode/);
  }));

test("validation outside a request context fails loudly", () => {
  assert.throws(() => validate("SCS-CAP-01", schema, {}), /No correlation context/);
});
