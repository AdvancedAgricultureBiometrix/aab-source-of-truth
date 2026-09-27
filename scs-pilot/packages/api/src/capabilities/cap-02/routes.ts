// SCS-CAP-02 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// Every CAP-02 registration path: party identity, identity evidence,
// relationships, mandates, role claims, verification assessments of parties
// and of mandates. The actor–party link routes are in link-routes.ts. The
// contract's reads (getParty, getRelationship, list…) are not built yet.

import type { ActorDirectory, SigningKeyDirectory } from "../../foundation/auth.js";
import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsIdentityEvidenceSubmissionRequest,
  ScsMandateRegistrationRequest,
  ScsMandateVerificationAssessmentRequest,
  ScsPartyRegistrationRequest,
  ScsRelationshipRegistrationRequest,
  ScsRoleClaimRequest,
  ScsVerificationAssessmentRequest,
} from "../../types/cap-02.js";
import { CAPABILITY_ID } from "./errors.js";
import { cap02LinkRoutes } from "./link-routes.js";
import { registerMandate } from "./register-mandate.js";
import { registerParty } from "./register-party.js";
import { registerRelationship } from "./register-relationship.js";
import { addRoleClaim } from "./register-role-claim.js";
import { addMandateVerificationAssessment } from "./record-mandate-verification.js";
import { addVerificationAssessment } from "./record-verification.js";
import { submitIdentityEvidence } from "./submit-evidence.js";

export const registerPartyRoute: Route<ScsPartyRegistrationRequest> = {
  method: "POST",
  path: "/scs/v1/parties",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02PartyRegistrationRequest,
  handle: registerParty,
};

/** Built with the signing keys: a representative submission verifies the representative's link. */
export const submitIdentityEvidenceRoute = (keys: SigningKeyDirectory): Route<ScsIdentityEvidenceSubmissionRequest> => ({
  method: "POST",
  path: "/scs/v1/parties/:partyId/evidence",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02IdentityEvidenceSubmissionRequest,
  paramsSchema: SCHEMAS.cap02IdentityEvidenceSubmissionParams,
  handle: submitIdentityEvidence(keys),
});

export const registerRelationshipRoute: Route<ScsRelationshipRegistrationRequest> = {
  method: "POST",
  path: "/scs/v1/relationships",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02RelationshipRegistrationRequest,
  handle: registerRelationship,
};

export const registerMandateRoute: Route<ScsMandateRegistrationRequest> = {
  method: "POST",
  path: "/scs/v1/mandates",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02MandateRegistrationRequest,
  handle: registerMandate,
};

export const addRoleClaimRoute: Route<ScsRoleClaimRequest> = {
  method: "POST",
  path: "/scs/v1/parties/:partyId/roles",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02RoleClaimRequest,
  paramsSchema: SCHEMAS.cap02RoleClaimParams,
  handle: addRoleClaim,
};

export const addVerificationAssessmentRoute: Route<ScsVerificationAssessmentRequest> = {
  method: "POST",
  path: "/scs/v1/parties/:partyId/verifications",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02VerificationAssessmentRequest,
  paramsSchema: SCHEMAS.cap02VerificationAssessmentParams,
  handle: addVerificationAssessment,
};

export const addMandateVerificationAssessmentRoute: Route<ScsMandateVerificationAssessmentRequest> = {
  method: "POST",
  path: "/scs/v1/mandates/:mandateId/verifications",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02MandateVerificationRequest,
  paramsSchema: SCHEMAS.cap02MandateVerificationParams,
  handle: addMandateVerificationAssessment,
};

/**
 * Every CAP-02 route. Identity evidence gets only the signing keys; the link
 * routes get the directory, for the accountable names their governance
 * decisions record. No other route gets either.
 */
export const cap02Routes = (directory: ActorDirectory): readonly Route<never>[] => [
  registerPartyRoute as unknown as Route<never>,
  submitIdentityEvidenceRoute({ signingKeyOf: (a) => directory.signingKeyOf(a) }) as unknown as Route<never>,
  registerRelationshipRoute as unknown as Route<never>,
  registerMandateRoute as unknown as Route<never>,
  addRoleClaimRoute as unknown as Route<never>,
  addVerificationAssessmentRoute as unknown as Route<never>,
  addMandateVerificationAssessmentRoute as unknown as Route<never>,
  ...cap02LinkRoutes(directory),
];
