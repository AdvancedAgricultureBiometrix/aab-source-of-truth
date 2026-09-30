#!/usr/bin/env node
// Reads a graph from import-graph.mjs and prints every edge that crosses the platform–domain boundary.
//
// Usage, from the repository root:
//   node governance/tools/dependency-audit/boundary-edges.mjs graph.json
//
// Prints, as tab-separated lines, sorted:
//   PLATFORM->DOMAIN     platform code importing SCS domain code (a violation unless recorded otherwise)
//   PLATFORM->REGISTRY   platform code importing the mixed schema registry, and so every SCS schema
//   TEST-PLATFORM->…     the same, from platform unit tests
// and then counts of the permitted directions, for completeness.

import { readFileSync } from "node:fs";
import { cmp } from "./lib.mjs";

const graph = JSON.parse(readFileSync(process.argv[2] ?? "graph.json", "utf8"));
const areaOf = new Map(graph.nodes.map((n) => [n.path, n]));

const rows = [];
const permitted = {};
for (const e of graph.edges) {
  if (e.external) continue;
  const from = areaOf.get(e.from);
  const fromArea = from.area;
  const toArea = e.toArea;
  const prefix = from.test ? "TEST-" : "";
  if (fromArea === "PLATFORM" && toArea === "DOMAIN_SCS") rows.push([`${prefix}PLATFORM->DOMAIN`, `${e.from}:${e.line}`, e.to, e.kind]);
  else if (fromArea === "PLATFORM" && toArea === "MIXED_REGISTRY") rows.push([`${prefix}PLATFORM->REGISTRY`, `${e.from}:${e.line}`, e.to, e.kind]);
  else {
    const k = `${prefix}${fromArea}->${toArea}`;
    permitted[k] = (permitted[k] ?? 0) + 1;
  }
}

// Sorted by kind, then file, then line number.
const fileOf = (loc) => loc.slice(0, loc.lastIndexOf(":"));
const lineOfLoc = (loc) => Number(loc.slice(loc.lastIndexOf(":") + 1));
rows.sort((a, b) => cmp(a[0], b[0]) || cmp(fileOf(a[1]), fileOf(b[1])) || lineOfLoc(a[1]) - lineOfLoc(b[1]));
for (const r of rows) console.log(r.join("\t"));
console.log("");
console.log("# other internal edges, by direction (not boundary crossings from the platform side)");
for (const [k, v] of Object.entries(permitted).sort((a, b) => cmp(a[0], b[0]))) console.log(`${k}\t${v}`);
if (graph.unresolved.length) {
  console.log("");
  console.log("# UNRESOLVED specifiers (must be zero)");
  for (const u of graph.unresolved) console.log(`${u.from}:${u.line}\t${u.spec}`);
}
