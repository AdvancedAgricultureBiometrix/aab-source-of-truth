// Generates src/types/*.ts from the JSON Schemas in src/schemas/.
//
//   npm run generate:types           write the files
//   npm run generate:types -- --check  exit 1 if any file differs from what the
//                                      schemas produce (run by npm test)
//
// Types are never hand-written: edit the schema, then regenerate.
// Schemas reference each other by $id (urn:aab:scs:schema:…); those references
// are resolved to the local files here — nothing is fetched over the network.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { compile } from "json-schema-to-typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaDir = path.join(root, "src", "schemas");
const typesDir = path.join(root, "src", "types");

/**
 * Output files and the schemas each declares. Every schema is declared in
 * exactly one file; its type name is its "title".
 */
const TARGETS = [
  { out: "shared.ts", schemas: ["shared/actor-reference.schema.json", "shared/actor-reference-v1.schema.json", "shared/actor-reference-v2.schema.json"] },
  {
    out: "platform.ts",
    schemas: [
      "platform/evidence-object.schema.json",
      "platform/rendition-params.schema.json",
      "platform/subject-key.schema.json",
      "platform/actor-subject-link-actor.schema.json",
      "platform/actor-subject-link-statement.schema.json",
      "platform/actor-subject-link.schema.json",
      "platform/actor-subject-link-status-statement.schema.json",
      "platform/actor-subject-link-status-record.schema.json",
    ],
  },
  {
    out: "cap-01.ts",
    schemas: [
      "cap-01/framework-registration-request.schema.json",
      "cap-01/framework-registration-decision.schema.json",
      "cap-01/framework-registration-receipt.schema.json",
      "cap-01/framework-registration-response.schema.json",
    ],
  },
  {
    out: "cap-02.ts",
    schemas: [
      "cap-02/acting-under.schema.json",
      "cap-02/representation-checks.schema.json",
      "cap-02/party-registration-request.schema.json",
      "cap-02/party-registration-decision.schema.json",
      "cap-02/party-registration-receipt.schema.json",
      "cap-02/party-registration-response.schema.json",
      "cap-02/identity-evidence-submission-params.schema.json",
      "cap-02/identity-evidence-submission-request.schema.json",
      "cap-02/identity-evidence-submission-decision.schema.json",
      "cap-02/identity-evidence-submission-receipt.schema.json",
      "cap-02/identity-evidence-submission-response.schema.json",
      "cap-02/relationship-registration-request.schema.json",
      "cap-02/relationship-registration-decision.schema.json",
      "cap-02/relationship-registration-receipt.schema.json",
      "cap-02/relationship-registration-response.schema.json",
      "cap-02/mandate-registration-request.schema.json",
      "cap-02/mandate-registration-decision.schema.json",
      "cap-02/mandate-registration-receipt.schema.json",
      "cap-02/mandate-registration-response.schema.json",
      "cap-02/role-claim-params.schema.json",
      "cap-02/role-claim-request.schema.json",
      "cap-02/role-claim-decision.schema.json",
      "cap-02/role-claim-receipt.schema.json",
      "cap-02/role-claim-response.schema.json",
      "cap-02/verification-assessment-params.schema.json",
      "cap-02/verification-assessment-request.schema.json",
      "cap-02/verification-assessment-decision.schema.json",
      "cap-02/verification-assessment-receipt.schema.json",
      "cap-02/verification-assessment-response.schema.json",
      "cap-02/actor-party-link-params.schema.json",
      "cap-02/actor-party-link-request.schema.json",
      "cap-02/actor-party-link-decision.schema.json",
      "cap-02/actor-party-link-receipt.schema.json",
      "cap-02/actor-party-link-response.schema.json",
      "cap-02/actor-party-link-status-request.schema.json",
      "cap-02/actor-party-link-status-decision.schema.json",
      "cap-02/actor-party-link-status-receipt.schema.json",
      "cap-02/actor-party-link-status-response.schema.json",
      "cap-02/actor-party-link-read.schema.json",
      "cap-02/mandate-verification-params.schema.json",
      "cap-02/mandate-verification-request.schema.json",
      "cap-02/mandate-verification-decision.schema.json",
      "cap-02/mandate-verification-receipt.schema.json",
      "cap-02/mandate-verification-response.schema.json",
    ],
  },
  {
    out: "cap-03.ts",
    schemas: [
      "cap-03/plot-registration-request.schema.json",
      "cap-03/plot-registration-decision.schema.json",
      "cap-03/plot-registration-receipt.schema.json",
      "cap-03/plot-registration-response.schema.json",
    ],
  },
  {
    out: "cap-04.ts",
    schemas: [
      "cap-04/evidence-submission-request.schema.json",
      "cap-04/evidence-admission-decision.schema.json",
      "cap-04/evidence-admission-receipt.schema.json",
      "cap-04/evidence-admission-response.schema.json",
    ],
  },
  {
    out: "cap-05.ts",
    schemas: [
      "cap-05/custody-event-submission-request.schema.json",
      "cap-05/custody-event-admission-decision.schema.json",
      "cap-05/custody-event-admission-receipt.schema.json",
      "cap-05/custody-event-admission-response.schema.json",
    ],
  },
  {
    out: "cap-06.ts",
    schemas: [
      "cap-06/sufficiency-evaluation-request.schema.json",
      "cap-06/sufficiency-evaluation-result.schema.json",
      "cap-06/sufficiency-evaluation-receipt.schema.json",
      "cap-06/sufficiency-evaluation-response.schema.json",
      "cap-06/sufficiency-evaluation-params.schema.json",
      "cap-06/conflict-resolution-request.schema.json",
      "cap-06/conflict-resolution-record.schema.json",
      "cap-06/conflict-resolution-receipt.schema.json",
      "cap-06/conflict-resolution-response.schema.json",
    ],
  },
  {
    out: "cap-08.ts",
    schemas: [
      "cap-08/package-compilation-request.schema.json",
      "cap-08/due-diligence-package.schema.json",
      "cap-08/package-envelope.schema.json",
      "cap-08/package-compilation-record.schema.json",
      "cap-08/package-compilation-receipt.schema.json",
      "cap-08/package-compilation-response.schema.json",
      "cap-08/package-params.schema.json",
      "cap-08/package-read-result.schema.json",
      "cap-08/package-integrity-result.schema.json",
    ],
  },
  {
    out: "cap-09.ts",
    schemas: [
      "cap-09/review-decision-request.schema.json",
      "cap-09/review-decision.schema.json",
      "cap-09/review-decision-receipt.schema.json",
      "cap-09/review-decision-response.schema.json",
      "cap-09/currency-assessment.schema.json",
      "cap-09/review-decision-params.schema.json",
      "cap-09/currency-assessment-request.schema.json",
      "cap-09/recorded-decision.schema.json",
    ],
  },
];

