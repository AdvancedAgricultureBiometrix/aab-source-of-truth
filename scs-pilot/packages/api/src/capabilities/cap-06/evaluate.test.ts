// SCS-CAP-06 evaluate(), the pure evaluator: the pilot rule "No pilot
// evaluation can be SUFFICIENT" (contract, "Outcomes and the honest pilot
// result"), as the amendment of 2026-10-11 makes it hold for every
// specification (finding F-B of the substance verification of 2026-10-11).
// The handler's end-to-end checks are in integration/cap-06-evaluate-sufficiency.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate, type EvaluationInput } from "./evaluate.js";
import type { CustodyInput, DeforestationInput, FrameworkSpec, PlotInput } from "./store.js";

type Threshold = FrameworkSpec["threshold"];

const framework = (threshold: Partial<Threshold>, edit: Partial<FrameworkSpec> = {}): FrameworkSpec => ({
  frameworkId: "fw-1", status: "ACTIVE", regulationVersion: "consolidated-2024", commodityCode: "4001", specId: "spec-1",
  referenceCutoffDate: "2020-12-31", requiredCoverageType: "FULL_PLOT_COVERAGE", acceptedSourceTypes: ["SATELLITE_IMAGE"],
  minimumResolutionMetres: null, minimumRecencyDays: null, integrityRequirement: "VERIFIED", authorityConfirmationRequired: false,
  requiredDocumentTypes: [], chainOfCustodyStandards: [], traceabilityDepth: "FIRST_SUPPLIER", geolocationRequired: false,
  landRegistryRequired: false, minimumPlotIdentifierType: "GPS_POINT", ownershipVerificationRequired: false,
  ...edit,
  threshold: { allPlotsRegistered: false, allPlotsHaveDeforestationEvidence: false, custodyChainComplete: false, noUnresolvedGaps: false, humanReviewCompleted: false, ...threshold },
});

const plot = (plotId: string, geometryType = "POINT"): PlotInput => ({
  plotId, plotVersion: 1, registrationStatus: "REGISTERED_WITH_GAPS", overlapState: "NOT_EVALUATED", geometryType,
  registryVerificationStatus: "VERIFIED", tenureStatuses: ["VERIFIED"], associationId: `assoc-${plotId}`,
});

/** A covering, verified, no-deforestation analysis of the whole required period. */
const covering = (plotId: string, target: "DEFORESTATION" | "FOREST_DEGRADATION" = "DEFORESTATION"): DeforestationInput => ({
  evidenceId: `ev-${plotId}-${target}`, evidenceVersion: 1, plotId, plotVersion: 1, evidenceType: "SATELLITE_IMAGE", contentDigest: "0".repeat(64),
  integrityStatus: "VERIFIED", admittedAt: "2026-01-01T00:00:00.000Z", coverageMode: "CHANGE_ANALYSIS",
  coverageBox: { minLon: 101.4, minLat: 13.4, maxLon: 101.6, maxLat: 13.6 }, spatialResolutionMetres: 10, acquisitionInstant: null,
  acquisitionStart: "2020-12-31T00:00:00.000Z", acquisitionEnd: "2024-06-30T00:00:00.000Z",
  analysisStart: "2020-12-31T00:00:00.000Z", analysisEnd: "2024-07-01T00:00:00.000Z", attestedStart: null, attestedEnd: null,
  detectionTarget: target, qualityStatus: "ACCEPTABLE", analystPartyId: null,
  claimType: target === "DEFORESTATION" ? "NO_DEFORESTATION_DETECTED" : "NO_FOREST_DEGRADATION_DETECTED",
  claimConfidence: "HIGH", claimStart: null, claimEnd: null, attestationProvided: false, attestingPartyId: null,
  declaredStart: null, declaredEnd: null, limitationCodes: [], knownGaps: [], excludedAreaIds: [],
});

const purchase = (plotId: string): CustodyInput => ({
  eventId: `evt-${plotId}`, eventVersion: 1, batchIdentifier: "LOT-1", eventType: "PURCHASE", sourcePartyId: "farmer", destinationPartyId: "coop",
  quantityAmount: 120, quantityUnit: "KG", documentType: "PURCHASE_RECEIPT", contentDigest: "1".repeat(64), integrityStatus: "VERIFIED",
  admittedAt: "2026-01-01T00:00:00.000Z", eventDate: "2024-06-30", contradictions: [], limitationCodes: [], sourcePlotIds: [plotId], links: [],
});

const input = (f: FrameworkSpec, edit: Partial<EvaluationInput> = {}): EvaluationInput => ({
  framework: f, plots: [plot("p1"), plot("p2")], deforestation: [], custody: [], verifiedPartyIds: ["farmer", "coop"],
  referenceDate: "2020-12-31", evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION",
  batchIdentifiers: [], operatorPartyId: null, resolutions: [], ...edit,
});

