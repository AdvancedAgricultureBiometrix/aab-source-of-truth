// Correlation IDs and structured logging.
//
// Every request runs inside runWithCorrelation(). The id is held in
// AsyncLocalStorage, so anything that runs during the request (handlers,
// database calls, validation, logging) can read it without it being passed
// around. Every log line carries `correlationId`; every error envelope does
// too (errors.ts → toEnvelope), and the server echoes it in the
// X-Correlation-Id response header.
//
// Framework-agnostic: the server calls resolveCorrelationId() with the
// inbound header value and wraps request handling in runWithCorrelation().

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const CORRELATION_HEADER = "x-correlation-id";

/**
 * An inbound X-Correlation-Id (from a gateway or a calling service) is kept so
 * one trace can span systems — but only if it is a plain token: 8–128 of
 * [A-Za-z0-9._:-]. A missing header gets a fresh UUID. A malformed or repeated
 * one is never passed through: it is replaced by a fresh UUID and the
 * replacement is logged (under the new id) so it can be investigated.
 */
const INBOUND_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const PREVIEW_LENGTH = 32;

interface CorrelationContext {
  readonly correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function resolveCorrelationId(inbound: string | readonly string[] | undefined): string {
  if (inbound === undefined) return randomUUID();
  if (typeof inbound === "string" && INBOUND_ID_PATTERN.test(inbound)) return inbound;

  const replacement = randomUUID();
  const reason = typeof inbound === "string" ? "invalid length or characters" : "header repeated";
  const raw = typeof inbound === "string" ? inbound : inbound.join(",");
  runWithCorrelation(replacement, () =>
    log.warn("inbound correlation id rejected and replaced", {
      reason,
      inboundLength: raw.length,
      // Only allowed characters are echoed; anything else shows as "?".
      inboundPreview: raw.slice(0, PREVIEW_LENGTH).replace(/[^A-Za-z0-9._:-]/g, "?"),
    }),
  );
  return replacement;
}

export function runWithCorrelation<T>(correlationId: string, fn: () => T): T {
  return storage.run(Object.freeze({ correlationId }), fn);
}

/** The current request's correlation id, or null outside any request (e.g. at startup). */
export function currentCorrelationId(): string | null {
  return storage.getStore()?.correlationId ?? null;
}

/** For code that must only ever run inside a request. */
export function requireCorrelationId(): string {
  const id = currentCorrelationId();
  if (id === null) throw new Error("No correlation context: this code must run inside runWithCorrelation()");
  return id;
}

// ── Logging ──────────────────────────────────────────────────────────────────
// One JSON object per line. Core keys (ts, level, correlationId, msg) are
// always present and cannot be overwritten by caller-supplied fields.

type Level = "info" | "warn" | "error";
type LogFields = Readonly<Record<string, unknown>>;

const CORE_KEYS = new Set(["ts", "level", "correlationId", "msg"]);

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: Level, msg: string, fields: LogFields = {}): void {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    extra[CORE_KEYS.has(key) ? `field_${key}` : key] = serialise(value);
  }
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    correlationId: currentCorrelationId(),
    msg,
    ...extra,
  });
  (level === "error" ? process.stderr : process.stdout).write(line + "\n");
}

export const log = {
  info: (msg: string, fields?: LogFields): void => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields): void => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields): void => write("error", msg, fields),
};
