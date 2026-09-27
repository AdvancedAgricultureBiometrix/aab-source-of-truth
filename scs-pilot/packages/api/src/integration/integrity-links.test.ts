// ops/verify-integrity.ts on actor–party links (AAB-PLATFORM-04): run as the
// operator runs it, as a separate process, against a database built from
// every migration and a throwaway bucket. Links and status records are made
// through the API, signed with throwaway Ed25519 keys; the tool reads the
// public keys from an actors file, as the api service does.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";
import { createTestObjectStore, type TestObjectStore } from "./object-store-harness.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const API_DIR = fileURLToPath(new URL("../..", import.meta.url));
const WHO = ["officer", "linker", "staff"] as const;
type Who = (typeof WHO)[number];
const ROLES: Record<Who, string[]> = { officer: ["COMPLIANCE_OFFICER"], linker: ["LINK_OFFICER"], staff: [] };
const actors = Object.fromEntries(WHO.map((w) => [w, { actorId: `${w}-integrity`, actorType: "HUMAN", roles: ROLES[w], authenticationMethod: "STATIC_TOKEN" }])) as Record<Who, { actorId: string; actorType: string; roles: string[]; authenticationMethod: string }>;
const token = (w: Who) => `integrity-${w}-token-0123456789abcdefghijk`;
const keys = Object.fromEntries(WHO.map((w) => [w, generateKeyPairSync("ed25519")])) as Record<Who, ReturnType<typeof generateKeyPairSync>>;
const spki = (k: ReturnType<typeof generateKeyPairSync>["publicKey"]) => k.export({ format: "der", type: "spki" }).toString("base64");
const signAs = (w: Who, s: unknown) => sign(null, Buffer.from(canonicalJson(s), "utf8"), keys[w].privateKey).toString("base64");
const actorsFile = (linkerKey = keys.linker.publicKey) => ({
  actors: WHO.map((w) => ({
    tokenSha256: createHash("sha256").update(token(w)).digest("hex"),
    actor: actors[w],
    accountableName: `Named ${w}`,
    signingPublicKey: spki(w === "linker" ? linkerKey : keys[w].publicKey),
  })),
});

let harness: MigratedDatabase;
let objects: TestObjectStore;
let api: Database;
let server: Server;
let base = "";
let dir = "";
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
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  dir = mkdtempSync(join(tmpdir(), "scs-integrity-"));

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
  const link = await post("/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signAs("linker", statement) }, "linker");
  linkId = link["linkId"] as string;
  for (const action of ["SUSPEND", "REINSTATE"]) {
    const s = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId, linkDigest: link["linkDigest"], action, reason: `${action} for the integrity check.`, writer: { issuer: TH, actorId: actors.linker.actorId } };
    await post(`/scs/v1/actor-party-links/${linkId}/status-records`, { statusStatement: s, statementSignature: signAs("linker", s) }, "linker");
  }
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await objects?.drop();
  await harness?.drop();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

interface Section { checked: number; problems: string[] }

/** Runs the integrity tool as a separate process, as the operator does; returns its exit code and report. */
function verifyIntegrity(o: { actors?: unknown; issuer?: boolean } = {}): { code: number; report: { ok: boolean; links: Section; linkStatusRecords: Section; receipts: Section; evidenceObjects: Section } } {
  const admin = harness.admin as unknown as { host: string; port: number; user: string; password: string; database: string };
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    SCS_VERIFY_DB_HOST: admin.host, SCS_VERIFY_DB_PORT: String(admin.port), SCS_VERIFY_DB_NAME: admin.database,
    SCS_VERIFY_DB_USER: admin.user, SCS_VERIFY_DB_PASSWORD: admin.password,
    S3_ENDPOINT: objects.config.endpoint, S3_BUCKET: objects.config.bucket, S3_ACCESS_KEY_ID: objects.config.accessKeyId, S3_SECRET_ACCESS_KEY: objects.config.secretAccessKey,
  };
  delete env["SCS_AUTH_STATIC_ACTORS_FILE"];
  delete env["SCS_ACTOR_ISSUER_COUNTRY"];
  if (o.actors !== undefined) {
    const file = join(dir, `actors-${randomUUID()}.json`);
    writeFileSync(file, JSON.stringify(o.actors));
    env["SCS_AUTH_STATIC_ACTORS_FILE"] = file;
  }
  if (o.issuer !== false) env["SCS_ACTOR_ISSUER_COUNTRY"] = "TH";
  const r = spawnSync(process.execPath, ["--import", "tsx", "src/ops/verify-integrity.ts"], { cwd: API_DIR, env, encoding: "utf8" });
  assert.ok(r.stdout.trim().startsWith("{"), `no report: ${r.stderr}`);
  return { code: r.status ?? -1, report: JSON.parse(r.stdout) };
}

test("intact: every link and status record verifies against its signer's key, re-digests, and matches its receipt", () => {
  const { code, report } = verifyIntegrity({ actors: actorsFile() });
  assert.deepEqual(report.links, { checked: 1, problems: [] });
  assert.deepEqual(report.linkStatusRecords, { checked: 2, problems: [] });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(code, 0);
});

test("without the actors file, signed records cannot be verified: the check fails, saying why", () => {
  const { code, report } = verifyIntegrity({});
  assert.equal(code, 1);
  assert.match(report.links.problems[0]!, /SCS_AUTH_STATIC_ACTORS_FILE and SCS_ACTOR_ISSUER_COUNTRY are not both set/);
});

test("a creator's key that is not the one they signed with: every record they signed fails (why signing-key history blocks real data)", () => {
  const { code, report } = verifyIntegrity({ actors: actorsFile(generateKeyPairSync("ed25519").publicKey) });
  assert.equal(code, 1);
  assert.match(report.links.problems.join(" "), new RegExp(`link ${linkId}: its statement signature does not verify`));
  assert.equal(report.linkStatusRecords.problems.length, 2, "both status records were signed by the same creator");
});

test("a link altered in the database, around its append-only trigger, is found: it no longer re-digests", async () => {
  await harness.admin.query(`ALTER TABLE scs.actor_party_link DISABLE TRIGGER actor_party_link_append_only`);
  try {
    await harness.admin.query(`UPDATE scs.actor_party_link SET created_by = jsonb_set(created_by, '{accountableName}', '"Someone Else"') WHERE link_id = $1`, [linkId]);
  } finally {
    await harness.admin.query(`ALTER TABLE scs.actor_party_link ENABLE TRIGGER actor_party_link_append_only`);
  }
  const { code, report } = verifyIntegrity({ actors: actorsFile() });
  assert.equal(code, 1);
  assert.deepEqual(report.links.problems, [`link ${linkId}: it does not re-digest to its recorded digest.`]);
});
