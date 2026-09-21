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

  const CAP04_IMPLEMENTATION_VERSION = "0.6.0";
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

  // Stage 7: human review and governed admission. Reviewer role names match
  // the vocabulary already used by cap34-simulation.js's roles object
  // (SCIENTIST, INSTITUTION_ADMIN, COUNTRY_HEAD hold genuine operational
  // authority there; RESTRICTED_USER and AUDITOR do not) without a runtime
  // dependency on that file.
  const AUTHORISED_REVIEWER_ROLES = Object.freeze(["SCIENTIST", "INSTITUTION_ADMIN", "COUNTRY_HEAD"]);

  // The permanent rule from the design document, enforced structurally:
  // "Uploading information does not make it approved scientific knowledge."
  // A reviewer's decision is necessary but never sufficient on its own --
  // the record's OWN state must also permit admission. This is the stage-7
  // equivalent of CAP-09's "replication alone does not override
  // contradiction": an authorised reviewer explicitly attempting to ADMIT
  // is still refused for a quarantined record or an unresolved conflict.
  //
  // authorisedReviewerRoles is optional and defaults to AUTHORISED_REVIEWER_ROLES,
  // matching the same override pattern as CAP-02's proposeInteroperabilityMapping
  // reference vocabulary: a domain with different organisational role names
  // (e.g. a Water Science or Aquaculture deployment) can supply its own list
  // with zero changes to this function's logic. See
  // cap04-scientific-memory-admission.behavioural-test.js CAP04ADM-H0/H1 for
  // the same "genuinely used, not just accepted and ignored" proof CAP-02's
  // vocabulary parameter is held to.
  function admitToScientificMemory(extractedRecord, reviewDecision, authorisedReviewerRoles) {
    const decision = reviewDecision || {};
    const roles = authorisedReviewerRoles || AUTHORISED_REVIEWER_ROLES;
    const refusalReasons = [];

    if (!extractedRecord) {
      return Object.freeze({ capabilityId: CAPABILITY_ID, status: "ADMISSION_REFUSED", refusalReasons: Object.freeze(["EXTRACTED_RECORD_REQUIRED"]), memoryRecord: null });
    }
    if (extractedRecord.governanceState !== "EXTRACTED_UNREVIEWED") refusalReasons.push("RECORD_ALREADY_REVIEWED");
    if (typeof decision.reviewerId !== "string" || decision.reviewerId.length === 0) refusalReasons.push("REVIEWER_ID_REQUIRED");
    if (!roles.includes(decision.reviewerRole)) refusalReasons.push("AUTHORISED_REVIEWER_ROLE_REQUIRED");
    if (!["ADMIT", "REJECT"].includes(decision.decision)) refusalReasons.push("VALID_REVIEW_DECISION_REQUIRED");

    if (refusalReasons.length > 0) {
      return Object.freeze({ capabilityId: CAPABILITY_ID, status: "ADMISSION_REFUSED", refusalReasons: Object.freeze(refusalReasons), memoryRecord: null });
    }

    if (decision.decision === "REJECT") {
      if (!decision.rejectionReason) {
        return Object.freeze({ capabilityId: CAPABILITY_ID, status: "ADMISSION_REFUSED", refusalReasons: Object.freeze(["REJECTION_REASON_REQUIRED"]), memoryRecord: null });
      }
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "RECORD_REJECTED",
        memoryRecord: Object.freeze(Object.assign({}, extractedRecord, {
          governanceState: "REJECTED_NOT_ADMITTED",
          reviewGate: Object.freeze({ required: true, passed: false, decision: "REJECT", reviewerId: decision.reviewerId, reviewerRole: decision.reviewerRole, reviewedAt: decision.reviewedAt || null, rejectionReason: decision.rejectionReason })
        }))
      });
    }

    // decision.decision === "ADMIT" from here. The record's own state must
    // also permit it.
    if (extractedRecord.recordStatus === "QUARANTINED") {
      return Object.freeze({ capabilityId: CAPABILITY_ID, status: "ADMISSION_REFUSED", refusalReasons: Object.freeze(["QUARANTINED_RECORD_CANNOT_BE_ADMITTED"]), memoryRecord: null });
    }
    if (extractedRecord.recordStatus === "FLAGGED_CONFLICT" && !decision.conflictResolutionNotes) {
      return Object.freeze({ capabilityId: CAPABILITY_ID, status: "ADMISSION_REFUSED", refusalReasons: Object.freeze(["UNRESOLVED_CONFLICT_REQUIRES_DOCUMENTED_RESOLUTION"]), memoryRecord: null });
    }

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      status: "RECORD_ADMITTED",
      memoryRecord: Object.freeze(Object.assign({}, extractedRecord, {
        governanceState: "ADMITTED_SCIENTIFIC_MEMORY",
        reviewGate: Object.freeze({ required: true, passed: true, decision: "ADMIT", reviewerId: decision.reviewerId, reviewerRole: decision.reviewerRole, reviewedAt: decision.reviewedAt || null, conflictResolutionNotes: decision.conflictResolutionNotes || null })
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

  function corpusGroupKey(record) {
    return String(record.subjectKey) + "\u0000" + String(record.treatmentLabel) + "\u0000" + String(record.location);
  }

  // Stage 5: detect problems without silently fixing them, AT SCALE. This
  // is deliberately distinct from stage 3's per-record conflict check,
  // which only ever compares a new record against whatever
  // priorExtractedRecords its caller happened to pass at extraction time --
  // in a real multi-institution pathway, records can arrive incrementally
  // and out of order, so an institution's own upload may never be told
  // about a genuinely conflicting record another institution filed at the
  // same time. Corpus-scale scanning re-examines the WHOLE set together
  // and can surface a contradiction stage 3 itself missed. This function
  // only ever produces a REPORT: it never mutates a record's recordStatus
  // or governanceState, and never merges or removes anything -- that
  // remains a human decision under stage 7.
  function scanCorpusForProblems(extractedRecords) {
    const records = Array.isArray(extractedRecords) ? extractedRecords : [];
    const quarantined = records.filter((r) => r && r.recordStatus === "QUARANTINED");
    const groupable = records.filter((r) => r && r.recordStatus !== "QUARANTINED" && r.subjectKey && r.treatmentLabel && r.location);

    const groups = new Map();
    for (const record of groupable) {
      const key = corpusGroupKey(record);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }

    const contradictionGroups = [];
    const exactDuplicateGroups = [];
    const possibleDuplicateVariantGroups = [];

    for (const [key, members] of groups) {
      if (members.length < 2) continue;
      const distinctPolarities = Array.from(new Set(members.map((m) => m.outcomePolarity)));
      if (distinctPolarities.length > 1) {
        contradictionGroups.push(Object.freeze({
          groupKey: key,
          recordIds: Object.freeze(members.map((m) => m.recordId)),
          distinctOutcomePolarities: Object.freeze(distinctPolarities)
        }));
        continue;
      }
      const distinctValues = Array.from(new Set(members.map((m) => m.measuredValue)));
      if (distinctValues.length === 1) {
        exactDuplicateGroups.push(Object.freeze({ groupKey: key, recordIds: Object.freeze(members.map((m) => m.recordId)) }));
      } else {
        possibleDuplicateVariantGroups.push(Object.freeze({ groupKey: key, recordIds: Object.freeze(members.map((m) => m.recordId)), distinctMeasuredValues: Object.freeze(distinctValues) }));
      }
    }

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      totalRecords: records.length,
      quarantinedCount: quarantined.length,
      contradictionGroups: Object.freeze(contradictionGroups),
      exactDuplicateGroups: Object.freeze(exactDuplicateGroups),
      possibleDuplicateVariantGroups: Object.freeze(possibleDuplicateVariantGroups),
      explanation: "A read-only corpus-scale report. It names groups of records sharing the same subject, treatment and location that disagree (contradictionGroups), appear to repeat the same observation identically (exactDuplicateGroups), or report the same conclusion with different values (possibleDuplicateVariantGroups). It never merges, removes or changes the status of any record -- resolving what it finds remains a stage-7 human decision."
    });
  }

  // Stage 6: negative and failed results must be discoverable with the
  // same rigor as positive ones, not merely retained. This deliberately
  // returns every matching record regardless of recordStatus or
  // outcomePolarity, sorted only by dateObserved (never "successes
  // first"), and tags each with its outcomePolarity so a negative or
  // null result cannot be buried or filtered out by default.
  function queryCorpusBySubject(extractedRecords, subjectKey) {
    const records = Array.isArray(extractedRecords) ? extractedRecords : [];
    const matches = records
      .filter((r) => r && r.subjectKey === subjectKey)
      .slice()
      .sort((a, b) => String(a.dateObserved || "").localeCompare(String(b.dateObserved || "")));
    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      subjectKey,
      matchCount: matches.length,
      matches: Object.freeze(matches.map((r) => Object.freeze({
        recordId: r.recordId,
        recordStatus: r.recordStatus,
        outcomePolarity: r.outcomePolarity,
        dateObserved: r.dateObserved,
        governanceState: r.governanceState
      })))
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
    implementationVersion: CAP04_IMPLEMENTATION_VERSION,
    authorisedReviewerRoles: AUTHORISED_REVIEWER_ROLES,
    extractAndClassify,
    admitToScientificMemory,
    isEligibleForScientificMemory,
    assembleEligibleEvidenceForReasoning,
    scanCorpusForProblems,
    queryCorpusBySubject,
    evaluateMemoryClassification
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluateMemoryClassification);
  }
}());
