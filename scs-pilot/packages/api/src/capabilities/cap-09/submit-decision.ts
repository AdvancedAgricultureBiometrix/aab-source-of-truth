// SCS-CAP-09 submitDecision — POST /scs/v1/review-decisions.
//
// A permanent, attributable human decision on one recorded SCS-CAP-06
// evaluation (contract ff6d3b8, "Review rules for the pilot"). Before this
// runs, the server layer has authenticated the actor, validated the body
// against review-decision-request.schema.json (ids lowercase UUIDs), checked
// the Idempotency-Key and opened the transaction.
//
// The route runs at READ COMMITTED, not REPEATABLE READ: decisions on a subject
// are serialised by an advisory lock on its subject key (step 10), and every
// statement after the lock must see a decision committed while this request
// waited for it. Under REPEATABLE READ the snapshot is taken by the idempotency
// lookup, before the lock, and two decisions on one subject could both become
// current. This is why it differs from getDecision and assessCurrency, which
// only read (and append an assessment) and so run in one REPEATABLE READ
// snapshot. Evaluations, receipts and resolutions are immutable, so reading them
// before the lock is safe.
//
// Checks, in order; each is FAIL_CLOSED and records nothing:
//   1. role          — REGULATORY_REVIEWER → REVIEWER_NOT_AUTHORISED (403).
//                      Checked first, so an unauthorised actor learns nothing
//   2. evaluation    — recorded → EVALUATION_NOT_FOUND (404)
//   3. independence  — not the evaluation's requester, and not the resolver of
//                      any conflict resolution it applied
//                      → REVIEWER_NOT_AUTHORISED (403)
//   4. integrity     — the stored result is exactly its receipt's decision, and
//                      the receipt hashes to its recorded digest
//                      → EVALUATION_INTEGRITY_FAILED (422)
//   5. digest        — evaluationSnapshotDigest is the stored result's
//                      → EVALUATION_DIGEST_MISMATCH (409)
//   6. not superseded — no later evaluation of the same subject
//                      → EVALUATION_ALREADY_SUPERSEDED (409)
//   7. context       — framework, version and commodity → FRAMEWORK_MISMATCH (422)
//   8. operator      — registered, not RETIRED → OPERATOR_PARTY_NOT_FOUND (422);
//                      the evaluation's operator, when it names one
//                      → OPERATOR_MISMATCH (422)
//   9. organisation  — registered, not RETIRED → REVIEWER_ORGANIZATION_NOT_FOUND (422)
//  10. once only     — the subject is locked; the evaluation is not yet decided
//                      → DECISION_ALREADY_RECORDED (409)
//  11. supersession  — names the subject's current decision exactly when there
//                      is one → SUPERSEDES_NOT_CURRENT (409)
//  12. outcome       — PROCEED only on GAPS_REQUIRE_HUMAN_DECISION or SUFFICIENT
//                      → OUTCOME_NOT_PERMITTED (422)
//  13. reasoning     — non-blank; every gap and every unresolved conflict
//                      addressed once; nothing the evaluation did not report
//                      → REASONING_INCOMPLETE (400), naming every problem
//
// Written: the decision, one reasoning item per gap and conflict addressed,
// and its receipt (REGULATORY_REVIEW_DECISION, outcome = decisionOutcome), in
// one transaction. The receipt records the decision with its currency as
// derived when it was decided: a decision on an evaluation whose scope has
// changed since is recorded POTENTIALLY_STALE, with the reasons disclosed, and
// is never refused for it (contract a816101, "A decision stale from the
// start").

import { randomUUID } from "node:crypto";

import { canonicalJson, sha256Hex } from "../../foundation/canonical.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsReviewDecisionReceipt, ScsReviewDecisionResponse, ScsReviewDecisionSubmission, ScsRegulatoryReviewDecision } from "../../types/cap-09.js";
import { decisionRecord, deriveCurrency } from "./currency.js";
import { CAPABILITY_ID, cap09Failure } from "./errors.js";
import {
  findAppliedResolutionReviewers,
  findCurrentDecision,
  findDecision,
  findDecisionForEvaluation,
  findEvaluation,
  findEvaluationReceipts,
  findLaterEvaluations,
  findParty,
  insertDecision,
  lockSubject,
  transactionStart,
  type DecisionRow,
} from "./store.js";

/** The only role that may submit a decision (contract ff6d3b8). */
export const REVIEWER_ROLE = "REGULATORY_REVIEWER";

/** ScsRegulatoryReviewDecision.schemaVersion. */
export const DECISION_SCHEMA_VERSION = "1";

const PROCEED = "PROCEED_TO_PACKAGE_COMPILATION";
const PROCEED_STATES = ["GAPS_REQUIRE_HUMAN_DECISION", "SUFFICIENT"];

