// HTTP server on node:http — routing, request parsing, response writing.
//
// No framework: every status code, header and body the API sends is written
// here, and validation happens once (validation.ts), not twice. Capability
// handlers are plain functions of a RouteContext and never touch http objects,
// so replacing this file would not change any capability.
//
// Per request, in order:
//   1. correlation id: inbound X-Correlation-Id if valid, else a fresh UUID
//      (correlation.ts); echoed on every response and in every log line
//   2. route match: unknown path → 404 ROUTE_NOT_FOUND; known path, other
//      method → 405 METHOD_NOT_ALLOWED with an Allow header
//   3. authentication, if the route requires it → 401 UNAUTHENTICATED
//   4. body (POST): Content-Type must be application/json → 415; at most
//      MAX_BODY_BYTES → 413; must parse as JSON → 400 MALFORMED_JSON
//   5. schema validation (route.requestSchema) → 400 REQUEST_VALIDATION_FAILED
//   6. idempotency key → 400 if missing or malformed. Every write route
//      (POST) must be authenticated, transactional and require an
//      Idempotency-Key: a route table that declares otherwise is refused at
//      startup, so a fire-and-forget write cannot be registered.
//      TODO(idempotency-retention): records are kept indefinitely.
//   7. handler — transactional routes run inside one database transaction
//      (with their receipt and idempotency record); idempotent replays are
//      marked with Idempotent-Replayed: true
//
// Every response body is canonical JSON (sorted keys, foundation/canonical.ts):
// one deterministic form, so an idempotent replay — read back from jsonb,
// which reorders keys — is byte-identical to the original response.
//
// Handlers return only 2xx results; every failure is thrown as an ScsFailure
// (so a failed request always rolls back and writes nothing). Anything else
// thrown becomes INTERNAL_ERROR with a generic reason; details go to the log.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { authenticateRequest, type ActorReference, type Authenticator } from "./auth.js";
import { canonicalJson } from "./canonical.js";
import { CORRELATION_HEADER, log, resolveCorrelationId, runWithCorrelation } from "./correlation.js";
import type { Database, Tx } from "./db.js";
import { asScsFailure, platformFailure, ScsFailure, toEnvelope, type CapabilityId } from "./errors.js";
import { readIdempotencyKey, requestFingerprint, runIdempotent, type OperationResult } from "./idempotency.js";
import { validate, type JsonSchema } from "./validation.js";

export const MAX_BODY_BYTES = 1024 * 1024;

type Method = "GET" | "POST";

export interface RouteContext<TBody> {
  readonly correlationId: string;
  /** Present on every route with auth: "required". */
  readonly actor: ActorReference | null;
  /** The validated request body (undefined for GET). */
  readonly body: TBody;
  /** The open transaction, on transactional routes; null otherwise. */
  readonly tx: Tx | null;
  readonly idempotencyKey: string | null;
  /** SHA-256 of the canonical {method, route, body}; recorded on receipts. */
  readonly requestDigest: string;
}

export interface Route<TBody = unknown> {
  readonly method: Method;
  readonly path: string;
  /** Whose failures these are; SCS-PLATFORM only for platform routes such as /health. */
  readonly capabilityId: CapabilityId;
  readonly auth: "required" | "none";
  /** Run the handler inside one database transaction. */
  readonly transactional: boolean;
  /** Idempotency-Key header. Mandatory ("required") on every POST route. */
  readonly idempotency: "required" | "none";
  readonly requestSchema?: JsonSchema;
  handle(ctx: RouteContext<TBody>): Promise<OperationResult>;
}

export interface ServerDeps {
  readonly routes: readonly Route<never>[];
  readonly authenticator: Authenticator;
  readonly db: Database | null;
}

const JSON_CONTENT_TYPE = /^application\/json\s*(;\s*charset=utf-8\s*)?$/i;

export const healthRoute: Route<undefined> = {
  method: "GET",
  path: "/health",
  capabilityId: "SCS-PLATFORM",
  auth: "none",
  transactional: false,
  idempotency: "none",
  handle: async () => ({ status: 200, body: { status: "ok", service: "scs-pilot-api" } }),
};

/** Refuse route tables that would bypass the rules above. */
function checkRoutes(routes: readonly Route<never>[], db: Database | null): void {
  const seen = new Set<string>();
  for (const r of routes) {
    const id = `${r.method} ${r.path}`;
    if (seen.has(id)) throw new Error(`duplicate route ${id}`);
    seen.add(id);
    if (!r.path.startsWith("/") || r.path.includes("?")) throw new Error(`route ${id}: path must start with / and have no query`);
    if (r.method === "POST" && r.requestSchema === undefined) throw new Error(`route ${id}: POST routes must declare a requestSchema`);
    if (r.method === "POST" && (r.auth !== "required" || !r.transactional || r.idempotency !== "required")) {
      throw new Error(`route ${id}: write routes must be authenticated, transactional and require an Idempotency-Key`);
    }
    if (r.idempotency === "required" && !r.transactional) throw new Error(`route ${id}: idempotency requires a transactional route`);
    if (r.idempotency === "required" && r.auth !== "required") throw new Error(`route ${id}: idempotency keys are per actor, so auth is required`);
    if (r.transactional && db === null) throw new Error(`route ${id}: transactional route but no database`);
  }
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const declared = Number(req.headers["content-length"] ?? NaN);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw platformFailure("PAYLOAD_TOO_LARGE", [`The request body must be at most ${MAX_BODY_BYTES} bytes.`]);
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) {
      throw platformFailure("PAYLOAD_TOO_LARGE", [`The request body must be at most ${MAX_BODY_BYTES} bytes.`]);
    }
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

