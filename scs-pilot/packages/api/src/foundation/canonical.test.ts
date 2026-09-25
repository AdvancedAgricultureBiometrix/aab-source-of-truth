import { test } from "node:test";
import assert from "node:assert/strict";

import { canonicalJson, digest, sha256Hex } from "./canonical.js";

test("keys are sorted at every depth; no whitespace", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } }), '{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}');
});

test("the same content in a different key order has the same digest", () => {
  assert.equal(digest({ method: "POST", body: { x: 1, y: [1, 2] } }), digest({ body: { y: [1, 2], x: 1 }, method: "POST" }));
  assert.notEqual(digest({ y: [1, 2] }), digest({ y: [2, 1] }), "array order matters");
});

test("strings use standard JSON escaping", () => {
  assert.equal(canonicalJson('quote " and \n newline, ünïcode'), JSON.stringify('quote " and \n newline, ünïcode'));
});

test("values JSON cannot represent faithfully are refused, with their path", () => {
  assert.throws(() => canonicalJson({ a: undefined }), /\$\.a has unsupported type undefined/);
  assert.throws(() => canonicalJson({ a: [1, Number.NaN] }), /\$\.a\[1\] is not a finite number/);
  assert.throws(() => canonicalJson({ a: Infinity }), /not a finite number/);
  assert.throws(() => canonicalJson({ d: new Date(0) }), /\$\.d is not a plain object/);
  assert.throws(() => canonicalJson({ n: 10n }), /unsupported type bigint/);
  assert.throws(() => canonicalJson(() => 1), /unsupported type function/);
});

test("sha256Hex matches the known digest of the empty string", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});
