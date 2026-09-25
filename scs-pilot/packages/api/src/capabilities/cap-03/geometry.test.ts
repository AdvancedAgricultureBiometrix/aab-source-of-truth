import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_RING_POSITIONS, validateGeometry } from "./geometry.js";

const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const BOWTIE = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]];

test("valid POINT, POLYGON (with a hole), MULTIPOLYGON", () => {
  assert.deepEqual(validateGeometry("POINT", [101.5, 13.5], undefined), []);
  assert.deepEqual(validateGeometry("POINT", [101.5, 13.5, 12.3], 2.5), [], "altitude ignored");
  const hole = [[101.5002, 13.5002], [101.5004, 13.5002], [101.5004, 13.5004], [101.5002, 13.5002]];
  assert.deepEqual(validateGeometry("POLYGON", [SQUARE, hole], 1.2), []);
  assert.deepEqual(validateGeometry("MULTIPOLYGON", [[SQUARE], [SQUARE.map(([x, y]) => [x! + 1, y!])]], 2.4), []);
});

test("a point: more than 4 ha refused; exactly 4 accepted", () => {
  assert.deepEqual(validateGeometry("POINT", [101.5, 13.5], 4), []);
  assert.match(validateGeometry("POINT", [101.5, 13.5], 4.5)[0]!, /at most 4 hectares \(EUDR Article 2\(28\)\)/);
});

test("a polygon or multipolygon without a declared area is refused", () => {
  assert.deepEqual(validateGeometry("POLYGON", [SQUARE], undefined), ["/plot/geometry/areaHectares: required for a POLYGON."]);
  assert.deepEqual(validateGeometry("MULTIPOLYGON", [[SQUARE]], undefined), ["/plot/geometry/areaHectares: required for a MULTIPOLYGON."]);
});

test("positions: shape, finite numbers, longitude and latitude ranges", () => {
  assert.match(validateGeometry("POINT", [101.5], undefined)[0]!, /\[longitude, latitude\]/);
  assert.match(validateGeometry("POINT", ["101.5", 13.5], undefined)[0]!, /finite numbers/);
  assert.match(validateGeometry("POINT", [181, 13.5], undefined)[0]!, /longitude 181 is outside/);
  assert.match(validateGeometry("POINT", [101.5, -91], undefined)[0]!, /latitude -91 is outside/);
  assert.match(validateGeometry("POINT", { type: "Point" }, undefined)[0]!, /a position must be/);
});

test("rings: at least 4 positions, closed, not self-intersecting", () => {
  assert.match(validateGeometry("POLYGON", [SQUARE.slice(0, 3)], 1)[0]!, /at least 4 positions \(it has 3\)/);
  assert.match(validateGeometry("POLYGON", [SQUARE.slice(0, 4)], 1)[0]!, /not closed/);
  assert.match(validateGeometry("POLYGON", [BOWTIE], 1)[0]!, /intersects itself/);
  // a ring that doubles back along its own edge also intersects itself
  const spike = [[0, 0], [2, 0], [1, 0], [1, 1], [0, 0]];
  assert.match(validateGeometry("POLYGON", [spike], 1)[0]!, /intersects itself/);
});

test("structure: empty polygon, empty multipolygon, non-array ring; problems name their JSON pointer", () => {
  assert.match(validateGeometry("POLYGON", [], 1)[0]!, /non-empty array of rings/);
  assert.match(validateGeometry("MULTIPOLYGON", [], 1)[0]!, /non-empty array of polygons/);
  assert.equal(validateGeometry("MULTIPOLYGON", [[SQUARE], [BOWTIE]], 1)[0]!.split(":")[0], "/plot/geometry/coordinates/1/0");
});

test("implementation limit: a ring over the position limit is refused, not checked slowly", () => {
  const big = Array.from({ length: MAX_RING_POSITIONS + 1 }, (_, i) => [i / 1e4, 0]);
  assert.match(validateGeometry("POLYGON", [big], 1)[0]!, /at most 1000 positions in the pilot/);
});

test("never throws on malformed input", () => {
  for (const bad of [null, 42, "x", [[null]], [[[null, null]]], [[[1, 2], "x"]]]) {
    assert.ok(Array.isArray(validateGeometry("POLYGON", bad, 1)));
    assert.ok(Array.isArray(validateGeometry("MULTIPOLYGON", bad, 1)));
    assert.ok(Array.isArray(validateGeometry("POINT", bad, undefined)));
  }
});
