// Database access: pool, startup role check, transaction helper.
//
// The API connects only as the restricted application role (scs_api — see
// packages/db/schema/roles-rls.sql). connectDatabase() checks the connected
// role on every boot and REFUSES TO START if it:
//   * is a superuser, can bypass row-level security, can create roles or
//     databases, or is a replication role; or
//   * owns — or is a member of a role that owns — the database, schema scs or
//     any object in scs (which would put it outside RLS and grants).
// Each violation is logged and startup fails. This is enforced in code on
// every start, not left as a convention.
//
// All reads and writes go through transaction(fn): BEGIN, fn, COMMIT — or
// ROLLBACK if fn throws or COMMIT fails. A connection whose ROLLBACK also fails
// is destroyed, never returned to the pool.

import pg from "pg";

import { log } from "./correlation.js";
import { platformFailure } from "./errors.js";

// ── Configuration ────────────────────────────────────────────────────────────

export interface DbConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly poolMax: number;
  readonly idleTimeoutMs: number;
  readonly connectionTimeoutMs: number;
  readonly statementTimeoutMs: number;
}

/**
 * Reads SCS_DB_* variables (separate values, not a URL: a password containing
 * @ : / would silently break a connection string). Reports every missing or
 * invalid variable at once.
 */
export function dbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const problems: string[] = [];
  const required = (name: string): string => {
    const value = env[name];
    if (value === undefined || value.trim() === "") {
      problems.push(`${name} is not set`);
      return "";
    }
    return value;
  };
  const positiveInt = (name: string, fallback: number): number => {
    const raw = env[name];
    if (raw === undefined || raw.trim() === "") return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      problems.push(`${name} must be a positive integer, got "${raw}"`);
      return fallback;
    }
    return n;
  };

  const config: DbConfig = {
    host: required("SCS_DB_HOST"),
    port: positiveInt("SCS_DB_PORT", 5432),
    database: required("SCS_DB_NAME"),
    user: required("SCS_DB_USER"),
    password: required("SCS_DB_PASSWORD"),
    poolMax: positiveInt("SCS_DB_POOL_MAX", 10),
    idleTimeoutMs: positiveInt("SCS_DB_IDLE_TIMEOUT_MS", 30_000),
    connectionTimeoutMs: positiveInt("SCS_DB_CONNECTION_TIMEOUT_MS", 5_000),
    statementTimeoutMs: positiveInt("SCS_DB_STATEMENT_TIMEOUT_MS", 15_000),
  };
  if (problems.length > 0) {
    throw new Error(`Invalid database configuration: ${problems.join("; ")}`);
  }
  return config;
}

// ── Startup role check ───────────────────────────────────────────────────────

export interface RoleFacts {
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly superuser: boolean;
  readonly bypassRls: boolean;
  readonly createRole: boolean;
  readonly createDb: boolean;
  readonly replication: boolean;
  readonly ownsDatabase: boolean;
  readonly scsSchemaExists: boolean;
  readonly ownsScsSchema: boolean;
  readonly ownedScsObjects: number;
}

// Attributes are checked for both session_user (who logged in) and
// current_user (who the session is acting as). pg_has_role(…, 'MEMBER') is
// true for the owner itself and for any member of the owning role.
const ROLE_FACTS_SQL = `
  WITH who AS (SELECT session_user::text AS session_user, current_user::text AS current_user),
  attrs AS (
    SELECT bool_or(rolsuper) AS superuser, bool_or(rolbypassrls) AS bypass_rls,
           bool_or(rolcreaterole) AS create_role, bool_or(rolcreatedb) AS create_db,
           bool_or(rolreplication) AS replication
    FROM pg_roles WHERE rolname IN (session_user, current_user)
  ),
  owns AS (
    SELECT
      (SELECT pg_has_role(session_user, datdba, 'MEMBER') OR pg_has_role(current_user, datdba, 'MEMBER')
         FROM pg_database WHERE datname = current_database()) AS owns_database,
      EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'scs') AS scs_schema_exists,
      COALESCE((SELECT pg_has_role(session_user, nspowner, 'MEMBER') OR pg_has_role(current_user, nspowner, 'MEMBER')
         FROM pg_namespace WHERE nspname = 'scs'), false) AS owns_scs_schema,
      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'scs'
           AND (pg_has_role(session_user, c.relowner, 'MEMBER') OR pg_has_role(current_user, c.relowner, 'MEMBER')))
      + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'scs'
           AND (pg_has_role(session_user, p.proowner, 'MEMBER') OR pg_has_role(current_user, p.proowner, 'MEMBER')))
        AS owned_scs_objects
  )
  SELECT * FROM who, attrs, owns`;

