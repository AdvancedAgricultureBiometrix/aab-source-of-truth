// Migration 025: which capability identifiers a receipt may carry
// (decision_receipt_capability_id_ck). The SCS capabilities and AAB-PLATFORM-09
// stay an explicit list, unchanged; AAB landscape capabilities (CAP-01 to
// CAP-99, except the retired CAP-29) and platform contracts (AAB-PLATFORM-01
// to 99) are admitted by pattern, so that no future capability needs a
// migration. The check governs format only: it makes no capability canonical.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

import { loadMigrations, migrate } from "../migrations/runner.js";
import { adminUrl, createMigratedDatabase, MIGRATION_LOCK_KEY, type MigratedDatabase } from "./harness.js";

const EXISTING = [
  "SCS-CAP-01", "SCS-CAP-02", "SCS-CAP-03", "SCS-CAP-04",
  "SCS-CAP-05", "SCS-CAP-06", "SCS-CAP-08", "SCS-CAP-09",
  "AAB-PLATFORM-09",
];
const ADMITTED_BY_PATTERN = ["CAP-01", "CAP-04", "CAP-20", "CAP-28", "CAP-30", "CAP-36", "CAP-99", "AAB-PLATFORM-01", "AAB-PLATFORM-10", "AAB-PLATFORM-99"];
const REFUSED = [
  "CAP-29",            // retired
  "CAP-00", "CAP-4", "CAP-100", "cap-04", "CAP-04 ", " CAP-04", "CAP-04x",
  "AGR-CAP-04",        // AGR capabilities carry no prefix (CAP-04's decision 1)
  "SCS-CAP-07",        // SCS stays an explicit list: added when it is built
  "SCS-CAP-10",
  "AAB-PLATFORM-9", "AAB-PLATFORM-00", "AAB-PLATFORM-100", "aab-platform-01",
  "SCS-PLATFORM", "", "CAP-", "CAP-04\nX",
];

let db: MigratedDatabase;

before(async () => {
  db = await createMigratedDatabase();
});

after(async () => {
  await db?.drop();
});

const hex = () => randomBytes(32).toString("hex");

/** Insert one receipt row with the given capability id; every other column valid. */
function insertReceipt(client: pg.Client, capabilityId: string) {
  const id = randomUUID();
  return client.query(
    `INSERT INTO scs.decision_receipt
       (receipt_id, capability_id, decision_type, decision, actor, correlation_id, request_digest, receipt, receipt_digest, issued_at)
     VALUES ($1, $2, 'TEST', 'TEST', '{}'::jsonb, 'test-correlation-0001', $3, $4::jsonb, $5, now())`,
    [id, capabilityId, hex(), JSON.stringify({ receiptId: id }), hex()],
  );
}

async function assertRefused(capabilityId: string) {
  await assert.rejects(insertReceipt(db.admin, capabilityId), (err: unknown) => {
    const e = err as { code?: string; constraint?: string };
    assert.equal(e.code, "23514", `${JSON.stringify(capabilityId)}: a check violation`);
    assert.equal(e.constraint, "decision_receipt_capability_id_ck", `${JSON.stringify(capabilityId)}: refused by the capability check`);
    return true;
  });
}

test("every identifier valid before migration 025 is still accepted", async () => {
  for (const id of EXISTING) await insertReceipt(db.admin, id);
});

test("AAB landscape capabilities and platform contracts are accepted by pattern, CAP-36 among them (format only, not canonical status)", async () => {
  for (const id of ADMITTED_BY_PATTERN) await insertReceipt(db.admin, id);
});

test("the retired CAP-29, malformed identifiers, prefixed AGR ids and unlisted SCS ids are refused", async () => {
  for (const id of REFUSED) await assertRefused(id);
});

test("upgrading: receipts written under migration 024 satisfy the new check when 025 is applied", async () => {
  const server = new pg.Client({ connectionString: adminUrl() });
  await server.connect();
  const name = `scs_rcpt_${randomBytes(5).toString("hex")}`;
  await server.query(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl());
  url.pathname = `/${name}`;
  const client = new pg.Client({ connectionString: url.toString() });
  try {
    await client.connect();
    const all = await loadMigrations();
    const upTo024 = all.filter((m) => m.version <= "024");
    assert.equal(upTo024.at(-1)?.version, "024");
    // migration 004 alters the instance-wide role scs_api: hold the harness's lock
    await server.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await migrate(client, upTo024);
      for (const id of EXISTING) await insertReceipt(client, id);
      const r = await migrate(client, all);
      assert.deepEqual(r.applied, ["025"]);
    } finally {
      await server.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    }
    const n = (await client.query("SELECT count(*)::int AS n FROM scs.decision_receipt")).rows[0].n;
    assert.equal(n, EXISTING.length, "every receipt written before 025 is kept, and valid under it");
  } finally {
    await client.end().catch(() => undefined);
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(() => undefined);
    await server.end();
  }
});