const SCHEMA_FILES = TARGETS.flatMap((t) => t.schemas);

/**
 * In the generator's own copy of a schema, replace each $ref to ANOTHER schema
 * (by $id) with json-schema-to-typescript's tsType hint naming that schema's
 * type. The referenced type is declared once — in its own schema's output —
 * and imported when that is a different file. The schema files are untouched.
 */
function useNamedTypes(node, refs) {
  if (Array.isArray(node)) return node.map((n) => useNamedTypes(n, refs));
  if (node === null || typeof node !== "object") return node;
  if (typeof node.$ref === "string" && refs.has(node.$ref)) {
    const { $ref, ...rest } = node;
    refs.get($ref).used = true;
    return { ...rest, tsType: refs.get($ref).name };
  }
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, useNamedTypes(v, refs)]));
}

function banner(sources) {
  return [
    "/* eslint-disable */",
    "/**",
    " * GENERATED FILE — DO NOT EDIT BY HAND.",
    " * Generated by json-schema-to-typescript from:",
    ...sources.map((s) => ` *   src/schemas/${s}`),
    " * To change these types, edit the schema(s) above, then run:",
    " *   npm run generate:types",
    " * npm test fails if this file differs from what the schemas generate.",
    " */",
  ].join("\n");
}

async function loadSchemas() {
  const byId = new Map();
  const byFile = new Map();
  for (const file of SCHEMA_FILES) {
    const schema = JSON.parse(await readFile(path.join(schemaDir, file), "utf8"));
    if (typeof schema.$id !== "string") throw new Error(`${file} has no $id`);
    byId.set(schema.$id, schema);
    byFile.set(file, schema);
  }
  return { byId, byFile };
}

/** Returns { "shared.ts": "…", "cap-01.ts": "…" } — the exact file contents. */
export async function generate() {
  const { byId, byFile } = await loadSchemas();
  const urnResolver = {
    order: 1,
    canRead: /^urn:aab:scs:schema:/,
    read: (file) => {
      const schema = byId.get(file.url);
      if (!schema) throw new Error(`unresolved schema reference ${file.url}`);
      return JSON.stringify(schema);
    },
  };

  const home = new Map(); // $id → { name, out }
  for (const target of TARGETS) {
    for (const file of target.schemas) {
      const schema = byFile.get(file);
      if (typeof schema.title !== "string") throw new Error(`${file} has no title`);
      home.set(schema.$id, { name: schema.title, out: target.out });
    }
  }

  const outputs = {};
  for (const target of TARGETS) {
    const parts = [];
    const imported = new Map(); // out file → Set of names
    for (const file of target.schemas) {
      const self = byFile.get(file).$id;
      const refs = new Map([...home].filter(([id]) => id !== self).map(([id, h]) => [id, { ...h, used: false }]));
      const prepared = useNamedTypes(structuredClone(byFile.get(file)), refs);
      for (const r of refs.values()) {
        if (r.used && r.out !== target.out) {
          if (!imported.has(r.out)) imported.set(r.out, new Set());
          imported.get(r.out).add(r.name);
        }
      }
      const ts = await compile(prepared, "", {
        bannerComment: "",
        cwd: schemaDir,
        declareExternallyReferenced: true,
        ignoreMinAndMaxItems: true,
        strictIndexSignatures: true,
        additionalProperties: false,
        unknownAny: true,
        format: true,
        $refOptions: { resolve: { urn: urnResolver, http: false, file: false } },
      });
      parts.push(ts.trim());
    }
    const imports = [...imported].map(([out, names]) => `import type { ${[...names].sort().join(", ")} } from "./${out.replace(/\.ts$/, ".js")}";`);
    outputs[target.out] = [banner(target.schemas), ...(imports.length ? [imports.join("\n")] : []), ...parts].join("\n\n") + "\n";
  }
  return outputs;
}

async function main() {
  const check = process.argv.includes("--check");
  const outputs = await generate();
  const stale = [];
  for (const [file, content] of Object.entries(outputs)) {
    const target = path.join(typesDir, file);
    if (check) {
      const current = await readFile(target, "utf8").catch(() => null);
      if (current !== content) stale.push(`src/types/${file}`);
    } else {
      await writeFile(target, content, "utf8");
      console.log(`wrote src/types/${file}`);
    }
  }
  if (check && stale.length > 0) {
    console.error(`Generated types are out of date: ${stale.join(", ")}. Run: npm run generate:types`);
    process.exit(1);
  }
  if (check) console.log("generated types are up to date");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
