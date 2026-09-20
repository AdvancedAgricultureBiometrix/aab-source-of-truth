"use strict";

/**
 * CAP-34 historical snapshot validity regression.
 *
 * "Evidence belongs to the state that produced it": a receipt built against
 * an archived manifest snapshot must still validate against that snapshot
 * years and several manifest generations later, and must be rejected the
 * moment it is checked against any OTHER snapshot. This was previously only
 * verified by hand after each manifest/validator upgrade. This file makes
 * that check standing and automatic: it walks every entry currently in
 * capability-fidelity-manifest-snapshot-registry.json, so it scales to
 * snapshot-004, 005, ... without needing to be rewritten each time a new
 * capability is wired in.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const read = (name) => fs.readFileSync(path.join(ROOT, name), "utf8");
const json = (name) => JSON.parse(read(name));

const roster = json("capability-identity-roster.json");
const rosterRegistry = json("capability-identity-roster-registry.json");
const registry = json("capability-fidelity-manifest-snapshot-registry.json");

const sandbox = { window: {}, TextEncoder };
vm.createContext(sandbox);
vm.runInContext(read("capability-fidelity-manifest.js"), sandbox);
vm.runInContext(read("cap34-disclosure-receipt.js"), sandbox);
const manifestApi = sandbox.window.AAB_CAP34_FIDELITY_MANIFEST;
const receiptApi = sandbox.window.AAB_CAP34_DISCLOSURE_RECEIPT;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function entryOf(manifest, capabilityId, capabilityPart) {
  return manifest.entries.find((e) => e.capabilityId === capabilityId && (e.capabilityPart || "ROOT") === (capabilityPart || "ROOT"));
}

function presented(entry) {
  return {
    capabilityId: entry.capabilityId,
    capabilityPart: entry.capabilityPart,
    capabilityName: entry.capabilityName,
    representationVersion: entry.representationVersion,
    simulatorMode: entry.simulatorMode,
    fidelity: entry.fidelity,
    manifestDisclosureBurden: entry.disclosureBurden,
    limitationsPresented: copy(entry.limitations),
    nonImplicationsPresented: copy(entry.nonImplications)
  };
}

function baseReceipt(manifest, entry) {
  return {
    receiptId: "CAP34-HISTORICAL-VALIDITY-RECEIPT-" + manifest.manifestSnapshotId,
    receiptContractVersion: "1.0.0",
    createdAt: "2026-09-20T00:00:00.000Z",
    correlationId: "CAP34-HISTORICAL-VALIDITY-" + manifest.manifestSnapshotId,
    authority: "DISCLOSURE_ACKNOWLEDGEMENT_ONLY_NO_LEGAL_COMMERCIAL_SCIENTIFIC_REGULATORY_PRODUCTION_OR_COMMISSIONING_AUTHORITY",
    manifestSnapshotId: manifest.manifestSnapshotId,
    manifestVersion: manifest.manifestVersion,
    manifestSourceReference: manifest.sourceLandscapeReference,
    evaluator: { displayName: "Synthetic evaluator", evaluatorReferenceId: null, role: "GOVERNMENT_EVALUATOR", organisation: "Synthetic organisation" },
    capabilitiesPresented: [presented(entry)],
    roadmapPreview: { entered: false, previewVersion: null, enteredAt: null, capabilitiesEntered: [] },
    acknowledgement: { wordingVersion: "CAP34-ROADMAP-ACK-1.0.0", wording: "I understand that Roadmap Preview is planned capability and is not evidence of implementation or readiness.", accepted: true, acceptedAt: "2026-09-20T00:00:00.000Z" },
    receiptDigest: null,
    signature: null
  };
}

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

if (registry.snapshots.length < 2) {
  throw new Error("Expected at least 2 archived snapshots to prove cross-generation validity; registry has fewer. This test needs a real multi-generation registry to mean anything.");
}

const loadedSnapshots = registry.snapshots.map((entry) => ({
  registryEntry: entry,
  manifest: json(entry.archivedManifestReference)
}));

// Every archived snapshot must still structurally validate on its own,
// and a receipt built against it -- using ITS OWN represented CAP-34 entry,
// since CAP-34 is present in every generation -- must still pass when
// checked against the live, growing registry.
for (const { registryEntry, manifest } of loadedSnapshots) {
  const manifestResult = manifestApi.validateManifest(manifest, roster, rosterRegistry);
  check(
    "HIST-" + registryEntry.manifestSnapshotId + "-MANIFEST-STILL-VALID",
    "Archived snapshot " + registryEntry.manifestSnapshotId + " (" + registryEntry.archivedManifestReference + ") still validates structurally",
    manifestResult.status === "PASS_CAP34_FIDELITY_MANIFEST_VALID",
    manifestResult
  );

  const cap34Entry = entryOf(manifest, "CAP-34");
  const receipt = baseReceipt(manifest, cap34Entry);
  const receiptResult = receiptApi.validateDisclosureReceipt(receipt, manifest, registry, roster, rosterRegistry);
  check(
    "HIST-" + registryEntry.manifestSnapshotId + "-RECEIPT-STILL-VALID",
    "A receipt built against archived snapshot " + registryEntry.manifestSnapshotId + " still validates against the CURRENT (" + loadedSnapshots.length + "-generation) registry",
    receiptResult.status === receiptApi.PASS,
    receiptResult
  );

  // Cross-snapshot rejection: the same receipt, but paired with every OTHER
  // snapshot's manifest instead of its own, must fail closed.
  for (const other of loadedSnapshots) {
    if (other.registryEntry.manifestSnapshotId === registryEntry.manifestSnapshotId) continue;
    const wrongManifest = other.manifest;
    const crossResult = receiptApi.validateDisclosureReceipt(receipt, wrongManifest, registry, roster, rosterRegistry);
    check(
      "HIST-" + registryEntry.manifestSnapshotId + "-REJECTED-AGAINST-" + other.registryEntry.manifestSnapshotId,
      "A receipt built for " + registryEntry.manifestSnapshotId + " fails closed when evaluated against " + other.registryEntry.manifestSnapshotId + " instead",
      crossResult.status === receiptApi.FAIL && crossResult.errors.includes("MANIFEST_SNAPSHOT_MISMATCH"),
      crossResult
    );
  }
}

// The registry itself must remain append-only and every entry's digest must
// match TRUSTED_SNAPSHOTS exactly -- this is what resolveSnapshot() enforces
// internally, exercised here across every real archived generation at once.
const trustedCoverageGaps = registry.snapshots.filter((entry) => !receiptApi.trustedSnapshots[entry.manifestSnapshotId]);
check(
  "HIST-ALL-ARCHIVED-SNAPSHOTS-ARE-TRUSTED",
  "Every snapshot in the registry has a corresponding TRUSTED_SNAPSHOTS entry in the validator",
  trustedCoverageGaps.length === 0,
  { trustedCoverageGaps }
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-HISTORICAL-SNAPSHOT-VALIDITY-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP34_HISTORICAL_SNAPSHOT_VALIDITY_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP34_HISTORICAL_SNAPSHOT_VALIDITY_BEHAVIOURAL_PROOF",
  scope: "Proves that every archived manifest snapshot currently in the registry still validates structurally, that a receipt built against each one still validates against the current multi-generation registry, and that the same receipt is rejected against every other snapshot. Runs generically over whatever is in the registry, so it automatically covers new snapshots added by future capability wiring without modification. It does not prove capability implementation, scientific correctness, production readiness or commissioning.",
  generationsChecked: loadedSnapshots.length,
  snapshotIdsChecked: loadedSnapshots.map((s) => s.registryEntry.manifestSnapshotId),
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "governance", "workstream-b", "CAP-34-HISTORICAL-SNAPSHOT-VALIDITY-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
