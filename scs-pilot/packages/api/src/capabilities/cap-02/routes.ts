// SCS-CAP-02 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// Party identity, identity evidence submission and relationships so far;
// mandates, role claims and verification assessments follow as separate
// routes.

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsIdentityEvidenceSubmissionRequest,
  ScsPartyRegistrationRequest,
  ScsRelationshipRegistrationRequest,
} from "../../types/cap-02.js";
import { CAPABILITY_ID } from "./errors.js";
import { registerParty } from "./register-party.js";
import { registerRelationship } from "./register-relationship.js";
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

export const submitIdentityEvidenceRoute: Route<ScsIdentityEvidenceSubmissionRequest> = {
  method: "POST",
  path: "/scs/v1/parties/:partyId/evidence",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02IdentityEvidenceSubmissionRequest,
  paramsSchema: SCHEMAS.cap02IdentityEvidenceSubmissionParams,
  handle: submitIdentityEvidence,
};

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

export const cap02Routes: readonly Route<never>[] = [
  registerPartyRoute as unknown as Route<never>,
  submitIdentityEvidenceRoute as unknown as Route<never>,
  registerRelationshipRoute as unknown as Route<never>,
];
