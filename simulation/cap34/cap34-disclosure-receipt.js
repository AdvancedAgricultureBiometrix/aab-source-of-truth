(function () {
  "use strict";

  const VALIDATOR_ID = "AAB-CAP34-CANONICAL-DISCLOSURE-RECEIPT-VALIDATOR";
  const VALIDATOR_VERSION = "2.7.0";
  const RECEIPT_CONTRACT_VERSION = "1.0.0";
  const PASS = "PASS_CAP34_DISCLOSURE_RECEIPT_VALID";
  const FAIL = "FAIL_CLOSED_DISCLOSURE_RECEIPT_INVALID";
  const AUTHORITY = "DISCLOSURE_ACKNOWLEDGEMENT_ONLY_NO_LEGAL_COMMERCIAL_SCIENTIFIC_REGULATORY_PRODUCTION_OR_COMMISSIONING_AUTHORITY";
  const SNAPSHOT_REGISTRY_ID = "AAB-CAP34-FIDELITY-MANIFEST-SNAPSHOT-REGISTRY";
  const TRUSTED_SNAPSHOTS = Object.freeze({
    "CAP34-MANIFEST-2026-09-19-SNAPSHOT-001": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.0.0",
      snapshotDigest: "sha256:d19bffe23c8d928882582593463109e5f1a3778475f9f1ae410498fc3e32befe"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-002": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.1.0",
      snapshotDigest: "sha256:8fc10b3a71135efa88e192a1ee92ef0c510941eb8023069fb7707f27b984e4f4"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-003": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.2.0",
      snapshotDigest: "sha256:55cf137bcd3f38c2d1675e90f77d31a74e712ca6af873360b5e40388e438e19e"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-004": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.3.0",
      snapshotDigest: "sha256:6e97c0e9a3de649234bd003d48cae50ccfe91b6620ea64c94c1d784a87e38064"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-005": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.4.0",
      snapshotDigest: "sha256:e6b3f86112ead6a4ed1d7ab4df9dc620f55527330c4374f02d317b1ad32486eb"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-006": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.5.0",
      snapshotDigest: "sha256:8edeafee3826f89a4feea4a4713037ac27e8bdc623ae41fead57a7f9945e1ca1"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-007": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.6.0",
      snapshotDigest: "sha256:94eb64ca7ba19e8c5e61e03f29fc3d7f20cc467ed8aed5ae22fe68a250bd252e"
    }),
    "CAP34-MANIFEST-2026-09-20-SNAPSHOT-008": Object.freeze({
      manifestId: "AAB-CAP34-FIDELITY-MANIFEST",
      manifestVersion: "1.7.0",
      snapshotDigest: "sha256:ee929e7df04671d8d2c843fbba73e0a2c61aa0b854919e93fdd57bd23d3d4934"
    })
  });

  function identityOf(value) {
    return value.capabilityId + ":" + (value.capabilityPart || "ROOT");
  }

  function sameValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function resolveSnapshot(registry, snapshotId, errors) {
    if (!registry || registry.registryId !== SNAPSHOT_REGISTRY_ID || registry.appendOnly !== true || !Array.isArray(registry.snapshots)) {
      errors.push("VALID_APPEND_ONLY_SNAPSHOT_REGISTRY_REQUIRED");
      return null;
    }
    const seen = new Set();
    for (const entry of registry.snapshots) {
      if (seen.has(entry.manifestSnapshotId)) errors.push("DUPLICATE_ARCHIVED_SNAPSHOT:" + entry.manifestSnapshotId);
      seen.add(entry.manifestSnapshotId);
      if (!/^sha256:[0-9a-f]{64}$/.test(entry.snapshotDigest || "")) errors.push("INVALID_ARCHIVED_SNAPSHOT_DIGEST:" + entry.manifestSnapshotId);
    }
    const matches = registry.snapshots.filter((entry) => entry.manifestSnapshotId === snapshotId);
    if (matches.length === 0) errors.push("SNAPSHOT_NOT_ARCHIVED:" + snapshotId);
    if (matches.length !== 1) return null;
    const trusted = TRUSTED_SNAPSHOTS[snapshotId];
    if (!trusted) errors.push("UNTRUSTED_ARCHIVED_SNAPSHOT:" + snapshotId);
    else for (const field of ["manifestId", "manifestVersion", "snapshotDigest"]) {
      if (matches[0][field] !== trusted[field]) errors.push("TRUSTED_ARCHIVED_SNAPSHOT_MISMATCH:" + field);
    }
    return matches[0];
  }

  function validateDisclosureReceipt(receipt, manifest, snapshotRegistry, roster, rosterRegistry) {
    const errors = [];
    const manifestApi = window.AAB_CAP34_FIDELITY_MANIFEST;
    if (!receipt || !manifest) return Object.freeze({status: FAIL, validatorId: VALIDATOR_ID, validatorVersion: VALIDATOR_VERSION, errors: ["RECEIPT_AND_MANIFEST_REQUIRED"]});
    if (!manifestApi || typeof manifestApi.validateManifest !== "function") return Object.freeze({status: FAIL, validatorId: VALIDATOR_ID, validatorVersion: VALIDATOR_VERSION, errors: ["MANIFEST_VALIDATOR_REQUIRED"]});

    const manifestResult = manifestApi.validateManifest(manifest, roster, rosterRegistry);
    if (manifestResult.status !== "PASS_CAP34_FIDELITY_MANIFEST_VALID") errors.push("MANIFEST_MUST_VALIDATE", ...manifestResult.errors);
    const archived = resolveSnapshot(snapshotRegistry, receipt.manifestSnapshotId, errors);
    if (archived) {
      if (receipt.manifestVersion !== archived.manifestVersion) errors.push("RECEIPT_ARCHIVE_MISMATCH:manifestVersion");
      for (const field of ["manifestId", "manifestVersion", "manifestSnapshotId", "snapshotDigest"]) {
        if (manifest[field] !== archived[field]) errors.push("MANIFEST_ARCHIVE_MISMATCH:" + field);
      }
    }

    if (receipt.receiptContractVersion !== RECEIPT_CONTRACT_VERSION) errors.push("UNSUPPORTED_RECEIPT_CONTRACT_VERSION");
    if (receipt.authority !== AUTHORITY) errors.push("INVALID_RECEIPT_AUTHORITY");
    if (receipt.manifestSnapshotId !== manifest.manifestSnapshotId) errors.push("MANIFEST_SNAPSHOT_MISMATCH");
    if (receipt.manifestVersion !== manifest.manifestVersion) errors.push("MANIFEST_VERSION_MISMATCH");
    if (receipt.manifestSourceReference !== manifest.sourceLandscapeReference) errors.push("MANIFEST_SOURCE_REFERENCE_MISMATCH");
    if (!receipt.receiptId) errors.push("RECEIPT_ID_REQUIRED");
    if (!receipt.createdAt || Number.isNaN(Date.parse(receipt.createdAt))) errors.push("VALID_CREATED_AT_REQUIRED");
    if (!receipt.correlationId) errors.push("CORRELATION_ID_REQUIRED");
    if (!receipt.evaluator || (!receipt.evaluator.displayName && !receipt.evaluator.evaluatorReferenceId)) errors.push("EVALUATOR_REFERENCE_REQUIRED");
    if (!receipt.evaluator || !receipt.evaluator.role) errors.push("EVALUATOR_ROLE_REQUIRED");
    if (!Array.isArray(receipt.capabilitiesPresented) || !receipt.capabilitiesPresented.length) errors.push("CAPABILITIES_PRESENTED_REQUIRED");

    const manifestMap = new Map((manifest.entries || []).map((entry) => [identityOf(entry), entry]));
    const shown = new Set();
    for (const presented of receipt.capabilitiesPresented || []) {
      const id = identityOf(presented);
      if (shown.has(id)) errors.push("DUPLICATE_PRESENTED_CAPABILITY:" + id);
      shown.add(id);
      const expected = manifestMap.get(id);
      if (!expected) {
        errors.push("CAPABILITY_NOT_IN_MANIFEST:" + id);
        continue;
      }
      if (expected.fidelity === "NOT_YET_REPRESENTED" || expected.simulatorMode === "NONE") errors.push("UNREPRESENTED_CAPABILITY_CANNOT_BE_SHOWN:" + id);
      if (presented.capabilityName !== expected.capabilityName) errors.push("CAPABILITY_NAME_MISMATCH:" + id);
      if (presented.representationVersion !== expected.representationVersion) errors.push("REPRESENTATION_VERSION_MISMATCH:" + id);
      if (presented.simulatorMode !== expected.simulatorMode) errors.push("SIMULATOR_MODE_MISMATCH:" + id);
      if (presented.fidelity !== expected.fidelity) errors.push("FIDELITY_MISMATCH:" + id);
      if (presented.manifestDisclosureBurden !== expected.disclosureBurden) errors.push("DISCLOSURE_BURDEN_MISMATCH:" + id);
      if (!Array.isArray(presented.limitationsPresented) || !presented.limitationsPresented.length) errors.push("LIMITATIONS_REQUIRED:" + id);
      else if (!sameValue(presented.limitationsPresented, expected.limitations)) errors.push("LIMITATIONS_MISMATCH:" + id);
      if (!Array.isArray(presented.nonImplicationsPresented) || !presented.nonImplicationsPresented.length) errors.push("NON_IMPLICATIONS_REQUIRED:" + id);
      else if (!sameValue(presented.nonImplicationsPresented, expected.nonImplications)) errors.push("NON_IMPLICATIONS_MISMATCH:" + id);
    }

    const preview = receipt.roadmapPreview || {};
    const acknowledgement = receipt.acknowledgement || {};
    if (preview.entered === true) {
      if (!preview.previewVersion) errors.push("ROADMAP_PREVIEW_VERSION_REQUIRED");
      if (!preview.enteredAt) errors.push("ROADMAP_PREVIEW_ENTERED_AT_REQUIRED");
      if (!Array.isArray(preview.capabilitiesEntered) || !preview.capabilitiesEntered.length) errors.push("ROADMAP_PREVIEW_CAPABILITIES_REQUIRED");
      if (acknowledgement.accepted !== true) errors.push("ROADMAP_ACKNOWLEDGEMENT_REQUIRED");
      if (!acknowledgement.wordingVersion || !acknowledgement.wording || !acknowledgement.acceptedAt) errors.push("ACKNOWLEDGEMENT_DETAILS_REQUIRED");
      for (const capability of preview.capabilitiesEntered || []) {
        const id = identityOf(capability);
        const expected = manifestMap.get(id);
        if (!expected) errors.push("ROADMAP_CAPABILITY_NOT_IN_MANIFEST:" + id);
        else if (expected.simulatorMode !== "ROADMAP_PREVIEW" || expected.fidelity !== "CONCEPT_PREVIEW_NOT_IMPLEMENTED") errors.push("ROADMAP_CAPABILITY_NOT_CLASSIFIED_PREVIEW:" + id);
        if (!shown.has(id)) errors.push("ROADMAP_CAPABILITY_NOT_RECORDED_AS_PRESENTED:" + id);
      }
    }
    if (preview.entered !== true && (preview.capabilitiesEntered || []).length) errors.push("ROADMAP_CAPABILITIES_WITHOUT_ENTRY");
    if (acknowledgement.accepted !== true) errors.push("ACKNOWLEDGEMENT_NOT_ACCEPTED");

    return Object.freeze({
      status: errors.length ? FAIL : PASS,
      validatorId: VALIDATOR_ID,
      validatorVersion: VALIDATOR_VERSION,
      receiptId: receipt.receiptId || null,
      manifestSnapshotId: receipt.manifestSnapshotId || null,
      capabilityCountPresented: Array.isArray(receipt.capabilitiesPresented) ? receipt.capabilitiesPresented.length : 0,
      errors
    });
  }

  window.AAB_CAP34_DISCLOSURE_RECEIPT = Object.freeze({
    validatorId: VALIDATOR_ID,
    validatorVersion: VALIDATOR_VERSION,
    receiptContractVersion: RECEIPT_CONTRACT_VERSION,
    trustedSnapshots: TRUSTED_SNAPSHOTS,
    PASS,
    FAIL,
    validateDisclosureReceipt
  });
}());
