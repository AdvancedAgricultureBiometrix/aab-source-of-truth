import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";

import { authenticateRequest, deploymentScopeId, extractBearerToken, MIN_TOKEN_LENGTH, StaticTokenAuthenticator } from "./auth.js";
import { ScsFailure } from "./errors.js";
import { validate } from "./validation.js";
import { runWithCorrelation } from "./correlation.js";
import { SCHEMAS } from "../schemas/registry.js";

const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const TOKEN_A = "token-a-0123456789-abcdefghijklmnop";
const TOKEN_B = "token-b-0123456789-abcdefghijklmnop";
const TOKEN_C = "token-c-0123456789-abcdefghijklmnop";
const TH = { issuerCountry: "TH" };
const actorA = { actorId: "officer-a", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const actorB = { actorId: "svc-b", actorType: "SERVICE", roles: [], authenticationMethod: "STATIC_TOKEN" };
const config = { actors: [{ tokenSha256: sha(TOKEN_A), actor: actorA }, { tokenSha256: sha(TOKEN_B), actor: actorB }] };
const spki = () => generateKeyPairSync("ed25519").publicKey.export({ format: "der", type: "spki" }).toString("base64");
const PARTY = "SCS:PARTY:4b1f05b0-0000-4000-8000-000000000001";

test("extractBearerToken: absent header is null; one well-formed Bearer header is accepted", () => {
  assert.equal(extractBearerToken({}), null);
  assert.equal(extractBearerToken({ authorization: `Bearer ${TOKEN_A}` }), TOKEN_A);
});

test("extractBearerToken: any other Authorization form is refused as UNAUTHENTICATED", () => {
  for (const bad of ["Basic abc", `bearer ${TOKEN_A}`, `Bearer  ${TOKEN_A}`, "Bearer", `Bearer ${TOKEN_A} extra`, "Bearer tokén"]) {
    assert.throws(() => extractBearerToken({ authorization: bad }), (e: unknown) => e instanceof ScsFailure && e.code === "UNAUTHENTICATED", bad);
  }
});

test("a configured token resolves to its actor, as an ActorReference version 2; an unknown token to null", async () => {
  const auth = StaticTokenAuthenticator.fromConfig(config, TH);
  assert.deepEqual(await auth.authenticate(TOKEN_A), {
    referenceVersion: "2",
    actorId: "officer-a",
    issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" },
    actorType: "HUMAN",
    authenticationMethod: "STATIC_TOKEN",
    authorityBasis: [{ role: "COMPLIANCE_OFFICER", scopeType: "DEPLOYMENT", scopeId: "SCS-PILOT-TH" }],
  });
  assert.deepEqual(await auth.authenticate(TOKEN_B), {
    referenceVersion: "2",
    actorId: "svc-b",
    issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" },
    actorType: "SERVICE",
    authenticationMethod: "STATIC_TOKEN",
    authorityBasis: [],
  });
  assert.equal(await auth.authenticate("unknown-token-0123456789-abcdefghij"), null);
  assert.equal(deploymentScopeId("TH"), "SCS-PILOT-TH");
});

test("every issued reference is a valid version 2 reference, and valid as an ActorReference", async () => {
  const auth = StaticTokenAuthenticator.fromConfig(
    { actors: [...config.actors, { tokenSha256: sha(TOKEN_C), actor: { ...actorA, actorId: "rep-c", roles: ["PARTY_REPRESENTATIVE"] }, subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: PARTY }] }] },
    TH,
  );
  for (const token of [TOKEN_A, TOKEN_B, TOKEN_C]) {
    const actor = await auth.authenticate(token);
    for (const schema of [SCHEMAS.actorReferenceV2, SCHEMAS.actorReference]) {
      const r = runWithCorrelation("t", () => validate("SCS-PLATFORM", schema, actor));
      assert.ok(r.ok, `${token}: ${JSON.stringify(r)}`);
    }
  }
});

