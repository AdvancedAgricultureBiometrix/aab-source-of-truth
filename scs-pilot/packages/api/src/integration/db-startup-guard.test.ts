// db.ts startup guard and transaction helper, against real PostgreSQL logins.
// connectDatabase() must refuse any role that is a superuser, can bypass RLS,
// or owns (or is a member of the owner of) scs objects — and accept only a
// restricted role.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { connectDatabase, RestrictedRoleViolation } from "../foundation/db.js";
import { adminUrl, createMigratedDatabase, type MigratedDatabase } from "./harness.js";

let db: MigratedDatabase;

before(async () => {
  db = await createMigratedDatabase();
});

after(async () => {
  await db?.drop();
});

async function assertRefused(user: string, password: string, expected: RegExp): Promise<void> {
  await assert.rejects(connectDatabase(db.configFor(user, password)), (err: unknown) => {
    assert.ok(err instanceof RestrictedRoleViolation, `expected RestrictedRoleViolation, got ${String(err)}`);
    assert.ok(err.violations.some((v) => expected.test(v)), `violations ${JSON.stringify(err.violations)} should match ${expected}`);
    return true;
  });
}

test("refuses the admin / owner (superuser, owns the database and scs)", async () => {
  const url = new URL(adminUrl());
  await assert.rejects(connectDatabase(db.configFor(decodeURIComponent(url.username), decodeURIComponent(url.password))), (err: unknown) => {
    assert.ok(err instanceof RestrictedRoleViolation);
    const all = err.violations.join("\n");
    assert.match(all, /is a superuser/);
    assert.match(all, /owns schema scs/);
    assert.match(all, /object\(s\) in schema scs/);
    return true;
  });
});

test("refuses a role with BYPASSRLS", async () => {
  const { user, password } = await db.createLoginRole("NOSUPERUSER BYPASSRLS");
  await assertRefused(user, password, /BYPASSRLS/);
});

test("refuses a role with CREATEROLE", async () => {
  const { user, password } = await db.createLoginRole("NOSUPERUSER CREATEROLE");
  await assertRefused(user, password, /CREATEROLE/);
});

test("refuses a role that owns an object in scs", async () => {
  const { user, password } = await db.createLoginRole("NOSUPERUSER");
  await db.admin.query(`ALTER FUNCTION scs.text_array_is_distinct(text[]) OWNER TO ${user}`);
  await assertRefused(user, password, /owns 1 object\(s\) in schema scs/);
});

test("refuses a member of the role that owns scs", async () => {
  const owner = decodeURIComponent(new URL(adminUrl()).username);
  const { user, password } = await db.createLoginRole(`NOSUPERUSER IN ROLE ${owner}`);
  await assertRefused(user, password, /owns schema scs/);
});

test("accepts a restricted role, and transactions commit or roll back as a unit", async () => {
  const { user, password } = await db.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  const api = await connectDatabase(db.configFor(user, password));
  try {
    assert.equal(api.roleFacts.currentUser, user);
    const insert = `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
                      country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
                    VALUES (1, '1.0', now(), '{"actorId":"t"}', 'COOPERATIVE', $1, 'TH', 'REGISTERED', '{}', '{"actorId":"t"}', now())`;
    const count = async (name: string) =>
      Number((await api.transaction((tx) => tx.query<{ n: string }>("SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1", [name]))).rows[0]!.n);

    await api.transaction(async (tx) => {
      await tx.query(insert, ["committed"]);
    });
    assert.equal(await count("committed"), 1, "committed row is visible");

    await assert.rejects(
      api.transaction(async (tx) => {
        await tx.query(insert, ["rolled-back"]);
        throw new Error("fail after insert");
      }),
      /fail after insert/,
    );
    assert.equal(await count("rolled-back"), 0, "rolled-back row is not visible");

    await assert.rejects(
      api.transaction(async (tx) => {
        await tx.query(insert, ["before-update"]);
        await tx.query("UPDATE scs.party_identity SET party_name = 'changed'");
      }),
      /permission denied/,
    );
    assert.equal(await count("before-update"), 0, "a denied statement rolls back the whole transaction");

    // the pool is still usable after failures
    assert.equal(await count("committed"), 1);
  } finally {
    await api.close();
  }
});