/** Every reason the connected role must not be used by the API (empty = acceptable). */
export function roleViolations(facts: RoleFacts): string[] {
  const who = facts.sessionUser === facts.currentUser ? `role "${facts.currentUser}"` : `roles "${facts.sessionUser}"/"${facts.currentUser}"`;
  const v: string[] = [];
  if (facts.superuser) v.push(`${who} is a superuser`);
  if (facts.bypassRls) v.push(`${who} can bypass row-level security (BYPASSRLS)`);
  if (facts.createRole) v.push(`${who} can create roles (CREATEROLE)`);
  if (facts.createDb) v.push(`${who} can create databases (CREATEDB)`);
  if (facts.replication) v.push(`${who} is a replication role`);
  if (facts.ownsDatabase) v.push(`${who} owns the database (or is a member of its owner)`);
  if (!facts.scsSchemaExists) v.push(`schema scs does not exist — migrations have not been applied to this database`);
  if (facts.ownsScsSchema) v.push(`${who} owns schema scs (or is a member of its owner)`);
  if (facts.ownedScsObjects > 0) v.push(`${who} owns ${facts.ownedScsObjects} object(s) in schema scs (or is a member of their owner)`);
  return v;
}

export async function readRoleFacts(client: pg.ClientBase): Promise<RoleFacts> {
  const { rows } = await client.query(ROLE_FACTS_SQL);
  const r = rows[0] as Record<string, unknown>;
  return {
    sessionUser: String(r["session_user"]),
    currentUser: String(r["current_user"]),
    superuser: r["superuser"] === true,
    bypassRls: r["bypass_rls"] === true,
    createRole: r["create_role"] === true,
    createDb: r["create_db"] === true,
    replication: r["replication"] === true,
    ownsDatabase: r["owns_database"] === true,
    scsSchemaExists: r["scs_schema_exists"] === true,
    ownsScsSchema: r["owns_scs_schema"] === true,
    ownedScsObjects: Number(r["owned_scs_objects"]),
  };
}

export class RestrictedRoleViolation extends Error {
  readonly violations: readonly string[];
  constructor(violations: readonly string[]) {
    super(`Refusing to start: the database role is not the restricted application role — ${violations.join("; ")}`);
    this.name = "RestrictedRoleViolation";
    this.violations = Object.freeze([...violations]);
  }
}

// ── Pool and transactions ────────────────────────────────────────────────────

/** What code inside a transaction may do: run parameterised queries. */
export interface Tx {
  query<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: readonly unknown[]): Promise<pg.QueryResult<R>>;
}

export interface Database {
  readonly roleFacts: RoleFacts;
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Create the pool and verify the connected role. Throws RestrictedRoleViolation
 * (after logging every violation and closing the pool) if the role is not
 * acceptable; the caller must then exit.
 */
export async function connectDatabase(config: DbConfig): Promise<Database> {
  const pool = new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.poolMax,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    statement_timeout: config.statementTimeoutMs,
    application_name: "scs-pilot-api",
  });
  pool.on("error", (err) => log.error("idle database connection failed", { err }));

  let facts: RoleFacts;
  try {
    const client = await pool.connect();
    try {
      facts = await readRoleFacts(client);
    } finally {
      client.release();
    }
  } catch (err) {
    await pool.end();
    throw err;
  }

  const violations = roleViolations(facts);
  if (violations.length > 0) {
    for (const violation of violations) log.error("database role check failed", { violation });
    await pool.end();
    throw new RestrictedRoleViolation(violations);
  }
  log.info("database role check passed", { role: facts.currentUser });

  return {
    roleFacts: facts,
    transaction: (fn) => runTransaction(pool, fn),
    close: () => pool.end(),
  };
}

async function runTransaction<T>(pool: pg.Pool, fn: (tx: Tx) => Promise<T>): Promise<T> {
  let client: pg.PoolClient;
  try {
    client = await pool.connect();
  } catch (err) {
    log.error("could not obtain a database connection", { err });
    throw platformFailure("DEPENDENCY_UNAVAILABLE", ["The database is unavailable."]);
  }

  const tx: Tx = { query: (text, values) => client.query(text, values === undefined ? undefined : [...values]) };
  try {
    await client.query("BEGIN");
    const result = await fn(tx);
    await client.query("COMMIT");
    client.release();
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
      client.release();
    } catch (rollbackErr) {
      log.error("rollback failed; discarding the connection", { err: rollbackErr });
      client.release(rollbackErr instanceof Error ? rollbackErr : true);
    }
    throw err;
  }
}
