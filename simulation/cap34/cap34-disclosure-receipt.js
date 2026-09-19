(function () {
  "use strict";

  function identityOf(e) {
    return e.capabilityId + ":" + (e.capabilityPart || "ROOT");
  }

  function validateDisclosureReceipt(receipt, manifest) {
    const errors = [];

    if (!receipt || !manifest) {
      return Object.freeze({status:"FAIL_CLOSED_DISCLOSURE_RECEIPT_INVALID",errors:["RECEIPT_AND_MANIFEST_REQUIRED"]});
    }

    if (receipt.receiptContractVersion !== "1.0.0") errors.push("UNSUPPORTED_RECEIPT_CONTRACT_VERSION");
    if (receipt.authority !== "DISCLOSURE_ACKNOWLEDGEMENT_ONLY_NO_LEGAL_COMMERCIAL_SCIENTIFIC_REGULATORY_PRODUCTION_OR_COMMISSIONING_AUTHORITY") errors.push("INVALID_RECEIPT_AUTHORITY");
    if (receipt.manifestSnapshotId !== manifest.manifestSnapshotId) errors.push("MANIFEST_SNAPSHOT_MISMATCH");
    if (receipt.manifestVersion !== manifest.manifestVersion) errors.push("MANIFEST_VERSION_MISMATCH");
    if (!receipt.receiptId) errors.push("RECEIPT_ID_REQUIRED");
    if (!receipt.createdAt) errors.push("CREATED_AT_REQUIRED");
    if (!receipt.correlationId) errors.push("CORRELATION_ID_REQUIRED");
    if (!receipt.evaluator || (!receipt.evaluator.displayName && !receipt.evaluator.evaluatorReferenceId)) errors.push("EVALUATOR_REFERENCE_REQUIRED");
    if (!receipt.evaluator || !receipt.evaluator.role) errors.push("EVALUATOR_ROLE_REQUIRED");
    if (!Array.isArray(receipt.capabilitiesPresented) || !receipt.capabilitiesPresented.length) errors.push("CAPABILITIES_PRESENTED_REQUIRED");

    const manifestMap = new Map((manifest.entries || []).map(e => [identityOf(e), e]));
    const shown = new Set();

    for (const p of (receipt.capabilitiesPresented || [])) {
      const id = identityOf(p);
      if (shown.has(id)) errors.push("DUPLICATE_PRESENTED_CAPABILITY:"+id);
      shown.add(id);

      const m = manifestMap.get(id);
      if (!m) {
        errors.push("CAPABILITY_NOT_IN_MANIFEST:"+id);
        continue;
      }
      if (m.fidelity === "NOT_YET_REPRESENTED" || m.simulatorMode === "NONE") errors.push("UNREPRESENTED_CAPABILITY_CANNOT_BE_SHOWN:"+id);
      if (p.capabilityName !== m.capabilityName) errors.push("CAPABILITY_NAME_MISMATCH:"+id);
      if (p.representationVersion !== m.representationVersion) errors.push("REPRESENTATION_VERSION_MISMATCH:"+id);
      if (p.simulatorMode !== m.simulatorMode) errors.push("SIMULATOR_MODE_MISMATCH:"+id);
      if (p.fidelity !== m.fidelity) errors.push("FIDELITY_MISMATCH:"+id);
      if (p.manifestDisclosureBurden !== m.disclosureBurden) errors.push("DISCLOSURE_BURDEN_MISMATCH:"+id);
      if (!Array.isArray(p.limitationsPresented) || !p.limitationsPresented.length) errors.push("LIMITATIONS_REQUIRED:"+id);
      if (!Array.isArray(p.nonImplicationsPresented) || !p.nonImplicationsPresented.length) errors.push("NON_IMPLICATIONS_REQUIRED:"+id);
    }

    const rp = receipt.roadmapPreview || {};
    const ack = receipt.acknowledgement || {};

    if (rp.entered === true) {
      if (!rp.previewVersion) errors.push("ROADMAP_PREVIEW_VERSION_REQUIRED");
      if (!rp.enteredAt) errors.push("ROADMAP_PREVIEW_ENTERED_AT_REQUIRED");
      if (!Array.isArray(rp.capabilitiesEntered) || !rp.capabilitiesEntered.length) errors.push("ROADMAP_PREVIEW_CAPABILITIES_REQUIRED");
      if (ack.accepted !== true) errors.push("ROADMAP_ACKNOWLEDGEMENT_REQUIRED");
      if (!ack.wordingVersion || !ack.wording || !ack.acceptedAt) errors.push("ACKNOWLEDGEMENT_DETAILS_REQUIRED");

      for (const c of (rp.capabilitiesEntered || [])) {
        const id = identityOf(c);
        const m = manifestMap.get(id);
        if (!m) errors.push("ROADMAP_CAPABILITY_NOT_IN_MANIFEST:"+id);
        else if (m.simulatorMode !== "ROADMAP_PREVIEW" || m.fidelity !== "CONCEPT_PREVIEW_NOT_IMPLEMENTED") {
          errors.push("ROADMAP_CAPABILITY_NOT_CLASSIFIED_PREVIEW:"+id);
        }
        if (!shown.has(id)) errors.push("ROADMAP_CAPABILITY_NOT_RECORDED_AS_PRESENTED:"+id);
      }
    }

    if (rp.entered !== true && (rp.capabilitiesEntered || []).length) errors.push("ROADMAP_CAPABILITIES_WITHOUT_ENTRY");
    if (ack.accepted !== true) errors.push("ACKNOWLEDGEMENT_NOT_ACCEPTED");

    return Object.freeze({
      status: errors.length ? "FAIL_CLOSED_DISCLOSURE_RECEIPT_INVALID" : "PASS_CAP34_DISCLOSURE_RECEIPT_VALID",
      receiptId: receipt.receiptId || null,
      manifestSnapshotId: receipt.manifestSnapshotId || null,
      capabilityCountPresented: Array.isArray(receipt.capabilitiesPresented) ? receipt.capabilitiesPresented.length : 0,
      errors
    });
  }

  window.AAB_CAP34_DISCLOSURE_RECEIPT = Object.freeze({validateDisclosureReceipt});
}());
