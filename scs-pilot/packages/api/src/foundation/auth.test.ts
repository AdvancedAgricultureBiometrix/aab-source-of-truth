import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { authenticateRequest, extractBearerToken, MIN_TOKEN_LENGTH, StaticTokenAuthenticator } from "./auth.js";
import { ScsFailure } from "./errors.js";

const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const TOKEN_A = "token-a-0123456789-abcdefghijklmnop";
const TOKEN_B = "token-b-0123456789-abcdefghijklmnop";
const actorA = { actorId: "officer-a", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const actorB = { actorId: "svc-b", actorType: "SERVICE", roles: [], organizationId: "org-1", authenticationMethod: "STATIC_TOKEN" };
const config = { actors: [{ tokenSha256: sha(TOKEN_A), actor: actorA }, { tokenSha256: sha(TOKEN_B), actor: actorB }] };

test("extractBearerToken: absent header is null; one well-formed Bearer header is accepted", () => {
  assert.equal(extractBearerToken({}), null);
  assert.equal(extractBearerToken({ authorization: `Bearer ${TOKEN_A}` }), TOKEN_A);
});

test("extractBearerToken: any other Authorization form is refused as UNAUTHENTICATED", () => {
  for (const bad of ["Basic abc", `bearer ${TOKEN_A}`, `Bearer  ${TOKEN_A}`, "Bearer", `Bearer ${TOKEN_A} extra`, "Bearer tokén"]) {
    assert.throws(() => extractBearerToken({ authorization: bad }), (e: unknown) => e instanceof ScsFailure && e.code === "UNAUTHENTICATED", bad);
  }
});

test("a configured token resolves to its actor; an unknown token to null", async () => {
  const auth = StaticTokenAuthenticator.fromConfig(config);
  assert.deepEqual(await auth.authenticate(TOKEN_A), actorA);
  assert.deepEqual(await auth.authenticate(TOKEN_B), actorB);
  assert.equal(await auth.authenticate("unknown-token-0123456789-abcdefghij"), null);
});

test("returned actors are frozen", async () => {
  const actor = await StaticTokenAuthenticator.fromConfig(config).authenticate(TOKEN_A);
  assert.ok(Object.isFrozen(actor) && Object.isFrozen(actor!.roles));
});

test("authenticateRequest: missing, short, unknown tokens are UNAUTHENTICATED with generic reasons", async () => {
  const auth = StaticTokenAuthenticator.fromConfig(config);
  const reasonsOf = async (headers: Record<string, string>) => {
    try {
      await authenticateRequest(headers, auth);
      return null;
    } catch (e) {
      assert.ok(e instanceof ScsFailure && e.code === "UNAUTHENTICATED" && e.httpStatus === 401);
      return e.reasons;
    }
  };
  assert.deepEqual(await reasonsOf({}), ["A bearer token is required."]);
  const short = "x".repeat(MIN_TOKEN_LENGTH - 1);
  const shortAuth = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: sha(short), actor: actorA }] });
  await assert.rejects(authenticateRequest({ authorization: `Bearer ${short}` }, shortAuth), (e: unknown) => e instanceof ScsFailure && e.code === "UNAUTHENTICATED", "short token refused even if configured");
  assert.deepEqual(await reasonsOf({ authorization: "Bearer unknown-token-0123456789-abcdefghij" }), ["The bearer token is not valid."]);
  assert.deepEqual((await authenticateRequest({ authorization: `Bearer ${TOKEN_A}` }, auth)).actorId, "officer-a");
});

test("the actors config is validated in full; every problem is reported", () => {
  assert.throws(() => StaticTokenAuthenticator.fromConfig({ actors: [], extra: 1 }), /exactly \{ "actors"/);
  assert.throws(() => StaticTokenAuthenticator.fromConfig({ actors: [] }), /no actors configured/);
  assert.throws(
    () =>
      StaticTokenAuthenticator.fromConfig({
        actors: [
          { tokenSha256: "REPLACE_WITH_SHA256", actor: actorA },
          { tokenSha256: sha(TOKEN_A), actor: { ...actorA, actorType: "ROBOT", unknown: 1 } },
          { tokenSha256: sha(TOKEN_B), actor: { ...actorB, authenticationMethod: "OIDC" } },
          { tokenSha256: sha(TOKEN_B), actor: actorA },
        ],
      }),
    (err: Error) => {
      for (const part of [
        "actors[0].tokenSha256 must be 64 lowercase hex characters",
        '/actorType: must be one of ["HUMAN","SERVICE"]',
        'actors[1].actor: unknown property "unknown" is not allowed',
        "actors[2].actor.authenticationMethod must be STATIC_TOKEN",
        "actors[3].tokenSha256 duplicates an earlier entry",
      ]) {
        assert.ok(err.message.includes(part), `missing: ${part}\n${err.message}`);
      }
      return true;
    },
  );
});

test("the repository's example actors file is rejected until its placeholder is replaced", async () => {
  await assert.rejects(
    StaticTokenAuthenticator.fromFile(new URL("../../config/static-actors.example.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
    /tokenSha256 must be 64 lowercase hex characters/,
  );
});
