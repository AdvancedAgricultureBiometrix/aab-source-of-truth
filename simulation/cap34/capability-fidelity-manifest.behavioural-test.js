"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = __dirname;
const MANIFEST_PATH = path.join(ROOT, "capability-fidelity-manifest.json");
const VALIDATOR_PATH = path.join(ROOT, "CAP-34-Capability-Fidelity-Manifest-Validator.js");
const ROSTER_PATH = path.join(ROOT, "CAP-34-Authoritative-Capability-Identity-Roster.json");
const ROSTER_REGISTRY_PATH = path.join(ROOT, "CAP-34-Capability-Identity-Roster-Registry.json");
const EVIDENCE_PATH = path.join(ROOT, "CAP-34-Manifest-Validator-Behavioural-Proof.json");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
const rosterRegistry = JSON.parse(fs.readFileSync(ROSTER_REGISTRY_PATH, "utf8"));
const validatorSource = fs.readFileSync(VALIDATOR_PATH, "utf8");
const sandbox = { window: {}, TextEncoder };
vm.createContext(sandbox);
vm.runInContext(validatorSource, sandbox, { filename: path.basename(VALIDATOR_PATH) });
const validator = sandbox.window.AAB_CAP34_FIDELITY_MANIFEST;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function repin(candidate) {
  candidate.snapshotDigest = validator.computeSnapshotDigest(candidate.entries);
  return candidate;
}

function find(candidate, capabilityId, capabilityPart = "ROOT") {
  return candidate.entries.find((entry) =>
    entry.capabilityId === capabilityId && (entry.capabilityPart || "ROOT") === capabilityPart
  );
}

const fixtures = [
  {
    fixtureId: "HONEST_MANIFEST",
    expectedStatus: "PASS_CAP34_FIDELITY_MANIFEST_VALID",
    expectedErrors: [],
    build: () => copy(manifest)
  },
  {
    fixtureId: "MISSING_CAPABILITY_COUNT_UNCHANGED",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["CAPABILITY_COUNT_MISMATCH"],
    build: () => {
      const candidate = copy(manifest);
      candidate.entries = candidate.entries.filter((entry) => entry.capabilityId !== "CAP-12");
      return repin(candidate);
    }
  },
  {
    fixtureId: "MISSING_CAPABILITY_COUNT_ADJUSTED",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["MISSING_CANONICAL_IDENTITY:CAP-12:ROOT"],
    build: () => {
      const candidate = copy(manifest);
      candidate.entries = candidate.entries.filter((entry) => entry.capabilityId !== "CAP-12");
      candidate.capabilityCount = candidate.entries.length;
      return repin(candidate);
    }
  },
  {
    fixtureId: "DUPLICATE_CAPABILITY_IDENTITY",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["DUPLICATE_IDENTITY:CAP-01:ROOT"],
    build: () => {
      const candidate = copy(manifest);
      candidate.entries.push(copy(candidate.entries[0]));
      candidate.capabilityCount = candidate.entries.length;
      return repin(candidate);
    }
  },
  {
    fixtureId: "MISSING_REPRESENTATION_VERSION",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["REPRESENTATION_VERSION_REQUIRED:CAP-01:ROOT"],
    build: () => {
      const candidate = copy(manifest);
      delete find(candidate, "CAP-01").representationVersion;
      return repin(candidate);
    }
  },
  {
    fixtureId: "INVALID_FIDELITY_MODE_PAIRING",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["NOT_REPRESENTED_REQUIRES_NONE:CAP-01:ROOT"],
    build: () => {
      const candidate = copy(manifest);
      find(candidate, "CAP-01").simulatorMode = "LIVE_SIMULATION";
      return repin(candidate);
    }
  },
  {
    fixtureId: "REAL_LOGIC_WITHOUT_IMPLEMENTATION_EVIDENCE",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["REAL_REQUIRES_IMPLEMENTATION_REFERENCE:CAP-01:ROOT"],
    build: () => {
      const candidate = copy(manifest);
      const entry = find(candidate, "CAP-01");
      entry.fidelity = "REAL_LOGIC_SYNTHETIC_REFERENCE_DATA";
      entry.simulatorMode = "LIVE_SIMULATION";
      entry.implementationReferences = [];
      return repin(candidate);
    }
  },
  {
    fixtureId: "CAPABILITY_COUNT_MISMATCH",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["CAPABILITY_COUNT_MISMATCH"],
    build: () => {
      const candidate = copy(manifest);
      candidate.capabilityCount += 1;
      return candidate;
    }
  },
  {
    fixtureId: "CAP33_EXCEPTIONAL_BURDEN_WEAKENED",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["CAP33_EXCEPTIONAL_DISCLOSURE_REQUIRED"],
    build: () => {
      const candidate = copy(manifest);
      find(candidate, "CAP-33").disclosureBurden = "STANDARD";
      return repin(candidate);
    }
  },
  {
    fixtureId: "CAP14A_CAP14B_MERGED_SUBSTITUTION",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["CAP14_MERGED_IDENTITY_FORBIDDEN", "MISSING_CANONICAL_IDENTITY:CAP-14:A", "MISSING_CANONICAL_IDENTITY:CAP-14:B"],
    build: () => {
      const candidate = copy(manifest);
      candidate.entries = candidate.entries.filter((entry) => entry.capabilityId !== "CAP-14");
      const merged = copy(manifest.entries.find((entry) => entry.capabilityId === "CAP-14" && entry.capabilityPart === "A"));
      merged.capabilityPart = null;
      merged.capabilityName = "Merged CAP-14";
      candidate.entries.push(merged);
      candidate.capabilityCount = candidate.entries.length;
      return repin(candidate);
    }
  },
  {
    fixtureId: "RETIRED_CAP29_INSERTED",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["RETIRED_IDENTITY_PRESENT:CAP-29:ROOT"],
    build: () => {
      const candidate = copy(manifest);
      const entry = copy(candidate.entries[0]);
      entry.capabilityId = "CAP-29";
      entry.capabilityName = "Retired duplicate identity";
      candidate.entries.push(entry);
      candidate.capabilityCount = candidate.entries.length;
      return repin(candidate);
    }
  },
  {
    fixtureId: "AUTHORITATIVE_ROSTER_MISSING",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["AUTHORITATIVE_ROSTER_REQUIRED"],
    build: () => copy(manifest),
    buildRoster: () => null
  },
  {
    fixtureId: "ROSTER_CAPABILITY_REMOVED_AND_REPINNED",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["TRUSTED_ROSTER_DIGEST_MISMATCH", "ARCHIVED_ROSTER_DIGEST_MISMATCH"],
    build: () => copy(manifest),
    buildRoster: () => {
      const candidate = copy(roster);
      candidate.identities = candidate.identities.filter((entry) => entry.capabilityId !== "CAP-12");
      candidate.activeIdentityCount -= 1;
      candidate.identityCount -= 1;
      candidate.rosterDigest = validator.computeRosterDigest(candidate.identities);
      return candidate;
    }
  },
  {
    fixtureId: "ROSTER_AND_REGISTRY_COLLABORATIVE_SUBSTITUTION",
    expectedStatus: "FAIL_CLOSED_MANIFEST_INVALID",
    expectedErrors: ["TRUSTED_ROSTER_DIGEST_MISMATCH"],
    build: () => copy(manifest),
    buildRoster: () => {
      const candidate = copy(roster);
      candidate.identities = candidate.identities.filter((entry) => entry.capabilityId !== "CAP-12");
      candidate.activeIdentityCount -= 1;
      candidate.identityCount -= 1;
      candidate.rosterDigest = validator.computeRosterDigest(candidate.identities);
      return candidate;
    },
    buildRegistry: (candidateRoster) => {
      const candidate = copy(rosterRegistry);
      candidate.rosters[0].rosterDigest = candidateRoster.rosterDigest;
      return candidate;
    }
  }
];

