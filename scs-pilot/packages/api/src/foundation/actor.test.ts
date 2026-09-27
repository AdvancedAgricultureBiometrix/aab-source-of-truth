import { test } from "node:test";
import assert from "node:assert/strict";

import { holdsRole, holdsSubjectGrant, isVersion2, sameActor, subjectScopeId } from "./actor.js";
import { runWithCorrelation } from "./correlation.js";
import { validate } from "./validation.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ActorReference, ActorReferenceV1, ActorReferenceV2 } from "../types/shared.js";

const PARTY = { domain: "SCS", subjectType: "PARTY", subjectId: "4b1f05b0-0000-4000-8000-000000000001" };
const OTHER = { ...PARTY, subjectId: "4b1f05b0-0000-4000-8000-000000000002" };

const v1: ActorReferenceV1 = { actorId: "officer-1", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], organizationId: "org-1", authenticationMethod: "STATIC_TOKEN" };
const v2 = (extra: Partial<ActorReferenceV2> = {}): ActorReferenceV2 => ({
  referenceVersion: "2",
  actorId: "officer-1",
  issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" },
  actorType: "HUMAN",
  authenticationMethod: "STATIC_TOKEN",
  authorityBasis: [
    { role: "COMPLIANCE_OFFICER", scopeType: "DEPLOYMENT", scopeId: "SCS-PILOT-TH" },
    { role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeType: "SUBJECT", scopeId: subjectScopeId(PARTY) },
  ],
  ...extra,
});
const valid = (schema: Parameters<typeof validate>[1], value: unknown) => runWithCorrelation("t", () => validate("SCS-PLATFORM", schema, value)).ok;

test("the version is told by referenceVersion alone", () => {
  assert.equal(isVersion2(v1), false);
  assert.equal(isVersion2(v2()), true);
  assert.equal(subjectScopeId(PARTY), "SCS:PARTY:4b1f05b0-0000-4000-8000-000000000001");
});

test("holdsRole, version 1: roles are deployment-wide, so any listed role covers any act", () => {
  assert.equal(holdsRole(v1, "COMPLIANCE_OFFICER"), true);
  assert.equal(holdsRole(v1, "COMPLIANCE_OFFICER", PARTY), true);
  assert.equal(holdsRole(v1, "REGULATORY_REVIEWER"), false);
});

test("holdsRole, version 2: a DEPLOYMENT grant covers every act; a SUBJECT grant only its own subject", () => {
  const a = v2();
  assert.equal(holdsRole(a, "COMPLIANCE_OFFICER"), true);
  assert.equal(holdsRole(a, "COMPLIANCE_OFFICER", PARTY), true);
  assert.equal(holdsRole(a, "PARTY_AUTHORITY_REPRESENTATIVE", PARTY), true);
  assert.equal(holdsRole(a, "PARTY_AUTHORITY_REPRESENTATIVE", OTHER), false, "another party");
  assert.equal(holdsRole(a, "PARTY_AUTHORITY_REPRESENTATIVE"), false, "an act on no named subject");
  assert.equal(holdsRole(a, "REGULATORY_REVIEWER"), false);
  assert.equal(holdsRole(v2({ authorityBasis: [] }), "COMPLIANCE_OFFICER"), false);
});

test("holdsRole, version 2: PLATFORM, COUNTRY, INSTITUTION and DOMAIN grants are not honoured yet (fail closed)", () => {
  for (const scopeType of ["PLATFORM", "COUNTRY", "INSTITUTION", "DOMAIN"] as const) {
    const a = v2({ authorityBasis: [{ role: "COMPLIANCE_OFFICER", scopeType, scopeId: "TH" }] });
    assert.equal(holdsRole(a, "COMPLIANCE_OFFICER"), false, scopeType);
    assert.equal(holdsRole(a, "COMPLIANCE_OFFICER", PARTY), false, scopeType);
  }
});

test("holdsSubjectGrant: only a SUBJECT grant for exactly this subject; never deployment-wide; never version 1", () => {
  const a = v2();
  assert.equal(holdsSubjectGrant(a, "PARTY_AUTHORITY_REPRESENTATIVE", PARTY), true);
  assert.equal(holdsSubjectGrant(a, "PARTY_AUTHORITY_REPRESENTATIVE", OTHER), false);
  assert.equal(holdsSubjectGrant(a, "COMPLIANCE_OFFICER", PARTY), false, "a DEPLOYMENT grant is not a designation");
  assert.equal(holdsSubjectGrant(v1, "COMPLIANCE_OFFICER", PARTY), false);
  assert.equal(holdsSubjectGrant(a, "PARTY_AUTHORITY_REPRESENTATIVE", { ...PARTY, domain: "AGR" }), false, "another domain");
});

