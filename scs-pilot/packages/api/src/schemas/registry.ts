// Every JSON Schema the API validates against, registered with the validator
// by $id so schemas can $ref one another (e.g. the CAP-01 receipt references
// the shared ActorReference). Importing this module registers them all.
//
// Imported as JSON modules so the TypeScript build copies them into dist.
// The matching TypeScript types in src/types/ are generated from these same
// files (npm run generate:types) — never hand-written.

import actorReference from "./shared/actor-reference.schema.json" with { type: "json" };
import cap01FrameworkRegistrationRequest from "./cap-01/framework-registration-request.schema.json" with { type: "json" };
import cap01FrameworkRegistrationDecision from "./cap-01/framework-registration-decision.schema.json" with { type: "json" };
import cap01FrameworkRegistrationReceipt from "./cap-01/framework-registration-receipt.schema.json" with { type: "json" };
import cap01FrameworkRegistrationResponse from "./cap-01/framework-registration-response.schema.json" with { type: "json" };
import cap02PartyRegistrationRequest from "./cap-02/party-registration-request.schema.json" with { type: "json" };
import cap02PartyRegistrationDecision from "./cap-02/party-registration-decision.schema.json" with { type: "json" };
import cap02PartyRegistrationReceipt from "./cap-02/party-registration-receipt.schema.json" with { type: "json" };
import cap02PartyRegistrationResponse from "./cap-02/party-registration-response.schema.json" with { type: "json" };
import cap02IdentityEvidenceSubmissionParams from "./cap-02/identity-evidence-submission-params.schema.json" with { type: "json" };
import cap02IdentityEvidenceSubmissionRequest from "./cap-02/identity-evidence-submission-request.schema.json" with { type: "json" };
import cap02IdentityEvidenceSubmissionDecision from "./cap-02/identity-evidence-submission-decision.schema.json" with { type: "json" };
import cap02IdentityEvidenceSubmissionReceipt from "./cap-02/identity-evidence-submission-receipt.schema.json" with { type: "json" };
import cap02IdentityEvidenceSubmissionResponse from "./cap-02/identity-evidence-submission-response.schema.json" with { type: "json" };
import cap02RelationshipRegistrationRequest from "./cap-02/relationship-registration-request.schema.json" with { type: "json" };
import cap02RelationshipRegistrationDecision from "./cap-02/relationship-registration-decision.schema.json" with { type: "json" };
import cap02RelationshipRegistrationReceipt from "./cap-02/relationship-registration-receipt.schema.json" with { type: "json" };
import cap02RelationshipRegistrationResponse from "./cap-02/relationship-registration-response.schema.json" with { type: "json" };
import cap02MandateRegistrationRequest from "./cap-02/mandate-registration-request.schema.json" with { type: "json" };
import cap02MandateRegistrationDecision from "./cap-02/mandate-registration-decision.schema.json" with { type: "json" };
import cap02MandateRegistrationReceipt from "./cap-02/mandate-registration-receipt.schema.json" with { type: "json" };
import cap02MandateRegistrationResponse from "./cap-02/mandate-registration-response.schema.json" with { type: "json" };
import cap02RoleClaimParams from "./cap-02/role-claim-params.schema.json" with { type: "json" };
import cap02RoleClaimRequest from "./cap-02/role-claim-request.schema.json" with { type: "json" };
import cap02RoleClaimDecision from "./cap-02/role-claim-decision.schema.json" with { type: "json" };
import cap02RoleClaimReceipt from "./cap-02/role-claim-receipt.schema.json" with { type: "json" };
import cap02RoleClaimResponse from "./cap-02/role-claim-response.schema.json" with { type: "json" };

import { registerSchema, type JsonSchema } from "../foundation/validation.js";

export const SCHEMAS = {
  actorReference,
  cap01FrameworkRegistrationRequest,
  cap01FrameworkRegistrationDecision,
  cap01FrameworkRegistrationReceipt,
  cap01FrameworkRegistrationResponse,
  cap02PartyRegistrationRequest,
  cap02PartyRegistrationDecision,
  cap02PartyRegistrationReceipt,
  cap02PartyRegistrationResponse,
  cap02IdentityEvidenceSubmissionParams,
  cap02IdentityEvidenceSubmissionRequest,
  cap02IdentityEvidenceSubmissionDecision,
  cap02IdentityEvidenceSubmissionReceipt,
  cap02IdentityEvidenceSubmissionResponse,
  cap02RelationshipRegistrationRequest,
  cap02RelationshipRegistrationDecision,
  cap02RelationshipRegistrationReceipt,
  cap02RelationshipRegistrationResponse,
  cap02MandateRegistrationRequest,
  cap02MandateRegistrationDecision,
  cap02MandateRegistrationReceipt,
  cap02MandateRegistrationResponse,
  cap02RoleClaimParams,
  cap02RoleClaimRequest,
  cap02RoleClaimDecision,
  cap02RoleClaimReceipt,
  cap02RoleClaimResponse,
} as const satisfies Record<string, JsonSchema>;

for (const schema of Object.values(SCHEMAS)) registerSchema(schema);
