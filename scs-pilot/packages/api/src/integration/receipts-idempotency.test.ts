// Receipts and idempotency against real PostgreSQL, as a restricted role
// (member of scs_api), plus one end-to-end request through the HTTP server.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { SCHEMAS } from "../schemas/registry.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson, sha256Hex } from "../foundation/canonical.js";
import { runWithCorrelation } from "../foundation/correlation.js";
import { connectDatabase, type Database, type Tx } from "../foundation/db.js";
import { ScsFailure } from "../foundation/errors.js";
import { runIdempotent } from "../foundation/idempotency.js";
import { writeReceipt } from "../foundation/receipts.js";
import { createApiServer, type Route } from "../foundation/server.js";
import type { ScsFrameworkRegistrationDecision, ScsFrameworkRegistrationReceipt } from "../types/cap-01.js";
import type { ActorReference } from "../types/shared.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

let harness: MigratedDatabase;
let api: Database;

const actor: ActorReference = { actorId: "officer-1", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const DIGEST = "a".repeat(64);

function decision(overrides: Partial<ScsFrameworkRegistrationDecision> = {}): ScsFrameworkRegistrationDecision {
  return {
    decisionId: randomUUID(),
    frameworkId: randomUUID(),
    decision: "REGISTERED",
    eligibilityChecks: {
      regulationReferenceValid: true, commodityRecognised: true, countryOfOriginValid: true, destinationMarketValid: true,
      applicableLawsConfirmed: true, noConflictingFrameworkExists: true, registrantAuthorised: true,
    },
    decisionReasons: ["All eligibility checks passed."],
    decidedBy: actor,
    decidedAt: new Date().toISOString(),
    ...overrides,
  };
}

const receiptFor = (tx: Tx, d: ScsFrameworkRegistrationDecision, idempotencyKey: string | null = null) =>
  writeReceipt<ScsFrameworkRegistrationReceipt, "SCS-CAP-01", ScsFrameworkRegistrationDecision>(tx, {
    capabilityId: "SCS-CAP-01",
    decisionType: "FRAMEWORK_REGISTRATION",
    subjectId: d.decision === "REGISTERED" ? d.frameworkId : null,
    decision: d,
    issuedFor: actor,
    requestDigest: DIGEST,
    idempotencyKey,
    schema: SCHEMAS.cap01FrameworkRegistrationReceipt,
  });

const insertParty = (tx: Tx, name: string) =>
  tx.query(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1.0', now(), $2, 'COOPERATIVE', $1, 'TH', 'REGISTERED', '{}', $2, now())`,
    [name, JSON.stringify(actor)],
  );

const count = async (sql: string, values: unknown[] = []) =>
  Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
});

after(async () => {
  await api?.close();
  await harness?.drop();
});

// ── Receipts ─────────────────────────────────────────────────────────────────

test("a receipt is written in the decision's transaction, stored exactly and digested", async () => {
  const d = decision();
  const written = await runWithCorrelation("receipt-test-0001", () => api.transaction((tx) => receiptFor(tx, d, "idem-key-0001")));
  assert.equal(written.receipt.decision.decisionId, d.decisionId);
  assert.equal(written.receipt.correlationId, "receipt-test-0001");
  assert.equal(written.receiptDigest, sha256Hex(canonicalJson(written.receipt)));

  const { rows } = await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [written.receipt.receiptId]);
  const row = rows[0] as Record<string, unknown>;
  assert.equal(row["capability_id"], "SCS-CAP-01");
  assert.equal(row["decision"], "REGISTERED");
  assert.equal(row["subject_id"], d.frameworkId);
  assert.equal(row["idempotency_key"], "idem-key-0001");
  assert.equal(row["receipt_digest"], written.receiptDigest);
  assert.equal(sha256Hex(canonicalJson(row["receipt"])), written.receiptDigest, "stored document re-hashes to the same digest");
});

test("a receipt that does not match its schema throws INTERNAL_ERROR and rolls back the whole decision", async () => {
  const name = `rollback-${randomUUID()}`;
  await assert.rejects(
    runWithCorrelation("receipt-test-0002", () =>
      api.transaction(async (tx) => {
        await insertParty(tx, name);
        await receiptFor(tx, decision({ decision: "MAYBE" as never }));
      }),
    ),
    (e: unknown) => e instanceof ScsFailure && e.code === "INTERNAL_ERROR" && e.capabilityId === "SCS-CAP-01",
  );
  assert.equal(await count(`SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1`, [name]), 0, "decision rolled back");
  assert.equal(await count(`SELECT count(*) AS n FROM scs.decision_receipt WHERE correlation_id = 'receipt-test-0002'`), 0);
});

