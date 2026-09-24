// Every UUID a client sends in a request body must be in lowercase canonical
// form. Otherwise "abc…" and "ABC…" pass uniqueItems as different strings but
// are the same uuid in PostgreSQL, so a duplicate would reach a unique
// constraint and surface as a 500 instead of a 400. This test fails if any
// request schema, now or later, declares a uuid without the lowercase pattern.

import { test } from "node:test";
import assert from "node:assert/strict";

import { SCHEMAS } from "./registry.js";

export const LOWERCASE_UUID_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

/** JSON pointers of every subschema with format "uuid". */
function uuidNodes(node: unknown, at = ""): Array<{ at: string; node: Record<string, unknown> }> {
  if (node === null || typeof node !== "object") return [];
  const found: Array<{ at: string; node: Record<string, unknown> }> = [];
  const obj = node as Record<string, unknown>;
  if (obj["format"] === "uuid") found.push({ at: at || "/", node: obj });
  for (const [k, v] of Object.entries(obj)) found.push(...uuidNodes(v, `${at}/${k}`));
  return found;
}

const requestSchemas = Object.values(SCHEMAS).filter((s) => /-request:\d+$/.test(String(s.$id)));

test("there are request schemas to check", () => {
  assert.ok(requestSchemas.length >= 3, requestSchemas.map((s) => s.$id).join(", "));
});

test("every uuid in a request body schema requires lowercase canonical form", () => {
  const missing = requestSchemas.flatMap((s) =>
    uuidNodes(s).filter((u) => u.node["pattern"] !== LOWERCASE_UUID_PATTERN).map((u) => `${String(s.$id)}#${u.at}`),
  );
  assert.deepEqual(missing, []);
});

test("the pattern accepts lowercase and rejects upper or mixed case", () => {
  const re = new RegExp(LOWERCASE_UUID_PATTERN);
  assert.ok(re.test("3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c"));
  assert.ok(!re.test("3F2B8C1E-9D4A-4E6B-8A1C-2D3E4F5A6B7C"));
  assert.ok(!re.test("3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6B7c"));
  assert.ok(!re.test("{3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c}"));
});