const results = fixtures.map((fixture) => {
  const candidateRoster = fixture.buildRoster ? fixture.buildRoster() : copy(roster);
  const candidateRegistry = fixture.buildRegistry ? fixture.buildRegistry(candidateRoster) : copy(rosterRegistry);
  const actual = validator.validateManifest(fixture.build(), candidateRoster, candidateRegistry);
  const statusMatched = actual.status === fixture.expectedStatus;
  const errorsMatched = fixture.expectedErrors.every((error) => actual.errors.includes(error));
  return {
    fixtureId: fixture.fixtureId,
    expectedStatus: fixture.expectedStatus,
    actualStatus: actual.status,
    expectedErrors: fixture.expectedErrors,
    actualErrors: Array.from(actual.errors),
    passed: statusMatched && errorsMatched
  };
});

const allPassed = results.every((result) => result.passed);
const evidence = {
  proofId: "AAB-CAP34-MANIFEST-VALIDATOR-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed
    ? "PASS_CAP34_MANIFEST_VALIDATOR_BEHAVIOURAL_PROOF"
    : "FAIL_CLOSED_CAP34_MANIFEST_VALIDATOR_BEHAVIOURAL_PROOF",
  scope: "Proves only whether the validator detects the defined honest and corrupted manifest states. It does not prove AAB completeness, CAP-34 completion, production readiness, WA commissioning, Gate D satisfaction, or WP05 commencement.",
  validator: {
    file: path.basename(VALIDATOR_PATH),
    validatorId: validator.validatorId,
    declaredValidatorVersion: validator.validatorVersion,
    sha256: crypto.createHash("sha256").update(validatorSource).digest("hex")
  },
  manifest: {
    file: path.basename(MANIFEST_PATH),
    manifestId: manifest.manifestId,
    manifestVersion: manifest.manifestVersion,
    manifestSnapshotId: manifest.manifestSnapshotId,
    snapshotDigest: manifest.snapshotDigest,
    capabilityCount: manifest.capabilityCount
  },
  authoritativeRoster: {
    file: path.basename(ROSTER_PATH),
    registryFile: path.basename(ROSTER_REGISTRY_PATH),
    rosterId: roster.rosterId,
    rosterVersion: roster.rosterVersion,
    rosterSnapshotId: roster.rosterSnapshotId,
    rosterDigest: roster.rosterDigest,
    sourceCommitSha: roster.sourceCommitSha,
    sourceBlobSha: roster.sourceBlobSha,
    activeIdentityCount: roster.activeIdentityCount,
    retiredIdentityCount: roster.retiredIdentityCount
  },
  summary: {
    fixtureCount: results.length,
    passedFixtureCount: results.filter((result) => result.passed).length,
    failedFixtureCount: results.filter((result) => !result.passed).length
  },
  fixtures: results
};

fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
process.stdout.write(JSON.stringify(evidence, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
