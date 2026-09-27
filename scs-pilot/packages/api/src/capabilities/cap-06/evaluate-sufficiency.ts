// SCS-CAP-06 evaluateSufficiency — POST /scs/v1/sufficiency-evaluations.
//
// The route runs in one REPEATABLE READ transaction (routes.ts), opened by the
// server layer before anything is read: every read below — and the
// idempotency lookup before it — sees one snapshot, so nothing admitted after
// the snapshot is taken can affect the evaluation (contract 876fc80, "The
// frozen input"). The sequence:
//
//   1. authority     — COMPLIANCE_OFFICER only → REQUESTOR_NOT_AUTHORISED (403)
//   2. validation    — framework (FRAMEWORK_VERSION_NOT_RESOLVED), its own
//                      specification (EVIDENCE_REQUIREMENT_SPEC_NOT_FOUND),
//                      the period (EVALUATION_PERIOD_INVALID), the plots
//                      (PLOT_NOT_FOUND, FRAMEWORK_ASSOCIATION_NOT_FOUND) and
//                      the custody subject (BATCH_NOT_FOUND,
//                      OPERATOR_PARTY_NOT_FOUND)
//   3. snapshot      — evidenceCutoffAt is the transaction's start time
//   4. evidence      — every admitted record in scope, read in the snapshot;
//                      a requester's list must match it exactly
//                      (EVIDENCE_RECORD_NOT_RESOLVED, EVIDENCE_SCOPE_INCOMPLETE)
//   5. subject       — subject_key; a previous evaluation must exist and be of
//                      the same subject (EVALUATION_NOT_FOUND,
//                      PREVIOUS_EVALUATION_NOT_SAME_SUBJECT); a repeated
//                      evaluation is noted, never blocked
//   6. manifest      — kind, id, version, content digest, admission time; the
//                      conflict resolutions recorded for items in scope are
//                      read in the same snapshot (contract e0b7634)
//   7. evaluation    — evaluate.ts, a pure function: no further reads. The
//                      resolutions it applies are the evaluation's
//                      appliedResolutionIds, each disclosed in its explanation
//   8. writes        — the evaluation, its plots, its evidence rows and the
//                      receipt (SUFFICIENCY_EVALUATION), then commit
//
// Every failure is FAIL_CLOSED and produces no evaluation.

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import { canonicalJson, sha256Hex } from "../../foundation/canonical.js";
import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsSufficiencyEvaluationReceipt,
  ScsSufficiencyEvaluationResponse,
  ScsSufficiencyEvaluationResult,
  ScsSufficiencyEvaluationSubmission,
} from "../../types/cap-06.js";
import { CAPABILITY_ID, cap06Failure } from "./errors.js";
import { evaluate } from "./evaluate.js";
import {
  findAdmittedIds,
  findCustodyEvents,
  findDeforestationEvidence,
  findEvaluationSubject,
  findFramework,
  findParty,
  findPlots,
  findRepeatedEvaluation,
  findResolutions,
  findVerifiedParties,
  insertEvaluation,
  transactionStart,
} from "./store.js";

/** The only role that may request an evaluation (contract 0fd8c25). */
export const REQUESTOR_ROLE = "COMPLIANCE_OFFICER";

/** ScsSufficiencyEvaluationResult.evaluatorVersion (contract 0fd8c25). */
export const EVALUATOR_VERSION = "scs-cap06-pilot-1";

const DAY_MS = 24 * 60 * 60 * 1000;

/** SHA-256 of the canonical subject: the set of plots, the commodity, the framework and the set of batches. */
export function subjectKey(s: { plotIds: readonly string[]; commodityCode: string; frameworkId: string; batchIdentifiers: readonly string[] }): string {
  return sha256Hex(
    canonicalJson({ plotIds: [...s.plotIds].sort(), commodityCode: s.commodityCode, frameworkId: s.frameworkId, batchIdentifiers: [...s.batchIdentifiers].sort() }),
  );
}

