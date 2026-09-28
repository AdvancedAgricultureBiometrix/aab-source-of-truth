// SCS-CAP-08 requestCompilation — POST /scs/v1/due-diligence-packages.
//
// Compiles a due diligence package from a CURRENT, VALID, PROCEED review
// decision, and renders it, in one step (contract 4b1f05b, 901a600; SCS-
// PLATFORM-02 a0f8c46). Before this runs, the server layer has authenticated
// the actor, validated the body (ids lowercase UUIDs), checked the
// Idempotency-Key and opened one REPEATABLE READ transaction: the gate, the
// decision's currency and every record packaged are read in one snapshot.
//
// Checks, in order; each is FAIL_CLOSED and records nothing:
//   1. role          — COMPLIANCE_OFFICER → REQUESTOR_NOT_AUTHORISED (403)
//   2. the decision  — recorded → REVIEW_DECISION_NOT_FOUND (404)
//   3. independence  — the compiler is not the decision's reviewer
//                      → REQUESTOR_NOT_AUTHORISED (403)
//   4. the gate      — SCS-CAP-09 validateForPackageCompilation: outcome,
//                      validity, currency, evaluation, framework and version,
//                      plots, operator, commodity; the first failure's code,
//                      with failedGateCheck and every blocker
//   5. evidence scope — the request's evidence ids are the manifest, as sets
//                      → EVIDENCE_SCOPE_MISMATCH (422)
//   6. integrity     — the evaluation and the decision match their receipts
//                      → EVALUATION_INTEGRITY_FAILED, REVIEW_DECISION_INTEGRITY_FAILED
//   7. records       — each item at its manifest version and digest, with its
//                      admission receipt → EVIDENCE_RECORDS_NOT_RESOLVED; each
//                      plot at its evaluated version, with its association
//                      → PLOT_RECORDS_NOT_FOUND
//   8. files         — every cited file re-hashed from the object store
//                      → EVIDENCE_INTEGRITY_FAILED; store down → DEPENDENCY_UNAVAILABLE
//   9. assembly and digest (assemble.ts), then the rendition (AAB-PLATFORM-02)
//                      → RENDITION_FAILED when the package cannot be rendered
//
// Written: the rendition, the package, the compilation record and its receipt
// (PACKAGE_COMPILATION, outcome COMPILED), in one transaction. The rendition's
// bytes are stored first; if the transaction fails they are an unreferenced
// object. The database's commit-time trigger refuses a package without its
// compilation record and receipt.

import { randomUUID } from "node:crypto";

import { holdsRole, sameActor } from "../../foundation/actor.js";
import { canonicalJson, sha256Hex } from "../../foundation/canonical.js";
import { ScsFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import type { ObjectStore } from "../../platform/evidence-objects/object-store.js";
import { RenditionError } from "../../platform/renditions/renderer.js";
import { produceRendition } from "../../platform/renditions/rendition.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsDueDiligencePackageEnvelope,
  ScsPackageCompilationDecision,
  ScsPackageCompilationReceipt,
  ScsPackageCompilationResponse,
  ScsPackageCompilationSubmission,
} from "../../types/cap-08.js";
import { DERIVED_DECISION_FIELDS, recordedDecision } from "../cap-09/currency.js";
import { validateForPackageCompilation } from "../cap-09/validate-for-package.js";
import { assemblePackage, COMPILATION_VERSION, PACKAGE_SCHEMA_VERSION, packageDigestOf } from "./assemble.js";
import { CAPABILITY_ID, cap08Failure, type Cap08FailureCode } from "./errors.js";
import { findAdmissionReceipts, findCustodyRecords, findDeforestationRecords, findEvaluatedPlots, findFramework, findParty, findReceipts, insertCompilation, insertPackage, transactionStart } from "./store.js";
import { packageDocument, RENDERER_VERSION } from "./template.js";

/** The only role that may compile a package (contract 4b1f05b). */
export const COMPILER_ROLE = "COMPLIANCE_OFFICER";

/** compilationMetadata.compiledByServiceIdentity. */
export const SERVICE_IDENTITY = `scs-pilot-api;${COMPILATION_VERSION}`;

const GATE_CHECKS = {
  reviewDecisionFound: true, outcomePermitsCompilation: true, recordIsValid: true, currencyIsCurrent: true, evaluationIdMatches: true,
  frameworkVersionMatches: true, plotIdsMatch: true, operatorIdMatches: true, commodityCodeMatches: true,
} as const;

const sameSet = (a: readonly string[], b: readonly string[]) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
const withoutDerived = (decision: Record<string, unknown>) => Object.fromEntries(Object.entries(decision).filter(([k]) => !(DERIVED_DECISION_FIELDS as readonly string[]).includes(k)));

