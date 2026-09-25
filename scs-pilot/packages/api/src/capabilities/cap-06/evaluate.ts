// SCS-CAP-06 evaluation — a pure function of the frozen input (contract
// 0fd8c25, "Evaluation rules for the pilot"; 876fc80, "The frozen input").
//
// It never reads the database: everything it evaluates is passed in, read in
// one repeatable-read snapshot by the handler. Gap and conflict identifiers
// are derived from their content, so the same input always gives the same
// requirement evaluations, gaps, conflicts and next steps.
//
// Intervals are half-open: start inclusive, end exclusive. The required
// period runs from referenceDate 00:00 UTC to the day after
// evaluationEndDate, 00:00 UTC.

import { createHash } from "node:crypto";

import type {
  ScsCustodyChainEvaluation,
  ScsEvidenceConflict,
  ScsEvidenceGap,
  ScsNextStep,
  ScsRequirementEvaluation,
  ScsSpatialCoverageEvaluation,
  ScsSufficiencyEvaluationResult,
  ScsTemporalCoverageEvaluation,
} from "../../types/cap-06.js";
import type { CustodyInput, DeforestationInput, FrameworkSpec, PlotInput } from "./store.js";

export type RequirementCode = ScsRequirementEvaluation["requirementCode"];
type GapType = ScsEvidenceGap["gapType"];
type OverallState = ScsSufficiencyEvaluationResult["overallState"];
type AssessmentType = "DEFORESTATION" | "FOREST_DEGRADATION" | "BOTH";
type Target = "DEFORESTATION" | "FOREST_DEGRADATION";

export const REQUIREMENT_ORDER: readonly RequirementCode[] = [
  "DEF-TEMPORAL-COVERAGE",
  "DEF-SPATIAL-COVERAGE",
  "DEF-SOURCE-TYPE",
  "DEF-RESOLUTION",
  "DEF-RECENCY",
  "DEF-INTEGRITY",
  "DEF-AUTHORITY-CONFIRMATION",
  "PLOT-REGISTERED",
  "PLOT-GEOLOCATION",
  "PLOT-LAND-REGISTRY",
  "PLOT-OWNERSHIP-VERIFIED",
  "PLOT-IDENTIFIER-TYPE",
  "CUSTODY-CHAIN-CONTINUITY",
  "CUSTODY-DOCUMENT-TYPES",
  "CUSTODY-TRACEABILITY-DEPTH",
];

/** Missing evidence: human review cannot cure it; the requirement is UNSATISFIED. */
const MISSING_EVIDENCE: ReadonlySet<GapType> = new Set<GapType>([
  "TEMPORAL_INTERVAL_MISSING",
  "EVIDENCE_ABSENT",
  "EVIDENCE_TYPE_NOT_PROVIDED",
  "RESOLUTION_BELOW_REQUIREMENT",
  "RECENCY_BELOW_REQUIREMENT",
  "PLOT_IDENTIFIER_TYPE_NOT_MET",
  "CUSTODY_CHAIN_BROKEN",
  "CUSTODY_DOCUMENT_TYPE_MISSING",
]);

export interface EvaluationInput {
  readonly framework: FrameworkSpec;
  readonly plots: readonly PlotInput[];
  readonly deforestation: readonly DeforestationInput[];
  readonly custody: readonly CustodyInput[];
  readonly verifiedPartyIds: readonly string[];
  readonly referenceDate: string;
  readonly evaluationEndDate: string;
  readonly assessmentType: AssessmentType;
  readonly batchIdentifiers: readonly string[];
  readonly operatorPartyId: string | null;
}

