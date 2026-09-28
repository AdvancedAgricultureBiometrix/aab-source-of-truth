// Every JSON Schema the API validates against, registered with the validator
// by $id so schemas can $ref one another (e.g. the CAP-01 receipt references
// the shared ActorReference). Importing this module registers them all.
//
// Imported as JSON modules so the TypeScript build copies them into dist.
// The matching TypeScript types in src/types/ are generated from these same
// files (npm run generate:types) — never hand-written.

import actorReference from "./shared/actor-reference.schema.json" with { type: "json" };
import actorReferenceV1 from "./shared/actor-reference-v1.schema.json" with { type: "json" };
import actorReferenceV2 from "./shared/actor-reference-v2.schema.json" with { type: "json" };
import platformEvidenceObject from "./platform/evidence-object.schema.json" with { type: "json" };
import cap01FrameworkRegistrationRequest from "./cap-01/framework-registration-request.schema.json" with { type: "json" };
import cap01FrameworkRegistrationDecision from "./cap-01/framework-registration-decision.schema.json" with { type: "json" };
import cap01FrameworkRegistrationReceipt from "./cap-01/framework-registration-receipt.schema.json" with { type: "json" };
import cap01FrameworkRegistrationResponse from "./cap-01/framework-registration-response.schema.json" with { type: "json" };
import cap02ActingUnder from "./cap-02/acting-under.schema.json" with { type: "json" };
import cap02RepresentationChecks from "./cap-02/representation-checks.schema.json" with { type: "json" };
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
import cap02VerificationAssessmentParams from "./cap-02/verification-assessment-params.schema.json" with { type: "json" };
import cap02VerificationAssessmentRequest from "./cap-02/verification-assessment-request.schema.json" with { type: "json" };
import cap02VerificationAssessmentDecision from "./cap-02/verification-assessment-decision.schema.json" with { type: "json" };
import cap02VerificationAssessmentReceipt from "./cap-02/verification-assessment-receipt.schema.json" with { type: "json" };
import cap02VerificationAssessmentResponse from "./cap-02/verification-assessment-response.schema.json" with { type: "json" };
import cap03PlotRegistrationRequest from "./cap-03/plot-registration-request.schema.json" with { type: "json" };
import cap03PlotRegistrationDecision from "./cap-03/plot-registration-decision.schema.json" with { type: "json" };
import cap03PlotRegistrationReceipt from "./cap-03/plot-registration-receipt.schema.json" with { type: "json" };
import cap03PlotRegistrationResponse from "./cap-03/plot-registration-response.schema.json" with { type: "json" };
import cap04EvidenceSubmissionRequest from "./cap-04/evidence-submission-request.schema.json" with { type: "json" };
import cap04EvidenceAdmissionDecision from "./cap-04/evidence-admission-decision.schema.json" with { type: "json" };
import cap04EvidenceAdmissionReceipt from "./cap-04/evidence-admission-receipt.schema.json" with { type: "json" };
import cap04EvidenceAdmissionResponse from "./cap-04/evidence-admission-response.schema.json" with { type: "json" };
import cap05CustodyEventSubmissionRequest from "./cap-05/custody-event-submission-request.schema.json" with { type: "json" };
import cap05CustodyEventAdmissionDecision from "./cap-05/custody-event-admission-decision.schema.json" with { type: "json" };
import cap05CustodyEventAdmissionReceipt from "./cap-05/custody-event-admission-receipt.schema.json" with { type: "json" };
import cap05CustodyEventAdmissionResponse from "./cap-05/custody-event-admission-response.schema.json" with { type: "json" };
import cap06SufficiencyEvaluationRequest from "./cap-06/sufficiency-evaluation-request.schema.json" with { type: "json" };
import cap06SufficiencyEvaluationResult from "./cap-06/sufficiency-evaluation-result.schema.json" with { type: "json" };
import cap06SufficiencyEvaluationReceipt from "./cap-06/sufficiency-evaluation-receipt.schema.json" with { type: "json" };
import cap06SufficiencyEvaluationResponse from "./cap-06/sufficiency-evaluation-response.schema.json" with { type: "json" };
import cap06SufficiencyEvaluationParams from "./cap-06/sufficiency-evaluation-params.schema.json" with { type: "json" };
import cap06ConflictResolutionRequest from "./cap-06/conflict-resolution-request.schema.json" with { type: "json" };
import cap06ConflictResolutionRecord from "./cap-06/conflict-resolution-record.schema.json" with { type: "json" };
import cap06ConflictResolutionReceipt from "./cap-06/conflict-resolution-receipt.schema.json" with { type: "json" };
import cap06ConflictResolutionResponse from "./cap-06/conflict-resolution-response.schema.json" with { type: "json" };
import cap09ReviewDecisionRequest from "./cap-09/review-decision-request.schema.json" with { type: "json" };
import cap09ReviewDecision from "./cap-09/review-decision.schema.json" with { type: "json" };
import cap09ReviewDecisionReceipt from "./cap-09/review-decision-receipt.schema.json" with { type: "json" };
import cap09ReviewDecisionResponse from "./cap-09/review-decision-response.schema.json" with { type: "json" };
import cap09CurrencyAssessment from "./cap-09/currency-assessment.schema.json" with { type: "json" };
import cap09ReviewDecisionParams from "./cap-09/review-decision-params.schema.json" with { type: "json" };
import cap09CurrencyAssessmentRequest from "./cap-09/currency-assessment-request.schema.json" with { type: "json" };
import cap09RecordedDecision from "./cap-09/recorded-decision.schema.json" with { type: "json" };
import cap08PackageCompilationRequest from "./cap-08/package-compilation-request.schema.json" with { type: "json" };
import cap08DueDiligencePackage from "./cap-08/due-diligence-package.schema.json" with { type: "json" };
import cap08PackageEnvelope from "./cap-08/package-envelope.schema.json" with { type: "json" };
import cap08PackageCompilationRecord from "./cap-08/package-compilation-record.schema.json" with { type: "json" };
import cap08PackageCompilationReceipt from "./cap-08/package-compilation-receipt.schema.json" with { type: "json" };
import cap08PackageCompilationResponse from "./cap-08/package-compilation-response.schema.json" with { type: "json" };
import cap08PackageParams from "./cap-08/package-params.schema.json" with { type: "json" };
import cap08PackageReadResult from "./cap-08/package-read-result.schema.json" with { type: "json" };
import cap08PackageIntegrityResult from "./cap-08/package-integrity-result.schema.json" with { type: "json" };
import platformRenditionParams from "./platform/rendition-params.schema.json" with { type: "json" };
import platformSubjectKey from "./platform/subject-key.schema.json" with { type: "json" };
import platformActorSubjectLinkActor from "./platform/actor-subject-link-actor.schema.json" with { type: "json" };
import platformActorSubjectLinkStatement from "./platform/actor-subject-link-statement.schema.json" with { type: "json" };
import platformActorSubjectLink from "./platform/actor-subject-link.schema.json" with { type: "json" };
import platformActorSubjectLinkStatusStatement from "./platform/actor-subject-link-status-statement.schema.json" with { type: "json" };
import platformActorSubjectLinkStatusRecord from "./platform/actor-subject-link-status-record.schema.json" with { type: "json" };
import cap02ActorPartyLinkParams from "./cap-02/actor-party-link-params.schema.json" with { type: "json" };
import cap02ActorPartyLinkRequest from "./cap-02/actor-party-link-request.schema.json" with { type: "json" };
import cap02ActorPartyLinkDecision from "./cap-02/actor-party-link-decision.schema.json" with { type: "json" };
import cap02ActorPartyLinkReceipt from "./cap-02/actor-party-link-receipt.schema.json" with { type: "json" };
import cap02ActorPartyLinkResponse from "./cap-02/actor-party-link-response.schema.json" with { type: "json" };
import cap02ActorPartyLinkStatusRequest from "./cap-02/actor-party-link-status-request.schema.json" with { type: "json" };
import cap02ActorPartyLinkStatusDecision from "./cap-02/actor-party-link-status-decision.schema.json" with { type: "json" };
import cap02ActorPartyLinkStatusReceipt from "./cap-02/actor-party-link-status-receipt.schema.json" with { type: "json" };
import cap02ActorPartyLinkStatusResponse from "./cap-02/actor-party-link-status-response.schema.json" with { type: "json" };
import cap02ActorPartyLinkRead from "./cap-02/actor-party-link-read.schema.json" with { type: "json" };
import cap02MandateVerificationParams from "./cap-02/mandate-verification-params.schema.json" with { type: "json" };
import cap02MandateVerificationRequest from "./cap-02/mandate-verification-request.schema.json" with { type: "json" };
import cap02MandateVerificationDecision from "./cap-02/mandate-verification-decision.schema.json" with { type: "json" };
import cap02MandateVerificationReceipt from "./cap-02/mandate-verification-receipt.schema.json" with { type: "json" };
import cap02MandateVerificationResponse from "./cap-02/mandate-verification-response.schema.json" with { type: "json" };
// AAB-PLATFORM-09 public-key registry (urn:aab:schema:)
import platformKeyRegistryIssuer from "./platform/key-registry-issuer.schema.json" with { type: "json" };
import platformKeyRegistryActor from "./platform/key-registry-actor.schema.json" with { type: "json" };
import platformKeyPossessionStatement from "./platform/key-possession-statement.schema.json" with { type: "json" };
import platformKeyRegistrationStatement from "./platform/key-registration-statement.schema.json" with { type: "json" };
import platformKeyEventStatement from "./platform/key-event-statement.schema.json" with { type: "json" };
import platformKeyBootstrapCeremonyStatement from "./platform/key-bootstrap-ceremony-statement.schema.json" with { type: "json" };
import platformKeyRegistrationView from "./platform/key-registration-view.schema.json" with { type: "json" };
import platformKeyVerificationEvidence from "./platform/key-verification-evidence.schema.json" with { type: "json" };
import platformKeyBootstrapRequest from "./platform/key-bootstrap-request.schema.json" with { type: "json" };
import platformKeyChallengeRequest from "./platform/key-challenge-request.schema.json" with { type: "json" };
import platformKeyRegistrationRequest from "./platform/key-registration-request.schema.json" with { type: "json" };
import platformKeyEventRequest from "./platform/key-event-request.schema.json" with { type: "json" };
import platformKeyParams from "./platform/key-params.schema.json" with { type: "json" };
import platformKeySignatureAcceptance from "./platform/key-signature-acceptance.schema.json" with { type: "json" };
import platformKeyBootstrapDecision from "./platform/key-bootstrap-decision.schema.json" with { type: "json" };
import platformKeyChallengeDecision from "./platform/key-challenge-decision.schema.json" with { type: "json" };
import platformKeyRegistrationDecision from "./platform/key-registration-decision.schema.json" with { type: "json" };
import platformKeyEventDecision from "./platform/key-event-decision.schema.json" with { type: "json" };
import platformKeyBootstrapReceipt from "./platform/key-bootstrap-receipt.schema.json" with { type: "json" };
import platformKeyBootstrapResponse from "./platform/key-bootstrap-response.schema.json" with { type: "json" };
import platformKeyChallengeReceipt from "./platform/key-challenge-receipt.schema.json" with { type: "json" };
import platformKeyChallengeResponse from "./platform/key-challenge-response.schema.json" with { type: "json" };
import platformKeyRegistrationReceipt from "./platform/key-registration-receipt.schema.json" with { type: "json" };
import platformKeyRegistrationResponse from "./platform/key-registration-response.schema.json" with { type: "json" };
import platformKeyEventReceipt from "./platform/key-event-receipt.schema.json" with { type: "json" };
import platformKeyEventResponse from "./platform/key-event-response.schema.json" with { type: "json" };
import platformKeyRead from "./platform/key-read.schema.json" with { type: "json" };

