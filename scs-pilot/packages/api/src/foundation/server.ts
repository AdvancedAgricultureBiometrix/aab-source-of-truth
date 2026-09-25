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
//      method → 405 METHOD_NOT_ALLOWED with an Allow header. A path segment
//      ":name" is a path parameter matching one non-empty segment; literal
//      paths are matched before parameterised ones
//   3. authentication, if the route requires it → 401 UNAUTHENTICATED
//   3a. path parameters: validated against route.paramsSchema (mandatory for
//      a route with parameters) → 400 REQUEST_VALIDATION_FAILED, reasons
//      prefixed "path"
//   4. body (POST): Content-Type must be application/json → 415; at most
//      MAX_BODY_BYTES → 413; must parse as JSON → 400 MALFORMED_JSON
//   5. schema validation (route.requestSchema) → 400 REQUEST_VALIDATION_FAILED
//   4'/5'. a raw-body route (route.rawBody, e.g. an evidence file upload)
//      instead: the Content-Type's media type must be one the route accepts
//      (route.rawBody.unsupportedType), the body at most rawBody.maxBytes
//      (route.rawBody.tooLarge, checked while streaming) and not empty (400
//      REQUEST_VALIDATION_FAILED). The handler receives the bytes and media
//      type; the request fingerprint covers their SHA-256, not the bytes.
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

import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { authenticateRequest, type ActorReference, type Authenticator } from "./auth.js";
import { canonicalJson } from "./canonical.js";
import { CORRELATION_HEADER, log, resolveCorrelationId, runWithCorrelation } from "./correlation.js";
import type { Database, Tx } from "./db.js";
import { asScsFailure, capabilityPlatformFailure, platformFailure, ScsFailure, toEnvelope, type CapabilityId, type PlatformErrorCode } from "./errors.js";
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
  /** Validated path parameters, e.g. { partyId } for /scs/v1/parties/:partyId/evidence; {} if none. */
  readonly params: Readonly<Record<string, string>>;
  /**
   * SHA-256 of the canonical {method, route, body}, where route is the
   * concrete path: the route template with its parameters filled in. So the
   * same key and body sent to another party is a different request (an
   * idempotency conflict, never a replay of the other party's response). For
   * a route without parameters it is the template itself. Recorded on receipts.
   */
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
  /** The transaction's isolation level; READ COMMITTED unless "repeatable read" (one snapshot for the whole request). */
  readonly isolation?: "repeatable read";
  /** Idempotency-Key header. Mandatory ("required") on every POST route. */
  readonly idempotency: "required" | "none";
  readonly requestSchema?: JsonSchema;
  /** A POST route whose body is a file, not JSON. Exclusive with requestSchema. */
  readonly rawBody?: RawBodySpec;
  /** Schema for the path parameters, as an object keyed by name. Required exactly when the path has parameters. */
  readonly paramsSchema?: JsonSchema;
  handle(ctx: RouteContext<TBody>): Promise<OperationResult>;
}

export interface ServerDeps {
  readonly routes: readonly Route<never>[];
  readonly authenticator: Authenticator;
  readonly db: Database | null;
}

const PARAM_SEGMENT = /^:([A-Za-z][A-Za-z0-9]*)$/;

/** A route template split into segments: a string is literal, { param } a path parameter. */
type Segment = string | { readonly param: string };

function parseTemplate(path: string): Segment[] {
  return path.split("/").slice(1).map((seg) => {
    const m = PARAM_SEGMENT.exec(seg);
    return m ? { param: m[1]! } : seg;
  });
}

const paramNames = (segments: readonly Segment[]) => segments.flatMap((s) => (typeof s === "string" ? [] : [s.param]));

/** The parameters of `path` if it matches the template, else null. Segments are URL-decoded. */
function matchTemplate(segments: readonly Segment[], path: string): Record<string, string> | null {
  const parts = path.split("/").slice(1);
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const seg = segments[i]!;
    if (typeof seg === "string") {
      if (parts[i] !== seg) return null;
      continue;
    }
    if (parts[i] === "") return null;
    try {
      params[seg.param] = decodeURIComponent(parts[i]!);
    } catch {
      return null;
    }
  }
  return params;
}