test("returned actors are frozen, all the way down", async () => {
  const actor = await StaticTokenAuthenticator.fromConfig(config, TH).authenticate(TOKEN_A);
  assert.ok(Object.isFrozen(actor) && Object.isFrozen(actor!.issuer) && Object.isFrozen(actor!.authorityBasis) && Object.isFrozen(actor!.authorityBasis[0]));
});

test("authenticateRequest: missing, short, unknown tokens are UNAUTHENTICATED with generic reasons", async () => {
  const auth = StaticTokenAuthenticator.fromConfig(config, TH);
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
  const shortAuth = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: sha(short), actor: actorA }] }, TH);
  await assert.rejects(authenticateRequest({ authorization: `Bearer ${short}` }, shortAuth), (e: unknown) => e instanceof ScsFailure && e.code === "UNAUTHENTICATED", "short token refused even if configured");
  assert.deepEqual(await reasonsOf({ authorization: "Bearer unknown-token-0123456789-abcdefghij" }), ["The bearer token is not valid."]);
  assert.deepEqual((await authenticateRequest({ authorization: `Bearer ${TOKEN_A}` }, auth)).actorId, "officer-a");
});

test("the issuer country is required, and must be ISO 3166-1 alpha-2", () => {
  for (const bad of [undefined, "", "th", "THA", "T1"]) {
    assert.throws(() => StaticTokenAuthenticator.fromConfig(config, { issuerCountry: bad as string }), /issuer country must be an ISO 3166-1 alpha-2 code/, String(bad));
  }
  assert.throws(() => StaticTokenAuthenticator.fromConfig(config, undefined as never), /issuer country/);
});

test("subject grants become SUBJECT-scoped authority, after the deployment roles", async () => {
  const auth = StaticTokenAuthenticator.fromConfig(
    { actors: [{ tokenSha256: sha(TOKEN_C), actor: { ...actorA, roles: ["PARTY_REPRESENTATIVE"] }, subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: PARTY }] }] },
    { issuerCountry: "VN" },
  );
  const actor = await auth.authenticate(TOKEN_C);
  assert.deepEqual(actor!.issuer, { issuerType: "COUNTRY_TENANCY", countryCode: "VN" });
  assert.deepEqual(actor!.authorityBasis, [
    { role: "PARTY_REPRESENTATIVE", scopeType: "DEPLOYMENT", scopeId: "SCS-PILOT-VN" },
    { role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeType: "SUBJECT", scopeId: PARTY },
  ]);
});