import { registerSchema, type JsonSchema } from "../foundation/validation.js";

export const SCHEMAS = {
  actorReference,
  actorReferenceV1,
  actorReferenceV2,
  platformEvidenceObject,
  cap01FrameworkRegistrationRequest,
  cap01FrameworkRegistrationDecision,
  cap01FrameworkRegistrationReceipt,
  cap01FrameworkRegistrationResponse,
  cap02ActingUnder,
  cap02RepresentationChecks,
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
  cap02VerificationAssessmentParams,
  cap02VerificationAssessmentRequest,
  cap02VerificationAssessmentDecision,
  cap02VerificationAssessmentReceipt,
  cap02VerificationAssessmentResponse,
  cap03PlotRegistrationRequest,
  cap03PlotRegistrationDecision,
  cap03PlotRegistrationReceipt,
  cap03PlotRegistrationResponse,
  cap04EvidenceSubmissionRequest,
  cap04EvidenceAdmissionDecision,
  cap04EvidenceAdmissionReceipt,
  cap04EvidenceAdmissionResponse,
  cap05CustodyEventSubmissionRequest,
  cap05CustodyEventAdmissionDecision,
  cap05CustodyEventAdmissionReceipt,
  cap05CustodyEventAdmissionResponse,
  cap06SufficiencyEvaluationRequest,
  cap06SufficiencyEvaluationResult,
  cap06SufficiencyEvaluationReceipt,
  cap06SufficiencyEvaluationResponse,
  cap06SufficiencyEvaluationParams,
  cap06ConflictResolutionRequest,
  cap06ConflictResolutionRecord,
  cap06ConflictResolutionReceipt,
  cap06ConflictResolutionResponse,
  cap09ReviewDecisionRequest,
  cap09ReviewDecision,
  cap09ReviewDecisionReceipt,
  cap09ReviewDecisionResponse,
  cap09CurrencyAssessment,
  cap09ReviewDecisionParams,
  cap09CurrencyAssessmentRequest,
  cap09RecordedDecision,
  cap08PackageCompilationRequest,
  cap08DueDiligencePackage,
  cap08PackageEnvelope,
  cap08PackageCompilationRecord,
  cap08PackageCompilationReceipt,
  cap08PackageCompilationResponse,
  cap08PackageParams,
  cap08PackageReadResult,
  cap08PackageIntegrityResult,
  platformRenditionParams,
  platformSubjectKey,
  platformActorSubjectLinkActor,
  platformActorSubjectLinkStatement,
  platformActorSubjectLink,
  platformActorSubjectLinkStatusStatement,
  platformActorSubjectLinkStatusRecord,
  cap02ActorPartyLinkParams,
  cap02ActorPartyLinkRequest,
  cap02ActorPartyLinkDecision,
  cap02ActorPartyLinkReceipt,
  cap02ActorPartyLinkResponse,
  cap02ActorPartyLinkStatusRequest,
  cap02ActorPartyLinkStatusDecision,
  cap02ActorPartyLinkStatusReceipt,
  cap02ActorPartyLinkStatusResponse,
  cap02ActorPartyLinkRead,
  cap02MandateVerificationParams,
  cap02MandateVerificationRequest,
  cap02MandateVerificationDecision,
  cap02MandateVerificationReceipt,
  cap02MandateVerificationResponse,
  platformKeyRegistryIssuer,
  platformKeyRegistryActor,
  platformKeyPossessionStatement,
  platformKeyRegistrationStatement,
  platformKeyEventStatement,
  platformKeyBootstrapCeremonyStatement,
  platformKeyRegistrationView,
  platformKeyVerificationEvidence,
  platformKeyBootstrapRequest,
  platformKeyChallengeRequest,
  platformKeyRegistrationRequest,
  platformKeyEventRequest,
  platformKeyParams,
  platformKeySignatureAcceptance,
  platformKeyBootstrapDecision,
  platformKeyChallengeDecision,
  platformKeyRegistrationDecision,
  platformKeyEventDecision,
  platformKeyBootstrapReceipt,
  platformKeyBootstrapResponse,
  platformKeyChallengeReceipt,
  platformKeyChallengeResponse,
  platformKeyRegistrationReceipt,
  platformKeyRegistrationResponse,
  platformKeyEventReceipt,
  platformKeyEventResponse,
  platformKeyRead,
} as const satisfies Record<string, JsonSchema>;

for (const schema of Object.values(SCHEMAS)) registerSchema(schema);
