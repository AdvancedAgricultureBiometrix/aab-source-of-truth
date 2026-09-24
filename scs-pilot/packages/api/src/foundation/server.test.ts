// HTTP behaviour of foundation/server.ts over real sockets (no database).

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import "../schemas/registry.js";
import { StaticTokenAuthenticator } from "./auth.js";
import { ScsFailure } from "./errors.js";
import type { Database, RoleFacts } from "./db.js";
import { createApiServer, MAX_BODY_BYTES, type Route } from "./server.js";
import type { JsonSchema } from "./validation.js";

const TOKEN = "server-test-token-0123456789abcdefgh";
const authenticator = StaticTokenAuthenticator.fromConfig({
  actors: [
    {
      tokenSha256: createHash("sha256").update(TOKEN).digest("hex"),
      actor: { actorId: "tester", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
    },
  ],
});

const echoSchema: JsonSchema = {
  $id: "urn:aab:scs:schema:test:server-echo:1",
  type: "object",
  additionalProperties: false,
  required: ["n"],
  properties: { n: { type: "integer" } },
};

/** In-memory stand-in: every query succeeds and returns no rows (no idempotency record found). */
const fakeDb: Database = {
  roleFacts: {} as RoleFacts,
  transaction: async (fn) => fn({ query: async () => ({ rows: [], rowCount: 0, command: "", oid: 0, fields: [] }) as never }),
  close: async () => undefined,
};

const routes: Route<never>[] = [
  {
    method: "POST", path: "/echo", capabilityId: "SCS-CAP-01", auth: "required", transactional: true, idempotency: "required", requestSchema: echoSchema,
    handle: async (ctx) => ({ status: 201, body: { got: ctx.body, actor: ctx.actor?.actorId, digest: ctx.requestDigest } }),
  },
  { method: "GET", path: "/public", capabilityId: "SCS-CAP-01", auth: "none", transactional: false, idempotency: "none", handle: async () => ({ status: 200, body: { ok: true } }) },
  {
    method: "GET", path: "/fails", capabilityId: "SCS-CAP-02", auth: "none", transactional: false, idempotency: "none",
    handle: async () => { throw new ScsFailure({ capabilityId: "SCS-CAP-02", code: "PARTY_NAME_MISSING", reasons: ["partyName is required"], httpStatus: 422 }); },
  },
  { method: "GET", path: "/crashes", capabilityId: "SCS-CAP-02", auth: "none", transactional: false, idempotency: "none", handle: async () => { throw new Error("secret=hunter2"); } },
  { method: "GET", path: "/bad-status", capabilityId: "SCS-CAP-01", auth: "none", transactional: false, idempotency: "none", handle: async () => ({ status: 404, body: {} }) },
];

let server: Server;
let base = "";

before(async () => {
  server = createApiServer({ routes, authenticator, db: fakeDb });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));

async function call(method: string, path: string, init: { headers?: Record<string, string>; body?: string } = {}) {
  const res = await fetch(base + path, { method, headers: init.headers ?? {}, body: init.body ?? null });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}
const authed = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": "server-test-key-0001" };

test("response bodies are canonical JSON: keys sorted at every depth, no whitespace", async () => {
  const res = await fetch(`${base}/nope`);
  const text = await res.text();
  const { canonicalJson } = await import("./canonical.js");
  assert.equal(text, canonicalJson(JSON.parse(text)));
  assert.ok(text.startsWith('{"capabilityId":'), text.slice(0, 40));
});

test("GET /health: 200, JSON, no-store, nosniff, correlation id", async () => {
  const r = await call("GET", "/health");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { status: "ok", service: "scs-pilot-api" });
  assert.match(r.headers.get("content-type")!, /application\/json/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.match(r.headers.get("x-correlation-id")!, /^[0-9a-f-]{36}$/);
});

test("a valid inbound correlation id is echoed and appears in error envelopes", async () => {
  const r = await call("GET", "/nope", { headers: { "x-correlation-id": "gateway-trace-0001" } });
  assert.equal(r.headers.get("x-correlation-id"), "gateway-trace-0001");
  assert.equal(r.json!["correlationId"], "gateway-trace-0001");
});

test("unknown path: 404 canonical envelope from SCS-PLATFORM", async () => {
  const r = await call("GET", "/nope");
  assert.equal(r.status, 404);
  assert.deepEqual(Object.keys(r.json!).sort(), ["capabilityId", "correlationId", "error", "noWrites", "ok", "reasons", "result"]);
  assert.equal(r.json!["error"], "ROUTE_NOT_FOUND");
  assert.equal(r.json!["capabilityId"], "SCS-PLATFORM");
});

test("known path, wrong method: 405 with Allow", async () => {
  const r = await call("DELETE", "/echo");
  assert.equal(r.status, 405);
  assert.equal(r.headers.get("allow"), "POST");
  assert.equal(r.json!["error"], "METHOD_NOT_ALLOWED");
});

test("auth required: no token 401 with WWW-Authenticate; bad token 401", async () => {
  const none = await call("POST", "/echo", { headers: { "content-type": "application/json" }, body: '{"n":1}' });
  assert.equal(none.status, 401);
  assert.equal(none.json!["error"], "UNAUTHENTICATED");
  assert.match(none.headers.get("www-authenticate")!, /^Bearer/);
  const bad = await call("POST", "/echo", { headers: { ...authed, authorization: "Bearer not-the-right-token-0123456789-abc" }, body: '{"n":1}' });
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.json!["reasons"], ["The bearer token is not valid."]);
});

