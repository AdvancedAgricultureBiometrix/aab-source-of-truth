// SCS-CAP-08 getPackage and verifyPackageIntegrity (contract 700c40a,
// "Reading and verifying", "Verifying a package").
//
//   GET /scs/v1/due-diligence-packages/:packageId
//        { envelope, currency }: the envelope exactly as stored (what
//        packageDigest covers) and, beside it, the currency of the decision
//        it was compiled from, derived now; never part of the digested content
//   GET /scs/v1/due-diligence-packages/:packageId/integrity
//        a verification: always 200 for a package that exists, with every
//        check and an overall integrityStatus. Finding a change is a result,
//        never a failure; an unreachable object store makes file checks
//        UNVERIFIABLE, never a guess
//
// Both run in one REPEATABLE READ transaction and record nothing. Checks:
//   1. authority — COMPLIANCE_OFFICER or REGULATORY_REVIEWER
//                  → REQUESTOR_NOT_AUTHORISED (403)
//   2. lookup    — an unknown packageId → PACKAGE_NOT_FOUND (404)


import { holdsRole } from "../../foundation/actor.js";
import { canonicalJson, sha256Hex } from "../../foundation/canonical.js";
import { ScsFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import type { RouteContext } from "../../foundation/server.js";
import type { ObjectRead, ObjectStore } from "../../platform/evidence-objects/object-store.js";
import type { ScsSufficiencyEvaluationResult } from "../../types/cap-06.js";
import type {
  ScsDueDiligencePackage,
  ScsDueDiligencePackageEnvelope,
  ScsPackageIntegrityCheck,
  ScsPackageIntegrityVerificationResult,
  ScsPackageReadResult,
} from "../../types/cap-08.js";
import { DERIVED_DECISION_FIELDS, deriveCurrency, recordedDecision } from "../cap-09/currency.js";
import { findDecision, findEvaluation } from "../cap-09/store.js";
import { packageDigestOf } from "./assemble.js";
import { cap08Failure, READER_ROLES } from "./errors.js";
import { findCustodyRecords, findDeforestationRecords, findPackage, findReceipts, transactionStart, type PackageRow } from "./store.js";

type Status = ScsPackageIntegrityVerificationResult["integrityStatus"];
type Finding = Exclude<Status, "INTACT">;

/** The overall status: the first that applies. A found change outranks a check that could not be performed. */
const PRECEDENCE: readonly Finding[] = [
  "DIGEST_MISMATCH", "EVALUATION_CHANGED", "REVIEW_DECISION_CHANGED", "EVIDENCE_RECORDS_CHANGED", "EVIDENCE_OBJECT_MISSING", "EVIDENCE_CHANGED", "UNVERIFIABLE",
];

async function readable(ctx: RouteContext<undefined>, action: string): Promise<{ row: PackageRow; at: Date }> {
  const actor = ctx.actor!;
  if (!READER_ROLES.some((r) => holdsRole(actor, r))) {
    throw cap08Failure("REQUESTOR_NOT_AUTHORISED", [`${action} requires the ${READER_ROLES.join(" or ")} role; actor ${actor.actorId} holds neither.`]);
  }
  const packageId = ctx.params["packageId"]!.toLowerCase();
  const at = await transactionStart(ctx.tx!);
  const row = await findPackage(ctx.tx!, packageId);
  if (row === null) throw cap08Failure("PACKAGE_NOT_FOUND", [`No due diligence package is recorded with packageId ${packageId}.`]);
  return { row, at };
}

/** The envelope exactly as stored. */
function envelopeOf(row: PackageRow): ScsDueDiligencePackageEnvelope {
  return {
    package: row.packageContent as ScsDueDiligencePackage,
    packageDigest: row.packageDigest,
    compilationMetadata: {
      packageId: row.packageId,
      compiledAt: row.compiledAt,
      requestedByActorId: row.requestedByActorId,
      compiledByServiceIdentity: row.compiledByServiceIdentity,
    },
  };
}

export async function getPackage(ctx: RouteContext<undefined>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const { row, at } = await readable(ctx, "Reading a due diligence package");
  // the decision and its evaluation exist: the package's foreign keys require them
  const decision = (await findDecision(tx, row.reviewDecisionId))!;
  const evaluation = (await findEvaluation(tx, decision.evaluationId))!;
  const c = await deriveCurrency(tx, decision, evaluation.result, at);
  const body: ScsPackageReadResult = {
    envelope: envelopeOf(row),
    currency: {
      decisionId: decision.decisionId,
      status: c.currencyStatus,
      assessedAt: c.assessedAt.toISOString(),
      ...(c.materialChanges.length === 0 ? {} : { stalenessReasons: c.materialChanges.map((m) => ({ ...m })) }),
      ...(c.successor === null ? {} : { supersededByDecisionId: c.successor.decisionId }),
    },
  };
  return { status: 200, body };
}

const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const withoutDerived = (d: Record<string, unknown>) => Object.fromEntries(Object.entries(d).filter(([k]) => !(DERIVED_DECISION_FIELDS as readonly string[]).includes(k)));

/** Run one comparison; anything that cannot even be compared (a malformed record) is that check's finding. */
async function compare(finding: Finding, fn: () => Promise<string[]>): Promise<{ result: "PASS" | Finding; detail: string }> {
  let problems: string[];
  try {
    problems = await fn();
  } catch (err) {
    if (err instanceof ScsFailure) throw err; // the database, not the record
    problems = [`It could not be compared: ${(err as Error).message}.`];
  }
  return problems.length === 0 ? { result: "PASS", detail: "Matches." } : { result: finding, detail: problems.join(" ") };
}

export function verifyPackageIntegrity(objectStore: ObjectStore) {
  return async (ctx: RouteContext<undefined>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const { row, at } = await readable(ctx, "Verifying a due diligence package");
    const env = envelopeOf(row);
    const p = env.package;
    const checks: ScsPackageIntegrityCheck[] = [];

    // PACKAGE_DIGEST: the content, the receipt and its compilation record
    checks.push({
      check: "PACKAGE_DIGEST",
      ...(await compare("DIGEST_MISMATCH", async () => {
        const problems: string[] = [];
        const digest = packageDigestOf(p);
        if (digest !== row.packageDigest) problems.push(`The stored content hashes to ${digest}, not its packageDigest ${row.packageDigest}.`);
        const receipts = await findReceipts(tx, "SCS-CAP-08", "PACKAGE_COMPILATION", row.packageId);
        if (receipts.length !== 1) return [...problems, `The package has ${receipts.length} PACKAGE_COMPILATION receipts; exactly one is expected.`];
        const receipt = receipts[0]!;
        if (sha256Hex(canonicalJson(receipt.receipt)) !== receipt.receiptDigest) problems.push("The PACKAGE_COMPILATION receipt no longer hashes to its recorded digest.");
        const record = receipt.receipt["decision"] as Record<string, unknown>;
        const recordedBy = (record["compiledBy"] as { actorId?: unknown } | undefined)?.actorId;
        if (record["packageDigest"] !== row.packageDigest) problems.push(`The compilation record names digest ${String(record["packageDigest"])}, not ${row.packageDigest}.`);
        if (record["packageId"] !== row.packageId || record["compiledAt"] !== row.compiledAt || recordedBy !== row.requestedByActorId
          || record["compiledByServiceIdentity"] !== row.compiledByServiceIdentity) {
          problems.push("The envelope's compilation metadata is not what the compilation record names.");
        }
        return problems;
      })),
    });

    // EVALUATION_RECEIPT
    const evaluationId = p.sufficiencyEvaluation.evaluationId;
    checks.push({
      check: "EVALUATION_RECEIPT",
      ...(await compare("EVALUATION_CHANGED", async () => {
        const e = (await findEvaluation(tx, row.evaluationId))?.result as ScsSufficiencyEvaluationResult | undefined;
        if (e === undefined) return [`Evaluation ${row.evaluationId} is not recorded.`];
        const receipts = await findReceipts(tx, "SCS-CAP-06", "SUFFICIENCY_EVALUATION", row.evaluationId);
        return [
          ...(row.evaluationId === evaluationId ? [] : [`The package names evaluation ${evaluationId}, not ${row.evaluationId}.`]),
          ...(receipts.length === 1 && same(receipts[0]!.receipt["decision"], e) ? [] : [`The stored evaluation ${row.evaluationId} is not the result its receipt records.`]),
          ...(same(e, p.sufficiencyEvaluation.result) ? [] : ["The stored evaluation is not the package's copy."]),
          ...(sha256Hex(canonicalJson(e)) === p.sufficiencyEvaluation.evaluationSnapshotDigest ? [] : ["The stored evaluation no longer hashes to the package's evaluationSnapshotDigest."]),
        ];
      })),
    });

    // DECISION_RECEIPT
    checks.push({
      check: "DECISION_RECEIPT",
      ...(await compare("REVIEW_DECISION_CHANGED", async () => {
        const d = await findDecision(tx, row.reviewDecisionId);
        if (d === null) return [`Decision ${row.reviewDecisionId} is not recorded.`];
        const prior = d.supersedesDecisionId === null ? null : await findDecision(tx, d.supersedesDecisionId);
        const recorded = recordedDecision(d, prior);
        const receipts = await findReceipts(tx, "SCS-CAP-09", "REGULATORY_REVIEW_DECISION", d.decisionId);
        return [
          ...(receipts.length === 1 && same(withoutDerived(receipts[0]!.receipt["decision"] as Record<string, unknown>), recorded) ? [] : [`The stored decision ${d.decisionId} is not the decision its receipt records.`]),
          ...(same(recorded, p.reviewDecision.decision) ? [] : ["The stored decision is not the package's copy."]),
        ];
      })),
    });

    // EVIDENCE_RECORD, one per item
    const defIds = p.deforestationEvidence.map((r) => r.evidenceId);
    const cusIds = p.custodyEvidence.map((c) => c.eventId);
    const [defNow, cusNow] = [await findDeforestationRecords(tx, defIds), await findCustodyRecords(tx, cusIds)];
    for (const r of p.deforestationEvidence) {
      const now = defNow.get(r.evidenceId);
      checks.push({
        check: "EVIDENCE_RECORD",
        evidenceId: r.evidenceId,
        ...(now === undefined
          ? { result: "EVIDENCE_RECORDS_CHANGED", detail: `Deforestation evidence ${r.evidenceId} is no longer recorded.` }
          : now.evidenceVersion === r.evidenceVersion && now.contentDigest === r.provenance.contentDigest
            ? { result: "PASS", detail: "Matches." }
            : { result: "EVIDENCE_RECORDS_CHANGED", detail: `Deforestation evidence ${r.evidenceId} is at version ${now.evidenceVersion} with digest ${now.contentDigest}, not the package's version ${r.evidenceVersion} and digest ${r.provenance.contentDigest}.` }),
      });
    }
    for (const c of p.custodyEvidence) {
      const now = cusNow.get(c.eventId);
      checks.push({
        check: "EVIDENCE_RECORD",
        evidenceId: c.eventId,
        ...(now === undefined
          ? { result: "EVIDENCE_RECORDS_CHANGED", detail: `Custody event ${c.eventId} is no longer recorded.` }
          : now.eventVersion === c.eventVersion && now.contentDigest === c.supportingDocument.contentDigest
            ? { result: "PASS", detail: "Matches." }
            : { result: "EVIDENCE_RECORDS_CHANGED", detail: `Custody event ${c.eventId} is at version ${now.eventVersion} with digest ${now.contentDigest}, not the package's version ${c.eventVersion} and digest ${c.supportingDocument.contentDigest}.` }),
      });
    }

    // EVIDENCE_FILE, one per item: the file the package verified at compilation
    let storeDown = false;
    for (const chain of p.challengeResponseMetadata.allProvenanceChains) {
      const base = { check: "EVIDENCE_FILE" as const, evidenceId: chain.evidenceId };
      if (!chain.fileSha256Verified) {
        checks.push({ ...base, result: "NOT_APPLICABLE", detail: "The item cites no stored file; its fileSha256Verified is false in the package." });
        continue;
      }
      if (storeDown) {
        checks.push({ ...base, result: "UNVERIFIABLE", detail: "The object store could not be reached." });
        continue;
      }
      let read: ObjectRead;
      try {
        read = await objectStore.read(chain.contentDigest);
      } catch (err) {
        if (!(err instanceof ScsFailure && err.code === "DEPENDENCY_UNAVAILABLE")) throw err;
        storeDown = true;
        checks.push({ ...base, result: "UNVERIFIABLE", detail: "The object store could not be reached." });
        continue;
      }
      if (read.state === "MISSING") {
        checks.push({ ...base, result: "EVIDENCE_OBJECT_MISSING", detail: `No file is stored under SHA-256 ${chain.contentDigest}.` });
        continue;
      }
      checks.push(
        read.state === "INTACT"
          ? { ...base, result: "PASS", detail: "Matches." }
          : { ...base, result: "EVIDENCE_CHANGED", detail: `The stored file hashes to ${read.actualSha256}, not its recorded SHA-256 ${chain.contentDigest}.` },
      );
    }

    const found = PRECEDENCE.find((s) => checks.some((c) => c.result === s));
    const integrityStatus: Status = found ?? "INTACT";
    const failing = checks.filter((c) => c.result !== "PASS" && c.result !== "NOT_APPLICABLE");
    const body: ScsPackageIntegrityVerificationResult = {
      packageId: row.packageId,
      packageDigest: row.packageDigest,
      verifiedAt: at.toISOString(),
      integrityStatus,
      checks,
      detail:
        integrityStatus === "INTACT"
          ? `All ${checks.length} checks passed: the package, its evaluation, its decision and every evidence record and file are as compiled.`
          : integrityStatus === "UNVERIFIABLE"
            ? `No change was found, but ${failing.length} check(s) could not be performed; the package cannot be confirmed intact.`
            : `${failing.length} of ${checks.length} checks found a change; the first by precedence is ${integrityStatus}.`,
    };
    return { status: 200, body };
  };
}
