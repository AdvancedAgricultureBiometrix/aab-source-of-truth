// Canonical JSON and SHA-256.
//
// Receipts, request digests and idempotency fingerprints are hashes of JSON.
// The same content must always hash to the same value, whatever order a
// client sent its keys in, so everything is hashed in canonical form:
// object keys sorted by code point, no whitespace, standard JSON escaping.
// Values that JSON cannot represent faithfully are refused rather than
// silently changed (undefined, functions, symbols, bigint, NaN, ±Infinity,
// and objects that are not plain objects or arrays).

import { createHash } from "node:crypto";

export function canonicalJson(value: unknown): string {
  return encode(value, "$");
}

function encode(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new TypeError(`canonicalJson: ${path} is not a finite number`);
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((item, i) => encode(item, `${path}[${i}]`)).join(",")}]`;
      }
      const proto = Object.getPrototypeOf(value) as unknown;
      if (proto !== Object.prototype && proto !== null) {
        throw new TypeError(`canonicalJson: ${path} is not a plain object`);
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${encode(record[k], `${path}.${k}`)}`).join(",")}}`;
    }
    default:
      throw new TypeError(`canonicalJson: ${path} has unsupported type ${typeof value}`);
  }
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** SHA-256 of the canonical JSON of a value. */
export function digest(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}
