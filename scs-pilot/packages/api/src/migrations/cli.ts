// npm run migrate [-- --baseline NNN]
//
// Applies pending migrations as the owner (migration) role, then sets the
// scs_api password. Run by the `migrate` service in docker-compose.yml before
// the api starts; exits non-zero on any failure, so the api never starts on a
// half-migrated database.
//
// Environment (the owner's connection — never scs_api):
//   SCS_MIGRATE_DB_HOST, SCS_MIGRATE_DB_PORT (5432), SCS_MIGRATE_DB_NAME,
//   SCS_MIGRATE_DB_USER, SCS_MIGRATE_DB_PASSWORD
//   SCS_API_DB_PASSWORD — the password to set for scs_api
//   SCS_MIGRATIONS_DIR  — optional; defaults to packages/db/migrations

import pg from "pg";

import { apiPasswordProblem, DEFAULT_MIGRATIONS_DIR, loadMigrations, migrate, MigrationError, setApiPassword } from "./runner.js";

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === "") throw new MigrationError(`${name} is not set`);
  return v;
}

function baselineArg(argv: readonly string[]): string | undefined {
  const i = argv.indexOf("--baseline");
  if (i === -1) return undefined;
  const v = argv[i + 1];
  if (v === undefined || !/^\d{3}$/.test(v)) throw new MigrationError("--baseline needs a three-digit version, e.g. --baseline 011");
  return v;
}

async function main(): Promise<void> {
  const log = (line: string) => console.log(`migrate: ${line}`);
  const baseline = baselineArg(process.argv.slice(2));
  const ownerPassword = required("SCS_MIGRATE_DB_PASSWORD");
  const apiPassword = process.env["SCS_API_DB_PASSWORD"];
  const problem = apiPasswordProblem(apiPassword, ownerPassword);
  if (problem !== null) throw new MigrationError(problem);

  const migrations = await loadMigrations(process.env["SCS_MIGRATIONS_DIR"] ?? DEFAULT_MIGRATIONS_DIR);
  const client = new pg.Client({
    host: required("SCS_MIGRATE_DB_HOST"),
    port: Number(process.env["SCS_MIGRATE_DB_PORT"] ?? 5432),
    database: required("SCS_MIGRATE_DB_NAME"),
    user: required("SCS_MIGRATE_DB_USER"),
    password: ownerPassword,
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  try {
    const result = await migrate(client, migrations, { ...(baseline !== undefined ? { baseline } : {}), log });
    await setApiPassword(client, apiPassword!);
    log(
      `done: ${result.applied.length} applied, ${result.baselined.length} baselined, ${result.alreadyApplied.length} already applied ` +
        `(latest ${migrations.at(-1)!.version}); scs_api password set`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(`migrate: FAILED — ${err instanceof MigrationError ? err.message : (err as Error).message}`);
  process.exit(1);
});
