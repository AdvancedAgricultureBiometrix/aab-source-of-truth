// ISO 3166-1 alpha-2 country codes (officially assigned), from the reference
// data file beside this module. See its $comment for source and exclusions.

import iso from "./iso-3166-1-alpha-2.json" with { type: "json" };

const CODES: ReadonlySet<string> = new Set(iso.codes);

if (CODES.size !== iso.count) {
  throw new Error(`iso-3166-1-alpha-2.json: count ${iso.count} does not match ${CODES.size} distinct codes`);
}

/** True only for an officially assigned ISO 3166-1 alpha-2 code, exactly as written (uppercase). */
export function isIso3166Alpha2(code: string): boolean {
  return CODES.has(code);
}
