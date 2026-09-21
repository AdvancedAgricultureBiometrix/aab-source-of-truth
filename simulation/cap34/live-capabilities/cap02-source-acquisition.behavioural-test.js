"use strict";

/**
 * CAP-02 (Governed Scientific Data Acquisition & Interoperability)
 * live-logic behavioural proof -- stages 1-2 of Historical Scientific
 * Memory Recovery (register source, preserve original).
 *
 * Proves: a source cannot be registered without complete attribution
 * (named missing fields, not a bare refusal); original material cannot be
 * preserved against an unregistered source; the preserved content hash is
 * genuinely content-derived (same content -> same hash, different content
 * -> different hash), not a counter or a constant.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = __dirname;
const SIM_ROOT = path.join(ROOT, "..");

function loadIntoSandbox(files) {
  const sandbox = { window: {}, TextEncoder };
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: path.basename(file) });
  }
  return sandbox;
}

const sandbox = loadIntoSandbox([
  path.join(SIM_ROOT, "cap34-simulation.js"),
  path.join(ROOT, "cap02-source-acquisition.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap02 = sandbox.window.AAB_CAP34_LIVE_CAP02_SOURCE_ACQUISITION;

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

function completeSourceMetadata(overrides) {
  return Object.assign({
    country: "Synthetic Country",
    institution: "Synthetic Institute",
    department: "Synthetic Research Unit",
    originalSystem: "Synthetic Legacy System",
    datasetName: "Synthetic Trial Archive",
    responsibleOwner: "Synthetic Owner",
    dateRangeStart: "1998-01-01",
    dateRangeEnd: "2015-12-31",
    authorityToProvide: "Synthetic Institutional Authorisation",
    accessRestrictions: "Institution-only"
  }, overrides || {});
}

// --- Part 0: dispatcher wiring ---
const dispatched = sim.runLiveCapability("CAP-02", { sourceMetadata: completeSourceMetadata(), fileMaterial: { originalContent: "synthetic original content A", originalFileName: "trial-archive.csv" } });
const direct = cap02.evaluateAcquisition({ sourceMetadata: completeSourceMetadata(), fileMaterial: { originalContent: "synthetic original content A", originalFileName: "trial-archive.csv" } });
check(
  "CAP02-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-02', ...) reaches the same evaluator as calling it directly",
  dispatched.outcome === direct.outcome && dispatched.preservation.preservedRecord.contentHash === direct.preservation.preservedRecord.contentHash,
  dispatched
);

// --- Part A: stage 1, source registration ---
const completeRegistration = cap02.registerSource(completeSourceMetadata());
check(
  "CAP02-A0-COMPLETE-ATTRIBUTION-REGISTERS",
  "A source with every required attribution field registers successfully",
  completeRegistration.status === "SOURCE_REGISTERED" && completeRegistration.refusalReasons.length === 0,
  completeRegistration
);

const missingTwoFields = cap02.registerSource(completeSourceMetadata({ institution: undefined, authorityToProvide: "" }));
check(
  "CAP02-A1-MISSING-ATTRIBUTION-REFUSED-NAMED",
  "Omitting institution and authorityToProvide refuses registration and names exactly those two fields, never a bare refusal",
  missingTwoFields.status === "SOURCE_REGISTRATION_REFUSED"
    && missingTwoFields.refusalReasons.length === 2
    && missingTwoFields.refusalReasons.includes("MISSING_FIELD:institution")
    && missingTwoFields.refusalReasons.includes("MISSING_FIELD:authorityToProvide")
    && missingTwoFields.sourceRecord === null,
  missingTwoFields
);

// Bidirectionality: break exactly ONE required field, confirm refusal names
// only that field, then fix that exact field on the SAME metadata object
// (nothing else touched) and confirm it now registers -- A0/A1 above pair a
// complete object against a DIFFERENT, separately-broken one; this proves
// the same object recovers once its one defect is corrected.
const singleFieldBroken = completeSourceMetadata({ authorityToProvide: undefined });
const singleFieldBrokenResult = cap02.registerSource(singleFieldBroken);
check(
  "CAP02-A1B-SINGLE-FIELD-BROKEN-REFUSED",
  "Breaking exactly one required field (authorityToProvide) refuses registration and names only that field",
  singleFieldBrokenResult.status === "SOURCE_REGISTRATION_REFUSED"
    && singleFieldBrokenResult.refusalReasons.length === 1
    && singleFieldBrokenResult.refusalReasons[0] === "MISSING_FIELD:authorityToProvide"
    && singleFieldBrokenResult.sourceRecord === null,
  singleFieldBrokenResult
);

singleFieldBroken.authorityToProvide = "Synthetic Institutional Authorisation"; // fix the SAME object, nothing else touched
const singleFieldFixedResult = cap02.registerSource(singleFieldBroken);
check(
  "CAP02-A1C-SAME-FIELD-RESTORED-ON-SAME-OBJECT-REGISTERS",
  "Restoring the SAME field on the SAME metadata object -- no other field touched -- flips registration from refused to registered",
  singleFieldFixedResult.status === "SOURCE_REGISTERED"
    && singleFieldFixedResult.refusalReasons.length === 0
    && singleFieldFixedResult.status !== singleFieldBrokenResult.status,
  singleFieldFixedResult
);

// --- Part B: stage 2, preserve original ---
const preservationWithoutRegistration = cap02.preserveOriginal(missingTwoFields, { originalContent: "synthetic content" });
check(
  "CAP02-B0-PRESERVATION_REQUIRES_REGISTRATION",
  "Preservation is refused, naming SOURCE_NOT_REGISTERED, when the registration it would attach to was refused",
  preservationWithoutRegistration.status === "PRESERVATION_REFUSED"
    && preservationWithoutRegistration.refusalReasons.includes("SOURCE_NOT_REGISTERED")
    && preservationWithoutRegistration.preservedRecord === null,
  preservationWithoutRegistration
);

const preservationWithoutContent = cap02.preserveOriginal(completeRegistration, {});
check(
  "CAP02-B1-PRESERVATION_REQUIRES_ORIGINAL_MATERIAL",
  "Preservation is refused, naming ORIGINAL_MATERIAL_REQUIRED, when no original content is supplied even for a registered source",
  preservationWithoutContent.status === "PRESERVATION_REFUSED"
    && preservationWithoutContent.refusalReasons.includes("ORIGINAL_MATERIAL_REQUIRED")
    && preservationWithoutContent.preservedRecord === null,
  preservationWithoutContent
);

const contentA = "Synthetic archived trial record, version 1.";
const contentB = "Synthetic archived trial record, version 2 (different).";
const preservedA1 = cap02.preserveOriginal(completeRegistration, { originalContent: contentA, originalFileName: "record.csv" });
const preservedA2 = cap02.preserveOriginal(completeRegistration, { originalContent: contentA, originalFileName: "record.csv" });
const preservedB = cap02.preserveOriginal(completeRegistration, { originalContent: contentB, originalFileName: "record.csv" });

check(
  "CAP02-C0-HASH-IS-GENUINELY-CONTENT-DERIVED",
  "Identical original content preserved twice yields the identical content hash, and different content yields a different one -- proving the hash tracks content, not a counter",
  preservedA1.status === "ORIGINAL_PRESERVED"
    && preservedA1.preservedRecord.contentHash === preservedA2.preservedRecord.contentHash
    && preservedA1.preservedRecord.contentHash !== preservedB.preservedRecord.contentHash,
  { preservedA1, preservedA2, preservedB }
);

const expectedHashA = "sha256:" + crypto.createHash("sha256").update(contentA, "utf8").digest("hex");
check(
  "CAP02-C1-HASH-MATCHES-TRUSTED-SHA256-REFERENCE",
  "The embedded pure-JS SHA-256 used to preserve the original matches Node's own crypto SHA-256 over the identical content, byte for byte",
  preservedA1.preservedRecord.contentHash === expectedHashA,
  { computed: preservedA1.preservedRecord.contentHash, expected: expectedHashA }
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP02-SOURCE-ACQUISITION-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP02_SOURCE_ACQUISITION_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP02_SOURCE_ACQUISITION_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves stages 1-2 only of Historical Scientific Memory Recovery: a source cannot be registered without complete, named attribution, and original material cannot be preserved without a registered source, and its content hash is genuinely content-derived and matches a trusted independent SHA-256 implementation. It does not prove stage 3 extraction/classification (see CAP-04), format/unit interoperability mapping, legacy-system adapters, corpus-scale acquisition, scientific correctness, production readiness or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-02-SOURCE-ACQUISITION-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
