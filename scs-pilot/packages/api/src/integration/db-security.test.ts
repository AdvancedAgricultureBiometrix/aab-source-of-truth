// Database security invariants, checked against a real PostgreSQL database
// built from every migration. Every scs table — including tables added by
// future migrations — must satisfy all of these. A migration that forgets
// RLS, grants or policies for a new table fails here.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

let db: MigratedDatabase;
let tables: string[] = [];

before(async () => {
  db = await createMigratedDatabase();
  const { rows } = await db.admin.query<{ relname: string }>(
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'scs' AND c.relkind IN ('r', 'p') ORDER BY c.relname`,
  );
  tables = rows.map((r) => r.relname);
});

after(async () => {
  await db?.drop();
});

test("schema scs has tables to check", () => {
  assert.ok(tables.length >= 7, `expected at least 7 scs tables, found ${tables.join(", ")}`);
});

test("every scs table has row-level security enabled", async () => {
  const { rows } = await db.admin.query<{ relname: string }>(
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'scs' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity`,
  );
  assert.deepEqual(rows.map((r) => r.relname), [], "tables without RLS");
});

test("scs_api has SELECT and INSERT on every scs table, and no UPDATE, DELETE, TRUNCATE, REFERENCES or TRIGGER", async () => {
  for (const table of tables) {
    const { rows } = await db.admin.query<Record<string, boolean>>(
      `SELECT ${["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]
        .map((p) => `has_table_privilege('scs_api', $1::regclass, '${p}') AS "${p}"`)
        .join(", ")}`,
      [`scs.${table}`],
    );
    const p = rows[0]!;
    assert.deepEqual(
      p,
      { SELECT: true, INSERT: true, UPDATE: false, DELETE: false, TRUNCATE: false, REFERENCES: false, TRIGGER: false },
      `scs.${table}`,
    );
  }
});

test("scs_api has no column-level UPDATE on any scs table (none granted yet)", async () => {
  const { rows } = await db.admin.query(
    `SELECT table_name, column_name FROM information_schema.column_privileges
      WHERE table_schema = 'scs' AND grantee = 'scs_api' AND privilege_type = 'UPDATE'`,
  );
  assert.deepEqual(rows, []);
});

