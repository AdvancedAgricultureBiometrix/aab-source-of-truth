// ops/verify-integrity.ts on actor–party links (AAB-PLATFORM-04) and the
// public-key registry (AAB-PLATFORM-09): run as the operator runs it, as a
// separate process, against a database built from every migration and a
// throwaway bucket. Keys are registered, links and status records made,
// through the API, with Ed25519 keys signing outside the server. The tool
// reads no actors file: every signature is verified against the key its
// statement names, as at its acceptance, from the registry in the database.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";
import { createTestObjectStore, type TestObjectStore } from "./object-store-harness.js";
import { keyRegistryRoutes } from "../platform/key-registry/routes.js";
import { bootstrapCountryRegistry, keyRegistrarEntry, newKeyPair, registerTestKey, signWith, type TestKey } from "./signing-keys.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const API_DIR = fileURLToPath(new URL("../..", import.meta.url));
const WHO = ["officer", "linker", "staff"] as const;
type Who = (typeof WHO)[number];
const ROLES: Record<Who, string[]> = { officer: ["COMPLIANCE_OFFICER"], linker: ["LINK_OFFICER"], staff: [] };
const actors = Object.fromEntries(WHO.map((w) => [w, { actorId: `${w}-integrity`, actorType: "HUMAN", roles: ROLES[w], authenticationMethod: "STATIC_TOKEN" }])) as Record<Who, { actorId: string; actorType: string; roles: string[]; authenticationMethod: string }>;
const token = (w: Who) => `integrity-${w}-token-0123456789abcdefghijk`;
const REGISTRAR_TOKEN = "integrity-key-registrar-token-0123456789";
const actorsFile = () => ({
  actors: [keyRegistrarEntry(createHash("sha256").update(REGISTRAR_TOKEN).digest("hex")), ...WHO.map((w) => ({
    tokenSha256: createHash("sha256").update(token(w)).digest("hex"),
    actor: actors[w],
    accountableName: `Named ${w}`,
  }))],
});
const registry = { base: "", token: () => REGISTRAR_TOKEN, issuer: TH };
let registrar: TestKey;
/** The linker's key, registered in the public-key registry (AAB-PLATFORM-09); rotated by a test. */
let linkerKey: TestKey;
let linkerFirstKeyId = "";
/** Signs a statement as version 2 (AAB-PLATFORM-04, third amendment) with the linker's key. */
const signAsLinker = (s: object) => signWith(linkerKey.privateKey, Object.assign(s, { statementVersion: "2", signingKeyId: linkerKey.keyId }));

let harness: MigratedDatabase;
let objects: TestObjectStore;
let api: Database;
let server: Server;
let base = "";
let linkId = "";

async function post(path: string, body: unknown, who: Who): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${token(who)}`, "content-type": "application/json", "idempotency-key": `integrity-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 201, JSON.stringify(json));
  return json["decision"] as Record<string, unknown>;
}

