"use strict";

/**
 * AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01 controlled behavioural proof.
 *
 * Twelve requirement groups, each with a baseline case plus perturbation
 * (the output changes as predicted when one input changes, in both
 * directions) and adversarial assertions (attempts to smuggle in weight,
 * authority, content or intent are refused). The candidate composes the
 * REAL live CAP-05 evaluator; it is never stubbed.
 *
 * The same fixtures are also run through a COMPOSITION BASELINE: what the
 * CAP-04 and CAP-05 contracts already provide when composed directly
 * (CAP-04 admission and workspace filtering, the CAP-05 request's
 * organizationIds and asOf bounds, then the live CAP-05 evaluator). Where
 * the baseline fails a requirement that the candidate meets, that governed
 * function is evidence of logic beyond composition. The capability-identity
 * classification is derived mechanically from those fixture results by a
 * rule fixed below, before any evaluation runs.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = __dirname;
const REPO_ROOT = path.join(ROOT, "..", "..", "..");
const CAP05_FILE = path.join(REPO_ROOT, "simulation", "cap34", "live-capabilities", "cap05-reasoning.js");
const CANDIDATE_FILE = path.join(ROOT, "landscape-candidate.js");
const PROOF_FILE = path.join(REPO_ROOT, "governance", "workstream-b", "AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01-BEHAVIOURAL-PROOF.json");

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of [CAP05_FILE, CANDIDATE_FILE]) vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: path.basename(file) });
const cap05 = sandbox.window.AAB_CAP34_LIVE_CAP05_REASONING;
const candidate = sandbox.window.AAB_AGR_CROSS_INSTITUTIONAL_LANDSCAPE_CANDIDATE_01;

const digest = (text) => "sha256:" + crypto.createHash("sha256").update(String(text)).digest("hex");
// Deterministic test stand-in for the keyed, request-scoped generator that an
// authorised disclosure component supplies in production.
function generateWithheldReference(record, landscapeRequestId) {
  return digest(
    "test-key\u0000" +
    landscapeRequestId + "\u0000" +
    record.evidenceRecordId + "@" + record.evidenceRecordVersion
  );
}
const clockAt = (iso) => () => iso;
const DEPS = Object.freeze({ cap05, digest, generateWithheldReference, now: clockAt("2026-09-23T02:00:00Z") });

const copy = (value) => JSON.parse(JSON.stringify(value));
const canon = (value) => candidate.canonicalize(JSON.parse(JSON.stringify(value)));
const same = (a, b) => canon(a) === canon(b);

const cases = [];
function check(fixtureId, requirement, description, passed, actual) {
  cases.push({ fixtureId, requirement, description, passed: passed === true, actual });
}

// --- Synthetic reference world --------------------------------------------

const PRIMARY = "rubber-yield-rainfall-deficit";
const LATEX = "rubber-latex-quality-rainfall-deficit";
const PANEL = "rubber-tapping-panel-dryness";
const TX_LB_ACRE = { transformationId: "TX-LBACRE-KGHA-V1", fromUnit: "lb/acre", toUnit: "kg/ha", multiplier: 1.12085, authorisedBy: "SYNTHETIC-METHODS-BOARD", authorityReference: "MB-2026-004" };

function baseRequest() {
  return {
    requestId: "LREQ-TH-RUBBER-001",
    requestedBy: { actorId: "synthetic-scientist-th-001", role: "SENIOR_SCIENTIST", authorityScope: ["REQUEST_CROSS_INSTITUTIONAL_LANDSCAPE"] },
    question: { questionText: "How does rubber yield respond to annual rainfall deficit in the declared regions?", subjectKey: PRIMARY, relatedSubjectKeys: [LATEX, PANEL] },
    workspace: { workspaceId: "WS-TH-LANDSCAPE-01", jurisdictionCode: "TH" },
    participatingInstitutions: [
      { institutionId: "INST-ALPHA", institutionName: "Synthetic Institution Alpha", participationAuthorityId: "PA-ALPHA-2026-01", reputationTier: "NATIONAL_FLAGSHIP", prestigeRank: 1 },
      { institutionId: "INST-BETA", institutionName: "Synthetic Institution Beta", participationAuthorityId: "PA-BETA-2026-01", reputationTier: "REGIONAL_AGENCY", prestigeRank: 2 },
      { institutionId: "INST-GAMMA", institutionName: "Synthetic Institution Gamma", participationAuthorityId: "PA-GAMMA-2026-01", reputationTier: "FIELD_STATION", prestigeRank: 5 }
    ],
    authorisedDatasets: [
      { institutionId: "INST-ALPHA", datasetId: "DS-ALPHA-RUBBER", sharingAuthorityId: "SA-ALPHA-01", permittedUse: "CROSS_INSTITUTIONAL_LANDSCAPE" },
      { institutionId: "INST-BETA", datasetId: "DS-BETA-RUBBER", sharingAuthorityId: "SA-BETA-01", permittedUse: "CROSS_INSTITUTIONAL_LANDSCAPE" },
      { institutionId: "INST-GAMMA", datasetId: "DS-GAMMA-RUBBER", sharingAuthorityId: "SA-GAMMA-01", permittedUse: "CROSS_INSTITUTIONAL_LANDSCAPE" }
    ],
    temporalScope: { from: "2019-01-01", to: "2024-12-31" },
    geographicScope: { regionCodes: ["TH-57", "TH-84", "TH-90"] },
    evidenceCutOff: "2026-06-30T00:00:00Z",
    cap04EligibilityRequirement: { requiredAdmissionDecision: "ADMITTED", requireEligibleForScientificMemory: true, requireIntegrityVerified: true },
    requestedCap05EvaluationVersion: "1.0.0",
    comparability: {
      requiredEvidenceCategories: ["FIELD_TRIAL", "LONG_TERM_MONITORING"],
      measure: { canonicalUnit: "kg/ha", authorisedUnitTransformations: [copy(TX_LB_ACRE)] },
      declaredCompatibleMethodologies: []
    },
    accessAndDisclosure: { disclosableClassifications: ["SHARED_CROSS_INSTITUTION"] },
    requestedOutputs: ["EVIDENCE_LANDSCAPE", "DISCLOSURE_RECEIPT"]
  };
}

const INSTITUTION_DEFAULTS = {
  "INST-ALPHA": { datasetId: "DS-ALPHA-RUBBER", institutionWorkspaceId: "WS-ALPHA", sourceAuthority: "ALPHA-FIELD-PROGRAMME", regionCode: "TH-84" },
  "INST-BETA": { datasetId: "DS-BETA-RUBBER", institutionWorkspaceId: "WS-BETA", sourceAuthority: "BETA-MONITORING-NETWORK", regionCode: "TH-57" },
  "INST-GAMMA": { datasetId: "DS-GAMMA-RUBBER", institutionWorkspaceId: "WS-GAMMA", sourceAuthority: "GAMMA-STATION-LOG", regionCode: "TH-90" },
  "INST-UNAUTH": { datasetId: "DS-UNAUTH-RUBBER", institutionWorkspaceId: "WS-UNAUTH", sourceAuthority: "UNAUTH-LAB", regionCode: "TH-84" }
};

function rec(evidenceRecordId, institutionId, overrides) {
  const o = overrides || {};
  const defaults = INSTITUTION_DEFAULTS[institutionId];
  return Object.assign({
    evidenceRecordId,
    evidenceRecordVersion: 1,
    institutionId,
    institutionWorkspaceId: defaults.institutionWorkspaceId,
    datasetId: defaults.datasetId,
    jurisdictionCode: "TH",
    sourceAuthority: defaults.sourceAuthority,
    sourceRecordId: "SRC-" + evidenceRecordId,
    contentDigest: "sha256:content-" + evidenceRecordId,
    subjectKey: PRIMARY,
    evidenceCategory: "FIELD_TRIAL",
    stance: "SUPPORTS",
    measuredValue: 1450,
    unit: "kg/ha",
    methodologyReference: "RAIN-MONTHLY-AGG-V2",
    regionCode: defaults.regionCode,
    dateObserved: "2021-07-01",
    integrityStatus: "VERIFIED",
    accessClassification: "SHARED_CROSS_INSTITUTION"
  }, o, {
    admission: Object.assign({ admissionDecisionId: "MAD-" + evidenceRecordId, decision: "ADMITTED", eligibleForScientificMemory: true, admittedAt: "2026-03-01T00:00:00Z" }, o.admission || {})
  });
}

const A1 = () => rec("R-A-1", "INST-ALPHA", { evidenceCategory: "FIELD_TRIAL", dateObserved: "2021-07-01", measuredValue: 1450 });
const B1 = (o) => rec("R-B-1", "INST-BETA", Object.assign({ evidenceCategory: "LONG_TERM_MONITORING", dateObserved: "2022-07-01", measuredValue: 1390, admission: { admittedAt: "2026-03-15T00:00:00Z" } }, o || {}));
const baseRecords = () => [A1(), B1()];

const run = (request, records, deps) => candidate.evaluateLandscape(request, records, deps || DEPS);
const landscapeOf = (output) => output.result.landscape;
const primaryContradictions = (output) => landscapeOf(output).genuineContradictions.filter((c) => c.subjectKey === PRIMARY);
const subjectState = (output, subjectKey) => (landscapeOf(output).subjects.find((s) => s.subjectKey === subjectKey) || {}).evidenceState;

// Composition baseline: CAP-04 admission + workspace filtering, the CAP-05
// request contract's organizationIds and asOf bounds, then live CAP-05.
const BASELINE_STANCE_TEXT = { SUPPORTS: "Result supports the question for this comparison group.", OPPOSES: "Result contradicts the question for this comparison group." };
function compositionBaseline(request, records) {
  const organizationIds = new Set(request.participatingInstitutions.map((institution) => institution.institutionId));
  const subjects = new Set([request.question.subjectKey].concat(request.question.relatedSubjectKeys || []));
  const selected = records.filter((record) =>
    record.admission.decision === "ADMITTED"
    && record.admission.eligibleForScientificMemory === true
    && record.integrityStatus === "VERIFIED"
    && record.admission.admittedAt <= request.evidenceCutOff
    && record.jurisdictionCode === request.workspace.jurisdictionCode
    && organizationIds.has(record.institutionId)
    && subjects.has(record.subjectKey));
  const input = selected
    .filter((record) => BASELINE_STANCE_TEXT[record.stance])
    .map((record) => ({ id: record.evidenceRecordId, source: record.subjectKey, state: "ELIGIBLE", finding: BASELINE_STANCE_TEXT[record.stance] }));
  const evaluation = cap05.evaluateReasoning(input);
  return {
    selectedRecordIds: selected.map((record) => record.evidenceRecordId).sort(),
    cap05Outcome: evaluation.outcome,
    computedFacts: JSON.parse(JSON.stringify(evaluation.computedFacts))
  };
}
const baselineContradicts = (baseline, subjectKey) => baseline.computedFacts.contradictingSubjects.includes(subjectKey);

// ===========================================================================
// 1. Cross-institution agreement
// ===========================================================================
{
  const out = run(baseRequest(), baseRecords());
  const obs = out.ok ? landscapeOf(out).supportedObservations.filter((o) => o.subjectKey === PRIMARY) : [];
  check("F01-A-CROSS-INSTITUTION-AGREEMENT", 1,
    "Two authorised institutions' admitted records on the same subject, both SUPPORTS, produce one cross-institutional agreement and no contradiction",
    out.ok && obs.length === 1 && obs[0].crossInstitutionalAgreement === true && same(obs[0].contributingInstitutionIds, ["INST-ALPHA", "INST-BETA"])
      && obs[0].independentObservationCount === 2 && primaryContradictions(out).length === 0 && subjectState(out, PRIMARY) === "OBSERVED_WITHOUT_CONTRADICTION",
    { observations: obs, contradictions: out.ok ? landscapeOf(out).genuineContradictions : out });

  const single = run(baseRequest(), [A1()]);
  const singleObs = landscapeOf(single).supportedObservations.filter((o) => o.subjectKey === PRIMARY);
  check("F01-B-AGREEMENT-DEPENDS-ON-DATA", 1,
    "Perturbation: removing Beta's record leaves a single-institution observation; cross-institutional agreement is no longer claimed",
    single.ok && singleObs.length === 1 && singleObs[0].crossInstitutionalAgreement === false && same(singleObs[0].contributingInstitutionIds, ["INST-ALPHA"]),
    singleObs);

  const baseline = compositionBaseline(baseRequest(), baseRecords());
  check("F01-C-COMPOSITION-PROVIDES-AGREEMENT", 1,
    "Attribution: the composition baseline (live CAP-05) also finds no contradiction on the agreeing subject, so agreement is available through composition",
    !baselineContradicts(baseline, PRIMARY) && baseline.selectedRecordIds.length === 2,
    baseline);
}

// ===========================================================================
// 2. Genuine same-subject contradiction
// ===========================================================================
{
  const opposing = [A1(), B1({ stance: "OPPOSES" })];
  const out = run(baseRequest(), opposing);
  const c = out.ok ? primaryContradictions(out) : [];
  check("F02-A-SAME-SUBJECT-CONTRADICTION", 2,
    "Beta OPPOSES where Alpha SUPPORTS on the same subject and methodology: CAP-05 detects one unresolved contradiction naming both sides",
    out.ok && c.length === 1 && same(c[0].supportingRecordIds, ["R-A-1"]) && same(c[0].opposingRecordIds, ["R-B-1"])
      && c[0].detectedBy === "CAP-05" && c[0].resolutionStatus === "UNRESOLVED_HUMAN_REVIEW_REQUIRED"
      && subjectState(out, PRIMARY) === "CONTRADICTED_UNRESOLVED"
      && landscapeOf(out).supportedObservations.filter((o) => o.subjectKey === PRIMARY).length === 0,
    c);

  const restored = run(baseRequest(), baseRecords());
  check("F02-B-CONTRADICTION-BIDIRECTIONAL", 2,
    "Perturbation back: restoring Beta's stance to SUPPORTS removes the contradiction",
    restored.ok && primaryContradictions(restored).length === 0 && primaryContradictions(out).length === 1,
    { before: c.length, after: primaryContradictions(restored).length });

  const majority = run(baseRequest(), [A1(), B1({ stance: "OPPOSES" }), rec("R-G-1", "INST-GAMMA", { dateObserved: "2023-07-01" }), rec("R-G-2", "INST-GAMMA", { dateObserved: "2024-02-01" })]);
  const mc = primaryContradictions(majority);
  check("F02-C-NO-MAJORITY-RESOLUTION", 2,
    "Adversarial: three supporting records against one opposing record still yield an UNRESOLVED contradiction; no count-based resolution or majority label",
    majority.ok && mc.length === 1 && mc[0].supportingRecordIds.length === 3 && mc[0].opposingRecordIds.length === 1
      && mc[0].resolutionStatus === "UNRESOLVED_HUMAN_REVIEW_REQUIRED" && !/majority|consensus/i.test(JSON.stringify(majority.result.landscape)),
    mc);

  const baseline = compositionBaseline(baseRequest(), opposing);
  check("F02-D-COMPOSITION-DETECTS-CONTRADICTION", 2,
    "Attribution: the composition baseline's live CAP-05 detects the same contradiction; contradiction detection is CAP-05's, not the candidate's",
    baselineContradicts(baseline, PRIMARY) && out.result.cap05Evaluation.implementationVersion === cap05.implementationVersion,
    baseline);
}

// ===========================================================================
// 3. Cross-subject disagreement is not contradiction
// ===========================================================================
{
  const crossSubject = [A1(), B1({ stance: "OPPOSES", subjectKey: LATEX })];
  const out = run(baseRequest(), crossSubject);
  const diffs = out.ok ? landscapeOf(out).compatibleDifferences : [];
  check("F03-A-CROSS-SUBJECT-NOT-CONTRADICTION", 3,
    "Opposing results about different subjects produce zero contradictions and one compatible difference explicitly marked isContradiction:false",
    out.ok && landscapeOf(out).genuineContradictions.length === 0 && diffs.length === 1
      && same(diffs[0].subjectKeys, [LATEX, PRIMARY]) && diffs[0].isContradiction === false && diffs[0].classification === "OPPOSING_RESULTS_CONCERN_DIFFERENT_SUBJECTS",
    diffs);

  const collapsed = run(baseRequest(), [A1(), B1({ stance: "OPPOSES", subjectKey: PRIMARY })]);
  check("F03-B-SAME-SUBJECT-FLIPS-TO-CONTRADICTION", 3,
    "Perturbation: moving the opposing record onto the same subject turns the compatible difference into a genuine contradiction",
    collapsed.ok && primaryContradictions(collapsed).length === 1 && landscapeOf(collapsed).compatibleDifferences.length === 0,
    { contradictions: landscapeOf(collapsed).genuineContradictions.length, compatibleDifferences: landscapeOf(collapsed).compatibleDifferences.length });

  const baseline = compositionBaseline(baseRequest(), crossSubject);
  check("F03-C-COMPOSITION-RESPECTS-SUBJECTS", 3,
    "Attribution: live CAP-05 in the composition baseline also reports no cross-subject contradiction",
    baseline.computedFacts.contradictingSubjects.length === 0,
    baseline);
}

// ===========================================================================
// 4. Units: authorised transformation or explicit incomparability
// ===========================================================================
{
  const converted = run(baseRequest(), [A1(), B1({ measuredValue: 1240, unit: "lb/acre" })]);
  const unitRow = converted.ok ? landscapeOf(converted).unitComparability.find((u) => u.subjectKey === PRIMARY) : null;
  const obs = converted.ok ? landscapeOf(converted).supportedObservations.find((o) => o.subjectKey === PRIMARY) : null;
  const expected = 1240 * TX_LB_ACRE.multiplier;
  check("F04-A-AUTHORISED-TRANSFORMATION-APPLIED", 4,
    "A lb/acre value is converted to kg/ha only through the request's authorised transformation, which is named with its authority",
    converted.ok && unitRow.converted.length === 1 && unitRow.converted[0].transformationId === "TX-LBACRE-KGHA-V1"
      && unitRow.converted[0].authorityReference === "MB-2026-004" && unitRow.incomparable.length === 0
      && obs.valueSummary.comparableValueCount === 2 && Math.abs(obs.valueSummary.minimum - expected) < 1e-9 && obs.valueSummary.maximum === 1450,
    { unitRow, valueSummary: obs && obs.valueSummary });

  const noTx = baseRequest();
  noTx.comparability.measure.authorisedUnitTransformations = [];
  const incomparable = run(noTx, [A1(), B1({ measuredValue: 1240, unit: "lb/acre" })]);
  const row2 = landscapeOf(incomparable).unitComparability.find((u) => u.subjectKey === PRIMARY);
  const obs2 = landscapeOf(incomparable).supportedObservations.find((o) => o.subjectKey === PRIMARY);
  check("F04-B-NO-AUTHORISATION-MEANS-INCOMPARABLE", 4,
    "Perturbation: removing the authorised transformation makes the value explicitly incomparable, excluded from the value comparison and disclosed as a limitation",
    incomparable.ok && row2.converted.length === 0 && row2.incomparable.length === 1 && row2.incomparable[0].reasonCode === "NO_AUTHORISED_UNIT_TRANSFORMATION"
      && obs2.valueSummary.comparableValueCount === 1
      && landscapeOf(incomparable).limitationsPreventingComparison.some((l) => l.limitationCode === "NO_AUTHORISED_UNIT_TRANSFORMATION" && l.evidenceRecordId === "R-B-1"),
    { row: row2, valueSummary: obs2.valueSummary });

  const unreferenced = baseRequest();
  delete unreferenced.comparability.measure.authorisedUnitTransformations[0].authorityReference;
  const out3 = run(unreferenced, [A1(), B1({ measuredValue: 1240, unit: "lb/acre" })]);
  const row3 = landscapeOf(out3).unitComparability.find((u) => u.subjectKey === PRIMARY);
  check("F04-C-UNREFERENCED-TRANSFORMATION-REFUSED", 4,
    "Adversarial: a transformation lacking an authority reference is not applied",
    out3.ok && row3.converted.length === 0 && row3.incomparable.length === 1,
    row3);

  const selfConverted = run(noTx, [A1(), B1({ measuredValue: 1240, unit: "lb/acre", conversion: { toUnit: "kg/ha", multiplier: 1000 } })]);
  const obs4 = landscapeOf(selfConverted).supportedObservations.find((o) => o.subjectKey === PRIMARY);
  check("F04-D-RECORD-SUPPLIED-CONVERSION-IGNORED", 4,
    "Adversarial: a conversion factor carried inside the evidence record itself is ignored; the value stays incomparable",
    selfConverted.ok && obs4.valueSummary.comparableValueCount === 1 && obs4.valueSummary.maximum === 1450,
    obs4.valueSummary);

  const baseline = compositionBaseline(noTx, [A1(), B1({ measuredValue: 1240, unit: "lb/acre" })]);
  check("F04-E-COMPOSITION-HAS-NO-UNIT-GOVERNANCE", 4,
    "Attribution: the composition baseline carries no unit comparability assessment or transformation record; it neither converts nor declares incomparability",
    !/transformation|unit|incomparab/i.test(JSON.stringify(baseline)) && baseline.selectedRecordIds.includes("R-B-1"),
    baseline);
}

// ===========================================================================
// 5. Methodological incompatibility is surfaced, not pooled
// ===========================================================================
{
  const mixed = [A1(), B1({ stance: "OPPOSES", methodologyReference: "RAIN-AWS-HOURLY-V1" })];
  const out = run(baseRequest(), mixed);
  const mi = out.ok ? landscapeOf(out).methodologicalIncompatibilities : [];
  check("F05-A-INCOMPATIBILITY-SURFACED", 5,
    "Opposing records under different methodologies are not pooled into a contradiction; the incompatibility is surfaced with both methodology groups",
    out.ok && primaryContradictions(out).length === 0 && mi.length === 1 && mi[0].methodologyGroups.length === 2
      && mi[0].treatment === "EVALUATED_SEPARATELY_PER_METHODOLOGY_GROUP_NOT_POOLED"
      && subjectState(out, PRIMARY) === "NOT_COMPARABLE_ACROSS_METHODOLOGIES"
      && landscapeOf(out).limitationsPreventingComparison.some((l) => l.limitationCode === "METHODOLOGICAL_INCOMPATIBILITY"),
    mi);

  const declared = baseRequest();
  declared.comparability.declaredCompatibleMethodologies = [["RAIN-AWS-HOURLY-V1", "RAIN-MONTHLY-AGG-V2"]];
  const pooled = run(declared, mixed);
  check("F05-B-DECLARED-COMPATIBILITY-ALLOWS-COMPARISON", 5,
    "Perturbation: only when the request explicitly declares the two methodologies compatible are they compared, and the contradiction then appears",
    pooled.ok && primaryContradictions(pooled).length === 1 && landscapeOf(pooled).methodologicalIncompatibilities.length === 0,
    primaryContradictions(pooled));

  const similar = run(baseRequest(), [A1(), B1({ stance: "OPPOSES", methodologyReference: "RAIN-MONTHLY-AGG-V3" })]);
  check("F05-C-SIMILAR-NAMES-NOT-AUTO-POOLED", 5,
    "Adversarial: a similarly named methodology version (V2 vs V3) is not assumed compatible",
    similar.ok && primaryContradictions(similar).length === 0 && landscapeOf(similar).methodologicalIncompatibilities.length === 1,
    landscapeOf(similar).methodologicalIncompatibilities);

  const baseline = compositionBaseline(baseRequest(), mixed);
  check("F05-D-COMPOSITION-SILENTLY-POOLS", 5,
    "Attribution: the composition baseline pools the two methodologies and reports a contradiction that the evidence cannot support",
    baselineContradicts(baseline, PRIMARY),
    baseline);
}

// ===========================================================================
// 6. Missing evidence is a knowledge gap, not a negative conclusion
// ===========================================================================
{
  const panelTrial = () => rec("R-G-PANEL-1", "INST-GAMMA", { subjectKey: PANEL, evidenceCategory: "FIELD_TRIAL", dateObserved: "2023-05-01" });
  const out = run(baseRequest(), [A1(), B1(), panelTrial()]);
  const gaps = out.ok ? landscapeOf(out).knowledgeGaps : [];
  const gapKeys = gaps.map((g) => g.subjectKey + "/" + g.missingEvidenceCategory).sort();
  check("F06-A-MISSING-CATEGORIES-ARE-KNOWLEDGE-GAPS", 6,
    "Missing required categories are named per subject as knowledge gaps; the subject with no evidence is UNKNOWN-state, never opposed or negative",
    out.ok && same(gapKeys, [LATEX + "/FIELD_TRIAL", LATEX + "/LONG_TERM_MONITORING", PANEL + "/LONG_TERM_MONITORING"])
      && gaps.every((g) => g.consequence === "KNOWLEDGE_GAP_NOT_A_NEGATIVE_FINDING")
      && subjectState(out, LATEX) === "NO_ELIGIBLE_EVIDENCE_KNOWLEDGE_GAP"
      && !landscapeOf(out).supportedObservations.some((o) => o.subjectKey === LATEX)
      && landscapeOf(out).genuineContradictions.length === 0,
    { gaps, subjects: landscapeOf(out).subjects });

  const filled = run(baseRequest(), [A1(), B1(), panelTrial(), rec("R-G-PANEL-2", "INST-GAMMA", { subjectKey: PANEL, evidenceCategory: "LONG_TERM_MONITORING", dateObserved: "2024-05-01" })]);
  check("F06-B-GAP-CLOSES-WHEN-EVIDENCE-ARRIVES", 6,
    "Perturbation: adding the missing monitoring record for the panel subject closes exactly that gap",
    filled.ok && !landscapeOf(filled).knowledgeGaps.some((g) => g.subjectKey === PANEL) && landscapeOf(filled).knowledgeGaps.length === 2,
    landscapeOf(filled).knowledgeGaps);

  check("F06-C-TEMPORAL-AND-GEOGRAPHIC-GAPS", 6,
    "Uncovered years and regions in the declared scope are reported as gaps",
    same(landscapeOf(out).temporalGaps.map((g) => g.year), [2019, 2020, 2024]) && same(landscapeOf(out).geographicGaps.map((g) => g.regionCode), []),
    { temporal: landscapeOf(out).temporalGaps, geographic: landscapeOf(out).geographicGaps });

  const nothing = run(baseRequest(), [rec("R-A-OLD", "INST-ALPHA", { dateObserved: "2010-01-01" })]);
  check("F06-D-NO-EVIDENCE-FAILS-CLOSED-NOT-NEGATIVE", 6,
    "Adversarial: when no eligible evidence exists at all, the candidate fails closed with EVIDENCE_SET_EMPTY rather than emitting a negative landscape",
    nothing.ok === false && same(nothing.errors, ["EVIDENCE_SET_EMPTY"]) && nothing.partialLandscapeReturned === false,
    nothing);
}

// ===========================================================================
// 7. Unauthorised evidence is excluded or fails closed
// ===========================================================================
{
  const unauthInstitution = [A1(), B1(), rec("R-U-1", "INST-UNAUTH", { stance: "OPPOSES" })];
  const out = run(baseRequest(), unauthInstitution);
  const ex = out.ok ? landscapeOf(out).excludedEvidence.find((e) => e.evidenceRecordId === "R-U-1") : null;
  check("F07-A-NON-PARTICIPATING-INSTITUTION-EXCLUDED", 7,
    "A record from a non-participating institution is excluded with a reason and cannot create a contradiction",
    out.ok && ex && same(ex.reasonCodes, ["INSTITUTION_NOT_PARTICIPATING"]) && primaryContradictions(out).length === 0
      && !out.frozenEvidenceSet.includedRecords.some((r) => r.evidenceRecordId === "R-U-1"),
    ex);

  const unauthDataset = [A1(), B1(), rec("R-A-PRIV", "INST-ALPHA", { datasetId: "DS-ALPHA-PRIVATE", stance: "OPPOSES" })];
  const out2 = run(baseRequest(), unauthDataset);
  const ex2 = landscapeOf(out2).excludedEvidence.find((e) => e.evidenceRecordId === "R-A-PRIV");
  check("F07-B-UNAUTHORISED-DATASET-EXCLUDED", 7,
    "A participating institution's record from a dataset outside the authorised sharing scope is excluded",
    out2.ok && ex2 && same(ex2.reasonCodes, ["DATASET_NOT_AUTHORISED"]) && primaryContradictions(out2).length === 0,
    ex2);

  const noParticipation = baseRequest();
  delete noParticipation.participatingInstitutions[2].participationAuthorityId;
  const f1 = run(noParticipation, baseRecords());
  check("F07-C-MISSING-PARTICIPATION-AUTHORITY-FAILS-CLOSED", 7,
    "An institution named without a participation authority fails the whole request closed, with no partial landscape",
    f1.ok === false && f1.errors.includes("PARTICIPATION_AUTHORITY_MISSING") && f1.partialLandscapeReturned === false && f1.result === "FAIL_CLOSED",
    f1);

  const noSharing = baseRequest();
  delete noSharing.authorisedDatasets[1].sharingAuthorityId;
  const f2 = run(noSharing, baseRecords());
  check("F07-D-DATASET-WITHOUT-SHARING-AUTHORITY-FAILS-CLOSED", 7,
    "A dataset declared without a sharing authority fails the request closed",
    f2.ok === false && f2.errors.includes("DATASET_AUTHORITY_INVALID"),
    f2);

  const noActorAuthority = baseRequest();
  noActorAuthority.requestedBy.authorityScope = ["READ_SCIENTIFIC_MEMORY"];
  const f3 = run(noActorAuthority, baseRecords());
  check("F07-E-REQUESTER-WITHOUT-AUTHORITY-FAILS-CLOSED", 7,
    "A requester without cross-institutional landscape authority fails closed",
    f3.ok === false && f3.errors.includes("REQUESTER_NOT_AUTHORISED"),
    f3);

  const weakened = baseRequest();
  weakened.cap04EligibilityRequirement.requiredAdmissionDecision = "QUARANTINED";
  const f4 = run(weakened, baseRecords());
  const quarantined = run(baseRequest(), [A1(), B1(), rec("R-G-Q", "INST-GAMMA", { stance: "OPPOSES", admission: { decision: "QUARANTINED", eligibleForScientificMemory: false } })]);
  const qex = landscapeOf(quarantined).excludedEvidence.find((e) => e.evidenceRecordId === "R-G-Q");
  check("F07-F-CAP04-ELIGIBILITY-CANNOT-BE-WEAKENED", 7,
    "Adversarial: a request that weakens the CAP-04 eligibility requirement fails closed, and a QUARANTINED record is excluded as CAP04_NOT_ADMITTED",
    f4.ok === false && f4.errors.includes("CAP04_ELIGIBILITY_REQUIREMENT_WEAKENED") && qex && qex.reasonCodes.includes("CAP04_NOT_ADMITTED") && primaryContradictions(quarantined).length === 0,
    { failure: f4, exclusion: qex });

  const otherJurisdiction = run(baseRequest(), [A1(), B1(), rec("R-G-VN", "INST-GAMMA", { jurisdictionCode: "VN", stance: "OPPOSES" })]);
  const jex = landscapeOf(otherJurisdiction).excludedEvidence.find((e) => e.evidenceRecordId === "R-G-VN");
  check("F07-G-CROSS-JURISDICTION-EXCLUDED", 7,
    "A record from outside the declared jurisdiction is excluded even when its institution participates",
    otherJurisdiction.ok && jex && jex.reasonCodes.includes("JURISDICTION_OUT_OF_SCOPE") && primaryContradictions(otherJurisdiction).length === 0,
    jex);

  const baselineDataset = compositionBaseline(baseRequest(), unauthDataset);
  check("F07-H-COMPOSITION-LEAKS-UNAUTHORISED-DATASET", 7,
    "Attribution: the composition baseline has no dataset-level sharing authority, so the unauthorised dataset enters CAP-05 and creates a contradiction",
    baselineDataset.selectedRecordIds.includes("R-A-PRIV") && baselineContradicts(baselineDataset, PRIMARY),
    baselineDataset);

  const baselineInstitution = compositionBaseline(baseRequest(), unauthInstitution);
  check("F07-I-COMPOSITION-HANDLES-INSTITUTION-FILTER", 7,
    "Attribution: an institution-level filter IS available through the CAP-05 request's organizationIds, so F07-A alone is composable",
    !baselineInstitution.selectedRecordIds.includes("R-U-1") && !baselineContradicts(baselineInstitution, PRIMARY),
    baselineInstitution);
}

// ===========================================================================
// 8. Duplicate evidence creates no artificial weight
// ===========================================================================
{
  const dup = (id, institutionId, extra) => rec(id, institutionId, Object.assign({ contentDigest: "sha256:content-R-A-1", admission: { admittedAt: "2026-04-01T00:00:00Z" } }, extra || {}));

  const out = run(baseRequest(), [A1(), dup("R-B-DUP", "INST-BETA")]);
  const obs = out.ok ? landscapeOf(out).supportedObservations.find((o) => o.subjectKey === PRIMARY) : null;
  const d = out.ok ? landscapeOf(out).duplicateEvidence : [];
  check("F08-A-DUPLICATE-CANNOT-MANUFACTURE-AGREEMENT", 8,
    "Beta re-submitting Alpha's observation (same content digest) is recorded as a duplicate: one independent observation, no cross-institutional agreement",
    out.ok && d.length === 1 && d[0].duplicateOf.evidenceRecordId === "R-A-1" && d[0].duplicateBasis === "SAME_CONTENT_DIGEST"
      && obs.independentObservationCount === 1 && obs.crossInstitutionalAgreement === false && same(obs.duplicateSubmissionsAlsoReportedBy, ["INST-BETA"]),
    { duplicates: d, observation: obs });

  const sameSource = run(baseRequest(), [A1(), rec("R-B-RESUB", "INST-BETA", { sourceAuthority: "ALPHA-FIELD-PROGRAMME", sourceRecordId: "SRC-R-A-1", contentDigest: "sha256:reextracted", admission: { admittedAt: "2026-04-01T00:00:00Z" } })]);
  const d2 = landscapeOf(sameSource).duplicateEvidence;
  check("F08-B-SAME-SOURCE-RECORD-IS-DUPLICATE", 8,
    "Adversarial: a re-extraction of the same source record with a different content digest is still one observation",
    sameSource.ok && d2.length === 1 && d2[0].duplicateBasis === "SAME_SOURCE_RECORD",
    d2);

  const outvote = run(baseRequest(), [A1(), dup("R-B-DUP", "INST-BETA"), dup("R-G-DUP", "INST-GAMMA"), dup("R-A-DUP", "INST-ALPHA"), rec("R-G-OPP", "INST-GAMMA", { stance: "OPPOSES", dateObserved: "2023-07-01" })]);
  const oc = primaryContradictions(outvote);
  check("F08-C-DUPLICATES-CANNOT-OUTVOTE", 8,
    "Adversarial: three duplicates of a supporting record count once; the contradiction shows one supporting and one opposing record",
    outvote.ok && oc.length === 1 && same(oc[0].supportingRecordIds, ["R-A-1"]) && same(oc[0].opposingRecordIds, ["R-G-OPP"]) && landscapeOf(outvote).duplicateEvidence.length === 3,
    oc);

  check("F08-D-DUPLICATE-DOES-NOT-SATISFY-CAP05-VOLUME", 8,
    "One observation plus its duplicate reaches CAP-05 as one record, so CAP-05 still reports SUFFICIENT_VOLUME missing",
    out.result.cap05Evaluation.inputRecordCount === 1 && out.result.cap05Evaluation.computedFacts.missingCategories.includes("SUFFICIENT_VOLUME"),
    out.result.cap05Evaluation);

  const baseline = compositionBaseline(baseRequest(), [A1(), dup("R-B-DUP", "INST-BETA")]);
  check("F08-E-COMPOSITION-GIVES-DUPLICATE-WEIGHT", 8,
    "Attribution: in the composition baseline the duplicate is counted as a second eligible record and changes CAP-05's outcome by satisfying SUFFICIENT_VOLUME",
    baseline.computedFacts.eligibleCount === 2 && !baseline.computedFacts.missingCategories.includes("SUFFICIENT_VOLUME"),
    baseline);

  const versions = run(baseRequest(), [A1(), rec("R-A-1", "INST-ALPHA", { evidenceRecordVersion: 2, contentDigest: "sha256:content-R-A-1-v2", admission: { admittedAt: "2026-05-01T00:00:00Z", admissionDecisionId: "MAD-R-A-1-v2" } }), B1()]);
  const included = versions.frozenEvidenceSet.includedRecords.filter((r) => r.evidenceRecordId === "R-A-1");
  const superseded = landscapeOf(versions).excludedEvidence.find((e) => e.evidenceRecordId === "R-A-1" && e.evidenceRecordVersion === 1);
  check("F08-F-ONE-VERSION-PER-RECORD", 8,
    "Two admitted versions of one record count once: the latest within the cut-off is included, the earlier is excluded as superseded",
    versions.ok && included.length === 1 && included[0].evidenceRecordVersion === 2 && included[0].admissionDecisionId === "MAD-R-A-1-v2"
      && superseded && same(superseded.reasonCodes, ["SUPERSEDED_BY_LATER_VERSION_WITHIN_CUT_OFF"]),
    { included, superseded });
}

// ===========================================================================
// 9. Institutional reputation has no evidential weighting
// ===========================================================================
{
  const opposing = () => [A1(), B1({ stance: "OPPOSES" }), rec("R-G-1", "INST-GAMMA", { dateObserved: "2023-07-01" })];
  const original = run(baseRequest(), opposing());

  const swapped = baseRequest();
  swapped.participatingInstitutions[0].prestigeRank = 5; swapped.participatingInstitutions[0].reputationTier = "FIELD_STATION";
  swapped.participatingInstitutions[2].prestigeRank = 1; swapped.participatingInstitutions[2].reputationTier = "NATIONAL_FLAGSHIP";
  const reranked = run(swapped, opposing());
  const stripped = baseRequest();
  for (const institution of stripped.participatingInstitutions) { delete institution.prestigeRank; delete institution.reputationTier; }
  const unranked = run(stripped, opposing());
  check("F09-A-REPUTATION-CHANGES-NOTHING", 9,
    "Inverting or removing institutional reputation fields leaves the result digest and evidence-set digest byte-identical",
    original.ok && reranked.ok && unranked.ok
      && original.result.resultDigest === reranked.result.resultDigest && original.result.resultDigest === unranked.result.resultDigest
      && original.frozenEvidenceSet.evidenceSetDigest === reranked.frozenEvidenceSet.evidenceSetDigest,
    { original: original.result.resultDigest, reranked: reranked.result.resultDigest, unranked: unranked.result.resultDigest });

  const mirrored = run(baseRequest(), [A1(), B1()].map((record) => Object.assign(record, { stance: record.institutionId === "INST-ALPHA" ? "OPPOSES" : "SUPPORTS" })));
  const flagship = run(baseRequest(), [A1(), B1({ stance: "OPPOSES" })]);
  const m = primaryContradictions(mirrored)[0];
  const f = primaryContradictions(flagship)[0];
  check("F09-B-SIDES-ARE-SYMMETRIC", 9,
    "Swapping which institution holds which stance mirrors the contradiction exactly; neither side is preferred when the higher-ranked institution holds it",
    m && f && same(m.supportingInstitutionIds, f.opposingInstitutionIds) && same(m.opposingInstitutionIds, f.supportingInstitutionIds)
      && m.resolutionStatus === f.resolutionStatus && Object.keys(m).sort().join() === Object.keys(f).sort().join(),
    { mirrored: m, flagship: f });

  // Digests canonicalise key order, so presentation order is checked directly:
  // coverage must stay in identifier order however reputation is arranged.
  const serialised = JSON.stringify(Object.assign({}, original.result, { authorityBoundary: undefined })) + JSON.stringify(Object.assign({}, original.receipt, { authorityBoundary: undefined }));
  const coverageOrders = [original, reranked, unranked].map((output) => Object.keys(landscapeOf(output).institutionCoverage));
  check("F09-C-NO-REPUTATION-IN-OUTPUT", 9,
    "No reputation, prestige or rank value appears anywhere in the result or receipt, and institution coverage stays in identifier order when reputation is inverted or removed",
    !/prestige|reputation|rank|NATIONAL_FLAGSHIP|FIELD_STATION|REGIONAL_AGENCY/i.test(serialised)
      && coverageOrders.every((order) => same(order, ["INST-ALPHA", "INST-BETA", "INST-GAMMA"])),
    coverageOrders);
}

// ===========================================================================
// 10. Later evidence creates staleness without rewriting the frozen result
// ===========================================================================
{
  const request = baseRequest();
  const r1 = run(request, baseRecords());
  const r1Canonical = canon(r1.result);
  const late = () => rec("R-G-NEW", "INST-GAMMA", { stance: "OPPOSES", dateObserved: "2024-03-01", admission: { admittedAt: "2026-08-01T00:00:00Z" } });

  const rerun = run(request, baseRecords().concat([late()]));
  const lateEx = landscapeOf(rerun).excludedEvidence.find((e) => e.evidenceRecordId === "R-G-NEW");
  check("F10-A-LATE-EVIDENCE-CANNOT-ENTER-FROZEN-SCOPE", 10,
    "Re-running the same request with a record admitted after the cut-off leaves the included set, observations and contradictions identical; the late record is excluded by cut-off",
    rerun.ok && same(rerun.frozenEvidenceSet.includedRecords, r1.frozenEvidenceSet.includedRecords)
      && same(landscapeOf(rerun).supportedObservations, landscapeOf(r1).supportedObservations)
      && landscapeOf(rerun).genuineContradictions.length === 0 && lateEx && same(lateEx.reasonCodes, ["ADMITTED_AFTER_EVIDENCE_CUT_OFF"]),
    lateEx);

  const notice = candidate.assessStaleness(r1.receipt, request, baseRecords().concat([late()]), DEPS);
  check("F10-B-STALENESS-NOTICE-ISSUED", 10,
    "A deliberate staleness check reports POTENTIALLY_STALE, names the newly eligible record, and returns no new landscape",
    notice.ok && notice.status === "POTENTIALLY_STALE" && notice.triggers.length === 1
      && notice.triggers[0].reasonCode === "NEW_ELIGIBLE_EVIDENCE_ADMITTED_AFTER_CUT_OFF" && notice.triggers[0].evidenceRecordId === "R-G-NEW"
      && notice.originalResultDigest === r1.result.resultDigest && notice.originalLandscapeUnchanged === true
      && notice.reEvaluationRequiresDeliberateRequest === true && !("landscape" in notice) && !("result" in notice),
    notice);

  let mutationRefused = false;
  try { r1.result.landscape.genuineContradictions.push({ injected: true }); } catch (error) { mutationRefused = error && error.name === "TypeError"; }
  let rewriteRefused = false;
  try { r1.result.binding.evidenceCutOff = "2027-01-01T00:00:00Z"; } catch (error) { rewriteRefused = error && error.name === "TypeError"; }
  check("F10-C-FROZEN-RESULT-IS-IMMUTABLE", 10,
    "After the staleness notice the original result is byte-identical, and attempts to append to it or move its cut-off throw",
    canon(r1.result) === r1Canonical && mutationRefused && rewriteRefused && Object.isFrozen(r1.frozenEvidenceSet.includedRecords[0]),
    { mutationRefused, rewriteRefused });

  const outOfScopeLate = candidate.assessStaleness(r1.receipt, request, baseRecords().concat([rec("R-U-NEW", "INST-UNAUTH", { stance: "OPPOSES", admission: { admittedAt: "2026-08-01T00:00:00Z" } })]), DEPS);
  check("F10-D-OUT-OF-SCOPE-LATE-EVIDENCE-IS-NOT-STALENESS", 10,
    "Perturbation: late evidence from a non-participating institution does not make the landscape stale",
    outOfScopeLate.ok && outOfScopeLate.status === "NO_NEWER_ELIGIBLE_EVIDENCE_FOUND" && outOfScopeLate.triggers.length === 0,
    outOfScopeLate);

  const newerVersion = candidate.assessStaleness(r1.receipt, request, baseRecords().concat([rec("R-A-1", "INST-ALPHA", { evidenceRecordVersion: 2, contentDigest: "sha256:content-R-A-1-v2", admission: { admittedAt: "2026-08-02T00:00:00Z" } })]), DEPS);
  check("F10-E-NEWER-VERSION-MAKES-STALE", 10,
    "A newer version of an included record admitted after the cut-off is reported as a staleness trigger",
    newerVersion.ok && newerVersion.status === "POTENTIALLY_STALE" && newerVersion.triggers.some((t) => t.reasonCode === "NEWER_VERSION_OF_INCLUDED_EVIDENCE_ADMITTED" && t.evidenceRecordId === "R-A-1"),
    newerVersion.triggers);

  const nowQuarantined = candidate.assessStaleness(r1.receipt, request, [A1(), Object.assign(B1(), { admission: { admissionDecisionId: "MAD-R-B-1-Q", decision: "QUARANTINED", eligibleForScientificMemory: false, admittedAt: "2026-03-15T00:00:00Z" } })], DEPS);
  check("F10-F-ADMISSION-CHANGE-MAKES-STALE", 10,
    "An included record that is no longer admitted is reported as a staleness trigger; the original result is not edited",
    nowQuarantined.ok && nowQuarantined.triggers.some((t) => t.reasonCode === "INCLUDED_EVIDENCE_ADMISSION_NO_LONGER_CURRENT" && t.evidenceRecordId === "R-B-1") && canon(r1.result) === r1Canonical,
    nowQuarantined.triggers);

  const movedCutOff = baseRequest();
  movedCutOff.evidenceCutOff = "2026-09-30T00:00:00Z";
  const mismatch = candidate.assessStaleness(r1.receipt, movedCutOff, baseRecords(), DEPS);
  check("F10-G-STALENESS-BOUND-TO-EXACT-SCOPE", 10,
    "Adversarial: a staleness check against a different scope (moved cut-off) fails closed",
    mismatch.ok === false && mismatch.errors.includes("RECEIPT_REQUEST_MISMATCH"),
    mismatch);

  const again = candidate.assessStaleness(r1.receipt, request, baseRecords().concat([late()]), Object.assign({}, DEPS, { now: clockAt("2026-12-01T00:00:00Z") }));
  const exported = Object.keys(candidate).sort();
  check("F10-H-STALENESS-IS-DELIBERATE-NOT-MONITORING", 10,
    "Staleness is a stateless deliberate check: repeating it later yields the same notice digest, and the candidate exposes no watch, subscribe or schedule operation",
    again.noticeDigest === notice.noticeDigest && again.assessedAt !== notice.assessedAt && notice.noMonitoringEstablished === true
      && !exported.some((key) => /watch|subscribe|schedule|monitor|listen/i.test(key)),
    { exported, noticeDigest: notice.noticeDigest });

  const fs1 = r1.frozenEvidenceSet;
  const body = Object.assign({}, JSON.parse(JSON.stringify(fs1)));
  delete body.frozenSetId; delete body.evidenceSetDigest;
  check("F10-I-FROZEN-SET-AND-RECEIPT-PRESERVE-BINDING", 10,
    "The frozen set and receipt preserve exact record IDs, versions, admission decision IDs, selection scope and cut-off; the set digest recomputes exactly",
    same(fs1.includedRecords.map((r) => [r.evidenceRecordId, r.evidenceRecordVersion, r.admissionDecisionId]), [["R-A-1", 1, "MAD-R-A-1"], ["R-B-1", 1, "MAD-R-B-1"]])
      && same(r1.receipt.includedEvidence.map((r) => [r.evidenceRecordId, r.evidenceRecordVersion, r.admissionDecisionId, r.admissionDecision]), [["R-A-1", 1, "MAD-R-A-1", "ADMITTED"], ["R-B-1", 1, "MAD-R-B-1", "ADMITTED"]])
      && r1.receipt.evidenceCutOff === request.evidenceCutOff && r1.receipt.selectionScope.evidenceCutOff === request.evidenceCutOff
      && same(r1.receipt.selectionScope.authorisedDatasets.map((d) => d.datasetId), ["DS-ALPHA-RUBBER", "DS-BETA-RUBBER", "DS-GAMMA-RUBBER"])
      && r1.receipt.evidenceSetDigest === fs1.evidenceSetDigest && digest(candidate.canonicalize(body)) === fs1.evidenceSetDigest
      && r1.receipt.versions.cap05ImplementationVersion === "1.0.0",
    { frozenSet: fs1.includedRecords, receiptIncluded: r1.receipt.includedEvidence });
}

// ===========================================================================
// 11. Restricted evidence is disclosed only as a limitation
// ===========================================================================
{
  const restricted = (o) => rec("R-A-RESTRICTED", "INST-ALPHA", Object.assign({
    stance: "OPPOSES", accessClassification: "INSTITUTION_RESTRICTED", measuredValue: 999.25,
    sourceRecordId: "ALPHA-CONFIDENTIAL-TRIAL-77", contentDigest: "sha256:content-restricted-77",
    admission: { admissionDecisionId: "MAD-RESTRICTED-77" }
  }, o || {}));
  const SENSITIVE = ["R-A-RESTRICTED", "ALPHA-CONFIDENTIAL-TRIAL-77", "999.25", "content-restricted-77", "MAD-RESTRICTED-77"];
  const leaks = (value) => SENSITIVE.filter((token) => JSON.stringify(value).includes(token));

  const out = run(baseRequest(), baseRecords().concat([restricted()]));
  const limitation = out.ok ? landscapeOf(out).limitationsPreventingComparison.find((l) => l.limitationCode === "RESTRICTED_EVIDENCE_WITHHELD") : null;
  check("F11-A-RESTRICTED-WITHHELD-AS-LIMITATION", 11,
    "A restricted opposing record is withheld: no contradiction is derived from it, and it appears only as a counted limitation for its institution",
    out.ok && primaryContradictions(out).length === 0 && limitation && limitation.institutionId === "INST-ALPHA" && limitation.withheldRecordCount === 1
      && same(out.receipt.withheldEvidence, [{ institutionId: "INST-ALPHA", accessClassification: "INSTITUTION_RESTRICTED", withheldRecordCount: 1, contentDisclosed: false }])
      && landscapeOf(out).institutionCoverage["INST-ALPHA"].withheldRecordCount === 1,
    { limitation, receiptWithheld: out.receipt.withheldEvidence });

  check("F11-B-NO-RESTRICTED-CONTENT-IN-ANY-OUTPUT", 11,
    "Adversarial: the restricted record's ID, source reference, value, content digest and admission decision ID appear nowhere in the result, receipt, frozen set or comparability assessments",
    leaks(out).length === 0,
    { leakedTokens: leaks(out) });

  check("F11-C-OPAQUE-REFERENCE-SUPPORTS-AUDIT", 11,
    "The receipt carries an opaque withheld reference that an authorised auditor can verify against the record, without the receipt revealing it",
    out.receipt.withheldReferences.length === 1 && out.receipt.withheldReferences[0] === generateWithheldReference(
      { evidenceRecordId: "R-A-RESTRICTED", evidenceRecordVersion: 1 },
      "LREQ-TH-RUBBER-001"
    ),
    out.receipt.withheldReferences);

  const outOfScope = run(baseRequest(), baseRecords().concat([restricted({ dateObserved: "2015-01-01" })]));
  const hidden = landscapeOf(outOfScope).excludedEvidence.find((e) => e.identityWithheld === true);
  check("F11-D-RESTRICTED-EXCLUSION-ALSO-OPAQUE", 11,
    "Adversarial: even when a restricted record is excluded for scope, its exclusion entry withholds its identity",
    outOfScope.ok && hidden && !("evidenceRecordId" in hidden) && same(hidden.reasonCodes, ["OUTSIDE_TEMPORAL_SCOPE"]) && leaks(outOfScope).length === 0,
    hidden);

  const reclassified = run(baseRequest(), baseRecords().concat([restricted({ accessClassification: "SHARED_CROSS_INSTITUTION" })]));
  check("F11-E-WITHHOLDING-IS-THE-ONLY-DIFFERENCE", 11,
    "Perturbation: the same record under a disclosable classification is included and the contradiction appears, so withholding alone kept it out",
    reclassified.ok && primaryContradictions(reclassified).length === 1 && primaryContradictions(reclassified)[0].opposingRecordIds.includes("R-A-RESTRICTED"),
    primaryContradictions(reclassified));

  const baseline = compositionBaseline(baseRequest(), baseRecords().concat([restricted()]));
  check("F11-F-COMPOSITION-LEAKS-BY-INFERENCE", 11,
    "Attribution: the composition baseline has no disclosure-as-limitation path; the restricted record enters CAP-05 and its opposing stance becomes visible as a contradiction",
    baseline.selectedRecordIds.includes("R-A-RESTRICTED") && baselineContradicts(baseline, PRIMARY),
    baseline);

  const r1 = run(baseRequest(), baseRecords());
  const lateRestricted = candidate.assessStaleness(r1.receipt, baseRequest(), baseRecords().concat([restricted({ admission: { admittedAt: "2026-08-05T00:00:00Z", admissionDecisionId: "MAD-RESTRICTED-77" } })]), DEPS);
  check("F11-G-RESTRICTED-STALENESS-COUNT-ONLY", 11,
    "Late restricted evidence makes the landscape potentially stale by count only; the notice reveals nothing about the record",
    lateRestricted.status === "POTENTIALLY_STALE" && lateRestricted.triggers.some((t) => t.reasonCode === "NEW_RESTRICTED_EVIDENCE_ADMITTED_AFTER_CUT_OFF" && t.withheldRecordCount === 1)
      && leaks(lateRestricted).length === 0,
    lateRestricted.triggers);
}

// ===========================================================================
// 12. No recommendation, promotion, verdict or memory write
// ===========================================================================
{
  const blocked = ["POLICY_RECOMMENDATION", "WINNING_INSTITUTION", "INSTITUTION_RANKING", "VERDICT", "CONTRADICTION_RESOLUTION", "KNOWLEDGE_PROMOTION", "MEMORY_WRITE_BACK"];
  const refusals = blocked.map((output) => {
    const request = baseRequest();
    request.requestedOutputs = ["EVIDENCE_LANDSCAPE", output];
    const result = run(request, baseRecords());
    return { output, ok: result.ok, errors: result.errors, partialLandscapeReturned: result.partialLandscapeReturned };
  });
  check("F12-A-OPERATIONAL-OUTPUTS-FAIL-CLOSED", 12,
    "Requesting a recommendation, winning institution, ranking, verdict, contradiction resolution, promotion or memory write fails the whole request closed",
    refusals.every((r) => r.ok === false && r.errors.includes("OPERATIONAL_INTENT_BLOCKED") && r.partialLandscapeReturned === false),
    refusals);

  const out = run(baseRequest(), [A1(), B1({ stance: "OPPOSES" }), rec("R-G-1", "INST-GAMMA", { subjectKey: PANEL })]);
  const scrub = (value) => { const v = JSON.parse(JSON.stringify(value)); delete v.authorityBoundary; return v; };
  const texts = [];
  const walk = (value) => {
    if (value && typeof value === "object") for (const key of Object.keys(value)) { texts.push(key); walk(value[key]); }
    else if (typeof value === "string") texts.push(value);
  };
  walk(scrub(out.result)); walk(scrub(out.receipt));
  const forbidden = texts.filter((text) => /recommend|winner|winning|verdict|promot|preferred|should adopt|best institution/i.test(text));
  check("F12-B-NO-OPERATIONAL-LANGUAGE-IN-OUTPUT", 12,
    "Adversarial scan: no key or value in the result or receipt (outside the authority boundary) recommends, selects a winner, promotes or issues a verdict",
    out.ok && forbidden.length === 0,
    { forbidden });

  const deepFreezeLocal = (value) => { if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(deepFreezeLocal); } return value; };
  const frozenRequest = deepFreezeLocal(baseRequest());
  const frozenRecords = deepFreezeLocal([A1(), B1({ stance: "OPPOSES" })]);
  const beforeInputs = canon({ frozenRequest, frozenRecords });
  const calls = [];
  const trap = (name) => () => { calls.push(name); throw new Error("write attempted: " + name); };
  const trappedDeps = Object.assign({}, DEPS, {
    cap04: { admitRecord: trap("cap04.admitRecord"), updateRecord: trap("cap04.updateRecord"), deleteRecord: trap("cap04.deleteRecord") },
    cap09: { promoteLearning: trap("cap09.promoteLearning"), recordLearningDecision: trap("cap09.recordLearningDecision") }
  });
  let threw = null;
  let trapped = null;
  try { trapped = candidate.evaluateLandscape(frozenRequest, frozenRecords, trappedDeps); } catch (error) { threw = String(error && error.message); }
  let staleThrew = null;
  try { candidate.assessStaleness(trapped.receipt, frozenRequest, frozenRecords, trappedDeps); } catch (error) { staleThrew = String(error && error.message); }
  check("F12-C-NO-MEMORY-WRITE-OR-PROMOTION", 12,
    "Deep-frozen inputs are read without mutation, and CAP-04 write and CAP-09 promotion traps offered to the candidate are never called by evaluation or staleness",
    threw === null && staleThrew === null && trapped && trapped.ok && calls.length === 0 && canon({ frozenRequest, frozenRecords }) === beforeInputs,
    { threw, staleThrew, calls });

  const boundary = out.result.authorityBoundary;
  check("F12-D-AUTHORITY-BOUNDARY-ON-EVERY-OUTPUT", 12,
    "Every result and receipt carries the full advisory-only authority boundary, and every contradiction is left unresolved",
    Object.values(boundary).every((flag) => flag === true) && same(out.receipt.authorityBoundary, boundary)
      && ["advisoryOnly", "noVerdictProduced", "noInstitutionRanked", "noPolicyRecommendation", "noKnowledgePromotion", "noWriteBackToInstitutionalMemory", "noAutonomousMonitoring"].every((key) => boundary[key] === true)
      && landscapeOf(out).genuineContradictions.every((c) => c.resolutionStatus === "UNRESOLVED_HUMAN_REVIEW_REQUIRED"),
    boundary);

  const wrongVersion = baseRequest();
  wrongVersion.requestedCap05EvaluationVersion = "2.0.0";
  const vfail = run(wrongVersion, baseRecords());
  check("F12-E-CAP05-VERSION-MUST-MATCH", 12,
    "Requesting a CAP-05 evaluation version that is not the one available fails closed rather than silently using another version",
    vfail.ok === false && vfail.errors.includes("CAP05_VERSION_UNAVAILABLE"),
    vfail);

  const first = run(baseRequest(), baseRecords());
  const later = run(baseRequest(), baseRecords(), Object.assign({}, DEPS, { now: clockAt("2027-01-01T00:00:00Z") }));
  check("F12-F-STATELESS-AND-DETERMINISTIC", 12,
    "The same request and records at a different time give the same result digest and landscape ID; only generatedAt differs",
    first.result.resultDigest === later.result.resultDigest && first.result.landscapeId === later.result.landscapeId && first.result.generatedAt !== later.result.generatedAt,
    { first: first.result.resultDigest, later: later.result.resultDigest });
}

// ===========================================================================
// Capability-identity assessment — derived from the fixtures above.
//
// Decision rule (fixed before evaluation):
//   * If any fixture fails, the question is UNDETERMINED.
//   * A governed function counts as beyond composition only when
//     (a) it is not provided by the CAP-04 or CAP-05 canonical contracts and
//         not assigned to another designated capability, and
//     (b) a composition-baseline fixture demonstrates the baseline fails it,
//     (c) while every candidate fixture for it passes.
//   * One or more such functions => CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW;
//     none => GOVERNED_COMPOSITION_PROFILE.
// ===========================================================================
const GOVERNED_FUNCTIONS = [
  { functionId: "DATASET_AND_PARTICIPATION_AUTHORISATION", attribution: "NOT_PROVIDED_BY_CAP04_OR_CAP05_CONTRACT",
    fixtures: ["F07-B-UNAUTHORISED-DATASET-EXCLUDED", "F07-C-MISSING-PARTICIPATION-AUTHORITY-FAILS-CLOSED", "F07-D-DATASET-WITHOUT-SHARING-AUTHORITY-FAILS-CLOSED"],
    baselineFixture: "F07-H-COMPOSITION-LEAKS-UNAUTHORISED-DATASET",
    basis: "The CAP-05 request contract offers an organizationIds filter (F07-I shows institution-level exclusion is composable) but no dataset-level sharing authority or participation authority; the CAP-05 contract fails closed on cross-boundary records rather than governing them." },
  { functionId: "METHODOLOGICAL_COMPARABILITY", attribution: "NOT_PROVIDED_BY_CAP04_OR_CAP05_CONTRACT",
    fixtures: ["F05-A-INCOMPATIBILITY-SURFACED", "F05-B-DECLARED-COMPATIBILITY-ALLOWS-COMPARISON", "F05-C-SIMILAR-NAMES-NOT-AUTO-POOLED"],
    baselineFixture: "F05-D-COMPOSITION-SILENTLY-POOLS",
    basis: "CAP-04 stores methodReference as data and CAP-05 compares stances by subject only; neither assesses whether methodologies are comparable." },
  { functionId: "AUTHORISED_UNIT_TRANSFORMATION", attribution: "NOT_PROVIDED_BY_CAP04_OR_CAP05_CONTRACT",
    fixtures: ["F04-A-AUTHORISED-TRANSFORMATION-APPLIED", "F04-B-NO-AUTHORISATION-MEANS-INCOMPARABLE", "F04-C-UNREFERENCED-TRANSFORMATION-REFUSED", "F04-D-RECORD-SUPPLIED-CONVERSION-IGNORED"],
    baselineFixture: "F04-E-COMPOSITION-HAS-NO-UNIT-GOVERNANCE",
    basis: "Neither contract defines unit transformations, their authority, or declared incomparability." },
  { functionId: "DUPLICATE_WEIGHT_PREVENTION", attribution: "NOT_PROVIDED_BY_CAP04_OR_CAP05_CONTRACT",
    fixtures: ["F08-A-DUPLICATE-CANNOT-MANUFACTURE-AGREEMENT", "F08-B-SAME-SOURCE-RECORD-IS-DUPLICATE", "F08-C-DUPLICATES-CANNOT-OUTVOTE", "F08-D-DUPLICATE-DOES-NOT-SATISFY-CAP05-VOLUME", "F08-F-ONE-VERSION-PER-RECORD"],
    baselineFixture: "F08-E-COMPOSITION-GIVES-DUPLICATE-WEIGHT",
    basis: "CAP-04 admits each institution's submission as its own record; nothing in either contract collapses the same observation submitted by different institutions." },
  { functionId: "RESTRICTED_EVIDENCE_DISCLOSED_AS_LIMITATION", attribution: "NOT_PROVIDED_BY_CAP04_OR_CAP05_CONTRACT",
    fixtures: ["F11-A-RESTRICTED-WITHHELD-AS-LIMITATION", "F11-B-NO-RESTRICTED-CONTENT-IN-ANY-OUTPUT", "F11-C-OPAQUE-REFERENCE-SUPPORTS-AUDIT", "F11-D-RESTRICTED-EXCLUSION-ALSO-OPAQUE", "F11-E-WITHHOLDING-IS-THE-ONLY-DIFFERENCE"],
    baselineFixture: "F11-F-COMPOSITION-LEAKS-BY-INFERENCE",
    basis: "The CAP-05 contract returns FAIL_CLOSED EVIDENCE_ACCESS_DENIED with no partial landscape; it has no path to proceed while disclosing withheld evidence as a counted, opaque limitation. The live composition has no access check at all." },
  { functionId: "EVIDENCE_SET_FREEZING_AND_SCOPE_BINDING", attribution: "PARTIALLY_PROVIDED_BY_CAP05_CONTRACT",
    fixtures: ["F10-A-LATE-EVIDENCE-CANNOT-ENTER-FROZEN-SCOPE", "F10-C-FROZEN-RESULT-IS-IMMUTABLE", "F10-I-FROZEN-SET-AND-RECEIPT-PRESERVE-BINDING"],
    baselineFixture: null,
    basis: "CAP-05's EvidenceLandscapeSnapshotIdentity already binds record IDs, a set digest and asOf. The candidate extends it with selection scope, exclusions, admission decisions and withheld references, but the core mechanism is not new. Not counted." },
  { functionId: "STALENESS_NOTICE", attribution: "ASSIGNED_TO_GOVERNED_EVIDENCE_WATCH_BY_CAP05_CONTRACT",
    fixtures: ["F10-B-STALENESS-NOTICE-ISSUED", "F10-D-OUT-OF-SCOPE-LATE-EVIDENCE-IS-NOT-STALENESS", "F10-E-NEWER-VERSION-MAKES-STALE", "F10-F-ADMISSION-CHANGE-MAKES-STALE", "F10-G-STALENESS-BOUND-TO-EXACT-SCOPE", "F10-H-STALENESS-IS-DELIBERATE-NOT-MONITORING"],
    baselineFixture: null,
    basis: "The CAP-05 contract assigns staleness notices to the separate Governed Evidence Watch design. The candidate's deliberate staleness check overlaps it and must be reconciled with it. Not counted." },
  { functionId: "SAME_SUBJECT_CONTRADICTION_AND_CROSS_SUBJECT_DISTINCTION", attribution: "PROVIDED_BY_CAP05",
    fixtures: ["F02-A-SAME-SUBJECT-CONTRADICTION", "F02-B-CONTRADICTION-BIDIRECTIONAL", "F02-C-NO-MAJORITY-RESOLUTION", "F03-A-CROSS-SUBJECT-NOT-CONTRADICTION", "F03-B-SAME-SUBJECT-FLIPS-TO-CONTRADICTION"],
    baselineFixture: null,
    basis: "F02-D and F03-C show the live CAP-05 evaluator performs this within composition." },
  { functionId: "CROSS_INSTITUTION_AGREEMENT", attribution: "PROVIDED_BY_CAP05",
    fixtures: ["F01-A-CROSS-INSTITUTION-AGREEMENT", "F01-B-AGREEMENT-DEPENDS-ON-DATA"],
    baselineFixture: null,
    basis: "F01-C: absence of contradiction across institutions is available through composition; grouping by institution is presentation." },
  { functionId: "KNOWLEDGE_GAPS", attribution: "PROVIDED_BY_CAP05_CONTRACT",
    fixtures: ["F06-A-MISSING-CATEGORIES-ARE-KNOWLEDGE-GAPS", "F06-B-GAP-CLOSES-WHEN-EVIDENCE-ARRIVES", "F06-C-TEMPORAL-AND-GEOGRAPHIC-GAPS", "F06-D-NO-EVIDENCE-FAILS-CLOSED-NOT-NEGATIVE"],
    baselineFixture: null,
    basis: "The CAP-05 contract's knowledgeGaps names missingEvidenceCategory per subject. The live CAP-05 evaluator reports only global categories, so the reference evaluator computes per-subject gaps as a stand-in for CAP-05 contract behaviour. Not counted." },
  { functionId: "REPUTATION_NEUTRALITY", attribution: "INVARIANT_NOT_LOGIC",
    fixtures: ["F09-A-REPUTATION-CHANGES-NOTHING", "F09-B-SIDES-ARE-SYMMETRIC", "F09-C-NO-REPUTATION-IN-OUTPUT"],
    baselineFixture: null,
    basis: "A constraint on every capability, not a mechanism. Not counted." },
  { functionId: "NO_OPERATIONAL_OUTPUT", attribution: "SHARED_BOUNDARY_WITH_CAP05",
    fixtures: ["F12-A-OPERATIONAL-OUTPUTS-FAIL-CLOSED", "F12-B-NO-OPERATIONAL-LANGUAGE-IN-OUTPUT", "F12-C-NO-MEMORY-WRITE-OR-PROMOTION", "F12-D-AUTHORITY-BOUNDARY-ON-EVERY-OUTPUT", "F12-E-CAP05-VERSION-MUST-MATCH", "F12-F-STATELESS-AND-DETERMINISTIC"],
    baselineFixture: null,
    basis: "CAP-05's authority boundary already forbids verdicts, promotion and writes. Not counted." }
];

const byId = new Map(cases.map((c) => [c.fixtureId, c]));
const allPassed = cases.every((c) => c.passed);
const functionResults = GOVERNED_FUNCTIONS.map((fn) => {
  const unknown = fn.fixtures.concat(fn.baselineFixture ? [fn.baselineFixture] : []).filter((id) => !byId.has(id));
  const candidateFixturesPass = unknown.length === 0 && fn.fixtures.every((id) => byId.get(id).passed);
  const baselineInsufficiencyDemonstrated = fn.baselineFixture ? Boolean(byId.get(fn.baselineFixture) && byId.get(fn.baselineFixture).passed) : false;
  const beyondComposition = fn.attribution === "NOT_PROVIDED_BY_CAP04_OR_CAP05_CONTRACT" && baselineInsufficiencyDemonstrated && candidateFixturesPass;
  return Object.assign({}, fn, { unknownFixtureIds: unknown, candidateFixturesPass, baselineInsufficiencyDemonstrated, countsAsLogicBeyondComposition: beyondComposition });
});
const beyond = functionResults.filter((fn) => fn.countsAsLogicBeyondComposition).map((fn) => fn.functionId);
const classification = !allPassed || functionResults.some((fn) => fn.unknownFixtureIds.length > 0)
  ? "UNDETERMINED_FIXTURES_FAILED"
  : (beyond.length > 0 ? "CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW" : "GOVERNED_COMPOSITION_PROFILE");

const capabilityIdentityAssessment = {
  question: "Does this candidate introduce material governed logic beyond authorised CAP-04 evidence selection followed by CAP-05 evaluation?",
  decisionRule: "Beyond composition only when a governed function is not provided by the CAP-04/CAP-05 canonical contracts or assigned elsewhere, a composition-baseline fixture demonstrates the baseline fails it, and every candidate fixture for it passes. One or more such functions => CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW; none => GOVERNED_COMPOSITION_PROFILE.",
  classification,
  functionsBeyondComposition: beyond,
  functions: functionResults,
  designRecordCriteria: {
    distinctFailureContract: "DEMONSTRATED — PARTICIPATION_AUTHORITY_MISSING, DATASET_AUTHORITY_INVALID, CAP04_ELIGIBILITY_REQUIREMENT_WEAKENED, RECEIPT_REQUEST_MISMATCH and CAP05_VERSION_UNAVAILABLE are not in the CAP-05 failure contract (F07-C, F07-D, F07-F, F10-G, F12-E).",
    distinctDisclosureReceiptType: "DEMONSTRATED — LANDSCAPE_DISCLOSURE_RECEIPT binds selection scope, exclusions, duplicates and opaque withheld references (F10-I, F11-C).",
    distinctAuthorityBoundary: "PARTIAL — the boundary adds cross-institutional flags (noInstitutionRanked, restrictedEvidenceDisclosedOnlyAsLimitation) to CAP-05's advisory boundary (F12-D).",
    independentLifecycle: "NOT_DEMONSTRATED — the reference evaluator is deliberately stateless; a lifecycle for frozen sets, receipts and staleness notices would need governed persistence that is out of scope.",
    distinctGatewayAction: "NOT_DEMONSTRATED — no gateway was in scope."
  },
  caveats: [
    "This is a classification for review, not admission. No CAP number is assigned.",
    "The staleness notice overlaps the Governed Evidence Watch design in the CAP-05 contract and must be reconciled before any admission review.",
    "The composition baseline uses the live CAP-05 simulation evaluator (1.0.0), which is thinner than the CAP-05 canonical contract; functions the contract assigns to CAP-05 are therefore attributed to CAP-05 even where the live evaluator lacks them."
  ]
};

const passedCount = cases.filter((c) => c.passed).length;
const requirementTotals = {};
for (const c of cases) {
  const key = "R" + String(c.requirement).padStart(2, "0");
  requirementTotals[key] = requirementTotals[key] || { fixtureCount: 0, passedFixtureCount: 0 };
  requirementTotals[key].fixtureCount += 1;
  if (c.passed) requirementTotals[key].passedFixtureCount += 1;
}

const proof = {
  proofId: "AAB-AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_AGR_CROSS_INSTITUTIONAL_LANDSCAPE_CANDIDATE_01_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_AGR_CROSS_INSTITUTIONAL_LANDSCAPE_CANDIDATE_01_BEHAVIOURAL_PROOF",
  scope: "Proves the candidate reference evaluator's behaviour on synthetic multi-institution fixtures, and compares it with a composition baseline of CAP-04 selection plus the live CAP-05 evaluator. It does not admit the candidate, assign a CAP number, or prove scientific correctness, production readiness, sovereignty or commissioning.",
  candidateVersion: candidate.candidateVersion,
  cap05ImplementationVersion: cap05.implementationVersion,
  fixtureCount: cases.length,
  passedFixtureCount: passedCount,
  requirementTotals,
  capabilityIdentityAssessment,
  fixtures: cases
};

fs.writeFileSync(PROOF_FILE, JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify({ result: proof.result, fixtureCount: proof.fixtureCount, passedFixtureCount: proof.passedFixtureCount, requirementTotals, classification, functionsBeyondComposition: beyond, failed: cases.filter((c) => !c.passed).map((c) => c.fixtureId) }, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
