(function () {
  "use strict";

  /**
   * CAP-04 (Governed Scientific Memory) live-simulation evaluator --
   * Historical Scientific Memory Recovery, stage 3 only (extract and
   * classify cautiously), plus the structural eligibility boundary that
   * stage 3 output must never cross on its own.
   *
   * Consumes CAP-02's REAL preserved-source output (see
   * cap04-scientific-memory.behavioural-test.js), not hand-written stand-in
   * fixtures -- extraction is refused if the original was never preserved.
   *
   * The single most important property of this file: extractAndClassify()
   * can NEVER produce a record that isEligibleForScientificMemory() accepts.
   * Every extraction outcome -- clean, conflicting or quarantined -- is
   * labelled governanceState "EXTRACTED_UNREVIEWED". Eligibility requires a
   * structurally distinct shape (governanceState "ADMITTED_SCIENTIFIC_MEMORY"
   * plus a genuine reviewGate: passed, decision "ADMIT", a named reviewer)
   * that only a stage-7 human-review admission decision can produce -- stage
   * 7 itself is out of scope for this build and is not implemented here.
   * This is the CAP-04 equivalent of CAP-09's CONTRADICTING_EVIDENCE_PRESENT
   * test: if this boundary is not real, the whole pathway is dishonest
   * regardless of how clean the extraction logic looks.
   */

  const CAPABILITY_ID = "CAP-04";
  const CAPABILITY_NAME = "Governed Scientific Memory";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";

  const VALID_OUTCOME_POLARITIES = Object.freeze(["POSITIVE", "NEGATIVE", "INCONCLUSIVE"]);

  function freshReviewGate() {
    return Object.freeze({ required: true, passed: false, reviewerId: null, decision: null });
  }

  // Stage 3: extract and classify cautiously. Never invents missing detail,
  // never silently repairs a conflict, and never treats a negative or null
  // result differently from a positive one at this stage -- all three route
  // through the identical status vocabulary below, driven only by what was
  // actually supplied.
  function extractAndClassify(preservedSource, rawExtraction, priorExtractedRecords) {
    const prior = Array.isArray(priorExtractedRecords) ? priorExtractedRecords : [];

    if (!preservedSource || preservedSource.status !== "ORIGINAL_PRESERVED" || !preservedSource.preservedRecord) {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "EXTRACTION_REFUSED",
        refusalReasons: Object.freeze(["ORIGINAL_NOT_PRESERVED"]),
        explanation: "Extraction refused: material cannot be extracted or classified before the original has been preserved with an immutable hash.",
        extractedRecord: null
      });
    }

    const raw = rawExtraction || {};
    const quarantineReasons = [];
    if (!raw.subjectKey) quarantineReasons.push("MISSING_SUBJECT");
    if (!raw.dateObserved) quarantineReasons.push("MISSING_DATE_OBSERVED");
    if (!raw.unit) quarantineReasons.push("UNKNOWN_UNIT");
    if (!raw.outcomePolarity || !VALID_OUTCOME_POLARITIES.includes(raw.outcomePolarity)) quarantineReasons.push("MISSING_OUTCOME_POLARITY");
    if (raw.measuredValue !== null && raw.measuredValue !== undefined && typeof raw.measuredValue !== "number") quarantineReasons.push("INVALID_MEASURED_VALUE");

    const recordId = "EXT-" + preservedSource.preservedRecord.fileId + "-" + String(raw.subjectKey || "UNKNOWN") + "-" + String(raw.treatmentLabel || "UNKNOWN");
    const baseFields = {
      recordId,
      sourceId: preservedSource.preservedRecord.sourceId,
      fileId: preservedSource.preservedRecord.fileId,
      subjectKey: raw.subjectKey || null,
      treatmentLabel: raw.treatmentLabel || null,
      location: raw.location || null,
      unit: raw.unit || null,
      dateObserved: raw.dateObserved || null,
      measuredValue: typeof raw.measuredValue === "number" ? raw.measuredValue : null,
      outcomePolarity: raw.outcomePolarity || null,
      governanceState: "EXTRACTED_UNREVIEWED",
      reviewGate: freshReviewGate()
    };

    if (quarantineReasons.length > 0) {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "EXTRACTION_COMPLETE",
        extractedRecord: Object.freeze(Object.assign({}, baseFields, {
          recordStatus: "QUARANTINED",
          quarantineReasons: Object.freeze(quarantineReasons),
          conflictingRecordIds: Object.freeze([])
        }))
      });
    }

    // Conflict is a categorical disagreement between two records that both
    // describe the same subject, treatment and location: this AAB does not
    // silently pick a value, it preserves the disagreement for review.
    const conflicts = prior.filter((candidate) => candidate
      && candidate.recordStatus !== "QUARANTINED"
      && candidate.subjectKey === raw.subjectKey
      && candidate.treatmentLabel === raw.treatmentLabel
      && candidate.location === raw.location
      && candidate.outcomePolarity !== raw.outcomePolarity);

    if (conflicts.length > 0) {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "EXTRACTION_COMPLETE",
        extractedRecord: Object.freeze(Object.assign({}, baseFields, {
          recordStatus: "FLAGGED_CONFLICT",
          quarantineReasons: Object.freeze([]),
          conflictingRecordIds: Object.freeze(conflicts.map((candidate) => candidate.recordId))
        }))
      });
    }

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      status: "EXTRACTION_COMPLETE",
      extractedRecord: Object.freeze(Object.assign({}, baseFields, {
        recordStatus: "PENDING_REVIEW",
        quarantineReasons: Object.freeze([]),
        conflictingRecordIds: Object.freeze([])
      }))
    });
  }

  // The structural boundary. Deliberately checks the full admission shape,
  // not a single label, so a record cannot be waved through by setting one
  // string field: it must carry a passed review gate with an explicit
  // ADMIT decision and a named human reviewer.
  function isEligibleForScientificMemory(record) {
    return !!record
      && record.governanceState === "ADMITTED_SCIENTIFIC_MEMORY"
      && !!record.reviewGate
      && record.reviewGate.required === true
      && record.reviewGate.passed === true
      && record.reviewGate.decision === "ADMIT"
      && typeof record.reviewGate.reviewerId === "string"
      && record.reviewGate.reviewerId.length > 0;
  }

  // Illustrative synthetic downstream gate representing how CAP-05/CAP-06
  // style reasoning would source its evidence. Extracted-but-unreviewed
  // records are excluded regardless of how stage 3 classified them.
  function assembleEligibleEvidenceForReasoning(records) {
    const list = Array.isArray(records) ? records : [];
    const eligibleRecords = list.filter(isEligibleForScientificMemory);
    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      consideredCount: list.length,
      eligibleCount: eligibleRecords.length,
      excludedCount: list.length - eligibleRecords.length,
      eligibleRecords: Object.freeze(eligibleRecords),
      explanation: "Only records bearing a genuine stage-7 admission decision (governanceState ADMITTED_SCIENTIFIC_MEMORY, a passed reviewGate with decision ADMIT and a named reviewer) are eligible for scientific-memory-backed reasoning. Extracted-but-unreviewed records -- pending review, flagged conflict, or quarantined alike -- are excluded, regardless of how clean stage 3's classification looked."
    });
  }

  // Dispatcher entry point.
  function evaluateMemoryClassification(request) {
    const req = request || {};
    const extraction = extractAndClassify(req.preservedSource, req.rawExtraction, req.priorExtractedRecords);
    const eligible = extraction.status === "EXTRACTION_COMPLETE" ? isEligibleForScientificMemory(extraction.extractedRecord) : false;
    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      capabilityName: CAPABILITY_NAME,
      classification: CLASSIFICATION,
      productionAuthority: false,
      outcome: extraction.status === "EXTRACTION_COMPLETE" ? extraction.extractedRecord.recordStatus : "EXTRACTION_REFUSED",
      extraction,
      eligibleForScientificMemory: eligible
    });
  }

  window.AAB_CAP34_LIVE_CAP04_SCIENTIFIC_MEMORY = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    extractAndClassify,
    isEligibleForScientificMemory,
    assembleEligibleEvidenceForReasoning,
    evaluateMemoryClassification
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluateMemoryClassification);
  }
}());
