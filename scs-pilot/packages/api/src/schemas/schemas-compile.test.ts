// Every registered schema compiles under Ajv strict mode. Schemas compile
// lazily, on first use, so a strict-mode error (an unknown keyword, a
// conditionally required property not declared in its subschema) would
// otherwise surface only as a 500 on the first request to its route.

import { test } from "node:test";
import assert from "node:assert/strict";

import { runWithCorrelation } from "../foundation/correlation.js";
import { validate } from "../foundation/validation.js";
import { SCHEMAS } from "./registry.js";

test("every registered schema compiles in strict mode", () => {
  const failures: string[] = [];
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    try {
      runWithCorrelation("schemas-compile-test", () => validate("SCS-CAP-01", schema, {}));
    } catch (e) {
      failures.push(`${name} (${String(schema.$id)}): ${(e as Error).message}`);
    }
  }
  assert.deepEqual(failures, []);
  assert.ok(Object.keys(SCHEMAS).length >= 20, `expected the full registry, found ${Object.keys(SCHEMAS).length}`);
});