export async function evaluateSufficiency(ctx: RouteContext<ScsSufficiencyEvaluationSubmission>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const req = ctx.body;
  const { subject, framework: fw, evaluationPeriod: period } = req;

  // 1. Authority
  if (!holdsRole(actor, REQUESTOR_ROLE)) {
    throw cap06Failure("REQUESTOR_NOT_AUTHORISED", [`Requesting a sufficiency evaluation requires the ${REQUESTOR_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }

  // 2. Validation: framework and specification
  const cutoff = await transactionStart(tx);
  const f = await findFramework(tx, fw.frameworkId);
  if (f === null) throw cap06Failure("FRAMEWORK_VERSION_NOT_RESOLVED", [`/framework/frameworkId: no SCS-CAP-01 framework is registered with frameworkId ${fw.frameworkId}.`]);
  const versionProblems = [
    ...(f.status === "ACTIVE" ? [] : [`Framework ${f.frameworkId} is ${f.status}; only an ACTIVE framework can be evaluated against.`]),
    ...(fw.frameworkVersion === f.regulationVersion ? [] : [`/framework/frameworkVersion: "${fw.frameworkVersion}" is not framework ${f.frameworkId}'s regulationVersion ("${f.regulationVersion}").`]),
    ...(subject.commodityCode === f.commodityCode ? [] : [`/subject/commodityCode: "${subject.commodityCode}" is not framework ${f.frameworkId}'s commodityCode ("${f.commodityCode}").`]),
  ];
  if (versionProblems.length > 0) throw cap06Failure("FRAMEWORK_VERSION_NOT_RESOLVED", versionProblems);
  if (fw.evidenceRequirementSpecId !== f.specId) {
    throw cap06Failure("EVIDENCE_REQUIREMENT_SPEC_NOT_FOUND", [
      `/framework/evidenceRequirementSpecId: "${fw.evidenceRequirementSpecId}" is not framework ${f.frameworkId}'s evidence requirement specification.`,
    ]);
  }

  // period: referenceDate is the specification's cut-off; the end date is not in the future (the latest calendar date anywhere is the UTC date plus one day)
  const referenceDate = f.referenceCutoffDate;
  const latestDate = new Date(cutoff.getTime() + DAY_MS).toISOString().slice(0, 10);
  const periodProblems = [
    ...(period.evaluationEndDate > referenceDate ? [] : [`/evaluationPeriod/evaluationEndDate (${period.evaluationEndDate}) must be after the reference date ${referenceDate} (the specification's referenceCutoffDate).`]),
    ...(period.evaluationEndDate <= latestDate ? [] : [`/evaluationPeriod/evaluationEndDate (${period.evaluationEndDate}) is in the future (database time ${cutoff.toISOString()}).`]),
  ];
  if (periodProblems.length > 0) throw cap06Failure("EVALUATION_PERIOD_INVALID", periodProblems);

  // plots
  const plots = await findPlots(tx, subject.plotIds, f.frameworkId);
  const plotProblems = subject.plotIds.flatMap((id) => {
    const p = plots.get(id);
    if (p === undefined) return [`No SCS-CAP-03 plot is registered with plotId ${id}.`];
    if (p.registrationStatus === "RETIRED") return [`Plot ${id} is RETIRED and cannot be evaluated.`];
    const asked = subject.plotVersions?.[id];
    if (asked !== undefined && asked !== p.plotVersion) return [`/subject/plotVersions: plot ${id} is at version ${p.plotVersion}, not ${asked}.`];
    return [];
  });
  const unknownVersions = Object.keys(subject.plotVersions ?? {}).filter((id) => !subject.plotIds.includes(id));
  plotProblems.push(...unknownVersions.map((id) => `/subject/plotVersions: ${id} is not one of the subject's plots.`));
  if (plotProblems.length > 0) throw cap06Failure("PLOT_NOT_FOUND", plotProblems);
  const unassociated = subject.plotIds.filter((id) => plots.get(id)!.associationId === null);
  if (unassociated.length > 0) {
    throw cap06Failure("FRAMEWORK_ASSOCIATION_NOT_FOUND", unassociated.map((id) => `Plot ${id} has no ACTIVE association with framework ${f.frameworkId}.`));
  }

  // custody subject
  const batches = [...(subject.batchIdentifiers ?? [])].sort();
  const operator = subject.operatorPartyId ?? null;
  if ((batches.length === 0) !== (operator === null)) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      "/subject: batchIdentifiers and operatorPartyId are given together or not at all.",
    ]);
  }
  const custody = await findCustodyEvents(tx, batches, f.frameworkId);
  if (operator !== null) {
    const missing = batches.filter((b) => !custody.some((e) => e.batchIdentifier === b));
    if (missing.length > 0) throw cap06Failure("BATCH_NOT_FOUND", missing.map((b) => `Batch "${b}" has no admitted custody event under framework ${f.frameworkId}.`));
    const party = await findParty(tx, operator);
    if (party === null || party.registrationStatus === "RETIRED") {
      throw cap06Failure("OPERATOR_PARTY_NOT_FOUND", [
        party === null ? `/subject/operatorPartyId: no SCS-CAP-02 party is registered with partyId ${operator}.` : `Operator party ${operator} is RETIRED.`,
      ]);
    }
  }

  // 3–4. Evidence scope, read in the snapshot
  const deforestation = await findDeforestationEvidence(tx, subject.plotIds, f.frameworkId);
  const scope = new Set([...deforestation.map((r) => r.evidenceId), ...custody.map((e) => e.eventId)]);
  const asked = req.evidenceScope.admittedEvidenceIds;
  if (asked !== undefined) {
    const admitted = await findAdmittedIds(tx, asked);
    const unresolved = asked.filter((id) => !admitted.has(id));
    if (unresolved.length > 0) {
      throw cap06Failure("EVIDENCE_RECORD_NOT_RESOLVED", unresolved.map((id) => `/evidenceScope/admittedEvidenceIds: ${id} is not an admitted SCS-CAP-04 record or SCS-CAP-05 event.`));
    }
    const extra = asked.filter((id) => !scope.has(id));
    const missing = [...scope].filter((id) => !asked.includes(id)).sort();
    if (extra.length > 0 || missing.length > 0) {
      throw cap06Failure("EVIDENCE_SCOPE_INCOMPLETE", [
        "The evidence scope is decided by the system: every admitted record for the subject under the framework. A requester's list must match it exactly.",
        ...missing.map((id) => `Missing from the list: ${id}, which is in scope.`),
        ...extra.map((id) => `Not in scope: ${id}.`),
      ]);
    }
  }

  // 5. Subject and previous evaluation
  const key = subjectKey({ plotIds: subject.plotIds, commodityCode: subject.commodityCode, frameworkId: f.frameworkId, batchIdentifiers: batches });
  if (req.previousEvaluationId !== undefined) {
    const prev = await findEvaluationSubject(tx, req.previousEvaluationId);
    if (prev === null) throw cap06Failure("EVALUATION_NOT_FOUND", [`/previousEvaluationId: no sufficiency evaluation is recorded with evaluationId ${req.previousEvaluationId}.`]);
    if (prev.subjectKey !== key) {
      throw cap06Failure("PREVIOUS_EVALUATION_NOT_SAME_SUBJECT", [
        `/previousEvaluationId: evaluation ${req.previousEvaluationId} concerns a different subject (plots, commodity, framework or batches); a re-evaluation must concern the same subject.`,
      ]);
    }
  }
  const repeated = await findRepeatedEvaluation(tx, key, period.evaluationEndDate, period.assessmentType);

  // 6. Manifest, and the parties whose verification the evaluation needs
  const manifest = [
    ...deforestation.map((r) => ({ kind: "DEFORESTATION" as const, evidenceId: r.evidenceId, version: r.evidenceVersion, contentDigest: r.contentDigest, admittedAt: r.admittedAt })),
    ...custody.map((e) => ({ kind: "CUSTODY" as const, evidenceId: e.eventId, version: e.eventVersion, contentDigest: e.contentDigest, admittedAt: e.admittedAt })),
  ];
  const partyIds = [
    ...new Set([
      ...deforestation.flatMap((r) => [r.analystPartyId, r.attestingPartyId]).filter((id): id is string => id !== null),
      ...custody.flatMap((e) => [e.sourcePartyId, e.destinationPartyId]),
    ]),
  ].sort();
  const verified = [...(await findVerifiedParties(tx, partyIds))].sort();
  const resolutions = await findResolutions(tx, [...scope]);

  // 7. Evaluation over the frozen input only
  const orderedPlots = [...subject.plotIds].sort().map((id) => plots.get(id)!);
  const outcome = evaluate({
    framework: f,
    plots: orderedPlots,
    deforestation,
    custody,
    verifiedPartyIds: verified,
    referenceDate,
    evaluationEndDate: period.evaluationEndDate,
    assessmentType: period.assessmentType,
    batchIdentifiers: batches,
    operatorPartyId: operator,
    resolutions,
  });

  const omitted = ["TEMPORAL_COVERAGE", "SPATIAL_COVERAGE", "REQUIREMENT_BY_REQUIREMENT", "CONFLICT_DETECTION", "GAP_IDENTIFICATION", "PROVENANCE_AND_AUTHORITY", "CUSTODY_CHAIN"].filter(
    (a) => !req.requestedAnalysis.includes(a as never),
  );
  const explanation = [
    `Evaluated under framework ${f.frameworkId} (regulationVersion ${f.regulationVersion}), evidence requirement specification ${f.specId}, for commodity ${f.commodityCode}.`,
    `Required period: ${referenceDate} (the specification's referenceCutoffDate) to ${period.evaluationEndDate}; assessment type ${period.assessmentType}.`,
    `Frozen input: ${deforestation.length} admitted deforestation evidence record(s) and ${custody.length} admitted custody event(s), read in one snapshot at ${cutoff.toISOString()}; the manifest records each item's version and content digest. Evidence admitted with limitations is always included.`,
    `Overall state: ${outcome.overallState}.`,
    ...(outcome.overallState === "SUFFICIENT" ? [] : [`Evaluation cannot reach SUFFICIENT because:`, ...outcome.findings.map((x, i) => `  ${i + 1}. ${x}`)]),
    "Pilot limit: spatial coverage and plot overlap are not evaluated (no spatial database), so no pilot evaluation can be SUFFICIENT. TODO(postgis).",
    "sufficiencyThreshold.humanReviewCompleted is a SCS-CAP-09 matter: human review follows this evaluation, so it is not evaluated here.",
    "No evidence in scope is quarantined: no quarantine operation exists yet.",
    `Every dimension was evaluated. requestedAnalysis is recorded as asked${omitted.length > 0 ? ` (it omits ${omitted.join(", ")})` : ""}, but it never narrows the evaluation.`,
    ...(repeated === null ? [] : [`An evaluation of this subject for the same period and assessment type already exists (${repeated.evaluationId}, evaluated at ${repeated.evaluatedAt}); this evaluation is recorded as well.`]),
    ...(req.previousEvaluationId === undefined ? [] : [`This is a re-evaluation of ${req.previousEvaluationId}, which is unchanged.`]),
    ...outcome.appliedResolutions.map(
      (r) =>
        `Applied conflict resolution ${r.resolutionId} to conflict ${r.conflictKey}, first found in evaluation ${r.originEvaluationId}: ` +
        (r.inapplicableEvidenceId === null ? "neither item was found inapplicable, so both stand." : `${r.inapplicableEvidenceId} was found inapplicable and is set aside for that requirement.`) +
        (r.remainingLimitations.length > 0 ? ` Remaining limitations: ${r.remainingLimitations.join("; ")}` : ""),
    ),
    "This result is advisory only: SUFFICIENT would mean sufficient under the evaluated specification, never legally compliant. Human review through SCS-CAP-09 is always required.",
  ];

  const evaluationId = randomUUID();
  const at = cutoff.toISOString();
  const result: ScsSufficiencyEvaluationResult = {
    evaluationId,
    requestId: randomUUID(),
    evaluatedAt: at,
    evaluatorVersion: EVALUATOR_VERSION,
    requestedBy: actor,
    requestedAt: at,
    frameworkId: f.frameworkId,
    frameworkVersion: f.regulationVersion,
    evidenceRequirementSpecId: f.specId,
    plotIds: [...subject.plotIds].sort(),
    commodityCode: f.commodityCode,
    batchIdentifiers: batches,
    ...(operator === null ? {} : { operatorPartyId: operator }),
    evaluationPeriod: { referenceDate, evaluationEndDate: period.evaluationEndDate, assessmentType: period.assessmentType },
    requestedAnalysis: req.requestedAnalysis,
    evidenceCutoffAt: at,
    evaluatedEvidence: {
      deforestationEvidenceIds: deforestation.map((r) => r.evidenceId),
      custodyEventIds: custody.map((e) => e.eventId),
      manifest,
      appliedResolutionIds: outcome.appliedResolutions.map((r) => r.resolutionId),
    },
    ...(req.previousEvaluationId === undefined ? {} : { previousEvaluationId: req.previousEvaluationId }),
    overallState: outcome.overallState,
    hasEvidenceGaps: outcome.hasEvidenceGaps,
    hasMaterialUnresolvedConflicts: outcome.hasMaterialUnresolvedConflicts,
    hasFailClosedConditions: false,
    requirementEvaluations: outcome.requirementEvaluations,
    temporalCoverage: outcome.temporalCoverage,
    spatialCoverage: outcome.spatialCoverage,
    ...(outcome.custodyChain === null ? {} : { custodyChain: outcome.custodyChain }),
    allGaps: outcome.allGaps,
    allConflicts: outcome.allConflicts,
    evaluationExplanation: explanation,
    nextSteps: outcome.nextSteps,
    authorityBoundary: {
      advisoryOnly: true,
      noComplianceDetermination: true,
      noDueDiligenceStatementAuthority: true,
      noRegulatoryPromotionAuthority: true,
      sufficientMeansEvidenceSufficient: true,
      sufficientDoesNotMeanLegallyCompliant: true,
    },
  };

  // 8. Writes — the evaluation, its plots, its frozen evidence and the receipt, in the one transaction
  await insertEvaluation(tx, { result, subjectKey: key, requestedBy: actor, plots: orderedPlots.map((p) => ({ plotId: p.plotId, plotVersion: p.plotVersion })) });
  const written = await writeReceipt<ScsSufficiencyEvaluationReceipt, typeof CAPABILITY_ID, ScsSufficiencyEvaluationResult>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "SUFFICIENCY_EVALUATION",
    subjectId: evaluationId,
    decision: result,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap06SufficiencyEvaluationReceipt,
  });

  const body: ScsSufficiencyEvaluationResponse = { decision: result, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