const blank = (s: string) => s.trim() === "";

export async function submitDecision(ctx: RouteContext<ScsReviewDecisionSubmission>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const req = ctx.body;

  // 1. Role
  if (!actor.roles.includes(REVIEWER_ROLE)) {
    throw cap09Failure("REVIEWER_NOT_AUTHORISED", [`Submitting a review decision requires the ${REVIEWER_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }
  const at = await transactionStart(tx);

  // 2. The evaluation
  const found = await findEvaluation(tx, req.evaluationId);
  if (found === null) throw cap09Failure("EVALUATION_NOT_FOUND", [`/evaluationId: no SCS-CAP-06 evaluation is recorded with evaluationId ${req.evaluationId}.`]);
  const e = found.result;

  // 3. Independence
  const resolvers = await findAppliedResolutionReviewers(tx, req.evaluationId);
  const dependence = [
    ...(found.requestedBy.actorId === actor.actorId ? [`Actor ${actor.actorId} requested evaluation ${req.evaluationId} and cannot review it.`] : []),
    ...resolvers
      .filter((r) => r.actorId === actor.actorId)
      .map((r) => `Actor ${actor.actorId} recorded conflict resolution ${r.resolutionId}, which evaluation ${req.evaluationId} applied, and cannot review it.`),
  ];
  if (dependence.length > 0) throw cap09Failure("REVIEWER_NOT_AUTHORISED", dependence);

  // 4. Integrity: the stored result is still the one receipted
  const receipts = await findEvaluationReceipts(tx, req.evaluationId);
  const integrity =
    receipts.length !== 1
      ? [`Evaluation ${req.evaluationId} has ${receipts.length} SUFFICIENCY_EVALUATION receipts; exactly one is expected.`]
      : [
          ...(canonicalJson(receipts[0]!.receipt.decision) === canonicalJson(e) ? [] : [`The stored result of evaluation ${req.evaluationId} is not the result its receipt records.`]),
          ...(sha256Hex(canonicalJson(receipts[0]!.receipt)) === receipts[0]!.receiptDigest ? [] : [`The receipt of evaluation ${req.evaluationId} no longer hashes to its recorded receipt digest.`]),
        ];
  if (integrity.length > 0) {
    throw cap09Failure("EVALUATION_INTEGRITY_FAILED", [...integrity, "The evaluation cannot be relied on (tampering or corruption); no decision can be recorded on it."]);
  }

  // 5. The digest of what the reviewer reviewed
  const digest = sha256Hex(canonicalJson(e));
  if (req.evaluationSnapshotDigest !== digest) {
    throw cap09Failure("EVALUATION_DIGEST_MISMATCH", [
      `/evaluationSnapshotDigest: ${req.evaluationSnapshotDigest} is not the digest of evaluation ${req.evaluationId} as recorded (${digest}): the evaluation reviewed is not the one recorded.`,
    ]);
  }

  // 6. Not superseded
  const later = await findLaterEvaluations(tx, req.evaluationId, found.subjectKey);
  if (later.length > 0) {
    throw cap09Failure("EVALUATION_ALREADY_SUPERSEDED", [
      ...later.map((l) => `Evaluation ${l.evaluationId} of the same subject was made at ${l.evaluatedAt}, at or after evaluation ${req.evaluationId}.`),
      "Only the latest evaluation of a subject can be decided on.",
    ]);
  }

  // 7. Context
  const context = [
    ...(req.frameworkId === e.frameworkId ? [] : [`/frameworkId: ${req.frameworkId} is not the evaluation's framework (${e.frameworkId}).`]),
    ...(req.frameworkVersion === e.frameworkVersion ? [] : [`/frameworkVersion: "${req.frameworkVersion}" is not the evaluation's framework version ("${e.frameworkVersion}").`]),
    ...(req.commodityCode === e.commodityCode ? [] : [`/commodityCode: "${req.commodityCode}" is not the evaluation's commodity ("${e.commodityCode}").`]),
  ];
  if (context.length > 0) throw cap09Failure("FRAMEWORK_MISMATCH", context);

  // 8. Operator
  const operator = await findParty(tx, req.operatorId);
  if (operator === null || operator.registrationStatus === "RETIRED") {
    throw cap09Failure("OPERATOR_PARTY_NOT_FOUND", [
      operator === null ? `/operatorId: no SCS-CAP-02 party is registered with partyId ${req.operatorId}.` : `/operatorId: party ${req.operatorId} is RETIRED.`,
    ]);
  }
  if (e.operatorPartyId !== undefined && e.operatorPartyId !== req.operatorId) {
    throw cap09Failure("OPERATOR_MISMATCH", [`/operatorId: ${req.operatorId} is not the operator of evaluation ${req.evaluationId} (${e.operatorPartyId}).`]);
  }

  // 9. The reviewer's organisation
  const org = await findParty(tx, req.reviewer.reviewerOrganizationId);
  if (org === null || org.registrationStatus === "RETIRED") {
    throw cap09Failure("REVIEWER_ORGANIZATION_NOT_FOUND", [
      org === null
        ? `/reviewer/reviewerOrganizationId: no SCS-CAP-02 party is registered with partyId ${req.reviewer.reviewerOrganizationId}.`
        : `/reviewer/reviewerOrganizationId: party ${req.reviewer.reviewerOrganizationId} is RETIRED.`,
    ]);
  }

  // 10. Once only — from here on, decisions on this subject are serialised
  await lockSubject(tx, found.subjectKey);
  const existing = await findDecisionForEvaluation(tx, req.evaluationId);
  if (existing !== null) throw cap09Failure("DECISION_ALREADY_RECORDED", [`Evaluation ${req.evaluationId} is already decided by ${existing}; an evaluation is decided at most once.`]);

  // 11. Supersession
  const current = await findCurrentDecision(tx, found.subjectKey);
  const named = req.supersedes?.priorDecisionId;
  if (current === null && named !== undefined) {
    throw cap09Failure("SUPERSEDES_NOT_CURRENT", [`/supersedes/priorDecisionId: the subject has no decision, so ${named} cannot be superseded by this decision.`]);
  }
  if (current !== null && named !== current) {
    throw cap09Failure("SUPERSEDES_NOT_CURRENT", [
      named === undefined
        ? `/supersedes: the subject's current decision is ${current}; a new decision on the subject must name it in supersedes, with a reason.`
        : `/supersedes/priorDecisionId: ${named} is not the subject's current decision (${current}).`,
    ]);
  }
  const prior: DecisionRow | null = current === null ? null : await findDecision(tx, current);

  // 12. Outcome
  if (req.decisionOutcome === PROCEED && !PROCEED_STATES.includes(e.overallState)) {
    throw cap09Failure("OUTCOME_NOT_PERMITTED", [
      e.overallState === "CONFLICTING_EVIDENCE"
        ? `${PROCEED} is not permitted on a CONFLICTING_EVIDENCE evaluation: a conflict is resolved only through a recorded SCS-CAP-06 conflict resolution and a new evaluation.`
        : `${PROCEED} is not permitted on an ${e.overallState} evaluation: human review cannot cure missing evidence.`,
      "DO_NOT_PROCEED, REQUIRES_FURTHER_EVIDENCE and REQUIRES_SPECIALIST_REVIEW are always permitted.",
    ]);
  }

  // 13. Reasoning
  const rr = req.reviewReasoning;
  const problems: string[] = [];
  if (blank(rr.evaluationSummaryAssessed)) problems.push("/reviewReasoning/evaluationSummaryAssessed: must not be blank.");
  if (blank(rr.basisForOutcome)) problems.push("/reviewReasoning/basisForOutcome: must not be blank.");
  for (const [field, list] of [["limitationsAcknowledged", rr.limitationsAcknowledged], ["remainingConcerns", rr.remainingConcerns ?? []], ["conditionsIfAny", rr.conditionsIfAny ?? []]] as const) {
    list.forEach((x, i) => blank(x) && problems.push(`/reviewReasoning/${field}/${i}: must not be blank.`));
  }
  const gapIds = new Set(e.allGaps.map((g) => g.gapId));
  const seenGaps = new Set<string>();
  rr.gapsConsidered.forEach((g, i) => {
    if (!gapIds.has(g.gapId)) problems.push(`/reviewReasoning/gapsConsidered/${i}: the evaluation reports no gap ${g.gapId}.`);
    else if (seenGaps.has(g.gapId)) problems.push(`/reviewReasoning/gapsConsidered/${i}: gap ${g.gapId} is addressed more than once.`);
    seenGaps.add(g.gapId);
    if (blank(g.assessment)) problems.push(`/reviewReasoning/gapsConsidered/${i}/assessment: must not be blank.`);
  });
  for (const g of e.allGaps.filter((x) => !seenGaps.has(x.gapId))) {
    problems.push(`/reviewReasoning/gapsConsidered: gap ${g.gapId} (${g.requirementCode}) is not addressed.`);
  }
  const conflictKeys = new Set(e.allConflicts.map((c) => c.conflictKey));
  const seenConflicts = new Set<string>();
  rr.conflictsConsidered.forEach((c, i) => {
    if (!conflictKeys.has(c.conflictKey)) problems.push(`/reviewReasoning/conflictsConsidered/${i}: the evaluation reports no conflict ${c.conflictKey}.`);
    else if (seenConflicts.has(c.conflictKey)) problems.push(`/reviewReasoning/conflictsConsidered/${i}: conflict ${c.conflictKey} is addressed more than once.`);
    seenConflicts.add(c.conflictKey);
    if (blank(c.assessment)) problems.push(`/reviewReasoning/conflictsConsidered/${i}/assessment: must not be blank.`);
  });
  for (const c of e.allConflicts.filter((x) => x.resolutionStatus === "UNRESOLVED" && !seenConflicts.has(x.conflictKey))) {
    problems.push(`/reviewReasoning/conflictsConsidered: unresolved conflict ${c.conflictKey} is not addressed.`);
  }
  if (problems.length > 0) throw cap09Failure("REASONING_INCOMPLETE", [...problems, "Generic reasoning is refused; nothing was recorded."]);

  // The decision
  const decisionId = randomUUID();
  const decisionReasons = [
    `The reviewer ${actor.actorId} holds ${REVIEWER_ROLE}, checked at ${at.toISOString()}. The reviewer's name and role reference are recorded as declared.`,
    `The authority basis is recorded as declared, not verified: no model exists of which reviewer may decide for which framework and commodity.`,
    `Independence was checked: the reviewer did not request evaluation ${e.evaluationId} and recorded none of the ${resolvers.length} conflict resolution(s) it applied.`,
    `The decision is bound to evaluation ${e.evaluationId} as recorded: its stored result matches its receipt, and the digest reviewed is the stored result's (${digest}).`,
    ...(req.decisionOutcome === PROCEED && e.overallState === "GAPS_REQUIRE_HUMAN_DECISION"
      ? [
          `${PROCEED} on a GAPS_REQUIRE_HUMAN_DECISION evaluation is a human decision on disclosed gaps: the reviewer addressed each of the evaluation's ${e.allGaps.length} gap(s) and decided to proceed despite them. It does not make the evidence sufficient.`,
        ]
      : []),
    "No pilot evaluation can be SUFFICIENT (SCS-CAP-06 does not evaluate spatial coverage), so every pilot PROCEED_TO_PACKAGE_COMPILATION is a human decision on disclosed gaps.",
    "This decision authorises a workflow step only. It is not a compliance determination, carries no regulatory submission authority, does not substitute for regulatory acceptance, and legal responsibility remains with the operator.",
    ...(prior === null || req.supersedes === undefined
      ? []
      : [`It supersedes decision ${prior.decisionId} (${prior.decisionOutcome} on evaluation ${prior.evaluationId}, decided at ${prior.decidedAt}), which is unchanged.`]),
  ];
  await insertDecision(tx, {
    decisionId,
    schemaVersion: DECISION_SCHEMA_VERSION,
    evaluationId: e.evaluationId,
    evaluationSnapshotDigest: digest,
    subjectKey: found.subjectKey,
    frameworkId: e.frameworkId,
    frameworkVersion: e.frameworkVersion,
    evidenceRequirementSpecId: e.evidenceRequirementSpecId,
    commodityCode: e.commodityCode,
    evaluationOverallState: e.overallState,
    operatorPartyId: req.operatorId,
    plotIds: e.plotIds,
    decisionOutcome: req.decisionOutcome,
    evaluationSummaryAssessed: rr.evaluationSummaryAssessed,
    limitationsAcknowledged: rr.limitationsAcknowledged,
    basisForOutcome: rr.basisForOutcome,
    remainingConcerns: rr.remainingConcerns ?? [],
    conditions: rr.conditionsIfAny ?? [],
    gapsConsidered: rr.gapsConsidered,
    conflictsConsidered: rr.conflictsConsidered,
    reviewer: actor,
    reviewerName: req.reviewer.reviewerName,
    reviewerOrganizationId: req.reviewer.reviewerOrganizationId,
    reviewerRoleReference: req.reviewer.reviewerRoleReference,
    authorityBasis: req.reviewer.authorityBasis,
    authorityVerifiedAt: at,
    decidedAt: at,
    recordValidity: "VALID",
    decisionReasons,
    supersedesDecisionId: prior?.decisionId ?? null,
    supersessionReason: req.supersedes?.supersessionReason ?? null,
  });

  // Read back what was recorded, with its currency as derived now
  const row = (await findDecision(tx, decisionId))!;
  const currency = await deriveCurrency(tx, row, e, at);
  const record = decisionRecord(row, currency, prior);
  const written = await writeReceipt<ScsReviewDecisionReceipt, typeof CAPABILITY_ID, ScsRegulatoryReviewDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "REGULATORY_REVIEW_DECISION",
    subjectId: decisionId,
    decision: record,
    outcome: req.decisionOutcome,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap09ReviewDecisionReceipt,
  });

  const body: ScsReviewDecisionResponse = { decision: record, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