/** Object store failures during compilation are SCS-CAP-08's DEPENDENCY_UNAVAILABLE. */
async function fromStore<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (err instanceof ScsFailure && err.code === "DEPENDENCY_UNAVAILABLE") throw cap08Failure("DEPENDENCY_UNAVAILABLE", err.reasons);
    throw err;
  }
}

export function requestCompilation(objectStore: ObjectStore) {
  return async (ctx: RouteContext<ScsPackageCompilationSubmission>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const actor = ctx.actor!;
    const req = ctx.body;

    // 1. Role
    if (!holdsRole(actor, COMPILER_ROLE)) {
      throw cap08Failure("REQUESTOR_NOT_AUTHORISED", [`Compiling a due diligence package requires the ${COMPILER_ROLE} role; actor ${actor.actorId} does not hold it.`]);
    }
    const at = await transactionStart(tx);

    // 2–4. The decision, independence, the gate
    const v = await validateForPackageCompilation(tx, req.reviewDecisionId, req, at);
    const first = v.result.blockers[0];
    if (!v.result.decisionFound) {
      throw cap08Failure("REVIEW_DECISION_NOT_FOUND", [first!.explanation], { failedGateCheck: "reviewDecisionFound", blockers: v.result.blockers });
    }
    const decisionRow = v.decision!;
    if (sameActor(decisionRow.reviewer, actor)) {
      throw cap08Failure("REQUESTOR_NOT_AUTHORISED", [`Actor ${actor.actorId} made review decision ${decisionRow.decisionId} and cannot compile it: the reviewer authorises the step, someone else takes it.`]);
    }
    if (first !== undefined) {
      const CHECK: Record<string, string> = {
        REVIEW_DECISION_OUTCOME_NOT_PROCEED: "outcomePermitsCompilation", REVIEW_DECISION_NOT_VALID: "recordIsValid", REVIEW_DECISION_NOT_CURRENT: "currencyIsCurrent",
        EVALUATION_ID_MISMATCH: "evaluationIdMatches", FRAMEWORK_VERSION_MISMATCH: "frameworkVersionMatches", PLOT_IDS_MISMATCH: "plotIdsMatch",
        OPERATOR_MISMATCH: "operatorIdMatches", COMMODITY_MISMATCH: "commodityCodeMatches",
      };
      throw cap08Failure(
        first.blockerType as Cap08FailureCode,
        v.result.blockers.map((b) => `${b.blockerType}: ${b.explanation} Required: ${b.requiredAction}`),
        { failedGateCheck: CHECK[first.blockerType]!, blockers: v.result.blockers },
      );
    }
    const e = v.evaluation!;

    // 5. Evidence scope: exactly the manifest
    const scopeProblems = [
      ...(sameSet(req.deforestationEvidenceIds, e.evaluatedEvidence.deforestationEvidenceIds) ? [] : [
        `/deforestationEvidenceIds must be exactly the evaluation's deforestation evidence (${e.evaluatedEvidence.deforestationEvidenceIds.length} item(s): ${e.evaluatedEvidence.deforestationEvidenceIds.join(", ") || "none"}).`,
      ]),
      ...(sameSet(req.custodyEvidenceIds, e.evaluatedEvidence.custodyEventIds) ? [] : [
        `/custodyEvidenceIds must be exactly the evaluation's custody events (${e.evaluatedEvidence.custodyEventIds.length} item(s): ${e.evaluatedEvidence.custodyEventIds.join(", ") || "none"}).`,
      ]),
    ];
    if (scopeProblems.length > 0) throw cap08Failure("EVIDENCE_SCOPE_MISMATCH", scopeProblems);

    // 6. Integrity of the evaluation and the decision against their receipts
    const evalReceipts = await findReceipts(tx, "SCS-CAP-06", "SUFFICIENCY_EVALUATION", e.evaluationId);
    const evaluationDigest = sha256Hex(canonicalJson(e));
    const evalProblems =
      evalReceipts.length !== 1
        ? [`Evaluation ${e.evaluationId} has ${evalReceipts.length} SUFFICIENCY_EVALUATION receipts; exactly one is expected.`]
        : [
            ...(canonicalJson(evalReceipts[0]!.receipt["decision"]) === canonicalJson(e) ? [] : [`The stored result of evaluation ${e.evaluationId} is not the result its receipt records.`]),
            ...(sha256Hex(canonicalJson(evalReceipts[0]!.receipt)) === evalReceipts[0]!.receiptDigest ? [] : [`The receipt of evaluation ${e.evaluationId} no longer hashes to its recorded digest.`]),
            ...(evaluationDigest === decisionRow.evaluationSnapshotDigest ? [] : [`Evaluation ${e.evaluationId} no longer hashes to the digest decision ${decisionRow.decisionId} reviewed.`]),
          ];
    if (evalProblems.length > 0) throw cap08Failure("EVALUATION_INTEGRITY_FAILED", [...evalProblems, "The evaluation cannot be relied on (tampering or corruption); no package is compiled."]);
    const decision = recordedDecision(decisionRow, v.prior);
    const decReceipts = await findReceipts(tx, "SCS-CAP-09", "REGULATORY_REVIEW_DECISION", decisionRow.decisionId);
    const decProblems =
      decReceipts.length !== 1
        ? [`Decision ${decisionRow.decisionId} has ${decReceipts.length} REGULATORY_REVIEW_DECISION receipts; exactly one is expected.`]
        : [
            ...(canonicalJson(withoutDerived(decReceipts[0]!.receipt["decision"] as Record<string, unknown>)) === canonicalJson(decision) ? [] : [`The stored decision ${decisionRow.decisionId} is not the decision its receipt records.`]),
            ...(sha256Hex(canonicalJson(decReceipts[0]!.receipt)) === decReceipts[0]!.receiptDigest ? [] : [`The receipt of decision ${decisionRow.decisionId} no longer hashes to its recorded digest.`]),
          ];
    if (decProblems.length > 0) throw cap08Failure("REVIEW_DECISION_INTEGRITY_FAILED", [...decProblems, "The decision cannot be relied on (tampering or corruption); no package is compiled."]);

    // 7. Records as the evaluation froze them
    const manifest = e.evaluatedEvidence.manifest;
    const defIds = manifest.filter((m) => m.kind === "DEFORESTATION").map((m) => m.evidenceId);
    const cusIds = manifest.filter((m) => m.kind === "CUSTODY").map((m) => m.evidenceId);
    const [defRows, cusRows] = [await findDeforestationRecords(tx, defIds), await findCustodyRecords(tx, cusIds)];
    const receipts = new Map<string, string>();
    const defReceipts = await findAdmissionReceipts(tx, "SCS-CAP-04", "DEFORESTATION_EVIDENCE_ADMISSION", defIds);
    const cusReceipts = await findAdmissionReceipts(tx, "SCS-CAP-05", "CUSTODY_EVENT_ADMISSION", cusIds);
    const recordProblems: string[] = [];
    for (const m of manifest) {
      const row = m.kind === "DEFORESTATION" ? defRows.get(m.evidenceId) : cusRows.get(m.evidenceId);
      const version = row === undefined ? undefined : "evidenceVersion" in row ? row.evidenceVersion : row.eventVersion;
      if (row === undefined) recordProblems.push(`${m.kind} ${m.evidenceId} in the manifest is not recorded.`);
      else if (version !== m.version || row.contentDigest !== m.contentDigest) {
        recordProblems.push(`${m.kind} ${m.evidenceId} is at version ${version} with digest ${row.contentDigest}, not the manifest's version ${m.version} and digest ${m.contentDigest}.`);
      }
      const ids = (m.kind === "DEFORESTATION" ? defReceipts : cusReceipts).get(m.evidenceId) ?? [];
      if (ids.length !== 1) recordProblems.push(`${m.kind} ${m.evidenceId} has ${ids.length} admission receipts; exactly one is expected.`);
      else receipts.set(m.evidenceId, ids[0]!);
    }
    if (recordProblems.length > 0) throw cap08Failure("EVIDENCE_RECORDS_NOT_RESOLVED", recordProblems);
    const plots = await findEvaluatedPlots(tx, e.evaluationId, e.frameworkId);
    const plotProblems = plots.flatMap((p) => [
      ...(p.plotVersion === null ? [`Plot ${p.plotId} is no longer at the evaluated version ${p.evaluatedVersion}.`] : []),
      ...(p.plotVersion !== null && p.associationId === null ? [`Plot ${p.plotId} has no ACTIVE association with framework ${e.frameworkId}.`] : []),
    ]);
    if (plots.length === 0) plotProblems.push(`Evaluation ${e.evaluationId} records no plots.`);
    if (plotProblems.length > 0) throw cap08Failure("PLOT_RECORDS_NOT_FOUND", plotProblems);
    const framework = await findFramework(tx, e.frameworkId);
    if (framework === null) throw cap08Failure("FRAMEWORK_NOT_FOUND", [`Framework ${e.frameworkId} is not registered.`]);
    const operator = (await findParty(tx, decisionRow.operatorPartyId))!;

    // 8. Every cited file, re-hashed from the object store
    const deforestation = defIds.map((id) => defRows.get(id)!);
    const custody = cusIds.map((id) => cusRows.get(id)!);
    const fileProblems: string[] = [];
    const verifiedFiles = new Set<string>();
    for (const [kind, id, sha] of [
      ...deforestation.map((r) => ["deforestation evidence", r.evidenceId, r.objectSha256] as const),
      ...custody.map((c) => ["custody event", c.eventId, c.objectSha256] as const),
    ]) {
      // a record that cites no stored file has none to verify; its provenance says so
      if (sha === null) continue;
      const read = await fromStore(() => objectStore.read(sha));
      if (read.state === "MISSING") fileProblems.push(`The file of ${kind} ${id} (SHA-256 ${sha}) is not in the object store.`);
      else if (read.state === "CHANGED") fileProblems.push(`The file of ${kind} ${id} hashes to ${read.actualSha256}, not its recorded SHA-256 ${sha}.`);
      else verifiedFiles.add(id);
    }
    if (fileProblems.length > 0) throw cap08Failure("EVIDENCE_INTEGRITY_FAILED", [...fileProblems, "A package goes to a regulator: every file it cites is verified when it is compiled."]);

    // 9. The package, its digest and its rendition
    const content = assemblePackage({
      packageTitle: req.packageTitle,
      framework,
      operator,
      plots,
      deforestation,
      custody,
      evaluation: e,
      evaluationSnapshotDigest: evaluationDigest,
      evaluationReceiptDigest: evalReceipts[0]!.receiptDigest,
      decision,
      decisionReceiptDigest: decReceipts[0]!.receiptDigest,
      admissionReceipts: receipts,
      verifiedFiles,
    });
    const digest = packageDigestOf(content);
    const packageId = randomUUID();
    const envelope: ScsDueDiligencePackageEnvelope = {
      package: content,
      packageDigest: digest,
      compilationMetadata: { packageId, compiledAt: at.toISOString(), requestedByActorId: actor.actorId, compiledByServiceIdentity: SERVICE_IDENTITY },
    };
    let rendition;
    try {
      rendition = await fromStore(() =>
        produceRendition(tx, objectStore, {
          capabilityId: CAPABILITY_ID,
          sourceRecordId: packageId,
          sourceDigest: digest,
          sourceDigestAlgorithm: "SHA-256",
          rendererVersion: RENDERER_VERSION,
          document: packageDocument(envelope),
          renderedAt: at,
          renderedFor: actor,
        }),
      );
    } catch (err) {
      if (err instanceof RenditionError) throw cap08Failure("RENDITION_FAILED", [`The package cannot be rendered: ${err.message}.`, "Nothing is compiled without its rendition."]);
      throw err;
    }

    // Writes: the package, its compilation record and receipt (the rendition is already recorded)
    await insertPackage(tx, {
      packageId,
      schemaVersion: PACKAGE_SCHEMA_VERSION,
      reviewDecisionId: decisionRow.decisionId,
      evaluationId: e.evaluationId,
      operatorPartyId: decisionRow.operatorPartyId,
      frameworkId: e.frameworkId,
      frameworkVersion: e.frameworkVersion,
      commodityCode: e.commodityCode,
      packageContent: content,
      packageDigest: digest,
      compiledAt: at,
      requestedByActorId: actor.actorId,
      compiledByServiceIdentity: SERVICE_IDENTITY,
    });
    const record: ScsPackageCompilationDecision = {
      compilationId: randomUUID(),
      packageId,
      requestId: randomUUID(),
      decision: "COMPILED",
      gateChecks: GATE_CHECKS,
      compiledAt: at.toISOString(),
      compiledBy: actor,
      compiledByServiceIdentity: SERVICE_IDENTITY,
      packageDigest: digest,
      rendition: { renditionId: rendition.renditionId, mediaType: rendition.mediaType, sha256: rendition.sha256, rendererVersion: rendition.rendererVersion },
    };
    await insertCompilation(tx, {
      compilationId: record.compilationId,
      packageId,
      packageDigest: digest,
      compiledAt: at,
      requestId: record.requestId,
      compiledBy: actor,
      gateChecks: GATE_CHECKS,
      renditionId: rendition.renditionId,
    });
    const written = await writeReceipt<ScsPackageCompilationReceipt, typeof CAPABILITY_ID, ScsPackageCompilationDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "PACKAGE_COMPILATION",
      subjectId: packageId,
      decision: record,
      issuedFor: actor,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.cap08PackageCompilationReceipt,
    });

    const body: ScsPackageCompilationResponse = { decision: record, package: envelope, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
