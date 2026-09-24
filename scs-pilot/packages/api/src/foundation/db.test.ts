import { test } from "node:test";
import assert from "node:assert/strict";

import { dbConfigFromEnv, roleViolations, type RoleFacts } from "./db.js";

const env = {
  SCS_DB_HOST: "db.internal",
  SCS_DB_NAME: "scs_pilot",
  SCS_DB_USER: "scs_api",
  SCS_DB_PASSWORD: "p@ss:w/rd-with-url-chars",
};

test("dbConfigFromEnv reads separate variables and applies defaults", () => {
  assert.deepEqual(dbConfigFromEnv(env), {
    host: "db.internal",
    port: 5432,
    database: "scs_pilot",
    user: "scs_api",
    password: "p@ss:w/rd-with-url-chars",
    poolMax: 10,
    idleTimeoutMs: 30_000,
    connectionTimeoutMs: 5_000,
    statementTimeoutMs: 15_000,
  });
});

test("dbConfigFromEnv reports every missing or invalid variable at once", () => {
  assert.throws(
    () => dbConfigFromEnv({ SCS_DB_HOST: " ", SCS_DB_PORT: "0", SCS_DB_POOL_MAX: "ten" }),
    (err: Error) => {
      for (const part of [
        "SCS_DB_HOST is not set",
        "SCS_DB_NAME is not set",
        "SCS_DB_USER is not set",
        "SCS_DB_PASSWORD is not set",
        'SCS_DB_PORT must be a positive integer, got "0"',
        'SCS_DB_POOL_MAX must be a positive integer, got "ten"',
      ]) {
        assert.ok(err.message.includes(part), part);
      }
      return true;
    },
  );
});

const restricted: RoleFacts = {
  sessionUser: "scs_api",
  currentUser: "scs_api",
  superuser: false,
  bypassRls: false,
  createRole: false,
  createDb: false,
  replication: false,
  ownsDatabase: false,
  scsSchemaExists: true,
  ownsScsSchema: false,
  ownedScsObjects: 0,
};

test("a restricted role has no violations", () => {
  assert.deepEqual(roleViolations(restricted), []);
});

test("each elevated attribute or ownership is a separate violation", () => {
  const cases: Array<[Partial<RoleFacts>, string]> = [
    [{ superuser: true }, "is a superuser"],
    [{ bypassRls: true }, "BYPASSRLS"],
    [{ createRole: true }, "CREATEROLE"],
    [{ createDb: true }, "CREATEDB"],
    [{ replication: true }, "replication role"],
    [{ ownsDatabase: true }, "owns the database"],
    [{ scsSchemaExists: false }, "schema scs does not exist"],
    [{ ownsScsSchema: true }, "owns schema scs"],
    [{ ownedScsObjects: 3 }, "owns 3 object(s) in schema scs"],
  ];
  for (const [change, expected] of cases) {
    const violations = roleViolations({ ...restricted, ...change });
    assert.equal(violations.length, 1, expected);
    assert.ok(violations[0]!.includes(expected), `${violations[0]} should mention ${expected}`);
  }
});

test("an owner that is also a superuser reports every violation", () => {
  const owner = { ...restricted, sessionUser: "scs_owner", currentUser: "scs_owner", superuser: true, createDb: true, createRole: true, bypassRls: true, ownsDatabase: true, ownsScsSchema: true, ownedScsObjects: 9 };
  assert.equal(roleViolations(owner).length, 7);
});

test("a session acting as another role names both roles", () => {
  const [v] = roleViolations({ ...restricted, sessionUser: "postgres", superuser: true });
  assert.ok(v!.includes('"postgres"/"scs_api"'));
});