before(async () => {
  harness = await createMigratedDatabase();
  objects = await createTestObjectStore();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig(actorsFile(), { issuerCountry: "TH" });
  server = createApiServer({ routes: [...capabilityRoutes(authenticator), ...keyRegistryRoutes(authenticator)], authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  registry.base = base;
  registrar = await bootstrapCountryRegistry(registry);
  linkerKey = await registerTestKey(registry, registrar, actors.linker.actorId);
  linkerFirstKeyId = linkerKey.keyId;

  const coop = (await post("/scs/v1/parties", partyRequest("COOPERATIVE"), "officer"))["partyId"] as string;
  // the authorisation letter: real bytes in the store, and its row
  const bytes = randomBytes(256);
  const sha = createHash("sha256").update(bytes).digest("hex");
  await objects.store.putIfAbsent(sha, bytes, "application/pdf");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, $2, 'application/pdf', $3, $1, $4)`,
    [sha, bytes.length, objects.config.bucket, JSON.stringify(actors.officer)],
  );
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: { issuer: TH, actorId: actors.staff.actorId },
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: coop }, relation: "ACTS_FOR_SUBJECT",
    validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    authorisationEvidence: [{ evidenceObjectSha256: sha, description: "Letter of authority from the cooperative" }],
    creator: { issuer: TH, actorId: actors.linker.actorId },
  };
  const link = await post("/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signAsLinker(statement) }, "linker");
  linkId = link["linkId"] as string;
  for (const action of ["SUSPEND", "REINSTATE"]) {
    const s = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId, linkDigest: link["linkDigest"], action, reason: `${action} for the integrity check.`, writer: { issuer: TH, actorId: actors.linker.actorId } };
    await post(`/scs/v1/actor-party-links/${linkId}/status-records`, { statusStatement: s, statementSignature: signAsLinker(s) }, "linker");
  }
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await objects?.drop();
  await harness?.drop();
});

interface Section { checked: number; problems: string[]; verification?: Record<string, number> }
interface IntegrityReport {
  ok: boolean;
  links: Section;
  linkStatusRecords: Section;
  receipts: Section;
  evidenceObjects: Section;
  keyRegistry: Record<"registrations" | "events" | "compromises" | "ceremonies" | "verificationEvidence" | "notices" | "assessments", Section>;
}

/** Runs the integrity tool as a separate process, as the operator does, with no actors file; returns its exit code and report. */
function verifyIntegrity(): { code: number; report: IntegrityReport } {
  const admin = harness.admin as unknown as { host: string; port: number; user: string; password: string; database: string };
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    SCS_VERIFY_DB_HOST: admin.host, SCS_VERIFY_DB_PORT: String(admin.port), SCS_VERIFY_DB_NAME: admin.database,
    SCS_VERIFY_DB_USER: admin.user, SCS_VERIFY_DB_PASSWORD: admin.password,
    S3_ENDPOINT: objects.config.endpoint, S3_BUCKET: objects.config.bucket, S3_ACCESS_KEY_ID: objects.config.accessKeyId, S3_SECRET_ACCESS_KEY: objects.config.secretAccessKey,
  };
  delete env["SCS_AUTH_STATIC_ACTORS_FILE"];
  delete env["SCS_ACTOR_ISSUER_COUNTRY"];
  const r = spawnSync(process.execPath, ["--import", "tsx", "src/ops/verify-integrity.ts"], { cwd: API_DIR, env, encoding: "utf8" });
  assert.ok(r.stdout.trim().startsWith("{"), `no report: ${r.stderr}`);
  return { code: r.status ?? -1, report: JSON.parse(r.stdout) as IntegrityReport };
}

const registryProblems = (report: IntegrityReport) => Object.values(report.keyRegistry).flatMap((s) => s.problems);

test("intact, with no actors file: every link, status record and registry record verifies against the registry, re-digests, and matches its receipt", () => {
  const { code, report } = verifyIntegrity();
  assert.deepEqual(report.links, { checked: 1, problems: [], verification: { VERIFIED: 1 } });
  assert.deepEqual(report.linkStatusRecords, { checked: 2, problems: [], verification: { VERIFIED: 2 } });
  assert.deepEqual(registryProblems(report), []);
  assert.equal(report.keyRegistry.registrations.checked, 2, "the registrar's first key, and the linker's");
  assert.deepEqual(report.keyRegistry.ceremonies.verification, { VERIFIED: 2 }, "the holder's signature and the Platform Owner's co-signature, from the evidence stored with it");
  assert.equal(report.keyRegistry.verificationEvidence.checked, 1);
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(code, 0);
});

test("signing-key history: after the creator's key is rotated, every record signed with the old key still verifies", async () => {
  linkerKey = await registerTestKey(registry, registrar, actors.linker.actorId, { replaces: linkerFirstKeyId });
  const { code, report } = verifyIntegrity();
  assert.deepEqual(report.links.verification, { VERIFIED: 1 }, "verified against the key the statement names, as at its createdAt");
  assert.deepEqual(report.linkStatusRecords.verification, { VERIFIED: 2 });
  assert.deepEqual(registryProblems(report), []);
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(code, 0);
});

test("a compromise of the old key: its records are under review — counted, not problems; the environment is intact", async () => {
  const res = await fetch(`${base}/aab/v1/signing-keys/${linkerFirstKeyId}/compromises`, {
    method: "POST",
    headers: { authorization: `Bearer ${token("linker")}`, "content-type": "application/json", "idempotency-key": `integrity-${randomUUID()}` },
    body: JSON.stringify({ compromiseStatement: {
      statementType: "SIGNING_KEY_COMPROMISE", keyId: linkerFirstKeyId, exposureBasis: "Unknown", evidence: [], declaredBy: { issuer: TH, actorId: actors.linker.actorId },
    } }),
  });
  assert.equal(res.status, 201, await res.text());
  const { code, report } = verifyIntegrity();
  assert.deepEqual(report.links, { checked: 1, problems: [], verification: { UNDER_COMPROMISE_REVIEW: 1 } });
  assert.deepEqual(report.linkStatusRecords.verification, { UNDER_COMPROMISE_REVIEW: 2 });
  assert.equal(report.keyRegistry.compromises.checked, 1);
  assert.equal(report.ok, true, "a compromise is not tampering: the records are intact, and their results say what they are worth");
  assert.equal(code, 0);
});

test("a link altered in the database, around its append-only trigger, is found: it no longer re-digests", async () => {
  await harness.admin.query(`ALTER TABLE scs.actor_party_link DISABLE TRIGGER actor_party_link_append_only`);
  try {
    await harness.admin.query(`UPDATE scs.actor_party_link SET created_by = jsonb_set(created_by, '{accountableName}', '"Someone Else"') WHERE link_id = $1`, [linkId]);
  } finally {
    await harness.admin.query(`ALTER TABLE scs.actor_party_link ENABLE TRIGGER actor_party_link_append_only`);
  }
  const { code, report } = verifyIntegrity();
  assert.equal(code, 1);
  assert.deepEqual(report.links.problems, [`link ${linkId}: it does not re-digest to its recorded digest.`]);
});

test("a key registration altered in the database is found, and the records signed with it no longer verify", async () => {
  await harness.admin.query(`ALTER TABLE scs.signing_key_registration DISABLE TRIGGER signing_key_registration_append_only`);
  try {
    await harness.admin.query(`UPDATE scs.signing_key_registration SET public_key = $2 WHERE key_id = $1`, [linkerFirstKeyId, newKeyPair().publicKey]);
  } finally {
    await harness.admin.query(`ALTER TABLE scs.signing_key_registration ENABLE TRIGGER signing_key_registration_append_only`);
  }
  const { code, report } = verifyIntegrity();
  assert.equal(code, 1);
  const problems = report.keyRegistry.registrations.problems.join(" ");
  assert.match(problems, new RegExp(`key ${linkerFirstKeyId}: it does not re-digest`));
  assert.match(problems, /its public key is not the key its digest names/);
  assert.match(problems, /proof of possession does not verify/);
  assert.equal(report.linkStatusRecords.verification?.["NOT_VERIFIABLE"], 2, "signed with the substituted key's original: no longer verifiable");
});
