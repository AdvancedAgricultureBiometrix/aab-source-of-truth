// Shared helpers for the platform dependency audit tools.
// Node built-ins only. Deterministic: every list is sorted, and nothing depends on the clock or the machine.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep, posix, dirname } from "node:path";

// Every file under root, as POSIX paths relative to root, sorted.
export function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(root, full).split(sep).join("/"));
    }
  };
  walk(root);
  return out.sort();
}

// Replaces comments with spaces, keeping every newline, so offsets and line numbers are unchanged.
// String and template literals are kept. Template substitutions are scanned as code, one level deep.
export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let mode = "code"; // code | line | block | sq | dq | tpl
  let tplDepth = 0;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === "code") {
      if (c === "/" && d === "/") { mode = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && d === "*") { mode = "block"; out += "  "; i += 2; continue; }
      if (c === "'") mode = "sq";
      else if (c === '"') mode = "dq";
      else if (c === "`") mode = "tpl";
      else if (c === "}" && tplDepth > 0) { tplDepth--; mode = "tpl"; }
      out += c; i++; continue;
    }
    if (mode === "line") {
      if (c === "\n") { mode = "code"; out += c; } else out += " ";
      i++; continue;
    }
    if (mode === "block") {
      if (c === "*" && d === "/") { mode = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i++; continue;
    }
    // inside a string or template
    if (c === "\\") { out += c + (d ?? ""); i += 2; continue; }
    if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) { mode = "code"; out += c; i++; continue; }
    if (mode === "tpl" && c === "$" && d === "{") { tplDepth++; mode = "code"; out += "${"; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

// Plain code-point comparison: the same order on every machine and in every locale.
export function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// The audit's categories, by path. The path is relative to scs-pilot/packages/api/src.
export function areaOf(path) {
  const top = path.split("/")[0];
  if (path === "index.ts") return "COMPOSITION_ROOT";
  if (path === "capabilities/index.ts") return "COMPOSITION_ROOT_SCS";
  if (path === "vendor.d.ts") return "PLATFORM";
  if (["foundation", "platform", "ops", "migrations", "reference"].includes(top)) return "PLATFORM";
  if (top === "capabilities") return "DOMAIN_SCS";
  if (top === "integration") return "TEST_INFRASTRUCTURE";
  if (top === "types") return /^types\/cap-\d+\.ts$/.test(path) ? "DOMAIN_SCS" : "PLATFORM";
  if (top === "schemas") {
    if (path === "schemas/registry.ts") return "MIXED_REGISTRY";
    if (/^schemas\/cap-\d+\//.test(path)) return "DOMAIN_SCS";
    if (/^schemas\/(shared|platform)\//.test(path)) return "PLATFORM";
    return "PLATFORM";
  }
  return "UNCLASSIFIED";
}

export function isTest(path) {
  return /\.test\.ts$/.test(path);
}

// Resolves a relative specifier from a source file to a path relative to root, or null if it is not relative.
// TypeScript sources import siblings with a .js extension; the file on disk is .ts.
export function resolveSpecifier(fromPath, spec, files) {
  if (!spec.startsWith(".")) return null;
  const joined = posix.normalize(posix.join(posix.dirname(fromPath), spec));
  if (joined.startsWith("../")) return { outside: joined }; // a file outside the audited root, such as a build script
  const candidates = [joined];
  if (joined.endsWith(".js")) candidates.push(joined.slice(0, -3) + ".ts");
  if (!/\.[a-z]+$/.test(joined)) candidates.push(joined + ".ts", joined + "/index.ts");
  for (const c of candidates) if (files.has(c)) return c;
  return { unresolved: joined };
}

export function readText(root, path) {
  return readFileSync(join(root, path), "utf8");
}

export { dirname };