test("PUBLIC has no privileges on any scs table", async () => {
  const { rows } = await db.admin.query<{ relname: string }>(
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
      WHERE n.nspname = 'scs' AND c.relkind IN ('r', 'p') AND a.grantee = 0`,
  );
  assert.deepEqual(rows.map((r) => r.relname), []);
});

test("every scs table has exactly two permissive policies — SELECT and INSERT — for scs_api only", async () => {
  for (const table of tables) {
    const { rows } = await db.admin.query<{ cmd: string; roles: string[]; permissive: string }>(
      `SELECT cmd, roles::text[] AS roles, permissive FROM pg_policies WHERE schemaname = 'scs' AND tablename = $1 ORDER BY cmd`,
      [table],
    );
    assert.deepEqual(
      rows,
      [
        { cmd: "INSERT", roles: ["scs_api"], permissive: "PERMISSIVE" },
        { cmd: "SELECT", roles: ["scs_api"], permissive: "PERMISSIVE" },
      ],
      `scs.${table}`,
    );
  }
});

test("scs_api is a login role with no elevated attributes", async () => {
  const { rows } = await db.admin.query(
    `SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, rolinherit
       FROM pg_roles WHERE rolname = 'scs_api'`,
  );
  assert.deepEqual(rows, [
    { rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false, rolinherit: false },
  ]);
});

test("scs_api owns nothing and is not a member of any role that owns scs objects or the database", async () => {
  const { rows } = await db.admin.query(
    `SELECT 'database' AS kind, datname AS name FROM pg_database
       WHERE datname = current_database() AND pg_has_role('scs_api', datdba, 'MEMBER')
     UNION ALL
     SELECT 'schema', nspname FROM pg_namespace WHERE nspname = 'scs' AND pg_has_role('scs_api', nspowner, 'MEMBER')
     UNION ALL
     SELECT 'relation', c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'scs' AND pg_has_role('scs_api', c.relowner, 'MEMBER')
     UNION ALL
     SELECT 'function', p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'scs' AND pg_has_role('scs_api', p.proowner, 'MEMBER')`,
  );
  assert.deepEqual(rows, []);
});

/** Run sql as scs_api inside a savepoint; return the SQLSTATE if it failed. */
async function asScsApi(sql: string, values?: unknown[]): Promise<string | null> {
  await db.admin.query("SAVEPOINT s");
  try {
    await db.admin.query(sql, values);
    await db.admin.query("RELEASE SAVEPOINT s");
    return null;
  } catch (err) {
    await db.admin.query("ROLLBACK TO SAVEPOINT s");
    return (err as { code?: string }).code ?? "unknown";
  }
}

test("acting as scs_api: SELECT and INSERT work; UPDATE, DELETE, TRUNCATE and DDL are denied", async () => {
  await db.admin.query("BEGIN");
  try {
    await db.admin.query("SET LOCAL ROLE scs_api");
    const insert = `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
                      country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
                    VALUES (1, '1.0', now(), '{"actorId":"t"}', 'COOPERATIVE', 'Co-op', 'TH', 'REGISTERED', '{}', '{"actorId":"t"}', now())`;
    assert.equal(await asScsApi(insert), null, "INSERT");
    const { rows } = await db.admin.query<{ n: string }>("SELECT count(*) AS n FROM scs.party_identity");
    assert.equal(rows[0]!.n, "1", "SELECT sees the inserted row");

    const denied = "42501"; // insufficient_privilege
    assert.equal(await asScsApi("UPDATE scs.party_identity SET party_name = 'x'"), denied, "UPDATE");
    assert.equal(await asScsApi("DELETE FROM scs.party_identity"), denied, "DELETE");
    assert.equal(await asScsApi("TRUNCATE scs.party_identity"), denied, "TRUNCATE");
    assert.equal(await asScsApi("CREATE TABLE scs.sneaky (id int)"), denied, "CREATE TABLE");
    assert.equal(await asScsApi("ALTER TABLE scs.party_identity DISABLE ROW LEVEL SECURITY"), denied, "ALTER TABLE");
  } finally {
    await db.admin.query("ROLLBACK");
  }
});

test("acting as scs_api: the migration history schema (scs_migration) is refused", async () => {
  // the runner's own schema exists in every migrated database, owned by the owner
  const { rows } = await db.admin.query<{ n: string }>("SELECT count(*) AS n FROM scs_migration.applied_migration");
  assert.ok(Number(rows[0]!.n) > 0, "the owner sees the applied migrations");
  await db.admin.query("BEGIN");
  try {
    await db.admin.query("SET LOCAL ROLE scs_api");
    const denied = "42501"; // insufficient_privilege: no USAGE on the schema
    assert.equal(await asScsApi("SELECT * FROM scs_migration.applied_migration"), denied, "SELECT");
    assert.equal(await asScsApi("INSERT INTO scs_migration.applied_migration DEFAULT VALUES"), denied, "INSERT");
    const hasUsage = await db.admin.query<{ u: boolean }>("SELECT has_schema_privilege('scs_api', 'scs_migration', 'USAGE') AS u");
    assert.equal(hasUsage.rows[0]!.u, false, "scs_api has no USAGE on scs_migration");
  } finally {
    await db.admin.query("ROLLBACK");
  }
});

test("migration 004 refuses to run as scs_api", async () => {
  const sql = await readFile(new URL("../../../db/migrations/004_roles_rls.sql", import.meta.url), "utf8");
  const body = sql.slice(sql.indexOf("DO $$"), sql.indexOf("END\n$$;") + "END\n$$;".length);
  await db.admin.query("BEGIN");
  try {
    await db.admin.query("SET LOCAL ROLE scs_api");
    await assert.rejects(db.admin.query(body), /migrations must not run as scs_api/);
  } finally {
    await db.admin.query("ROLLBACK");
  }
});
