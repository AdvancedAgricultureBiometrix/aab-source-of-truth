import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

import { currentCorrelationId, log, requireCorrelationId, resolveCorrelationId, runWithCorrelation } from "./correlation.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Capture JSON log lines written to stdout/stderr while fn runs. */
function captureLogs(fn: () => void): Array<Record<string, unknown>> {
  const lines: string[] = [];
  const out = process.stdout.write;
  const err = process.stderr.write;
  const grab = ((chunk: string | Uint8Array) => {
    lines.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stdout.write = grab;
  process.stderr.write = grab;
  try {
    fn();
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
  }
  return lines.map((l) => JSON.parse(l) as Record<string, unknown>);
}

test("a valid inbound correlation id is kept, without logging", () => {
  const logs = captureLogs(() => assert.equal(resolveCorrelationId("gw-abc.123:XYZ"), "gw-abc.123:XYZ"));
  assert.equal(logs.length, 0);
});

test("a missing header gets a fresh UUID, without logging", () => {
  const logs = captureLogs(() => assert.match(resolveCorrelationId(undefined), UUID));
  assert.equal(logs.length, 0);
});

test("malformed or repeated inbound ids are replaced and the replacement is logged", () => {
  const cases: Array<[string | string[], string]> = [
    ["short", "invalid length or characters"],
    ["has space in it", "invalid length or characters"],
    ["x".repeat(129), "invalid length or characters"],
    ['inj"ect\nlog-line', "invalid length or characters"],
    [["a-valid-id-1", "a-valid-id-2"], "header repeated"],
  ];
  for (const [inbound, reason] of cases) {
    let id = "";
    const logs = captureLogs(() => {
      id = resolveCorrelationId(inbound);
    });
    assert.match(id, UUID);
    assert.equal(logs.length, 1);
    const entry = logs[0]!;
    assert.equal(entry["level"], "warn");
    assert.equal(entry["correlationId"], id);
    assert.equal(entry["reason"], reason);
    assert.match(String(entry["inboundPreview"]), /^[A-Za-z0-9._:?-]*$/);
    assert.ok(String(entry["inboundPreview"]).length <= 32);
  }
});

test("correlation id survives await and timers; concurrent requests stay isolated", async () => {
  const ids = ["req-aaaaaaaa", "req-bbbbbbbb", "req-cccccccc"];
  const seen = await Promise.all(
    ids.map((id, i) =>
      runWithCorrelation(id, async () => {
        await sleep(15 - i * 5);
        await Promise.resolve();
        return [id, currentCorrelationId()] as const;
      }),
    ),
  );
  for (const [want, got] of seen) assert.equal(got, want);
});

test("outside a request there is no correlation id, and requireCorrelationId throws", () => {
  assert.equal(currentCorrelationId(), null);
  assert.throws(() => requireCorrelationId(), /No correlation context/);
});

test("every log line carries correlationId; caller fields cannot overwrite core keys", () => {
  const logs = captureLogs(() => {
    runWithCorrelation("req-logtest1", () => log.info("hello", { correlationId: "forged", msg: "forged", n: 1 }));
    log.error("startup failure", { err: new Error("boom") });
  });
  const [inRequest, atStartup] = logs;
  assert.equal(inRequest!["correlationId"], "req-logtest1");
  assert.equal(inRequest!["msg"], "hello");
  assert.equal(inRequest!["field_correlationId"], "forged");
  assert.equal(inRequest!["field_msg"], "forged");
  assert.equal(inRequest!["n"], 1);
  assert.equal(atStartup!["correlationId"], null);
  assert.equal(atStartup!["level"], "error");
  assert.equal((atStartup!["err"] as { message: string }).message, "boom");
});
