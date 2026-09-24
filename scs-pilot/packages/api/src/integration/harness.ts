// Integration test harness: a throwaway PostgreSQL database with every
// migration applied, built fresh for each test file and dropped afterwards.
//
// Needs SCS_TEST_ADMIN_DATABASE_URL: a SUPERUSER connection to a DISPOSABLE
// PostgreSQL 17 instance (the tests create and drop databases and login roles,
// and use SET ROLE). Never point it at a real database. If it is not set the
// integration tests fail — they are never silently skipped.

import { readdir, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

import type { DbConfig } from "../foundation/db.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../db/migrations/", import.meta.url));

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

  const server = new pg.Client({ connectionString: url });
  await server.connect();
  try {
    await server.query(`CREATE DATABASE ${name}`);
  } finally {
    await server.end();
  }

  const target = new URL(url);
  target.pathname = `/${name}`;
  const admin = new pg.Client({ connectionString: target.toString() });
  await admin.connect();

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) throw new Error(`no migrations found in ${MIGRATIONS_DIR}`);
  for (const file of files) {
    try {
      await admin.query(await readFile(new URL(file, new URL("../../../db/migrations/", import.meta.url)), "utf8"));
    } catch (err) {
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    }
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