test("the accountable name and signing key are kept in the directory, never in the reference", async () => {
  const key = spki();
  const auth = StaticTokenAuthenticator.fromConfig(
    { actors: [{ tokenSha256: sha(TOKEN_A), actor: actorA, accountableName: "A. Officer", signingPublicKey: key }, { tokenSha256: sha(TOKEN_B), actor: actorB }] },
    TH,
  );
  const a = (await auth.authenticate(TOKEN_A))!;
  assert.equal("accountableName" in a, false, "personal data stays out of operational references");
  assert.equal(auth.accountableNameOf(a), "A. Officer");
  assert.equal(auth.signingKeyOf(a)!.export({ format: "der", type: "spki" }).toString("base64"), key);
  const b = (await auth.authenticate(TOKEN_B))!;
  assert.equal(auth.accountableNameOf(b), null);
  assert.equal(auth.signingKeyOf(b), null);
  // version 1 references (stored records) are found by actorId; another issuer's actor is not this one
  assert.equal(auth.accountableNameOf(actorA as never), "A. Officer");
  assert.equal(auth.accountableNameOf({ ...a, issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" } }), null);
  assert.equal(auth.accountableNameOf({ ...a, actorId: "someone-else" }), null);
});

test("the actors config is validated in full; every problem is reported", () => {
  assert.throws(() => StaticTokenAuthenticator.fromConfig({ actors: [], extra: 1 }, TH), /exactly \{ "actors"/);
  assert.throws(() => StaticTokenAuthenticator.fromConfig({ actors: [] }, TH), /no actors configured/);
  assert.throws(
    () =>
      StaticTokenAuthenticator.fromConfig({
        actors: [
          { tokenSha256: "REPLACE_WITH_SHA256", actor: actorA },
          { tokenSha256: sha(TOKEN_A), actor: { ...actorA, actorType: "ROBOT", unknown: 1 } },
          { tokenSha256: sha(TOKEN_B), actor: { ...actorB, authenticationMethod: "OIDC" } },
          { tokenSha256: sha(TOKEN_B), actor: actorA },
        ],
      }, TH),
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

test("the new fields are validated too: names, keys and subject grants; organizationId is refused", () => {
  const token = (n: number) => sha(`token-${n}-0123456789-abcdefghijklmnop`);
  const human = (n: number) => ({ ...actorA, actorId: `human-${n}` });
  const service = (n: number) => ({ ...actorB, actorId: `svc-${n}` });
  const shared = spki();
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const entries = [
    { tokenSha256: token(0), actor: { ...human(0), organizationId: "org-1" } },
    { tokenSha256: token(1), actor: human(1), accountableName: "  " },
    { tokenSha256: token(2), actor: service(2), accountableName: "A Service" },
    { tokenSha256: token(3), actor: service(3), signingPublicKey: spki() },
    { tokenSha256: token(4), actor: human(4), signingPublicKey: "not base64!" },
    { tokenSha256: token(5), actor: human(5), signingPublicKey: rsa },
    { tokenSha256: token(6), actor: human(6), signingPublicKey: shared },
    { tokenSha256: token(7), actor: human(7), signingPublicKey: shared },
    { tokenSha256: token(8), actor: human(8), subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: "SCS-PILOT-TH" }] },
    { tokenSha256: token(9), actor: human(9), subjectGrants: [{ role: "party_authority", scopeId: PARTY }] },
    { tokenSha256: token(10), actor: human(10), subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: PARTY }, { role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: PARTY }] },
    { tokenSha256: token(11), actor: human(11), subjectGrants: "all" },
    { tokenSha256: token(12), actor: human(12), roles: ["X"] },
    { tokenSha256: token(13), actor: human(13), signingPublicKey: Buffer.from("not a key at all").toString("base64") },
  ];
  assert.throws(
    () => StaticTokenAuthenticator.fromConfig({ actors: entries }, TH),
    (err: Error) => {
      for (const part of [
        "actors[0].actor.organizationId is not part of ActorReference version 2",
        "actors[1].accountableName must be a non-blank string",
        "actors[2].accountableName is for HUMAN actors only",
        "actors[3].signingPublicKey is for HUMAN actors only",
        "actors[4].signing public key must be standard base64",
        "actors[5].signing public key must be Ed25519, not rsa",
        "actors[7].signingPublicKey duplicates an earlier actor's key",
        "actors[8].subjectGrants[0] must be { role, scopeId",
        "actors[9].subjectGrants[0] must be { role, scopeId",
        "actors[10].subjectGrants[1] duplicates an earlier grant",
        "actors[11].subjectGrants must be an array",
        "actors[12] must be { tokenSha256, actor } with optional",
        "actors[13].signing public key is not a DER SPKI public key",
      ]) {
        assert.ok(err.message.includes(part), `missing: ${part}\n${err.message}`);
      }
      assert.ok(!err.message.includes("actors[6]"), "the first holder of a key is not at fault");
      return true;
    },
  );
});

test("the repository's example actors file is rejected until its placeholder is replaced", async () => {
  await assert.rejects(
    StaticTokenAuthenticator.fromFile(new URL("../../config/static-actors.example.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), TH),
    /tokenSha256 must be 64 lowercase hex characters/,
  );
});
