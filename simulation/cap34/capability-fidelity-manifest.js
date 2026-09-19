(function () {
  "use strict";
  const FIDELITY = Object.freeze({
    REAL: "REAL_LOGIC_SYNTHETIC_REFERENCE_DATA",
    PARTIAL: "PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN",
    PREVIEW: "CONCEPT_PREVIEW_NOT_IMPLEMENTED",
    NONE: "NOT_YET_REPRESENTED"
  });
  const MODE = Object.freeze({ LIVE: "LIVE_SIMULATION", PREVIEW: "ROADMAP_PREVIEW", NONE: "NONE" });

  function validateManifest(m) {
    const errors = [];
    if (!m || !Array.isArray(m.entries)) errors.push("MANIFEST_ENTRIES_REQUIRED");
    if (!m || !m.manifestSnapshotId) errors.push("SNAPSHOT_ID_REQUIRED");
    if (!m || !m.manifestVersion) errors.push("MANIFEST_VERSION_REQUIRED");
    if (errors.length) return Object.freeze({status:"FAIL_CLOSED_MANIFEST_INVALID",errors});

    const identities = new Set();
    for (const e of m.entries) {
      const identity = e.capabilityId + ":" + (e.capabilityPart || "ROOT");
      if (identities.has(identity)) errors.push("DUPLICATE_IDENTITY:"+identity);
      identities.add(identity);
      if (!e.representationVersion) errors.push("REPRESENTATION_VERSION_REQUIRED:"+identity);
      if (!Object.values(FIDELITY).includes(e.fidelity)) errors.push("INVALID_FIDELITY:"+identity);
      if (!Object.values(MODE).includes(e.simulatorMode)) errors.push("INVALID_MODE:"+identity);
      if (e.fidelity===FIDELITY.REAL && e.simulatorMode!==MODE.LIVE) errors.push("REAL_REQUIRES_LIVE:"+identity);
      if (e.fidelity===FIDELITY.PREVIEW && e.simulatorMode!==MODE.PREVIEW) errors.push("PREVIEW_REQUIRES_PREVIEW_MODE:"+identity);
      if (e.fidelity===FIDELITY.NONE && e.simulatorMode!==MODE.NONE) errors.push("NOT_REPRESENTED_REQUIRES_NONE:"+identity);
      if (e.fidelity===FIDELITY.REAL && (!e.implementationReferences || !e.implementationReferences.length)) errors.push("REAL_REQUIRES_IMPLEMENTATION_REFERENCE:"+identity);
      if (e.simulatorMode===MODE.PREVIEW && (!e.limitations?.length || !e.nonImplications?.length)) errors.push("PREVIEW_DISCLOSURE_REQUIRED:"+identity);
      if (e.capabilityId==="CAP-33" && e.disclosureBurden!=="EXCEPTIONAL") errors.push("CAP33_EXCEPTIONAL_DISCLOSURE_REQUIRED");
    }
    if (m.capabilityCount !== m.entries.length) errors.push("CAPABILITY_COUNT_MISMATCH");
    return Object.freeze({
      status: errors.length ? "FAIL_CLOSED_MANIFEST_INVALID" : "PASS_CAP34_FIDELITY_MANIFEST_VALID",
      manifestSnapshotId:m.manifestSnapshotId,
      manifestVersion:m.manifestVersion,
      capabilityCount:m.entries.length,
      errors
    });
  }

  window.AAB_CAP34_FIDELITY_MANIFEST = Object.freeze({FIDELITY,MODE,validateManifest});
}());