export interface EvaluationOutcome {
  readonly overallState: Exclude<OverallState, "FAIL_CLOSED">;
  readonly hasEvidenceGaps: boolean;
  readonly hasMaterialUnresolvedConflicts: boolean;
  readonly requirementEvaluations: ScsRequirementEvaluation[];
  readonly temporalCoverage: ScsTemporalCoverageEvaluation[];
  readonly spatialCoverage: ScsSpatialCoverageEvaluation[];
  readonly custodyChain: ScsCustodyChainEvaluation[] | null;
  readonly allGaps: ScsEvidenceGap[];
  readonly allConflicts: ScsEvidenceConflict[];
  readonly nextSteps: ScsNextStep[];
  /** Numbered explanation of the findings (the handler adds the header). */
  readonly findings: string[];
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** A UUID derived from content: the same content always gives the same identifier. */
export function contentUuid(content: string): string {
  const h = createHash("sha256").update(content).digest("hex");
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

type Interval = readonly [number, number];
const ms = (iso: string) => Date.parse(iso);
const isoOf = (t: number) => new Date(t).toISOString();
const dayStart = (date: string) => Date.parse(`${date}T00:00:00Z`);
const DAY_MS = 24 * 60 * 60 * 1000;

function subtract(from: readonly Interval[], cut: readonly Interval[]): Interval[] {
  let out: Interval[] = [...from];
  for (const [cs, ce] of cut) {
    out = out.flatMap(([s, e]): Interval[] => {
      if (ce <= s || cs >= e) return [[s, e]];
      return [...(cs > s ? [[s, cs] as Interval] : []), ...(ce < e ? [[ce, e] as Interval] : [])];
    });
  }
  return out.filter(([s, e]) => e > s);
}

function union(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

const clip = (i: Interval, to: Interval): Interval | null => {
  const s = Math.max(i[0], to[0]);
  const e = Math.min(i[1], to[1]);
  return e > s ? [s, e] : null;
};

const targetsOf = (a: AssessmentType): Target[] => (a === "BOTH" ? ["DEFORESTATION", "FOREST_DEGRADATION"] : [a]);
const noneClaim = (t: Target) => (t === "DEFORESTATION" ? "NO_DEFORESTATION_DETECTED" : "NO_FOREST_DEGRADATION_DETECTED");
const adverseClaims = (t: Target) =>
  t === "DEFORESTATION" ? ["DEFORESTATION_DETECTED", "POSSIBLE_DEFORESTATION_DETECTED"] : ["FOREST_DEGRADATION_DETECTED", "POSSIBLE_FOREST_DEGRADATION_DETECTED"];
const targetOfClaim = (claim: string): Target | null =>
  claim.includes("FOREST_DEGRADATION") ? "FOREST_DEGRADATION" : claim.includes("DEFORESTATION") ? "DEFORESTATION" : null;

function quality(r: DeforestationInput): "HIGH" | "MEDIUM" | "LOW" | "UNASSESSED" {
  const q = r.claimConfidence === "NOT_STATED" ? "UNASSESSED" : (r.claimConfidence as "HIGH" | "MEDIUM" | "LOW");
  return r.qualityStatus === "LIMITED" && (q === "HIGH" || q === "MEDIUM") ? "LOW" : q;
}

const boxesIntersect = (a: DeforestationInput["coverageBox"], b: DeforestationInput["coverageBox"]) =>
  a === null || b === null || (a.minLon <= b.maxLon && b.minLon <= a.maxLon && a.minLat <= b.maxLat && b.minLat <= a.maxLat);

// ── evaluation ──────────────────────────────────────────────────────────────

export function evaluate(input: EvaluationInput): EvaluationOutcome {
  const { framework: f, plots } = input;
  const specId = f.specId;
  const targets = targetsOf(input.assessmentType);
  const verified = new Set(input.verifiedPartyIds);
  const required: Interval = [dayStart(input.referenceDate), dayStart(input.evaluationEndDate) + DAY_MS];
  const findings: string[] = [];

  const gaps = new Map<RequirementCode, ScsEvidenceGap[]>();
  const conflicts = new Map<RequirementCode, ScsEvidenceConflict[]>();
  const adverse = new Map<RequirementCode, string[]>();
  const supporting = new Map<RequirementCode, Set<string>>();
  const applies = new Map<RequirementCode, string | null>(); // null: not applicable; else why it applies
  const support = (code: RequirementCode, ...ids: string[]) => {
    const s = supporting.get(code) ?? new Set<string>();
    ids.forEach((id) => s.add(id));
    supporting.set(code, s);
  };

  const gap = (
    code: RequirementCode,
    gapType: GapType,
    subject: { plotId?: string; subjectType: string; subjectReference?: string },
    explanation: string,
    extra: { uncoveredPeriod?: { start: string; end: string; reason: string } } = {},
  ): ScsEvidenceGap => {
    const missing = MISSING_EVIDENCE.has(gapType);
    const g: ScsEvidenceGap = {
      gapId: contentUuid(JSON.stringify(["gap", code, gapType, subject, extra.uncoveredPeriod ?? null, explanation])),
      requirementCode: code,
      gapType,
      subject,
      ...(extra.uncoveredPeriod === undefined ? {} : { uncoveredPeriod: extra.uncoveredPeriod }),
      automaticFailure: missing,
      humanDecisionRequired: !missing,
      explanation,
    };
    const list = gaps.get(code) ?? [];
    if (!list.some((x) => x.gapId === g.gapId)) list.push(g);
    gaps.set(code, list);
    return g;
  };

  const conflict = (c: Omit<ScsEvidenceConflict, "conflictId" | "conflictKey" | "materiality" | "resolutionStatus">): ScsEvidenceConflict => {
    const [a, b] = [c.evidenceAId, c.evidenceBId].sort();
    const conflictKey = `${c.requirementCode}:${a}:${b}`;
    const full: ScsEvidenceConflict = {
      conflictId: contentUuid(`conflict:${conflictKey}:${c.conflictType}:${c.propositionA}:${c.propositionB}`),
      conflictKey,
      ...c,
      materiality: "MATERIAL_UNRESOLVED",
      resolutionStatus: "UNRESOLVED",
    };
    const list = conflicts.get(c.requirementCode) ?? [];
    if (!list.some((x) => x.conflictId === full.conflictId)) list.push(full);
    conflicts.set(c.requirementCode, list);
    return full;
  };

  const plotSubject = (plotId: string) => ({ plotId, subjectType: "PLOT", subjectReference: `scs:plot/${plotId}` });
  const evidenceSubject = (plotId: string, evidenceId: string) => ({ plotId, subjectType: "DEFORESTATION_EVIDENCE", subjectReference: `scs:deforestation-evidence/${evidenceId}` });

  // ── Deforestation: conflicts and adverse findings first (they decide applicability) ──
  const recordsOf = (plotId: string) => input.deforestation.filter((r) => r.plotId === plotId);
  const defConflicts: Array<Omit<ScsEvidenceConflict, "conflictId" | "conflictKey" | "materiality" | "resolutionStatus">> = [];
  const inConflict = new Set<string>();
  for (const p of plots) {
    const rs = recordsOf(p.plotId);
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        const [a, b] = [rs[i]!, rs[j]!];
        if (a.analysisStart === null || a.analysisEnd === null || b.analysisStart === null || b.analysisEnd === null) continue;
        if (a.detectionTarget === null || a.detectionTarget !== b.detectionTarget) continue;
        const t = a.detectionTarget as Target;
        if (!targets.includes(t)) continue;
        const aNone = a.claimType === noneClaim(t);
        const bNone = b.claimType === noneClaim(t);
        const aAdv = adverseClaims(t).includes(a.claimType);
        const bAdv = adverseClaims(t).includes(b.claimType);
        if (!((aNone && bAdv) || (aAdv && bNone))) continue;
        const overlap = clip([ms(a.analysisStart), ms(a.analysisEnd)], [ms(b.analysisStart), ms(b.analysisEnd)]);
        if (overlap === null || !boxesIntersect(a.coverageBox, b.coverageBox)) continue;
        defConflicts.push({
          requirementCode: "DEF-TEMPORAL-COVERAGE",
          subject: plotSubject(p.plotId),
          evidenceAId: a.evidenceId,
          evidenceBId: b.evidenceId,
          propositionA: `${a.claimType} for ${a.analysisStart} to ${a.analysisEnd} (${t}).`,
          propositionB: `${b.claimType} for ${b.analysisStart} to ${b.analysisEnd} (${t}).`,
          temporalOverlap: { start: isoOf(overlap[0]), end: isoOf(overlap[1]) },
          spatialOverlapReference: "possible: the coverage bounding boxes intersect; the actual overlap is not verified (no spatial database)",
          conflictType: "OPPOSING_FINDINGS",
          explanation: `Evidence ${a.evidenceId} and ${b.evidenceId} make opposing ${t} claims about plot ${p.plotId} for overlapping analysis periods, with the same detection target.`,
        });
        inConflict.add(a.evidenceId).add(b.evidenceId);
      }
    }
  }
  const adverseRecords = input.deforestation.filter((r) => {
    const t = targetOfClaim(r.claimType);
    if (t === null || !targets.includes(t) || !adverseClaims(t).includes(r.claimType) || inConflict.has(r.evidenceId)) return false;
    const end = r.claimEnd ?? r.analysisEnd ?? r.acquisitionEnd ?? r.acquisitionInstant;
    return end === null || ms(end) > required[0];
  });

  // ── Applicability (from the specification) ──
  const th = f.threshold;
  const defReason = th.allPlotsHaveDeforestationEvidence
    ? "sufficiencyThreshold.allPlotsHaveDeforestationEvidence is true"
    : adverseRecords.length > 0 || defConflicts.length > 0
      ? "admitted evidence reports an adverse finding or a conflict, which is never set aside"
      : null;
  applies.set("DEF-TEMPORAL-COVERAGE", defReason);
  applies.set("DEF-SPATIAL-COVERAGE", th.allPlotsHaveDeforestationEvidence ? "sufficiencyThreshold.allPlotsHaveDeforestationEvidence is true" : null);
  applies.set("DEF-SOURCE-TYPE", "always");
  applies.set("DEF-RESOLUTION", f.minimumResolutionMetres !== null ? `minimumResolutionMetres is ${f.minimumResolutionMetres}` : null);
  applies.set("DEF-RECENCY", f.minimumRecencyDays !== null ? `minimumRecencyDays is ${f.minimumRecencyDays}` : null);
  applies.set("DEF-INTEGRITY", "always");
  applies.set("DEF-AUTHORITY-CONFIRMATION", f.authorityConfirmationRequired ? "authorityConfirmationRequired is true" : null);
  applies.set("PLOT-REGISTERED", th.allPlotsRegistered ? "sufficiencyThreshold.allPlotsRegistered is true" : null);
  applies.set("PLOT-GEOLOCATION", f.geolocationRequired ? "plotRequirements.geolocationRequired is true" : null);
  applies.set("PLOT-LAND-REGISTRY", f.landRegistryRequired ? "plotRequirements.landRegistryRequired is true" : null);
  applies.set("PLOT-OWNERSHIP-VERIFIED", f.ownershipVerificationRequired ? "plotRequirements.ownershipVerificationRequired is true" : null);
  applies.set("PLOT-IDENTIFIER-TYPE", "always");
  applies.set("CUSTODY-CHAIN-CONTINUITY", th.custodyChainComplete ? "sufficiencyThreshold.custodyChainComplete is true" : null);
  applies.set("CUSTODY-DOCUMENT-TYPES", f.requiredDocumentTypes.length > 0 ? `custodyEvidence.requiredDocumentTypes lists ${f.requiredDocumentTypes.join(", ")}` : null);
  applies.set("CUSTODY-TRACEABILITY-DEPTH", th.custodyChainComplete ? "sufficiencyThreshold.custodyChainComplete is true" : null);
  const on = (code: RequirementCode) => applies.get(code) !== null;

  if (on("DEF-TEMPORAL-COVERAGE")) {
    for (const c of defConflicts) conflict(c);
    for (const r of adverseRecords) {
      const list = adverse.get("DEF-TEMPORAL-COVERAGE") ?? [];
      list.push(
        `Adverse finding: evidence ${r.evidenceId} reports ${r.claimType} for plot ${r.plotId}` +
          `${r.claimStart !== null || r.claimEnd !== null ? ` (claimed period ${r.claimStart ?? "…"} to ${r.claimEnd ?? "…"})` : ""}, after the cut-off ${input.referenceDate}, and no admitted evidence contradicts it.`,
      );
      adverse.set("DEF-TEMPORAL-COVERAGE", list);
    }
  }

  // ── Temporal coverage, per plot ──
  const covering = new Map<string, DeforestationInput[]>(); // plotId → items that support coverage
  const temporalCoverage: ScsTemporalCoverageEvaluation[] = plots.map((p) => {
    const rs = recordsOf(p.plotId);
    const supportedIntervals: ScsTemporalCoverageEvaluation["supportedIntervals"] = [];
    const uncoveredIntervals: ScsTemporalCoverageEvaluation["uncoveredIntervals"] = [];
    const cover: DeforestationInput[] = [];
    for (const t of targets) {
      const pieces: Interval[] = [];
      for (const r of rs) {
        if (r.coverageMode === "POINT_IN_TIME" || r.analysisStart === null || r.analysisEnd === null) continue;
        if (r.detectionTarget !== t || r.claimType !== noneClaim(t)) continue;
        const own = subtract([[ms(r.analysisStart), ms(r.analysisEnd)]], r.knownGaps.map((g) => [ms(g.start), ms(g.end)] as Interval))
          .map((i) => clip(i, required))
          .filter((i): i is Interval => i !== null);
        if (own.length === 0) continue;
        if (!cover.includes(r)) cover.push(r);
        for (const [s, e] of own) {
          supportedIntervals.push({ start: isoOf(s), end: isoOf(e), evidenceIds: [r.evidenceId], coverageQuality: quality(r), supportType: `${r.coverageMode} analysis, ${t}` });
        }
        pieces.push(...own);
      }
      if (on("DEF-TEMPORAL-COVERAGE")) {
        for (const [s, e] of subtract([required], union(pieces))) {
          const reason =
            rs.length === 0
              ? `No admitted deforestation evidence for plot ${p.plotId}.`
              : `No admitted analysis supports ${t} coverage of plot ${p.plotId} for this interval.`;
          const g = gap("DEF-TEMPORAL-COVERAGE", "TEMPORAL_INTERVAL_MISSING", plotSubject(p.plotId), `${reason} (${isoOf(s)} to ${isoOf(e)}, ${t}).`, {
            uncoveredPeriod: { start: isoOf(s), end: isoOf(e), reason },
          });
          uncoveredIntervals.push({ start: isoOf(s), end: isoOf(e), reason, gapId: g.gapId });
        }
      }
    }
    covering.set(p.plotId, cover);
    if (on("DEF-TEMPORAL-COVERAGE")) support("DEF-TEMPORAL-COVERAGE", ...cover.map((r) => r.evidenceId));

    const attestationExceedingAnalysis: ScsTemporalCoverageEvaluation["attestationExceedingAnalysis"] = [];
    for (const r of rs) {
      if (r.coverageMode === "AUTHORITY_ATTESTATION" && r.analysisStart === null && r.analysisEnd === null && on("DEF-TEMPORAL-COVERAGE")) {
        gap("DEF-TEMPORAL-COVERAGE", "ATTESTATION_WITHOUT_ANALYSIS", evidenceSubject(p.plotId, r.evidenceId),
          `Evidence ${r.evidenceId} is an authority attestation with no analysis period: the attestation is present, the analysis behind it is not. It creates no coverage.`);
      }
      const attStart = r.attestedStart ?? r.declaredStart;
      const attEnd = r.attestedEnd ?? r.declaredEnd;
      if (r.limitationCodes.includes("ATTESTATION_EXCEEDS_ANALYSIS") && attStart !== null && attEnd !== null && r.analysisStart !== null && r.analysisEnd !== null) {
        attestationExceedingAnalysis.push({
          evidenceId: r.evidenceId, attestedStart: attStart, attestedEnd: attEnd, analysisStart: r.analysisStart, analysisEnd: r.analysisEnd,
          explanation: `The attested period ${attStart} to ${attEnd} extends beyond the analysis period ${r.analysisStart} to ${r.analysisEnd}; the attestation creates no coverage beyond the analysis.`,
        });
      }
    }
    const conflictingIntervals = (conflicts.get("DEF-TEMPORAL-COVERAGE") ?? [])
      .filter((c) => c.subject.plotId === p.plotId && c.temporalOverlap !== undefined)
      .map((c) => ({ start: c.temporalOverlap!.start, end: c.temporalOverlap!.end, conflictId: c.conflictId, explanation: c.explanation }));
    const points = rs.filter((r) => r.coverageMode === "POINT_IN_TIME").length;
    return {
      plotId: p.plotId,
      requiredPeriod: { start: isoOf(required[0]), end: isoOf(required[1]), assessmentType: input.assessmentType },
      supportedIntervals,
      uncoveredIntervals,
      conflictingIntervals,
      attestationExceedingAnalysis,
      coverageNote:
        "Coverage is the admitted analysis periods, minus declared known gaps, whose detection target and claim match the assessment; it is never a union of declared or attested dates. " +
        "Intervals are half-open (end exclusive). Acquisition frequency, cloud interference and the risk of undetected change between observations are not quantified in the pilot." +
        (points > 0 ? ` ${points} point-in-time item(s) support only their instant and fill no interval.` : "") +
        (on("DEF-TEMPORAL-COVERAGE") ? "" : " Temporal coverage is not required by the specification, so uncovered intervals are not gaps."),
    };
  });

  // ── Deforestation requirements beyond temporal coverage ──
  const allCovering = plots.flatMap((p) => covering.get(p.plotId) ?? []);
  for (const p of plots) {
    const cover = covering.get(p.plotId) ?? [];
    if (on("DEF-SPATIAL-COVERAGE")) {
      if (cover.length === 0) gap("DEF-SPATIAL-COVERAGE", "EVIDENCE_ABSENT", plotSubject(p.plotId), `No admitted evidence covers plot ${p.plotId}.`);
      if (f.requiredCoverageType !== "FULL_PLOT_COVERAGE") {
        gap("DEF-SPATIAL-COVERAGE", "COVERAGE_TYPE_NOT_EVALUATED", plotSubject(p.plotId), `The specification requires ${f.requiredCoverageType}, which is not defined and is not evaluated in the pilot.`);
      } else {
        gap("DEF-SPATIAL-COVERAGE", "SPATIAL_COVERAGE_NOT_EVALUATED", plotSubject(p.plotId),
          `Spatial coverage of plot ${p.plotId} is not evaluated: the pilot has no spatial database, so the covered area cannot be computed. TODO(postgis).`);
      }
      support("DEF-SPATIAL-COVERAGE", ...cover.map((r) => r.evidenceId));
    }
    if (on("DEF-RECENCY")) {
      const latest = recordsOf(p.plotId).map((r) => r.acquisitionInstant ?? r.acquisitionEnd).filter((d): d is string => d !== null).sort().pop();
      const limit = dayStart(input.evaluationEndDate) - f.minimumRecencyDays! * DAY_MS;
      if (latest === undefined) {
        gap("DEF-RECENCY", "RECENCY_BELOW_REQUIREMENT", plotSubject(p.plotId), `No admitted evidence for plot ${p.plotId} states an acquisition date, so recency cannot be shown.`);
      } else if (ms(latest) < limit) {
        gap("DEF-RECENCY", "RECENCY_BELOW_REQUIREMENT", plotSubject(p.plotId),
          `The most recent observation of plot ${p.plotId} (${latest}) is more than ${f.minimumRecencyDays} days before ${input.evaluationEndDate}.`);
      }
    }
    if (on("DEF-AUTHORITY-CONFIRMATION") && !cover.some((r) => r.attestationProvided)) {
      gap("DEF-AUTHORITY-CONFIRMATION", "AUTHORITY_CONFIRMATION_ABSENT", plotSubject(p.plotId), `No covering evidence for plot ${p.plotId} carries an attestation.`);
    }
  }
  for (const r of allCovering) {
    const subj = evidenceSubject(r.plotId, r.evidenceId);
    support("DEF-SOURCE-TYPE", r.evidenceId);
    if (!f.acceptedSourceTypes.includes(r.evidenceType)) {
      gap("DEF-SOURCE-TYPE", "EVIDENCE_TYPE_NOT_PROVIDED", subj, `Evidence ${r.evidenceId} is ${r.evidenceType}, which is not among the accepted source types.`);
    }
    if (on("DEF-RESOLUTION")) {
      support("DEF-RESOLUTION", r.evidenceId);
      if (r.spatialResolutionMetres === null || r.spatialResolutionMetres > f.minimumResolutionMetres!) {
        gap("DEF-RESOLUTION", "RESOLUTION_BELOW_REQUIREMENT", subj,
          `Evidence ${r.evidenceId} ${r.spatialResolutionMetres === null ? "states no resolution" : `has ${r.spatialResolutionMetres} m resolution`}; ${f.minimumResolutionMetres} m or finer is required.`);
      }
    }
    support("DEF-INTEGRITY", r.evidenceId);
    if (r.integrityStatus !== "VERIFIED") {
      gap("DEF-INTEGRITY", "INTEGRITY_UNVERIFIED", subj, `Evidence ${r.evidenceId}'s integrity is ${r.integrityStatus}: no stored object confirms its declared digest.`);
    }
    if (on("DEF-TEMPORAL-COVERAGE")) {
      for (const [role, party] of [["analyst", r.analystPartyId], ["attesting party", r.attestingPartyId]] as const) {
        if (party !== null && !verified.has(party)) {
          gap("DEF-TEMPORAL-COVERAGE", "PARTY_UNVERIFIED", { plotId: r.plotId, subjectType: "PARTY", subjectReference: `scs:party/${party}` },
            `The ${role} ${party} of evidence ${r.evidenceId} has no current VERIFIED_FOR_DECLARED_SCOPE assessment.`);
        }
      }
      const incomplete = r.limitationCodes.filter((c) => c === "PROVENANCE_INCOMPLETE" || c === "CHAIN_OF_CUSTODY_INCOMPLETE");
      if (incomplete.length > 0) {
        gap("DEF-TEMPORAL-COVERAGE", "PROVENANCE_INCOMPLETE", subj, `Evidence ${r.evidenceId} was admitted with ${incomplete.join(" and ")}.`);
      }
    }
  }

  // ── Plots ──
  for (const p of plots) {
    const subj = plotSubject(p.plotId);
    if (on("PLOT-REGISTERED")) {
      support("PLOT-REGISTERED", p.plotId);
      if (p.overlapState === "NOT_EVALUATED") {
        gap("PLOT-REGISTERED", "OVERLAP_NOT_EVALUATED", subj, `Overlap of plot ${p.plotId} with other registered plots has not been evaluated (no spatial database). TODO(postgis).`);
      }
    }
    if (on("PLOT-LAND-REGISTRY") && p.registryVerificationStatus !== "VERIFIED") {
      gap("PLOT-LAND-REGISTRY", "REGISTRY_VERIFICATION_ABSENT", subj, `Plot ${p.plotId}'s registry verification status is ${p.registryVerificationStatus}, not VERIFIED.`);
    }
    if (on("PLOT-OWNERSHIP-VERIFIED") && !p.tenureStatuses.includes("VERIFIED")) {
      gap("PLOT-OWNERSHIP-VERIFIED", "TENURE_VERIFICATION_ABSENT", subj, `Plot ${p.plotId} has no VERIFIED tenure claim (${p.tenureStatuses.join(", ") || "none"}).`);
    }
    if (f.minimumPlotIdentifierType === "GPS_POLYGON") {
      if (p.geometryType === "POINT") {
        gap("PLOT-IDENTIFIER-TYPE", "PLOT_IDENTIFIER_TYPE_NOT_MET", subj, `Plot ${p.plotId} is a POINT; the specification requires GPS_POLYGON.`);
      }
    } else if (f.minimumPlotIdentifierType !== "GPS_POINT") {
      gap("PLOT-IDENTIFIER-TYPE", "PLOT_IDENTIFIER_TYPE_UNRECOGNISED", subj,
        `The specification's minimumPlotIdentifierType "${f.minimumPlotIdentifierType}" is not GPS_POLYGON or GPS_POINT, so it cannot be matched.`);
    }
  }

  // ── Spatial coverage, per plot ──
  const spatialCoverage: ScsSpatialCoverageEvaluation[] = plots.map((p) => {
    const rs = recordsOf(p.plotId);
    const changed = rs.some((r) => r.plotVersion < p.plotVersion);
    return {
      plotId: p.plotId,
      plotVersion: p.plotVersion,
      registeredGeometryReference: `scs:plot/${p.plotId}/v${p.plotVersion}/geometry`,
      uncoveredAreaReferences: [],
      excludedAreaReferences: rs.flatMap((r) => r.excludedAreaIds.map((x) => `scs:deforestation-evidence/${r.evidenceId}/excluded-area/${x}`)),
      spatialConflictReferences: [],
      coverageAssessment: "NOT_EVALUATED",
      plotGeometryChangedSinceEvidence: changed,
      ...(changed ? { geometryChangeNote: "Some evidence records an earlier plot version than the plot's current version." } : {}),
    };
  });

  // ── Custody chain ──
  let custodyChain: ScsCustodyChainEvaluation[] | null = null;
  if (input.batchIdentifiers.length === 0) {
    for (const code of ["CUSTODY-CHAIN-CONTINUITY", "CUSTODY-DOCUMENT-TYPES", "CUSTODY-TRACEABILITY-DEPTH"] as const) {
      if (on(code)) gap(code, "EVIDENCE_ABSENT", { subjectType: "CUSTODY_SUBJECT" }, "The evaluation names no batch, so no custody chain can be evaluated.");
    }
  } else {
    const operator = input.operatorPartyId!;
    const subjectPlots = new Set(plots.map((p) => p.plotId));
    if (on("CUSTODY-CHAIN-CONTINUITY") && f.chainOfCustodyStandards.length > 0) {
      gap("CUSTODY-CHAIN-CONTINUITY", "CUSTODY_STANDARD_NOT_EVALUATED", { subjectType: "SPECIFICATION", subjectReference: `scs:evidence-spec/${specId}` },
        `The specification names chain-of-custody standards (${f.chainOfCustodyStandards.join(", ")}), which no custody event records, so they are not evaluated.`);
    }
    custodyChain = input.batchIdentifiers.map((batch) => {
      const events = input.custody.filter((e) => e.batchIdentifier === batch);
      const byId = new Map(events.map((e) => [e.eventId, e]));
      const batchSubject = { subjectType: "BATCH", subjectReference: `scs:batch/${batch}` };
      const breaks: ScsCustodyChainEvaluation["breaks"] = [];
      const conflictIds: string[] = [];
      const edges: Array<[CustodyInput, CustodyInput]> = [];
      for (const e of events) {
        for (const l of e.links) {
          if (l.type === "SUCCESSOR") continue;
          if (l.linkedId === null) {
            if (on("CUSTODY-CHAIN-CONTINUITY")) {
              const g = gap("CUSTODY-CHAIN-CONTINUITY", "CUSTODY_CHAIN_BROKEN", batchSubject,
                `Event ${e.eventId} cites ${l.citedId} (${l.type}), which is not an admitted custody event.`);
              breaks.push({ beforeEventId: e.eventId, explanation: g.explanation, gapId: g.gapId });
            }
            continue;
          }
          const prev = byId.get(l.linkedId);
          if (prev === undefined) continue; // a link out of this batch or framework: kept, not part of this chain
          edges.push([prev, e]);
        }
      }
      for (const [prev, next] of edges) {
        if (next.sourcePartyId !== prev.destinationPartyId && on("CUSTODY-CHAIN-CONTINUITY")) {
          const g = gap("CUSTODY-CHAIN-CONTINUITY", "CUSTODY_CHAIN_BROKEN", batchSubject,
            `Event ${next.eventId} starts from party ${next.sourcePartyId}, but its predecessor ${prev.eventId} delivered to party ${prev.destinationPartyId}.`);
          breaks.push({ afterEventId: prev.eventId, beforeEventId: next.eventId, explanation: g.explanation, gapId: g.gapId });
        }
        if (
          on("CUSTODY-CHAIN-CONTINUITY") && prev.quantityAmount !== null && next.quantityAmount !== null && prev.quantityUnit === next.quantityUnit &&
          prev.quantityUnit !== "OTHER" && next.quantityAmount > prev.quantityAmount && !["TRANSFORMATION", "PROCESSING", "CONSOLIDATION"].includes(next.eventType)
        ) {
          const c = conflict({
            requirementCode: "CUSTODY-CHAIN-CONTINUITY", subject: batchSubject, evidenceAId: prev.eventId, evidenceBId: next.eventId,
            propositionA: `${prev.quantityAmount} ${prev.quantityUnit} (event ${prev.eventId}).`, propositionB: `${next.quantityAmount} ${next.quantityUnit} (event ${next.eventId}).`,
            conflictType: "QUANTITY_CONFLICT",
            explanation: `Event ${next.eventId} records more (${next.quantityAmount} ${next.quantityUnit}) than its predecessor ${prev.eventId} (${prev.quantityAmount} ${prev.quantityUnit}), with no transformation or consolidation between them.`,
          });
          conflictIds.push(c.conflictId);
        }
      }
      if (on("CUSTODY-CHAIN-CONTINUITY")) {
        for (const e of events) {
          support("CUSTODY-CHAIN-CONTINUITY", e.eventId);
          for (const text of e.contradictions) {
            const c = conflict({
              requirementCode: "CUSTODY-CHAIN-CONTINUITY", subject: batchSubject, evidenceAId: e.eventId, evidenceBId: e.eventId,
              propositionA: `Event ${e.eventId} as recorded (${e.eventType}).`, propositionB: `Declared contradiction: ${text}`, conflictType: "OTHER",
              explanation: `Event ${e.eventId} was admitted with a declared contradiction: ${text}`,
            });
            conflictIds.push(c.conflictId);
          }
          for (const party of [e.sourcePartyId, e.destinationPartyId]) {
            if (!verified.has(party)) {
              gap("CUSTODY-CHAIN-CONTINUITY", "PARTY_UNVERIFIED", { subjectType: "PARTY", subjectReference: `scs:party/${party}` },
                `Custody party ${party} has no current VERIFIED_FOR_DECLARED_SCOPE assessment.`);
            }
          }
          if (e.integrityStatus !== "VERIFIED") {
            gap("CUSTODY-CHAIN-CONTINUITY", "INTEGRITY_UNVERIFIED", { subjectType: "CUSTODY_EVENT", subjectReference: `scs:custody-event/${e.eventId}` },
              `Custody event ${e.eventId}'s supporting document is ${e.integrityStatus}: no stored object confirms its declared digest.`);
          }
        }
      }
      // depth
      let reached = false;
      if (f.traceabilityDepth === "FIRST_SUPPLIER") {
        reached = events.some((e) => e.destinationPartyId === operator);
      } else if (f.traceabilityDepth === "FULL_CHAIN") {
        const next = new Map<string, CustodyInput[]>();
        for (const [a, b] of edges) if (b.sourcePartyId === a.destinationPartyId) next.set(a.eventId, [...(next.get(a.eventId) ?? []), b]);
        const queue = events.filter((e) => e.sourcePlotIds.some((id) => subjectPlots.has(id)));
        const seen = new Set<string>();
        while (queue.length > 0) {
          const e = queue.shift()!;
          if (seen.has(e.eventId)) continue;
          seen.add(e.eventId);
          if (e.destinationPartyId === operator) { reached = true; break; }
          queue.push(...(next.get(e.eventId) ?? []));
        }
      }
      if (on("CUSTODY-TRACEABILITY-DEPTH")) {
        support("CUSTODY-TRACEABILITY-DEPTH", ...events.map((e) => e.eventId));
        if (f.traceabilityDepth === "RISK_PROPORTIONATE") {
          gap("CUSTODY-TRACEABILITY-DEPTH", "TRACEABILITY_DEPTH_NOT_EVALUATED", batchSubject, "The specification requires RISK_PROPORTIONATE traceability, which is not defined and is not evaluated in the pilot.");
        } else if (!reached) {
          const g = gap("CUSTODY-TRACEABILITY-DEPTH", "CUSTODY_CHAIN_BROKEN", batchSubject,
            f.traceabilityDepth === "FULL_CHAIN"
              ? `No continuous chain of admitted events runs from the subject's plots to operator ${operator} for batch ${batch}.`
              : `No admitted event delivers batch ${batch} to operator ${operator}.`);
          breaks.push({ explanation: g.explanation, gapId: g.gapId });
        }
      }
      const present = [...new Set(events.map((e) => e.documentType))].sort();
      const missingTypes = f.requiredDocumentTypes.filter((t) => !present.includes(t));
      if (on("CUSTODY-DOCUMENT-TYPES")) {
        support("CUSTODY-DOCUMENT-TYPES", ...events.map((e) => e.eventId));
        for (const t of missingTypes) {
          gap("CUSTODY-DOCUMENT-TYPES", "CUSTODY_DOCUMENT_TYPE_MISSING", batchSubject, `No admitted event of batch ${batch} is supported by a ${t}.`);
        }
      }
      return {
        batchIdentifier: batch,
        operatorPartyId: operator,
        requiredDepth: f.traceabilityDepth,
        eventIds: events.map((e) => e.eventId),
        chainAssessment: f.traceabilityDepth === "RISK_PROPORTIONATE" ? "NOT_EVALUATED" : breaks.length === 0 && reached ? "CONTINUOUS" : "BROKEN",
        breaks,
        documentTypesPresent: present,
        documentTypesMissing: missingTypes,
        conflictIds,
      };
    });
  }
  if (on("PLOT-GEOLOCATION")) support("PLOT-GEOLOCATION", ...plots.map((p) => p.plotId));

  // ── Requirement states ──
  const requirementEvaluations: ScsRequirementEvaluation[] = REQUIREMENT_ORDER.map((code) => {
    const why = applies.get(code) ?? null;
    const gs = gaps.get(code) ?? [];
    const cs = conflicts.get(code) ?? [];
    const adv = adverse.get(code) ?? [];
    const state: ScsRequirementEvaluation["state"] =
      why === null ? "NOT_APPLICABLE"
      : cs.length > 0 ? "CONFLICTING_EVIDENCE"
      : adv.length > 0 || gs.some((g) => g.automaticFailure) ? "UNSATISFIED"
      : gs.length > 0 ? "GAP_REQUIRES_HUMAN_DECISION"
      : "SATISFIED";
    const detail =
      why === null ? "its specification field does not demand it."
      : [
          `applies because ${why}.`,
          ...adv,
          ...(cs.length > 0 ? [`${cs.length} material unresolved conflict(s).`] : []),
          ...(gs.length > 0 ? [`${gs.filter((g) => g.automaticFailure).length} missing-evidence gap(s), ${gs.filter((g) => g.humanDecisionRequired).length} verification gap(s).`] : []),
        ].join(" ");
    return {
      requirementCode: code,
      evidenceRequirementSpecId: specId,
      state,
      supportingEvidenceIds: [...(supporting.get(code) ?? [])].sort(),
      conflictingEvidenceIds: [...new Set(cs.flatMap((c) => [c.evidenceAId, c.evidenceBId]))].sort(),
      gaps: gs,
      conflicts: cs,
      evaluationExplanation: `${code} is ${state}: ${detail}`,
      humanDecisionRequired: state === "GAP_REQUIRES_HUMAN_DECISION" || adv.length > 0 || cs.length > 0,
      noComplianceDetermination: true,
    };
  });
  const allGaps = requirementEvaluations.flatMap((r) => r.gaps);
  const allConflicts = requirementEvaluations.flatMap((r) => r.conflicts);
  const states = requirementEvaluations.map((r) => r.state);
  const overallState: EvaluationOutcome["overallState"] = states.includes("CONFLICTING_EVIDENCE")
    ? "CONFLICTING_EVIDENCE"
    : states.includes("UNSATISFIED")
      ? "INSUFFICIENT"
      : states.includes("GAP_REQUIRES_HUMAN_DECISION")
        ? "GAPS_REQUIRE_HUMAN_DECISION"
        : "SUFFICIENT";

  // ── Next steps ──
  const steps = new Map<string, ScsNextStep>();
  const step = (priority: ScsNextStep["priority"], stepType: ScsNextStep["stepType"], requirementCode: RequirementCode, explanation: string) => {
    const key = `${priority}:${stepType}:${requirementCode}`;
    if (!steps.has(key)) steps.set(key, { priority, stepType, requirementCode, explanation });
  };
  for (const r of requirementEvaluations) {
    for (const c of r.conflicts) step("BLOCKING", "RESOLVE_CONFLICT", r.requirementCode, `Resolve the conflict ${c.conflictKey} through a recorded human resolution.`);
    if ((adverse.get(r.requirementCode) ?? []).length > 0) {
      step("BLOCKING", "HUMAN_DECISION_REQUIRED", r.requirementCode, "Admitted evidence reports deforestation or degradation after the cut-off; a human must examine the finding.");
    }
    for (const g of r.gaps) {
      if (g.gapType === "TEMPORAL_INTERVAL_MISSING" || g.gapType === "RECENCY_BELOW_REQUIREMENT") step("BLOCKING", "OBTAIN_TEMPORAL_EVIDENCE", r.requirementCode, "Obtain admitted analysis covering the uncovered interval(s).");
      else if (g.gapType === "EVIDENCE_ABSENT" && r.requirementCode.startsWith("CUSTODY")) step("BLOCKING", "OBTAIN_CUSTODY_EVIDENCE", r.requirementCode, "Name the batch and operator, and admit the custody events that document the chain.");
      else if (g.gapType === "CUSTODY_CHAIN_BROKEN" || g.gapType === "CUSTODY_DOCUMENT_TYPE_MISSING") step("BLOCKING", "OBTAIN_CUSTODY_EVIDENCE", r.requirementCode, "Admit the custody events or documents that close the chain.");
      else if (g.gapType === "EVIDENCE_ABSENT") step("BLOCKING", "OBTAIN_SPATIAL_EVIDENCE", r.requirementCode, "Admit evidence covering every plot.");
      else if (g.gapType === "REGISTRY_VERIFICATION_ABSENT") step("SIGNIFICANT", "OBTAIN_REGISTRY_VERIFICATION", r.requirementCode, "Obtain registry verification of the plot.");
      else if (g.automaticFailure) step("BLOCKING", "OTHER", r.requirementCode, g.explanation);
      else step("SIGNIFICANT", "HUMAN_DECISION_REQUIRED", r.requirementCode, "A recorded human determination is required for the verification gap(s).");
    }
  }
  for (const t of temporalCoverage) {
    for (const a of t.attestationExceedingAnalysis) step("ADVISORY", "CHALLENGE_ATTESTATION", "DEF-TEMPORAL-COVERAGE", `Challenge or correct the attestation of evidence ${a.evidenceId}.`);
  }
  const priorityRank = { BLOCKING: 0, SIGNIFICANT: 1, ADVISORY: 2 } as const;
  const nextSteps = [...steps.values()].sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || REQUIREMENT_ORDER.indexOf(a.requirementCode) - REQUIREMENT_ORDER.indexOf(b.requirementCode) || a.stepType.localeCompare(b.stepType),
  );

  // ── Findings ──
  for (const r of requirementEvaluations.filter((x) => x.state !== "SATISFIED" && x.state !== "NOT_APPLICABLE")) findings.push(r.evaluationExplanation);
  for (const g of allGaps.filter((x) => x.gapType === "TEMPORAL_INTERVAL_MISSING")) findings.push(`${g.explanation} Human review cannot remove this missing-evidence fact.`);
  for (const text of adverse.get("DEF-TEMPORAL-COVERAGE") ?? []) findings.push(text);
  for (const c of allConflicts) findings.push(`Conflict ${c.conflictKey}: ${c.explanation}`);

  return {
    overallState,
    hasEvidenceGaps: allGaps.length > 0,
    hasMaterialUnresolvedConflicts: allConflicts.length > 0,
    requirementEvaluations,
    temporalCoverage,
    spatialCoverage,
    custodyChain,
    allGaps,
    allConflicts,
    nextSteps,
    findings,
  };
}