test("sameActor: version 2 pairs compare (issuer, actorId)", () => {
  assert.equal(sameActor(v2(), v2({ authorityBasis: [] })), true, "grants do not identify an actor");
  assert.equal(sameActor(v2(), v2({ actorId: "officer-2" })), false);
  assert.equal(sameActor(v2(), v2({ issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" } })), false, "another tenancy");
  assert.equal(sameActor(v2(), v2({ issuer: { issuerType: "PLATFORM_CONTROL_PLANE" } })), false, "the control plane");
  assert.equal(sameActor(v2({ issuer: { issuerType: "PLATFORM_CONTROL_PLANE" } }), v2({ issuer: { issuerType: "PLATFORM_CONTROL_PLANE" } })), true);
});

test("sameActor: where either side is version 1, actorId alone", () => {
  assert.equal(sameActor(v1, v2()), true);
  assert.equal(sameActor(v2(), v1), true);
  assert.equal(sameActor(v1, { ...v1, roles: [] }), true);
  assert.equal(sameActor(v1, v2({ actorId: "officer-2" })), false);
  assert.equal(sameActor(v1, { ...v1, actorId: "officer-2" }), false);
});

test("stored version 1 references stay valid ActorReferences; version 2 references are valid too; a mixture is neither", () => {
  assert.ok(valid(SCHEMAS.actorReference, v1));
  assert.ok(valid(SCHEMAS.actorReference, v2()));
  assert.ok(valid(SCHEMAS.actorReference, { ...v2(), accountableName: "A. Officer", representation: { domain: "SCS", subjectType: "PARTY", subjectId: PARTY.subjectId, actorLinkId: "link-1", basis: { basisType: "MANDATE", basisId: "m-1", onBehalfOfSubjectId: OTHER.subjectId } } }));
  const { roles: _roles, organizationId: _org, ...bare } = v1;
  for (const [label, value] of [
    ["v1 with referenceVersion", { ...v1, referenceVersion: "2" }],
    ["v1 with issuer", { ...v1, issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" } }],
    ["v2 with roles", { ...v2(), roles: ["COMPLIANCE_OFFICER"] }],
    ["v2 with organizationId", { ...v2(), organizationId: "org-1" }],
    ["v2 without authorityBasis", { ...v2(), authorityBasis: undefined }],
    ["referenceVersion 3", { ...v2(), referenceVersion: "3" }],
    ["neither roles nor referenceVersion", bare],
  ] as const) {
    assert.equal(valid(SCHEMAS.actorReference, JSON.parse(JSON.stringify(value)) as ActorReference), false, label);
  }
});

test("version 2 schema: the issuer's country, SUBJECT scope ids and representation are checked", () => {
  const ok = (a: unknown) => valid(SCHEMAS.actorReferenceV2, a);
  assert.equal(ok(v2({ issuer: { issuerType: "COUNTRY_TENANCY" } })), false, "a tenancy names its country");
  assert.equal(ok(v2({ issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "th" } })), false);
  assert.equal(ok(v2({ issuer: { issuerType: "PLATFORM_CONTROL_PLANE", countryCode: "TH" } })), false, "the control plane has no country");
  assert.equal(ok(v2({ issuer: { issuerType: "PLATFORM_CONTROL_PLANE" } })), true);
  const grant = (scopeId: string) => v2({ authorityBasis: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeType: "SUBJECT", scopeId }] });
  assert.equal(ok(grant("SCS-PILOT-TH")), false, "a SUBJECT scope names domain, type and id");
  assert.equal(ok(grant("SCS:PARTY:")), false);
  assert.equal(ok(grant("scs:party:x")), false);
  assert.equal(ok(grant("SCS:PARTY:x")), true);
  assert.equal(ok(v2({ authorityBasis: [{ role: "X_Y", scopeType: "DEPLOYMENT", scopeId: "has space" }] })), false);
  assert.equal(ok(v2({ accountableName: " " })), false);
  assert.equal(ok({ ...v2(), representation: { domain: "SCS", subjectType: "PARTY", subjectId: "p" } }), false, "a representation names its link");
});
