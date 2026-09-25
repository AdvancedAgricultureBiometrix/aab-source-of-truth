import { test } from "node:test";
import assert from "node:assert/strict";

import iso from "./iso-3166-1-alpha-2.json" with { type: "json" };
import { isIso3166Alpha2 } from "./countries.js";

test("reference list: 249 distinct, sorted, two-letter uppercase codes", () => {
  assert.equal(iso.codes.length, 249);
  assert.equal(new Set(iso.codes).size, 249);
  assert.deepEqual([...iso.codes].sort(), iso.codes);
  for (const c of iso.codes) assert.match(c, /^[A-Z]{2}$/);
});

test("officially assigned codes are recognised", () => {
  for (const c of ["TH", "LA", "MY", "ID", "VN", "DE", "US", "GB", "AX", "SS", "BQ"]) assert.ok(isIso3166Alpha2(c), c);
});

test("user-assigned, reserved, lowercase, alpha-3 and names are not", () => {
  for (const c of ["XK", "XX", "ZZ", "EU", "UK", "AA", "QM", "th", "Th", "THA", "Thailand", "", " TH"]) assert.ok(!isIso3166Alpha2(c), JSON.stringify(c));
});