/** The concrete path: the template with its parameter values (encoded) filled in. */
function fillTemplate(segments: readonly Segment[], params: Readonly<Record<string, string>>): string {
  return "/" + segments.map((s) => (typeof s === "string" ? s : encodeURIComponent(params[s.param]!))).join("/");
}

/** True if some path could match both parameterised templates. */
function templatesOverlap(a: readonly Segment[], b: readonly Segment[]): boolean {
  return a.length === b.length && a.every((s, i) => typeof s !== "string" || typeof b[i] !== "string" || s === b[i]);
}

/** How a raw-body route accepts its body, and which platform codes refuse it. */
export interface RawBodySpec {
  readonly maxBytes: number;
  /** Accepted media types, lowercase; parameters (e.g. "; charset=…") are ignored. */
  readonly mediaTypes: readonly string[];
  readonly tooLarge: PlatformErrorCode;
  readonly unsupportedType: PlatformErrorCode;
}

/** The body a raw-body route's handler receives. */
export interface RawBody {
  readonly bytes: Buffer;
  readonly mediaType: string;
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
    const segments = parseTemplate(r.path);
    if (segments.some((s) => typeof s === "string" && s.includes(":"))) throw new Error(`route ${id}: a path parameter must be a whole segment ":name"`);
    const names = paramNames(segments);
    if (new Set(names).size !== names.length) throw new Error(`route ${id}: duplicate path parameter name`);
    if (names.length > 0 && r.paramsSchema === undefined) throw new Error(`route ${id}: routes with path parameters must declare a paramsSchema`);
    if (names.length === 0 && r.paramsSchema !== undefined) throw new Error(`route ${id}: paramsSchema declared but the path has no parameters`);
    if (r.rawBody !== undefined && r.method !== "POST") throw new Error(`route ${id}: only a POST route can take a raw body`);
    if (r.rawBody !== undefined && r.requestSchema !== undefined) throw new Error(`route ${id}: a raw-body route has no requestSchema`);
    if (r.method === "POST" && r.requestSchema === undefined && r.rawBody === undefined) {
      throw new Error(`route ${id}: POST routes must declare a requestSchema (or a rawBody)`);
    }
    if (r.method === "POST" && (r.auth !== "required" || !r.transactional || r.idempotency !== "required")) {
      throw new Error(`route ${id}: write routes must be authenticated, transactional and require an Idempotency-Key`);
    }
    if (r.idempotency === "required" && !r.transactional) throw new Error(`route ${id}: idempotency requires a transactional route`);
    if (r.idempotency === "required" && r.auth !== "required") throw new Error(`route ${id}: idempotency keys are per actor, so auth is required`);
    if (r.transactional && db === null) throw new Error(`route ${id}: transactional route but no database`);
  }
  const templates = [...new Set(routes.map((r) => r.path))].filter((p) => paramNames(parseTemplate(p)).length > 0);
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      if (templatesOverlap(parseTemplate(templates[i]!), parseTemplate(templates[j]!))) {
        throw new Error(`routes ${templates[i]} and ${templates[j]}: parameterised paths overlap`);
      }
    }
  }
}

