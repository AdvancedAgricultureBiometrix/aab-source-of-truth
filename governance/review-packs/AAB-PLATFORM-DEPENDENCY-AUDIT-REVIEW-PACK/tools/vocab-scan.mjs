#!/usr/bin/env node
// Searches platform-side source for SCS domain vocabulary, ignoring comments.
//
// Usage, from the repository root:
//   node governance/tools/dependency-audit/vocab-scan.mjs [srcRoot]
//
// Platform-side means the PLATFORM area of lib.mjs: foundation/, platform/, ops/, migrations/,
// reference/, types/shared.ts, types/platform.ts, types/key-registry.ts, schemas/shared/,
// schemas/platform/ and vendor.d.ts. Production and test files are reported separately.
// Prints tab-separated lines, sorted: term, file:line, the matched text.

import { listFiles, stripComments, lineOf, areaOf, isTest, readText, cmp } from "./lib.mjs";

const root = process.argv[2] ?? "scs-pilot/packages/api/src";

// The audit's vocabulary: SCS identifiers, Scs names, scs tables and roles, SCS names in platform
// interfaces, and supply-chain domain words.
const TERMS = [
  ["SCS_CAPABILITY_ID", /SCS-CAP-\d+/g],
  ["SCS_PLATFORM_ID", /SCS-PLATFORM(?:-\d+)?/g],
  ["SCS_PILOT_SCOPE", /SCS-PILOT/g],
  ["SCS_TYPE_NAME", /\bScs[A-Z]\w*/g],
  ["SCS_TABLE", /\bscs\.[a-z_]+/g],
  ["SCS_DB_NAME", /\bscs_[a-z_]+/g],
  ["SCS_SCHEMA_URN", /urn:aab:scs:[\w:.-]*/g],
  ["SCS_ROUTE", /\/scs\/v1\b[\w/:.-]*/g],
  ["SCS_ENV", /\bSCS_[A-Z_]+/g],
  ["SCS_SCHEMA_NAME", /(["'])scs\1/g],
  ["DOMAIN_WORD", /\b(?:EUDR|deforestation|custody|dueDiligence|due_diligence|overallState|sufficiency|CONFLICT_RESOLVER|REGULATORY_REVIEWER)\b/gi],
];

const rows = [];
for (const path of listFiles(root)) {
  if (!/\.(ts|mts|mjs|json)$/.test(path)) continue;
  if (areaOf(path) !== "PLATFORM") continue;
  const raw = readText(root, path);
  const text = path.endsWith(".json") ? raw : stripComments(raw);
  for (const [term, re] of TERMS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      rows.push([isTest(path) ? "test" : "production", term, `${path}:${lineOf(text, m.index)}`, m[0]]);
    }
  }
}

// Sorted by production or test, term, file, then line number.
const fileOf = (loc) => loc.slice(0, loc.lastIndexOf(":"));
const lineOfLoc = (loc) => Number(loc.slice(loc.lastIndexOf(":") + 1));
rows.sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]) || cmp(fileOf(a[2]), fileOf(b[2])) || lineOfLoc(a[2]) - lineOfLoc(b[2]) || cmp(a[3], b[3]));
for (const r of rows) console.log(r.join("\t"));
const summary = {};
for (const r of rows) summary[`${r[0]} ${r[1]}`] = (summary[`${r[0]} ${r[1]}`] ?? 0) + 1;
console.log("");
console.log("# counts");
for (const [k, v] of Object.entries(summary).sort((a, b) => cmp(a[0], b[0]))) console.log(`${k}\t${v}`);