test("if the receipt insert fails, the decision rolls back too", async () => {
  const name = `insert-fail-${randomUUID()}`;
  await assert.rejects(
    runWithCorrelation("receipt-test-0003", () =>
      api.transaction(async (tx) => {
        await insertParty(tx, name);
        await writeReceipt(tx, {
          capabilityId: "SCS-CAP-01", decisionType: "FRAMEWORK_REGISTRATION", subjectId: null, decision: decision(),
          issuedFor: actor, requestDigest: "not-a-digest", idempotencyKey: null, schema: SCHEMAS.cap01FrameworkRegistrationReceipt,
        });
      }),
    ),
  );
  assert.equal(await count(`SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1`, [name]), 0);
});

test("receipts can never be changed: scs_api lacks the privilege; the owner is stopped by the trigger", async () => {
  await runWithCorrelation("receipt-test-0004", () => api.transaction((tx) => receiptFor(tx, decision())));
  await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.decision_receipt SET decision = 'X'`)), /permission denied/);
  await assert.rejects(api.transaction((tx) => tx.query(`DELETE FROM scs.decision_receipt`)), /permission denied/);
  for (const sql of [`UPDATE scs.decision_receipt SET decision = 'X'`, `DELETE FROM scs.decision_receipt`, `TRUNCATE scs.decision_receipt`]) {
    await assert.rejects(harness.admin.query(sql), /append-only/, `owner: ${sql}`);
  }
});

test("a receipt's document must carry its own receiptId: a missing one is refused, not passed as NULL (migration 019)", async () => {
  const insert = (receipt: Record<string, unknown>, receiptId: string) =>
    harness.admin.query(
      `INSERT INTO scs.decision_receipt (receipt_id, capability_id, decision_type, decision, subject_id, actor, correlation_id, idempotency_key,
         request_digest, receipt, receipt_digest, issued_at)
       VALUES ($1, 'SCS-CAP-01', 'FRAMEWORK_REGISTRATION', 'REGISTERED', NULL, $2, 'receipt-test-0019', NULL, $3, $4, $3, now())`,
      [receiptId, JSON.stringify(actor), DIGEST, JSON.stringify(receipt)],
    );
  const id = randomUUID();
  await assert.rejects(insert({}, id), /decision_receipt_receipt_id_matches_ck/, "no receiptId");
  await assert.rejects(insert({ receiptId: null }, id), /decision_receipt_receipt_id_matches_ck/, "a null receiptId");
  await assert.rejects(insert({ receiptId: randomUUID() }, id), /decision_receipt_receipt_id_matches_ck/, "another receipt's id");
  await insert({ receiptId: id }, id);
});

test("writeReceipt outside a request context refuses to run", async () => {
  await assert.rejects(api.transaction((tx) => receiptFor(tx, decision())), /No correlation context/);
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("first run executes and records; a replay returns the same response without running again", async () => {
  let runs = 0;
  const scope = { actorId: "officer-1", key: `key-${randomUUID()}`, fingerprint: "b".repeat(64) };
  const op = async () => ({ status: 201, body: { run: ++runs } });
  const first = await runWithCorrelation("idem-test-0001", () => runIdempotent(api, scope, op));
  const second = await runWithCorrelation("idem-test-0002", () => runIdempotent(api, scope, op));
  assert.deepEqual(first, { status: 201, body: { run: 1 }, replayed: false });
  assert.deepEqual(second, { status: 201, body: { run: 1 }, replayed: true });
  assert.equal(runs, 1);
});

test("the same key with a different request is IDEMPOTENCY_KEY_CONFLICT and nothing runs", async () => {
  let runs = 0;
  const key = `key-${randomUUID()}`;
  const op = async () => ({ status: 201, body: { run: ++runs } });
  await runWithCorrelation("idem-test-0003", () => runIdempotent(api, { actorId: "officer-1", key, fingerprint: "c".repeat(64) }, op));
  await assert.rejects(
    runWithCorrelation("idem-test-0004", () => runIdempotent(api, { actorId: "officer-1", key, fingerprint: "d".repeat(64) }, op)),
    (e: unknown) => e instanceof ScsFailure && e.code === "IDEMPOTENCY_KEY_CONFLICT" && e.httpStatus === 409,
  );
  assert.equal(runs, 1);
});

test("keys are per actor: another actor's identical key is independent", async () => {
  const key = `key-${randomUUID()}`;
  const a = await runWithCorrelation("idem-test-0005", () => runIdempotent(api, { actorId: "officer-1", key, fingerprint: "e".repeat(64) }, async () => ({ status: 201, body: { who: 1 } })));
  const b = await runWithCorrelation("idem-test-0006", () => runIdempotent(api, { actorId: "officer-2", key, fingerprint: "f".repeat(64) }, async () => ({ status: 201, body: { who: 2 } })));
  assert.equal(a.replayed || b.replayed, false);
});

test("a failed operation is not recorded and writes nothing; a retry runs again", async () => {
  const scope = { actorId: "officer-1", key: `key-${randomUUID()}`, fingerprint: "1".repeat(64) };
  const name = `failed-${randomUUID()}`;
  await assert.rejects(
    runWithCorrelation("idem-test-0007", () =>
      runIdempotent(api, scope, async (tx) => {
        await insertParty(tx, name);
        throw new ScsFailure({ capabilityId: "SCS-CAP-02", code: "PARTY_NAME_MISSING", reasons: ["x"], httpStatus: 422 });
      }),
    ),
  );
  assert.equal(await count(`SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1`, [name]), 0);
  assert.equal(await count(`SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1`, [scope.key]), 0);
  const retry = await runWithCorrelation("idem-test-0008", () => runIdempotent(api, scope, async () => ({ status: 201, body: { ok: true } })));
  assert.equal(retry.replayed, false);
});

test("concurrent requests with one key: exactly one runs to commit; the other replays its response", async () => {
  const scope = { actorId: "officer-1", key: `key-${randomUUID()}`, fingerprint: "2".repeat(64) };
  const name = `concurrent-${randomUUID()}`;
  const op = (label: string) => async (tx: Tx) => {
    await insertParty(tx, name);
    await tx.query("SELECT pg_sleep(0.3)");
    return { status: 201, body: { by: label } };
  };
  const [x, y] = await Promise.all([
    runWithCorrelation("idem-test-0009", () => runIdempotent(api, scope, op("x"))),
    runWithCorrelation("idem-test-0010", () => runIdempotent(api, scope, op("y"))),
  ]);
  assert.equal([x, y].filter((r) => r.replayed).length, 1, "one replayed");
  assert.deepEqual(x.body, y.body, "both callers get the committed response");
  assert.equal(await count(`SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1`, [name]), 1, "the loser's writes rolled back");
});

test("idempotency records are append-only for the owner too", async () => {
  for (const sql of [`UPDATE scs.idempotency_record SET response_status = 200`, `DELETE FROM scs.idempotency_record`, `TRUNCATE scs.idempotency_record`]) {
    await assert.rejects(harness.admin.query(sql), /append-only/, sql);
  }
});

// ── End to end through the HTTP server ───────────────────────────────────────

test("end to end: transactional, idempotent route writes one receipt; replay and conflict behave", async () => {
  const token = "e2e-token-0123456789-abcdefghijklmnop";
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: [{ tokenSha256: createHash("sha256").update(token).digest("hex"), actor }],
  });
  const requestSchema = {
    $id: "urn:aab:scs:schema:test:e2e-register:1",
    type: "object", additionalProperties: false, required: ["name"],
    properties: { name: { type: "string", minLength: 1 } },
  } as const;
  const route: Route<{ name: string }> = {
    method: "POST", path: "/test/register", capabilityId: "SCS-CAP-01", auth: "required", transactional: true, idempotency: "required", requestSchema,
    handle: async (ctx) => {
      await insertParty(ctx.tx!, ctx.body.name);
      const d = decision();
      const w = await writeReceipt<ScsFrameworkRegistrationReceipt, "SCS-CAP-01", ScsFrameworkRegistrationDecision>(ctx.tx!, {
        capabilityId: "SCS-CAP-01", decisionType: "FRAMEWORK_REGISTRATION", subjectId: d.frameworkId, decision: d,
        issuedFor: ctx.actor!, requestDigest: ctx.requestDigest, idempotencyKey: ctx.idempotencyKey, schema: SCHEMAS.cap01FrameworkRegistrationReceipt,
      });
      return { status: 201, body: { receipt: w.receipt, receiptDigest: w.receiptDigest } };
    },
  };
  const server: Server = createApiServer({ routes: [route as Route<never>], authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/test/register`;
  const post = (body: unknown, key?: string) =>
    fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(body),
    });
  try {
    const name = `e2e-${randomUUID()}`;
    const key = `e2e-key-${randomUUID()}`;
    const first = await post({ name }, key);
    const firstBody = (await first.json()) as { receipt: ScsFrameworkRegistrationReceipt; receiptDigest: string };
    assert.equal(first.status, 201);
    assert.equal(first.headers.get("idempotent-replayed"), null);
    assert.equal(firstBody.receipt.idempotencyKey, key);
    assert.equal(firstBody.receipt.correlationId, first.headers.get("x-correlation-id"));

    const replay = await post({ name }, key);
    assert.equal(replay.status, 201);
    assert.equal(replay.headers.get("idempotent-replayed"), "true");
    assert.deepEqual(await replay.json(), firstBody);

    const conflict = await post({ name: `${name}-other` }, key);
    assert.equal(conflict.status, 409);
    assert.equal(((await conflict.json()) as { error: string }).error, "IDEMPOTENCY_KEY_CONFLICT");

    const missingKey = await post({ name });
    assert.equal(missingKey.status, 400);

    assert.equal(await count(`SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1`, [name]), 1);
    assert.equal(await count(`SELECT count(*) AS n FROM scs.decision_receipt WHERE idempotency_key = $1`, [key]), 1);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