/** Read the whole body, refusing it (with `tooLarge`) as soon as it exceeds `maxBytes`. */
async function readBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES, tooLarge: PlatformErrorCode = "PAYLOAD_TOO_LARGE"): Promise<Buffer> {
  const refuse = () => platformFailure(tooLarge, [`The request body must be at most ${maxBytes} bytes.`]);
  const declared = Number(req.headers["content-length"] ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) throw refuse();
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw refuse();
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** The media type of a Content-Type header: lowercase, parameters removed. */
function mediaTypeOf(header: string | undefined): string {
  return (header ?? "").split(";")[0]!.trim().toLowerCase();
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
  const literal = new Map([...byPath].filter(([p]) => paramNames(parseTemplate(p)).length === 0));
  const parameterised = [...byPath]
    .filter(([p]) => paramNames(parseTemplate(p)).length > 0)
    .map(([p, methods]) => ({ segments: parseTemplate(p), methods }));

  /** The methods registered for `path`, with its parameters; literal paths first. */
  const resolve = (path: string): { methods: Map<Method, Route<never>>; params: Record<string, string>; segments: Segment[] } | null => {
    const exact = literal.get(path);
    if (exact !== undefined) return { methods: exact, params: {}, segments: parseTemplate(path) };
    for (const t of parameterised) {
      const params = matchTemplate(t.segments, path);
      if (params !== null) return { methods: t.methods, params, segments: t.segments };
    }
    return null;
  };

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
        const resolved = resolve(path);
        if (resolved === null) throw platformFailure("ROUTE_NOT_FOUND", [`No route for ${path}.`]);
        const { methods, params, segments } = resolved;
        const route = methods.get(req.method as Method);
        if (route === undefined) {
          res.setHeader("allow", [...methods.keys()].join(", "));
          throw platformFailure("METHOD_NOT_ALLOWED", [`${req.method ?? "?"} is not allowed on ${path}.`]);
        }
        capabilityId = route.capabilityId;

        const actor = route.auth === "required" ? await authenticateRequest(req.headers, deps.authenticator) : null;
        actorId = actor?.actorId ?? null;

        if (route.paramsSchema !== undefined) {
          const checked = validate(route.capabilityId, route.paramsSchema, params);
          if (!checked.ok) {
            throw capabilityPlatformFailure(route.capabilityId, "REQUEST_VALIDATION_FAILED", checked.failure.reasons.map((x) => `path ${x}`));
          }
        }

        let body: unknown = undefined;
        let fingerprintBody: unknown = null;
        if (route.rawBody !== undefined) {
          const spec = route.rawBody;
          const mediaType = mediaTypeOf(req.headers["content-type"]);
          if (!spec.mediaTypes.includes(mediaType)) {
            throw platformFailure(spec.unsupportedType, [
              `Content-Type "${mediaType || "(none)"}" is not accepted; accepted media types: ${spec.mediaTypes.join(", ")}.`,
            ]);
          }
          const bytes = await readBody(req, spec.maxBytes, spec.tooLarge);
          if (bytes.length === 0) throw platformFailure("REQUEST_VALIDATION_FAILED", ["The request body is empty; a file is required."]);
          body = { bytes, mediaType } satisfies RawBody;
          fingerprintBody = { mediaType, sha256: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.length };
        } else if (route.method === "POST") {
          if (!JSON_CONTENT_TYPE.test(req.headers["content-type"] ?? "")) {
            throw platformFailure("UNSUPPORTED_MEDIA_TYPE", ["Content-Type must be application/json."]);
          }
          body = parseJson(await readBody(req));
          const checked = validate(route.capabilityId, route.requestSchema!, body);
          if (!checked.ok) throw checked.failure;
          fingerprintBody = body;
        }

        const idempotencyKey = route.idempotency === "required" ? readIdempotencyKey(req.headers) : null;
        if (route.idempotency === "required" && idempotencyKey === null) {
          throw platformFailure("REQUEST_VALIDATION_FAILED", ["An Idempotency-Key header is required for this request."]);
        }
        const requestDigest = requestFingerprint(route.method, fillTemplate(segments, params), fingerprintBody);
        const context = (tx: Tx | null) => ({ correlationId, actor, body: body as never, params, tx, idempotencyKey, requestDigest });
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
            route.isolation === undefined ? {} : { isolation: route.isolation },
          );
          result = outcome;
          replayed = outcome.replayed;
        } else if (route.transactional) {
          result = await deps.db!.transaction(
            async (tx) => checkResult(await route.handle(context(tx))),
            route.isolation === undefined ? {} : { isolation: route.isolation },
          );
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
