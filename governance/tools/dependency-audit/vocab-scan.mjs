#!/usr/bin/env node
// Searches platform-side source, and the platform's database files, for SCS domain vocabulary,
// ignoring comments.
//
// Usage, from the repository root:
//   node governance/tools/dependency-audit/vocab-scan.mjs [srcRoot] [dbRoot]
// srcRoot defaults to scs-pilot/packages/api/src; dbRoot to srcRoot/../../db.
//
// Platform-side means the PLATFORM area of lib.mjs: foundation/, platform/, ops/, migrations/,
// reference/, types/shared.ts, types/platform.ts, types/key-registry.ts, schemas/shared/,
// schemas/platform/ and vendor.d.ts. Production and test files are reported separately.
//
// DOMAIN_TABLE (added by the audit's amendment 1, 2026-09-30): every SCS domain table, as the
// current-state schema files db/schema/cap-*.sql define them, is searched for by name, with or
// without the `scs.` prefix, in platform-side source and in the platform's database files:
// db/schema/platform.sql, db/schema/key-registry.sql, db/schema/roles-rls.sql and every
// db/migrations/*_platform_*.sql. Those rows are reported as "database".
//
// Prints tab-separated lines, sorted: production, test or database; term; file:line; the matched text.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { listFiles, stripComments, lineOf, areaOf, isTest, readText, cmp } from "./lib.mjs";

const root = process.argv[2] ?? "scs-pilot/packages/api/src";
const dbRoot = process.argv[3] ?? join(root, "..", "..", "db");

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

// SQL comments: `--` to the end of the line, and /* … */. Newlines are kept, so line numbers are unchanged.
function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/--[^\n]*/g, (c) => " ".repeat(c.length));
}

// The SCS domain tables: every table the capability schema files create.
const domainTables = [];
const haveDb = existsSync(join(dbRoot, "schema"));
if (haveDb) {
  for (const f of listFiles(join(dbRoot, "schema"))) {
    if (!/^cap-\d+\.sql$/.test(f)) continue;
    const sql = stripSqlComments(readText(join(dbRoot, "schema"), f));
    for (const m of sql.matchAll(/CREATE TABLE\s+scs\.([a-z_]+)/g)) domainTables.push(m[1]);
  }
}
domainTables.sort(cmp);
// A domain table's name, whole, with or without `scs.` before it.
const DOMAIN_TABLE = domainTables.length
  ? new RegExp(`(?<![\\w.])(?:scs\\.)?(?:${domainTables.join("|")})(?![\\w])`, "g")
  : null;

const rows = [];
const scan = (kind, path, text, terms) => {
  for (const [term, re] of terms) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) rows.push([kind, term, `${path}:${lineOf(text, m.index)}`, m[0]]);
  }
};

for (const path of listFiles(root)) {
  if (!/\.(ts|mts|mjs|json)$/.test(path)) continue;
  if (areaOf(path) !== "PLATFORM") continue;
  const raw = readText(root, path);
  const text = path.endsWith(".json") ? raw : stripComments(raw);
  scan(isTest(path) ? "test" : "production", path, text, DOMAIN_TABLE ? [...TERMS, ["DOMAIN_TABLE", DOMAIN_TABLE]] : TERMS);
}

if (DOMAIN_TABLE) {
  const dbFiles = [
    ...["platform.sql", "key-registry.sql", "roles-rls.sql"].filter((f) => existsSync(join(dbRoot, "schema", f))).map((f) => `schema/${f}`),
    ...listFiles(join(dbRoot, "migrations")).filter((f) => /_platform_.*\.sql$/.test(f)).map((f) => `migrations/${f}`),
  ];
  for (const f of dbFiles) scan("database", `db/${f}`, stripSqlComments(readText(dbRoot, f)), [["DOMAIN_TABLE", DOMAIN_TABLE]]);
}

// Sorted by kind, term, file, then line number.
const fileOf = (loc) => loc.slice(0, loc.lastIndexOf(":"));
const lineOfLoc = (loc) => Number(loc.slice(loc.lastIndexOf(":") + 1));
rows.sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]) || cmp(fileOf(a[2]), fileOf(b[2])) || lineOfLoc(a[2]) - lineOfLoc(b[2]) || cmp(a[3], b[3]));
for (const r of rows) console.log(r.join("\t"));
const summary = {};
for (const r of rows) summary[`${r[0]} ${r[1]}`] = (summary[`${r[0]} ${r[1]}`] ?? 0) + 1;
console.log("");
console.log("# counts");
for (const [k, v] of Object.entries(summary).sort((a, b) => cmp(a[0], b[0]))) console.log(`${k}\t${v}`);
console.log("");
console.log(haveDb ? `# SCS domain tables searched (from db/schema/cap-*.sql): ${domainTables.length}` : "# database files not found: DOMAIN_TABLE not searched");