function parseJson(raw: Buffer): unknown {
  const text = raw.toString("utf8");
  if (text.trim() === "") throw platformFailure("MALFORMED_JSON", ["The request body is empty; a JSON object is required."]);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw platformFailure("MALFORMED_JSON", ["The request body is not valid JSON."]);
  }
}

function send(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const payload = canonicalJson(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  res.end(payload);
}

export function createApiServer(deps: ServerDeps): Server {
  const routes: readonly Route<never>[] = [healthRoute as Route<never>, ...deps.routes];
  checkRoutes(routes, deps.db);
  const byPath = new Map<string, Map<Method, Route<never>>>();
  for (const r of routes) {
    const methods = byPath.get(r.path) ?? new Map<Method, Route<never>>();
    methods.set(r.method, r);
    byPath.set(r.path, methods);
  }

  const server = createServer((req, res) => {
    const correlationId = resolveCorrelationId(req.headers[CORRELATION_HEADER]);
    res.setHeader("x-correlation-id", correlationId);
    const started = process.hrtime.bigint();
    const path = new URL(req.url ?? "/", "http://localhost").pathname;

    void runWithCorrelation(correlationId, async () => {
      let status = 500;
      let capabilityId: CapabilityId = "SCS-PLATFORM";
      let actorId: string | null = null;
      try {
        const methods = byPath.get(path);
        if (methods === undefined) throw platformFailure("ROUTE_NOT_FOUND", [`No route for ${path}.`]);
        const route = methods.get(req.method as Method);
        if (route === undefined) {
          res.setHeader("allow", [...methods.keys()].join(", "));
          throw platformFailure("METHOD_NOT_ALLOWED", [`${req.method ?? "?"} is not allowed on ${path}.`]);
        }
        capabilityId = route.capabilityId;

        const actor = route.auth === "required" ? await authenticateRequest(req.headers, deps.authenticator) : null;
        actorId = actor?.actorId ?? null;

        let body: unknown = undefined;
        if (route.method === "POST") {
          if (!JSON_CONTENT_TYPE.test(req.headers["content-type"] ?? "")) {
            throw platformFailure("UNSUPPORTED_MEDIA_TYPE", ["Content-Type must be application/json."]);
          }
          body = parseJson(await readBody(req));
          const checked = validate(route.capabilityId, route.requestSchema!, body);
          if (!checked.ok) throw checked.failure;
        }

        const idempotencyKey = route.idempotency === "required" ? readIdempotencyKey(req.headers) : null;
        if (route.idempotency === "required" && idempotencyKey === null) {
          throw platformFailure("REQUEST_VALIDATION_FAILED", ["An Idempotency-Key header is required for this request."]);
        }
        const requestDigest = requestFingerprint(route.method, route.path, body ?? null);
        const context = (tx: Tx | null) => ({ correlationId, actor, body: body as never, tx, idempotencyKey, requestDigest });
        const checkResult = (result: OperationResult): OperationResult => {
          if (!Number.isInteger(result.status) || result.status < 200 || result.status > 299) {
            throw new Error(`handler for ${route.method} ${route.path} returned status ${result.status}; failures must be thrown`);
          }
          return result;
        };

        let result: OperationResult;
        let replayed = false;
        if (route.transactional && idempotencyKey !== null && actor !== null) {
          const outcome = await runIdempotent(
            deps.db!,
            { actorId: actor.actorId, key: idempotencyKey, fingerprint: requestDigest },
            async (tx) => checkResult(await route.handle(context(tx))),
          );
          result = outcome;
          replayed = outcome.replayed;
        } else if (route.transactional) {
          result = await deps.db!.transaction(async (tx) => checkResult(await route.handle(context(tx))));
        } else {
          result = checkResult(await route.handle(context(null)));
        }

        status = result.status;
        send(res, result.status, result.body, replayed ? { "idempotent-replayed": "true" } : {});
      } catch (err) {
        const failure = asScsFailure(err, capabilityId);
        if (!(err instanceof ScsFailure)) log.error("unhandled error", { err, method: req.method, path });
        status = failure.httpStatus;
        if (status === 401) res.setHeader("www-authenticate", 'Bearer realm="scs"');
        send(res, status, toEnvelope(failure, correlationId));
        if (!req.complete) req.resume(); // drain an unread body so the connection can close cleanly
      } finally {
        log.info("request", {
          method: req.method,
          path,
          status,
          capabilityId,
          actorId,
          durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        });
      }
    });
  });

  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
