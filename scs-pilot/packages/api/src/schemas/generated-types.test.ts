// src/types/ is generated from src/schemas/ and never hand-written. This test
// fails if a generated file was edited, or a schema changed without
// regenerating (npm run generate:types).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// @ts-expect-error — plain ESM script without type declarations
import { generate } from "../../scripts/generate-types.mjs";

test("generated types match the schemas exactly", async () => {
  const outputs = (await generate()) as Record<string, string>;
  assert.deepEqual(Object.keys(outputs).sort(), ["cap-01.ts", "cap-02.ts", "cap-03.ts", "shared.ts"]);
  for (const [file, expected] of Object.entries(outputs)) {
    const actual = await readFile(new URL(`../types/${file}`, import.meta.url), "utf8");
    assert.equal(actual, expected, `src/types/${file} is out of date or was edited by hand — run npm run generate:types`);
  }
});

test("every schema is registered and compiles in strict mode", async () => {
  const { SCHEMAS } = await import("./registry.js");
  const { runWithCorrelation } = await import("../foundation/correlation.js");
  const { validate } = await import("../foundation/validation.js");
  for (const schema of Object.values(SCHEMAS)) {
    runWithCorrelation("schema-compile-check", () => validate("SCS-PLATFORM", schema, null));
  }
});
