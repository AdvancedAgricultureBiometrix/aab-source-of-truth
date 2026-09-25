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
import { createApiServer, MAX_BODY_BYTES, type RawBody, type Route } from "./server.js";
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

const thingParamsSchema: JsonSchema = {
  $id: "urn:aab:scs:schema:test:server-thing-params:1",
  type: "object",
  additionalProperties: false,
  required: ["thingId"],
  properties: { thingId: { type: "string", format: "uuid" } },
};

const THING_A = "3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c";
const THING_B = "7c6b5a4f-3e2d-4c1b-8a9d-e1c8b2f3a4d5";

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
  {
    method: "POST", path: "/things/:thingId/notes", capabilityId: "SCS-CAP-02", auth: "required", transactional: true, idempotency: "required",
    requestSchema: echoSchema, paramsSchema: thingParamsSchema,
    handle: async (ctx) => ({ status: 201, body: { params: ctx.params, got: ctx.body, digest: ctx.requestDigest } }),
  },
  {
    method: "POST", path: "/upload", capabilityId: "SCS-PLATFORM", auth: "required", transactional: true, idempotency: "required",
    rawBody: { maxBytes: 16, mediaTypes: ["application/pdf", "application/octet-stream"], tooLarge: "EVIDENCE_OBJECT_TOO_LARGE", unsupportedType: "EVIDENCE_OBJECT_TYPE_UNSUPPORTED" },
    handle: async (ctx) => {
      const body = ctx.body as unknown as RawBody;
      return { status: 201, body: { size: body.bytes.length, mediaType: body.mediaType, text: body.bytes.toString("utf8"), digest: ctx.requestDigest } };
    },
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

test("path parameters: matched, URL-decoded, validated and passed to the handler", async () => {
  const r = await call("POST", `/things/${THING_A}/notes`, { headers: authed, body: '{"n":1}' });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json!["params"], { thingId: THING_A });
  const encoded = await call("POST", `/things/${encodeURIComponent(THING_B)}/notes`, { headers: authed, body: '{"n":1}' });
  assert.deepEqual(encoded.json!["params"], { thingId: THING_B });
});

test("an invalid path parameter: 400 REQUEST_VALIDATION_FAILED naming the path, attributed to the route's capability", async () => {
  const r = await call("POST", "/things/not-a-uuid/notes", { headers: authed, body: '{"n":1}' });
  assert.equal(r.status, 400);
  assert.equal(r.json!["error"], "REQUEST_VALIDATION_FAILED");
  assert.equal(r.json!["capabilityId"], "SCS-CAP-02");
  assert.deepEqual(r.json!["reasons"], ['path /thingId: must match format "uuid"']);
});

test("path parameters are checked after authentication", async () => {
  const r = await call("POST", "/things/not-a-uuid/notes", { headers: { "content-type": "application/json" }, body: '{"n":1}' });
  assert.equal(r.status, 401);
});

test("a parameterised path matches only whole, non-empty segments; other methods are 405", async () => {
  for (const path of ["/things//notes", `/things/${THING_A}`, `/things/${THING_A}/notes/extra`, `/things/${THING_A}/other`]) {
    assert.equal((await call("POST", path, { headers: authed, body: '{"n":1}' })).status, 404, path);
  }
  const wrong = await call("GET", `/things/${THING_A}/notes`);
  assert.equal(wrong.status, 405);
  assert.equal(wrong.headers.get("allow"), "POST");
});

test("the request digest covers the concrete path: same body, different parameter → different digest", async () => {
  const a = await call("POST", `/things/${THING_A}/notes`, { headers: authed, body: '{"n":1}' });
  const a2 = await call("POST", `/things/${THING_A}/notes`, { headers: authed, body: '{"n":1}' });
  const b = await call("POST", `/things/${THING_B}/notes`, { headers: authed, body: '{"n":1}' });
  assert.equal(a.json!["digest"], a2.json!["digest"]);
  assert.notEqual(a.json!["digest"], b.json!["digest"]);
});

test("a route without parameters keeps its digest: the fingerprint of the template itself", async () => {
  const { requestFingerprint } = await import("./idempotency.js");
  const r = await call("POST", "/echo", { headers: authed, body: '{"n":7}' });
  assert.equal(r.json!["digest"], requestFingerprint("POST", "/echo", { n: 7 }));
});

