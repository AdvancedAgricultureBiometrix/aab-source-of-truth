// The migration runner against real PostgreSQL: throwaway databases on the
// SCS_TEST_ADMIN_DATABASE_URL instance, and throwaway copies of the migration
// directory for the cases that need an extra, edited or broken migration.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

import { adminUrl, MIGRATION_LOCK_KEY } from "../integration/harness.js";
import { apiPasswordProblem, DEFAULT_MIGRATIONS_DIR, loadMigrations, migrate, MigrationError, setApiPassword } from "./runner.js";

const REAL = DEFAULT_MIGRATIONS_DIR;
const REAL_COUNT = (await readdir(REAL)).filter((f) => f.endsWith(".sql")).length;
const LATEST = String(REAL_COUNT).padStart(3, "0");
const NEXT = String(REAL_COUNT + 1).padStart(3, "0");

let server: pg.Client;
const databases: string[] = [];
const dirs: string[] = [];

before(async () => {
  server = new pg.Client({ connectionString: adminUrl() });
  await server.connect();
});

after(async () => {
  for (const db of databases) await server.query(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`).catch(() => undefined);
  await server.end();
  for (const d of dirs) await rm(d, { recursive: true, force: true });
});

/** A new empty database and an owner (superuser) client connected to it. */
async function freshDatabase(): Promise<pg.Client> {
  const name = `scs_runner_${randomBytes(5).toString("hex")}`;
  await server.query(`CREATE DATABASE ${name}`);
  databases.push(name);
  const url = new URL(adminUrl());
  url.pathname = `/${name}`;
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  return client;
}

/**
 * Run fn while holding the harness's cluster-wide lock: migration 004 alters
 * the role scs_api, which is shared by every database on the instance.
 */
async function serialised<T>(fn: () => Promise<T>): Promise<T> {
  await server.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
  try {
    return await fn();
  } finally {
    await server.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
  }
}

/** A copy of the real migrations, plus `extra` files (name → content). */
async function migrationsDir(extra: Record<string, string> = {}, transform?: (name: string, text: string) => string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "scs-migrations-"));
  dirs.push(dir);
  for (const f of (await readdir(REAL)).filter((x) => x.endsWith(".sql"))) {
    if (transform === undefined) await copyFile(join(REAL, f), join(dir, f));
    else await writeFile(join(dir, f), transform(f, await readFile(join(REAL, f), "utf8")));
  }
  for (const [name, content] of Object.entries(extra)) await writeFile(join(dir, name), content);
  return dir;
}

const history = async (c: pg.Client) =>
  (await c.query<{ version: string; method: string; checksum: string; applied_by: string }>(`SELECT version, method, checksum, applied_by FROM scs_migration.applied_migration ORDER BY version`)).rows;

const EXTRA = `-- test migration\nBEGIN;\n\nCREATE TABLE scs.runner_probe (id integer PRIMARY KEY);\n\nCOMMIT;\n`;

// ── Applying ─────────────────────────────────────────────────────────────────

test("a fresh database: every migration applied in order and recorded; a second run applies nothing", async () => {
  const c = await freshDatabase();
  try {
    const files = await loadMigrations();
    const first = await serialised(() => migrate(c, files));
    assert.deepEqual(first.applied, files.map((f) => f.version));
    assert.deepEqual(first.alreadyApplied, []);
    const h = await history(c);
    assert.deepEqual(h.map((r) => [r.version, r.method, r.checksum]), files.map((f) => [f.version, "APPLIED", f.checksum]));
    assert.equal(to(await c.query(`SELECT current_user AS u`)).u, h[0]!.applied_by, "recorded as the connected owner");

    const second = await serialised(() => migrate(c, files));
    assert.deepEqual(second.applied, []);
    assert.equal(second.alreadyApplied.length, REAL_COUNT);
    assert.equal((await history(c)).length, REAL_COUNT);
  } finally {
    await c.end();
  }
});

test("a new migration in a later release: only it is applied", async () => {
  const c = await freshDatabase();
  try {
    await serialised(async () => migrate(c, await loadMigrations()));
    const withNext = await loadMigrations(await migrationsDir({ [`${NEXT}_runner_probe.sql`]: EXTRA }));
    const r = await serialised(() => migrate(c, withNext));
    assert.deepEqual(r.applied, [NEXT]);
    assert.equal(to(await c.query(`SELECT to_regclass('scs.runner_probe') IS NOT NULL AS ok`)).ok, true);
  } finally {
    await c.end();
  }
});

test("a failing migration is rolled back entirely, recorded nowhere, and applies once fixed", async () => {
  const c = await freshDatabase();
  try {
    await serialised(async () => migrate(c, await loadMigrations()));
    const broken = EXTRA.replace("COMMIT;", "SELECT no_such_function();\n\nCOMMIT;");
    await assert.rejects(
      serialised(async () => migrate(c, await loadMigrations(await migrationsDir({ [`${NEXT}_runner_probe.sql`]: broken })))),
      (err: unknown) => err instanceof MigrationError && /migration .*runner_probe.sql failed and was rolled back/.test(err.message),
    );
    assert.equal(to(await c.query(`SELECT to_regclass('scs.runner_probe') IS NULL AS absent`)).absent, true, "its first statement was rolled back");
    assert.equal((await history(c)).length, REAL_COUNT, "not recorded");
    const fixed = await serialised(async () => migrate(c, await loadMigrations(await migrationsDir({ [`${NEXT}_runner_probe.sql`]: EXTRA }))));
    assert.deepEqual(fixed.applied, [NEXT]);
  } finally {
    await c.end();
  }
});

test("concurrent runners on one database apply each migration exactly once", async () => {
  const a = await freshDatabase();
  const url = new URL(adminUrl());
  url.pathname = `/${databases.at(-1)}`;
  const b = new pg.Client({ connectionString: url.toString() });
  await b.connect();
  try {
    const files = await loadMigrations();
    const [ra, rb] = await serialised(() => Promise.all([migrate(a, files), migrate(b, files)]));
    assert.deepEqual([...ra.applied, ...rb.applied].sort(), files.map((f) => f.version));
    assert.equal((await history(a)).length, REAL_COUNT);
  } finally {
    await a.end();
    await b.end();
  }
});

// ── Refusals: fail closed, apply nothing ─────────────────────────────────────

test("an applied migration whose file has changed → refused, nothing applied", async () => {
  const c = await freshDatabase();
  try {
    await serialised(async () => migrate(c, await loadMigrations()));
    const edited = await migrationsDir({ [`${NEXT}_runner_probe.sql`]: EXTRA }, (name, text) => (name.startsWith("002_") ? text.replace("BEGIN;", "BEGIN;\n-- edited after it was applied") : text));
    await assert.rejects(
      serialised(async () => migrate(c, await loadMigrations(edited))),
      (err: unknown) => err instanceof MigrationError && /002_.*has changed since it was applied.*committed migrations are immutable/.test(err.message),
    );
    assert.equal(to(await c.query(`SELECT to_regclass('scs.runner_probe') IS NULL AS absent`)).absent, true, `${NEXT} not applied`);
  } finally {
    await c.end();
  }
});

test("a recorded migration whose file is missing (database newer than the release) → refused", async () => {
  const c = await freshDatabase();
  try {
    await serialised(async () => migrate(c, await loadMigrations(await migrationsDir({ [`${NEXT}_runner_probe.sql`]: EXTRA }))));
    await assert.rejects(
      serialised(async () => migrate(c, await loadMigrations())),
      (err: unknown) => err instanceof MigrationError && new RegExp(`migration ${NEXT} .* file is missing: this database is newer than this release`).test(err.message),
    );
  } finally {
    await c.end();
  }
});

test("CRLF line endings do not change a checksum (a Windows checkout is not an edit)", async () => {
  const lf = await loadMigrations();
  const crlf = await loadMigrations(await migrationsDir({}, (_n, text) => text.replace(/\r?\n/g, "\r\n")));
  assert.deepEqual(crlf.map((f) => f.checksum), lf.map((f) => f.checksum));
});

test("malformed migration directories are refused before anything runs", async () => {
  const gap = await mkdtemp(join(tmpdir(), "scs-migrations-"));
  dirs.push(gap);
  await copyFile(join(REAL, (await readdir(REAL)).sort()[0]!), join(gap, "001_initial.sql"));
  await writeFile(join(gap, "003_skipped.sql"), EXTRA);
  await assert.rejects(loadMigrations(gap), /expected version 002 next/);

  await assert.rejects(loadMigrations(await migrationsDir({ [`${NEXT}_Bad-Name.sql`]: EXTRA })), /file names must match/);
  await assert.rejects(loadMigrations(await migrationsDir({ [`${NEXT}_no_transaction.sql`]: "CREATE TABLE scs.x (id int);\n" })), /exactly one transaction/);
  await assert.rejects(loadMigrations(await migrationsDir({ [`${NEXT}_after_commit.sql`]: `${EXTRA}CREATE TABLE scs.y (id int);\n` })), /exactly one transaction/);
  await assert.rejects(loadMigrations(await migrationsDir({ [`${NEXT}_two_transactions.sql`]: `${EXTRA}BEGIN;\nCOMMIT;\n` })), /exactly one transaction/);
});

test("the API role, or any member of it, is refused", async () => {
  const c = await freshDatabase();
  const name = databases.at(-1)!;
  const role = `scs_runner_role_${randomBytes(4).toString("hex")}`;
  try {
    await serialised(async () => migrate(c, await loadMigrations()));
    await c.query(`CREATE ROLE ${role} LOGIN PASSWORD 'runner-test-password-123' IN ROLE scs_api`);
    await c.query(`GRANT CONNECT ON DATABASE ${name} TO ${role}`);
    const url = new URL(adminUrl());
    url.pathname = `/${name}`;
    url.username = role;
    url.password = "runner-test-password-123";
    const api = new pg.Client({ connectionString: url.toString() });
    await api.connect();
    try {
      await assert.rejects(migrate(api, await loadMigrations()), /refusing to migrate as .*: migrations run as the owner/);
      // and the API role cannot read the migration history
      await assert.rejects(api.query(`SELECT * FROM scs_migration.applied_migration`), /permission denied/);
    } finally {
      await api.end();
    }
  } finally {
    await c.end();
    await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.query(`DROP ROLE IF EXISTS ${role}`);
  }
});

// ── Databases built before the runner ────────────────────────────────────────

test("SCS objects with no history → refused; --baseline records them once without running them", async () => {
  const c = await freshDatabase();
  try {
    // the old init hook: every file run as-is, nothing recorded
    await serialised(async () => {
      for (const f of (await readdir(REAL)).filter((x) => x.endsWith(".sql")).sort()) await c.query(await readFile(join(REAL, f), "utf8"));
    });
    const files = await loadMigrations();
    await assert.rejects(serialised(() => migrate(c, files)), /has SCS objects but no migration history.*--baseline <version>/);

    const r = await serialised(() => migrate(c, files, { baseline: LATEST }));
    assert.deepEqual(r.baselined, files.map((f) => f.version));
    assert.deepEqual(r.applied, []);
    assert.ok((await history(c)).every((h) => h.method === "BASELINED"));

    const again = await serialised(() => migrate(c, files));
    assert.deepEqual(again.applied, []);
    await assert.rejects(serialised(() => migrate(c, files, { baseline: LATEST })), /--baseline is only allowed on a database with no migration history/);
  } finally {
    await c.end();
  }
});

test("a partial baseline applies the rest", async () => {
  const c = await freshDatabase();
  try {
    await serialised(async () => {
      for (const f of (await readdir(REAL)).filter((x) => x.endsWith(".sql")).sort().slice(0, 5)) await c.query(await readFile(join(REAL, f), "utf8"));
    });
    const r = await serialised(async () => migrate(c, await loadMigrations(), { baseline: "005" }));
    assert.deepEqual(r.baselined, ["001", "002", "003", "004", "005"]);
    assert.equal(r.applied.length, REAL_COUNT - 5);
  } finally {
    await c.end();
  }
});

test("--baseline on an empty database, or for an unknown version, is refused", async () => {
  const c = await freshDatabase();
  try {
    const files = await loadMigrations();
    await assert.rejects(serialised(() => migrate(c, files, { baseline: "001" })), /has no scs schema; nothing to baseline/);
    await assert.rejects(serialised(() => migrate(c, files, { baseline: "999" })), /--baseline 999: no such migration/);
  } finally {
    await c.end();
  }
});

// ── scs_api password ─────────────────────────────────────────────────────────

test("the scs_api password rules (as the old init script enforced them)", () => {
  assert.equal(apiPasswordProblem(undefined, "owner-pass"), "SCS_API_DB_PASSWORD is not set");
  assert.equal(apiPasswordProblem("change-me-scs-api-password", "owner-pass"), "SCS_API_DB_PASSWORD is still the .env.example placeholder");
  assert.equal(apiPasswordProblem("short", "owner-pass"), "SCS_API_DB_PASSWORD must be at least 16 characters");
  assert.equal(apiPasswordProblem("same-as-owner-password", "same-as-owner-password"), "SCS_API_DB_PASSWORD must differ from the owner's password");
  assert.equal(apiPasswordProblem("a-good-api-password-2026", "owner-pass"), null);
});

test("setApiPassword sets the scs_api password, quoting it server-side", async () => {
  const c = await freshDatabase();
  try {
    await serialised(async () => {
      await migrate(c, await loadMigrations());
      await setApiPassword(c, "it's a 'quoted' pass; DROP ROLE x; --");
      assert.equal(to(await c.query(`SELECT rolpassword IS NOT NULL AS set FROM pg_authid WHERE rolname = 'scs_api'`)).set, true);
    });
  } finally {
    await c.end();
  }
});

function to<T extends pg.QueryResultRow>(r: pg.QueryResult<T>): T {
  return r.rows[0]!;
}