test("authenticated, valid body: handler runs and sees the actor and request digest", async () => {
  const r = await call("POST", "/echo", { headers: authed, body: '{"n":7}' });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json!["got"], { n: 7 });
  assert.equal(r.json!["actor"], "tester");
  assert.match(String(r.json!["digest"]), /^[0-9a-f]{64}$/);
});

test("write route without an Idempotency-Key: 400; with a malformed one: 400", async () => {
  const { "idempotency-key": _omit, ...noKey } = authed;
  const missing = await call("POST", "/echo", { headers: noKey, body: '{"n":1}' });
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.json!["reasons"], ["An Idempotency-Key header is required for this request."]);
  const malformed = await call("POST", "/echo", { headers: { ...authed, "idempotency-key": "bad key!" }, body: '{"n":1}' });
  assert.equal(malformed.status, 400);
});

test("wrong content type: 415", async () => {
  const r = await call("POST", "/echo", { headers: { ...authed, "content-type": "text/plain" }, body: '{"n":1}' });
  assert.equal(r.status, 415);
  assert.equal(r.json!["error"], "UNSUPPORTED_MEDIA_TYPE");
});

test("malformed or empty JSON: 400 MALFORMED_JSON", async () => {
  for (const body of ["{", ""]) {
    const r = await call("POST", "/echo", { headers: authed, body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.json!["error"], "MALFORMED_JSON");
  }
});

test("schema violation: 400 REQUEST_VALIDATION_FAILED attributed to the route's capability", async () => {
  const r = await call("POST", "/echo", { headers: authed, body: '{"n":"7","x":1}' });
  assert.equal(r.status, 400);
  assert.equal(r.json!["error"], "REQUEST_VALIDATION_FAILED");
  assert.equal(r.json!["capabilityId"], "SCS-CAP-01");
  assert.equal(r.json!["noFrameworkRegistered"], true);
  assert.equal((r.json!["reasons"] as string[]).length, 2);
});

test("body over the limit: 413", async () => {
  const r = await call("POST", "/echo", { headers: authed, body: `{"n":1,"pad":"${"x".repeat(MAX_BODY_BYTES)}"}` });
  assert.equal(r.status, 413);
  assert.equal(r.json!["error"], "PAYLOAD_TOO_LARGE");
});

test("a thrown ScsFailure keeps its code, status and capability flags", async () => {
  const r = await call("GET", "/fails");
  assert.equal(r.status, 422);
  assert.equal(r.json!["error"], "PARTY_NAME_MISSING");
  assert.equal(r.json!["noPartyRegistered"], true);
});

test("an unexpected error is 500 INTERNAL_ERROR and never leaks its message", async () => {
  const r = await call("GET", "/crashes");
  assert.equal(r.status, 500);
  assert.equal(r.json!["error"], "INTERNAL_ERROR");
  assert.ok(!JSON.stringify(r.json).includes("hunter2"));
});

test("a handler that returns a non-2xx result is treated as a defect: 500", async () => {
  const r = await call("GET", "/bad-status");
  assert.equal(r.status, 500);
  assert.equal(r.json!["error"], "INTERNAL_ERROR");
});

test("route tables that bypass the rules are refused at construction", () => {
  const post = { method: "POST", path: "/x", capabilityId: "SCS-CAP-01", auth: "required", transactional: true, idempotency: "required", requestSchema: echoSchema, handle: async () => ({ status: 200, body: {} }) } as const;
  const refused = (route: object, db: Database | null, pattern: RegExp) =>
    assert.throws(() => createApiServer({ routes: [route as Route<never>], authenticator, db }), pattern);
  refused({ ...post, requestSchema: undefined }, fakeDb, /must declare a requestSchema/);
  refused({ ...post, idempotency: "none" }, fakeDb, /write routes must be authenticated, transactional and require an Idempotency-Key/);
  refused({ ...post, transactional: false }, fakeDb, /write routes must be authenticated, transactional and require an Idempotency-Key/);
  refused({ ...post, auth: "none" }, fakeDb, /write routes must be authenticated, transactional and require an Idempotency-Key/);
  refused(post, null, /no database/);
  refused({ ...post, method: "GET", transactional: false }, fakeDb, /idempotency requires a transactional route/);
  assert.throws(() => createApiServer({ routes: [routes[1]!, routes[1]!], authenticator, db: fakeDb }), /duplicate route/);
});
