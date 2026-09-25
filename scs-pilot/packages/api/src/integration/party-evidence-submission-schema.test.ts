// Migration 006: scs.party_identity_evidence_submission and
// scs.party_identity_evidence.submission_id, tested against a database built
// from every migration. Grants and RLS on the new table are covered by
// db-security.test.ts, which checks every scs table it finds.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { connectDatabase, type Database } from "../foundation/db.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const ACTOR = JSON.stringify({ actorId: "officer-m006", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" });

let harness: MigratedDatabase;
let api: Database;

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
});

after(async () => {
  await api?.close();
  await harness?.drop();
});

async function party(): Promise<string> {
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'LEGAL_ENTITY', $2, 'TH', 'REGISTERED', '{}', $1, now()) RETURNING party_id`,
    [ACTOR, `M006 Party ${randomUUID()}`],
  );
  return rows[0]!.party_id;
}

async function submission(partyId: string, partyVersion = 1): Promise<string> {
  const { rows } = await harness.admin.query<{ submission_id: string }>(
    `INSERT INTO scs.party_identity_evidence_submission (party_id, party_version, evidence_limitations, submitted_by)
     VALUES ($1, $2, '{"Copy only"}', $3) RETURNING submission_id`,
    [partyId, partyVersion, ACTOR],
  );
  return rows[0]!.submission_id;
}

const link = (partyId: string, submissionId: string | null, evidenceId = randomUUID(), partyVersion = 1) =>
  harness.admin.query(
    `INSERT INTO scs.party_identity_evidence (party_id, party_version, evidence_id, submission_id) VALUES ($1, $2, $3, $4)`,
    [partyId, partyVersion, evidenceId, submissionId],
  );

test("migration 006 creates the submission table and the nullable submission_id column", async () => {
  const { rows } = await harness.admin.query<{ column_name: string; data_type: string; is_nullable: string }>(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'scs' AND table_name = 'party_identity_evidence_submission' ORDER BY ordinal_position`,
  );
  assert.deepEqual(rows.map((r) => [r.column_name, r.data_type, r.is_nullable]), [
    ["submission_id", "uuid", "NO"],
    ["party_id", "uuid", "NO"],
    ["party_version", "integer", "NO"],
    ["evidence_limitations", "ARRAY", "NO"],
    ["submitted_by", "jsonb", "NO"],
    ["submitting_organization_id", "text", "YES"],
    ["submitted_at", "timestamp with time zone", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
  ]);
  const col = await harness.admin.query<{ data_type: string; is_nullable: string }>(
    `SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'scs' AND table_name = 'party_identity_evidence' AND column_name = 'submission_id'`,
  );
  assert.deepEqual(col.rows[0], { data_type: "uuid", is_nullable: "YES" });
});

test("scs_api can insert and read submissions (grants and RLS policies)", async () => {
  const partyId = await party();
  const id = await api.transaction(async (tx) => {
    const { rows } = await tx.query<{ submission_id: string }>(
      `INSERT INTO scs.party_identity_evidence_submission (party_id, party_version, evidence_limitations, submitted_by)
       VALUES ($1, 1, '{}', $2) RETURNING submission_id`,
      [partyId, ACTOR],
    );
    return rows[0]!.submission_id;
  });
  const read = await api.transaction((tx) => tx.query(`SELECT 1 FROM scs.party_identity_evidence_submission WHERE submission_id = $1`, [id]));
  assert.equal(read.rowCount, 1);
});

test("submissions are append-only: scs_api lacks the privilege; the owner is stopped by the trigger", async () => {
  const id = await submission(await party());
  for (const sql of [
    `UPDATE scs.party_identity_evidence_submission SET evidence_limitations = '{}' WHERE submission_id = '${id}'`,
    `DELETE FROM scs.party_identity_evidence_submission WHERE submission_id = '${id}'`,
  ]) {
    await assert.rejects(api.transaction((tx) => tx.query(sql)), /permission denied/, `scs_api: ${sql}`);
    await assert.rejects(harness.admin.query(sql), /append-only/, `owner: ${sql}`);
  }
  await assert.rejects(harness.admin.query(`TRUNCATE scs.party_identity_evidence_submission CASCADE`), /append-only/);
  const { rowCount } = await harness.admin.query(`SELECT 1 FROM scs.party_identity_evidence_submission WHERE submission_id = $1`, [id]);
  assert.equal(rowCount, 1);
});

test("an evidence link may name only a submission for its own party and party version", async () => {
  const a = await party();
  const b = await party();
  const subA = await submission(a);
  await link(a, subA); // matching party and version
  await link(a, null); // given at registration: no submission
  await assert.rejects(link(b, subA), /party_identity_evidence_submission_fk/, "another party's submission");
  await assert.rejects(link(a, subA, randomUUID(), 2), /party_identity_evidence_submission_fk/, "another party version");
  await assert.rejects(link(a, randomUUID()), /party_identity_evidence_submission_fk/, "a submission that does not exist");
});

test("one evidence id cannot be linked twice to a party version, at registration or by a submission", async () => {
  const p = await party();
  const evidenceId = randomUUID();
  await link(p, null, evidenceId);
  await assert.rejects(link(p, await submission(p), evidenceId), /party_identity_evidence_uq/);
});

test("a submission cannot be removed while evidence links name it", async () => {
  const p = await party();
  const sub = await submission(p);
  await link(p, sub);
  // Even with the append-only trigger out of the way, the foreign key holds.
  // (One multi-statement query is one transaction: the DISABLE rolls back with the failed DELETE.)
  try {
    await assert.rejects(
      harness.admin.query(`ALTER TABLE scs.party_identity_evidence_submission DISABLE TRIGGER party_identity_evidence_submission_append_only;
        DELETE FROM scs.party_identity_evidence_submission WHERE submission_id = '${sub}'`),
      /party_identity_evidence_submission_fk/,
    );
  } finally {
    await harness.admin.query(`ALTER TABLE scs.party_identity_evidence_submission ENABLE TRIGGER party_identity_evidence_submission_append_only`);
  }
});

test("submission constraints: version ≥ 1, actor is an object, no NULL limitations, organisation id not blank, party exists", async () => {
  const p = await party();
  const insert = (cols: string, values: string) =>
    harness.admin.query(`INSERT INTO scs.party_identity_evidence_submission (party_id, ${cols}) VALUES ('${p}', ${values})`);
  await assert.rejects(insert("party_version, evidence_limitations, submitted_by", `0, '{}', '${ACTOR}'`), /party_identity_evidence_submission_version_ck/);
  await assert.rejects(insert("party_version, evidence_limitations, submitted_by", `1, '{}', '"someone"'`), /party_identity_evidence_submission_actor_object_ck/);
  await assert.rejects(insert("party_version, evidence_limitations, submitted_by", `1, ARRAY[NULL]::text[], '${ACTOR}'`), /party_identity_evidence_submission_no_null_elements_ck/);
  await assert.rejects(
    insert("party_version, evidence_limitations, submitted_by, submitting_organization_id", `1, '{}', '${ACTOR}', '  '`),
    /party_identity_evidence_submission_org_not_blank_ck/,
  );
  await assert.rejects(
    harness.admin.query(`INSERT INTO scs.party_identity_evidence_submission (party_id, party_version, evidence_limitations, submitted_by) VALUES ($1, 1, '{}', $2)`, [randomUUID(), ACTOR]),
    /party_identity_evidence_submission_party_fk/,
  );
});