const requirement = (o: ReturnType<typeof evaluate>, code: string) => o.requirementEvaluations.find((r) => r.requirementCode === code)!;

test("a permissive specification with no evidence at all is not SUFFICIENT: spatial coverage is disclosed as not evaluated for every plot", () => {
  const o = evaluate(input(framework({})));
  assert.equal(o.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
  const spatial = requirement(o, "DEF-SPATIAL-COVERAGE");
  assert.equal(spatial.state, "GAP_REQUIRES_HUMAN_DECISION");
  assert.match(spatial.evaluationExplanation, /the pilot cannot evaluate spatial coverage/);
  assert.deepEqual(spatial.gaps.map((g) => [g.gapType, g.subject.plotId]).sort(), [["SPATIAL_COVERAGE_NOT_EVALUATED", "p1"], ["SPATIAL_COVERAGE_NOT_EVALUATED", "p2"]]);
  assert.ok(spatial.gaps.every((g) => g.humanDecisionRequired && !g.automaticFailure), "a verification gap, never missing evidence, when the threshold is off");
  assert.ok(o.nextSteps.some((n) => n.requirementCode === "DEF-SPATIAL-COVERAGE" && n.stepType === "HUMAN_DECISION_REQUIRED"));
});

test("a coverage type other than FULL_PLOT_COVERAGE is disclosed as COVERAGE_TYPE_NOT_EVALUATED, also when the threshold is off", () => {
  const o = evaluate(input(framework({}, { requiredCoverageType: "PARTIAL" })));
  assert.deepEqual(requirement(o, "DEF-SPATIAL-COVERAGE").gaps.map((g) => g.gapType), ["COVERAGE_TYPE_NOT_EVALUATED", "COVERAGE_TYPE_NOT_EVALUATED"]);
  assert.equal(o.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
});

test("no specification, scope or subject the pilot accepts yields SUFFICIENT", () => {
  const cases: string[] = [];
  for (const allPlotsRegistered of [false, true])
    for (const allPlotsHaveDeforestationEvidence of [false, true])
      for (const custodyChainComplete of [false, true])
        for (const evidence of ["none", "covering", "both-targets"] as const)
          for (const custody of [false, true])
            for (const assessmentType of ["DEFORESTATION", "FOREST_DEGRADATION", "BOTH"] as const)
              for (const shape of ["POINT", "POLYGON"] as const) {
                const f = framework({ allPlotsRegistered, allPlotsHaveDeforestationEvidence, custodyChainComplete }, shape === "POLYGON" ? { minimumPlotIdentifierType: "GPS_POLYGON" } : {});
                const plots = [plot("p1", shape), plot("p2", shape)];
                const deforestation =
                  evidence === "none" ? [] :
                  evidence === "covering" ? plots.map((p) => covering(p.plotId)) :
                  plots.flatMap((p) => [covering(p.plotId), covering(p.plotId, "FOREST_DEGRADATION")]);
                const o = evaluate(input(f, {
                  plots, deforestation, assessmentType,
                  ...(custody ? { custody: plots.map((p) => purchase(p.plotId)), batchIdentifiers: ["LOT-1"], operatorPartyId: "coop" } : {}),
                }));
                if (o.overallState === "SUFFICIENT") cases.push(JSON.stringify({ allPlotsRegistered, allPlotsHaveDeforestationEvidence, custodyChainComplete, evidence, custody, assessmentType, shape }));
                assert.ok(o.allGaps.some((g) => g.requirementCode === "DEF-SPATIAL-COVERAGE"), "spatial coverage is always disclosed");
              }
  assert.deepEqual(cases, [], "SUFFICIENT reached");
});

test("with allPlotsHaveDeforestationEvidence true, spatial coverage is unchanged: an uncovered plot is still missing evidence", () => {
  const none = evaluate(input(framework({ allPlotsHaveDeforestationEvidence: true })));
  assert.deepEqual(requirement(none, "DEF-SPATIAL-COVERAGE").gaps.map((g) => g.gapType).sort(), ["EVIDENCE_ABSENT", "EVIDENCE_ABSENT", "SPATIAL_COVERAGE_NOT_EVALUATED", "SPATIAL_COVERAGE_NOT_EVALUATED"]);
  assert.equal(requirement(none, "DEF-SPATIAL-COVERAGE").state, "UNSATISFIED");
  assert.match(requirement(none, "DEF-SPATIAL-COVERAGE").evaluationExplanation, /allPlotsHaveDeforestationEvidence is true/);
  assert.equal(none.overallState, "INSUFFICIENT");
  const covered = evaluate(input(framework({ allPlotsHaveDeforestationEvidence: true }), { deforestation: [covering("p1"), covering("p2")] }));
  assert.equal(requirement(covered, "DEF-SPATIAL-COVERAGE").state, "GAP_REQUIRES_HUMAN_DECISION");
  assert.equal(covered.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
});
