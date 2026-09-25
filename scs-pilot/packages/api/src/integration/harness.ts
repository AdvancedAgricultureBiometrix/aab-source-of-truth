// Integration test harness: a throwaway PostgreSQL database with every
// migration applied by the migration runner, built fresh for each test file
// and dropped afterwards.
//
// Needs SCS_TEST_ADMIN_DATABASE_URL: a SUPERUSER connection to a DISPOSABLE
// PostgreSQL 17 instance (the tests create and drop databases and login roles,
// and use SET ROLE). Never point it at a real database. If it is not set the
// integration tests fail — they are never silently skipped.

import { randomBytes } from "node:crypto";
import pg from "pg";

import type { DbConfig } from "../foundation/db.js";
import { loadMigrations, migrate } from "../migrations/runner.js";

/**
 * Test files run in parallel processes, but migration 004 alters the role
 * scs_api, which exists once per PostgreSQL instance, not per database.
 * Concurrent ALTER ROLE fails ("tuple concurrently updated"), so building a
 * migrated database is serialised with a session advisory lock taken on the
 * shared admin database. The tests themselves still run in parallel.
 */
export const MIGRATION_LOCK_KEY = 7_374_001; // arbitrary, fixed: "scs test migrations"

export function adminUrl(): string {
  const url = process.env["SCS_TEST_ADMIN_DATABASE_URL"];
  if (url === undefined || url.trim() === "") {
    throw new Error(
      "SCS_TEST_ADMIN_DATABASE_URL is not set. Integration tests need a superuser connection to a disposable " +
        "PostgreSQL 17 instance, e.g. postgres://postgres:postgres@127.0.0.1:5432/postgres (see .env.example).",
    );
  }
  return url;
}

function randomName(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export interface MigratedDatabase {
  readonly name: string;
  /** Connected to the throwaway database as the admin (superuser, owner of everything). */
  readonly admin: pg.Client;
  /** Connection settings for a login role on this database. */
  configFor(user: string, password: string): DbConfig;
  /** Create a login role that exists only for this test run; dropped by drop(). */
  createLoginRole(attributes: string): Promise<{ user: string; password: string }>;
  drop(): Promise<void>;
}

export async function createMigratedDatabase(): Promise<MigratedDatabase> {
  const url = adminUrl();
  const name = randomName("scs_test");
  const roles: string[] = [];

  const target = new URL(url);
  target.pathname = `/${name}`;
  const server = new pg.Client({ connectionString: url });
  const admin = new pg.Client({ connectionString: target.toString() });
  let created = false;
  let adminConnected = false;

  await server.connect();
  try {
    await server.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await server.query(`CREATE DATABASE ${name}`);
    created = true;
    await admin.connect();
    adminConnected = true;

    // the same runner the migrate container uses (src/migrations/runner.ts)
    await migrate(admin, await loadMigrations());
  } catch (err) {
    // Never leave a half-built database or an open connection behind: an open
    // client would keep the test process alive instead of reporting the failure.
    if (adminConnected) await admin.end().catch(() => undefined);
    if (created) await server.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(() => undefined);
    throw err;
  } finally {
    await server.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    await server.end();
  }

  return {
    name,
    admin,
    configFor: (user, password) => ({
      host: target.hostname,
      port: Number(target.port || 5432),
      database: name,
      user,
      password,
      poolMax: 2,
      idleTimeoutMs: 1_000,
      connectionTimeoutMs: 5_000,
      statementTimeoutMs: 15_000,
    }),
    async createLoginRole(attributes) {
      const user = randomName("scs_test_role");
      const password = randomBytes(18).toString("base64url");
      await admin.query(`CREATE ROLE ${user} LOGIN ${attributes} PASSWORD '${password}'`);
      await admin.query(`GRANT CONNECT ON DATABASE ${name} TO ${user}`);
      roles.push(user);
      return { user, password };
    },
    async drop() {
      await admin.end();
      const cleanup = new pg.Client({ connectionString: url });
      await cleanup.connect();
      try {
        await cleanup.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
        for (const role of roles) await cleanup.query(`DROP ROLE IF EXISTS ${role}`);
      } finally {
        await cleanup.end();
      }
    },
  };
}
