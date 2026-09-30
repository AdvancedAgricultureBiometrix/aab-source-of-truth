#!/usr/bin/env node
// The import graph of scs-pilot/packages/api/src, as JSON on stdout.
//
// Usage, from the repository root:
//   node governance/tools/dependency-audit/import-graph.mjs [srcRoot] > graph.json
// srcRoot defaults to scs-pilot/packages/api/src.
//
// Every static `import … from`, `export … from`, side-effect `import "…"` and dynamic `import("…")`
// with a literal specifier is recorded, with its line. Comments are ignored. Relative specifiers are
// resolved to files; anything else is recorded as an external package or a Node built-in.
// Node built-ins only; no dependencies to install.

import { listFiles, stripComments, lineOf, areaOf, isTest, resolveSpecifier, readText, cmp } from "./lib.mjs";

const root = process.argv[2] ?? "scs-pilot/packages/api/src";
const all = listFiles(root);
const fileSet = new Set(all);
const sources = all.filter((p) => /\.(ts|mts|mjs)$/.test(p));

const PATTERNS = [
  // An import or export clause never contains a semicolon, so the match cannot run past its statement.
  { kind: "static", re: /\b(?:import|export)\s+(?:type\s+)?[^;]*?\bfrom\s*(["'])([^"']+)\1/g },
  { kind: "side-effect", re: /\bimport\s*(["'])([^"']+)\1/g },
  { kind: "dynamic", re: /\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g },
];

const nodes = [];
const edges = [];
const unresolved = [];

for (const path of sources) {
  const text = stripComments(readText(root, path));
  nodes.push({ path, area: areaOf(path), test: isTest(path) });
  const seen = new Set();
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const spec = m[2];
      const at = m.index + m[0].lastIndexOf(spec);
      const line = lineOf(text, at);
      const key = `${line}:${spec}`;
      if (seen.has(key)) continue; // a static import is also matched by nothing else; guard anyway
      seen.add(key);
      const resolved = resolveSpecifier(path, spec, fileSet);
      if (resolved === null) {
        edges.push({ from: path, line, kind, external: spec.startsWith("node:") ? "node-builtin" : "package", to: spec });
      } else if (resolved.outside) {
        edges.push({ from: path, line, kind, external: "outside-root", to: resolved.outside });
      } else if (resolved.unresolved) {
        unresolved.push({ from: path, line, spec, tried: resolved.unresolved });
      } else {
        edges.push({ from: path, line, kind, external: null, to: resolved, toArea: areaOf(resolved) });
      }
    }
  }
}

edges.sort((a, b) => cmp(a.from, b.from) || a.line - b.line || cmp(a.to, b.to));

const counts = {};
for (const n of nodes) {
  const k = `${n.area}${n.test ? " (test)" : ""}`;
  counts[k] = (counts[k] ?? 0) + 1;
}

const out = {
  tool: "governance/tools/dependency-audit/import-graph.mjs",
  root,
  files: { all: all.length, sources: sources.length, tests: sources.filter(isTest).length, production: sources.filter((p) => !isTest(p)).length },
  countsByArea: Object.fromEntries(Object.entries(counts).sort((a, b) => cmp(a[0], b[0]))),
  nodes,
  edges,
  unresolved,
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