test("raw-body route: the handler gets the bytes and the media type (parameters ignored)", async () => {
  const r = await call("POST", "/upload", { headers: { ...authed, "content-type": "application/PDF; name=x" }, body: "%PDF-1.7 hello" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.deepEqual([r.json!["size"], r.json!["mediaType"], r.json!["text"]], [14, "application/pdf", "%PDF-1.7 hello"]);
});

test("raw-body route: a media type it does not accept is refused with the route's code", async () => {
  for (const contentType of ["application/json", "text/plain", ""]) {
    const r = await call("POST", "/upload", { headers: { ...authed, "content-type": contentType }, body: "abc" });
    assert.equal(r.status, 415, contentType);
    assert.equal(r.json!["error"], "EVIDENCE_OBJECT_TYPE_UNSUPPORTED");
    assert.equal(r.json!["capabilityId"], "SCS-PLATFORM");
  }
});

test("raw-body route: a body over the route's limit is refused with its code, declared or streamed", async () => {
  const declared = await call("POST", "/upload", { headers: { ...authed, "content-type": "application/octet-stream" }, body: "x".repeat(17) });
  assert.equal(declared.status, 413);
  assert.equal(declared.json!["error"], "EVIDENCE_OBJECT_TOO_LARGE");
  assert.deepEqual(declared.json!["reasons"], ["The request body must be at most 16 bytes."]);
  // no Content-Length: the limit is enforced while the body streams in
  const res = await fetch(`${base}/upload`, {
    method: "POST",
    headers: { ...authed, "content-type": "application/octet-stream" },
    body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("x".repeat(10))); c.enqueue(new TextEncoder().encode("x".repeat(10))); c.close(); } }),
    duplex: "half",
  } as RequestInit);
  assert.equal(res.status, 413);
  assert.equal(((await res.json()) as Record<string, unknown>)["error"], "EVIDENCE_OBJECT_TOO_LARGE");
});

test("raw-body route: an empty body is refused", async () => {
  const r = await call("POST", "/upload", { headers: { ...authed, "content-type": "application/pdf" }, body: "" });
  assert.equal(r.status, 400);
  assert.deepEqual(r.json!["reasons"], ["The request body is empty; a file is required."]);
});

test("raw-body route: the fingerprint covers the bytes (via their digest) and the media type", async () => {
  const send = (body: string, type = "application/pdf") => call("POST", "/upload", { headers: { ...authed, "content-type": type }, body });
  const a = await send("same bytes");
  const a2 = await send("same bytes");
  const b = await send("other bytes");
  const c = await send("same bytes", "application/octet-stream");
  assert.equal(a.json!["digest"], a2.json!["digest"]);
  assert.notEqual(a.json!["digest"], b.json!["digest"]);
  assert.notEqual(a.json!["digest"], c.json!["digest"]);
});

test("raw-body route: authentication is checked before the body", async () => {
  const r = await call("POST", "/upload", { headers: { "content-type": "text/plain" }, body: "x".repeat(100) });
  assert.equal(r.status, 401);
});

test("route tables that bypass the rules are refused at construction", () => {
  const post = { method: "POST", path: "/x", capabilityId: "SCS-CAP-01", auth: "required", transactional: true, idempotency: "required", requestSchema: echoSchema, handle: async () => ({ status: 200, body: {} }) } as const;
  const refused = (route: object, db: Database | null, pattern: RegExp) =>
    assert.throws(() => createApiServer({ routes: [route as Route<never>], authenticator, db }), pattern);
  refused({ ...post, idempotency: "none" }, fakeDb, /write routes must be authenticated, transactional and require an Idempotency-Key/);
  refused({ ...post, transactional: false }, fakeDb, /write routes must be authenticated, transactional and require an Idempotency-Key/);
  refused({ ...post, auth: "none" }, fakeDb, /write routes must be authenticated, transactional and require an Idempotency-Key/);
  refused(post, null, /no database/);
  refused({ ...post, method: "GET", transactional: false }, fakeDb, /idempotency requires a transactional route/);
  assert.throws(() => createApiServer({ routes: [routes[1]!, routes[1]!], authenticator, db: fakeDb }), /duplicate route/);
  refused({ ...post, path: "/x/:id" }, fakeDb, /must declare a paramsSchema/);
  const raw = { maxBytes: 1, mediaTypes: ["application/pdf"], tooLarge: "EVIDENCE_OBJECT_TOO_LARGE", unsupportedType: "EVIDENCE_OBJECT_TYPE_UNSUPPORTED" };
  refused({ ...post, rawBody: raw }, fakeDb, /a raw-body route has no requestSchema/);
  refused({ ...post, method: "GET", transactional: false, idempotency: "none", requestSchema: undefined, rawBody: raw }, fakeDb, /only a POST route can take a raw body/);
  refused({ ...post, requestSchema: undefined }, fakeDb, /must declare a requestSchema \(or a rawBody\)/);
  refused({ ...post, paramsSchema: thingParamsSchema }, fakeDb, /paramsSchema declared but the path has no parameters/);
  refused({ ...post, path: "/x/a:id", paramsSchema: thingParamsSchema }, fakeDb, /must be a whole segment/);
  refused({ ...post, path: "/x/:id/:id", paramsSchema: thingParamsSchema }, fakeDb, /duplicate path parameter name/);
  assert.throws(
    () => createApiServer({
      routes: [{ ...post, path: "/x/:a/y", paramsSchema: thingParamsSchema }, { ...post, path: "/x/:b/y", paramsSchema: thingParamsSchema }] as unknown as Route<never>[],
      authenticator, db: fakeDb,
    }),
    /parameterised paths overlap/,
  );
});
