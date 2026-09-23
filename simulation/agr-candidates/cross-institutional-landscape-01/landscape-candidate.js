(function () {
  "use strict";

  /**
   * AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01 reference evaluator.
   *
   * Candidate design only: no CAP number, not admitted, not deployed, not
   * wired into CAP-34. A stateless, deliberate, read-only and advisory
   * evaluation that:
   *   1. validates a human CrossInstitutionalLandscapeRequest (fail closed);
   *   2. selects authorised CAP-04-admitted records across institutions;
   *   3. freezes the selection into an immutable FrozenEvidenceSet;
   *   4. assesses methodological and unit comparability;
   *   5. composes the injected CAP-05 evaluator for same-subject
   *      contradiction detection (it does not reimplement it);
   *   6. returns a CrossInstitutionalLandscapeResult and a
   *      LandscapeDisclosureReceipt;
   *   7. on a separate deliberate call, returns a LandscapeStalenessNotice.
   *
   * Every dependency (CAP-05 evaluator, digest, clock) is injected so the
   * logic stays provider-neutral. Nothing is written anywhere: inputs are
   * never mutated and outputs are deep-frozen. Institutional reputation
   * fields are never read. See landscape-candidate.behavioural-test.js.
   */

  const CANDIDATE_ID = "AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01";
  const CANDIDATE_VERSION = "0.1.0";
  const CLASSIFICATION = "CANDIDATE_REFERENCE_EVALUATOR_SYNTHETIC_FIXTURES_ONLY";

  const REQUIRED_AUTHORITY = "REQUEST_CROSS_INSTITUTIONAL_LANDSCAPE";
  const PERMITTED_OUTPUTS = ["EVIDENCE_LANDSCAPE", "DISCLOSURE_RECEIPT"];
  const OPERATIONAL_OUTPUTS = [
    "POLICY_RECOMMENDATION",
    "INSTITUTION_RANKING",
    "WINNING_INSTITUTION",
    "VERDICT",
    "CONTRADICTION_RESOLUTION",
    "KNOWLEDGE_PROMOTION",
    "MEMORY_WRITE_BACK"
  ];
  const DIRECTIONAL_STANCES = ["SUPPORTS", "OPPOSES"];
  const NON_DIRECTIONAL_STANCES = ["NEUTRAL", "INCONCLUSIVE"];

  // Disclosed, deterministic adapter from an explicit stance to the finding
  // text the live CAP-05 evaluator classifies. The CAP-05 contract requires
  // stance to be explicit or derived through a disclosed deterministic step.
  const CAP05_STANCE_TEXT = Object.freeze({
    SUPPORTS: "Result supports the question for this comparison group.",
    OPPOSES: "Result contradicts the question for this comparison group."
  });

  const AUTHORITY_BOUNDARY = Object.freeze({
    readOnly: true,
    advisoryOnly: true,
    statelessDeliberateEvaluation: true,
    noVerdictProduced: true,
    noInstitutionRanked: true,
    noContradictionResolved: true,
    noPolicyRecommendation: true,
    noKnowledgePromotion: true,
    noWriteBackToInstitutionalMemory: true,
    noAutonomousMonitoring: true,
    institutionalProvenanceIsDataNotWeighting: true,
    restrictedEvidenceDisclosedOnlyAsLimitation: true
  });

  // --- small pure helpers ---------------------------------------------------

  function canonicalize(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
    if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalize(value[key])).join(",") + "}";
  }

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const key of Object.keys(value)) deepFreeze(value[key]);
    }
    return value;
  }

  const sortStrings = (values) => values.slice().sort();
  const unique = (values) => Array.from(new Set(values));
  const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
  const yearOf = (isoDate) => Number(String(isoDate).slice(0, 4));

  function recordRef(record) {
    return { evidenceRecordId: record.evidenceRecordId, evidenceRecordVersion: record.evidenceRecordVersion };
  }

  function recordOrder(a, b) {
    // Deterministic, time-and-identifier ordering. Never institution reputation.
    const at = String(a.admission && a.admission.admittedAt);
    const bt = String(b.admission && b.admission.admittedAt);
    if (at !== bt) return at < bt ? -1 : 1;
    if (a.evidenceRecordId !== b.evidenceRecordId) return a.evidenceRecordId < b.evidenceRecordId ? -1 : 1;
    return a.evidenceRecordVersion - b.evidenceRecordVersion;
  }

  function failClosed(errors, reasons, extra) {
    return deepFreeze(Object.assign({
      ok: false,
      candidateId: CANDIDATE_ID,
      result: "FAIL_CLOSED",
      errors: unique(errors),
      reasons,
      partialLandscapeReturned: false,
      noWrites: true,
      noMutation: true
    }, extra || {}));
  }

  function checkDependencies(dependencies) {
    const deps = dependencies || {};
    const cap05 = deps.cap05;
    if (!cap05 || typeof cap05.evaluateReasoning !== "function" || !nonEmptyString(cap05.implementationVersion)) return "CAP05_DEPENDENCY_UNAVAILABLE";
    if (typeof deps.digest !== "function") return "DIGEST_DEPENDENCY_UNAVAILABLE";
    if (typeof deps.now !== "function") return "CLOCK_DEPENDENCY_UNAVAILABLE";
    return null;
  }

  // --- 1. CrossInstitutionalLandscapeRequest validation -----------------------

  function validateRequest(request, dependencies) {
    const errors = [];
    const reasons = [];
    const r = request || {};

    const dependencyError = checkDependencies(dependencies);
    if (dependencyError) return { errors: [dependencyError], reasons: ["A required injected dependency is unavailable."] };

    if (!nonEmptyString(r.requestId)) { errors.push("REQUEST_INVALID"); reasons.push("requestId is required."); }
    const scope = (r.requestedBy && r.requestedBy.authorityScope) || [];
    if (!r.requestedBy || !nonEmptyString(r.requestedBy.actorId) || !scope.includes(REQUIRED_AUTHORITY)) {
      errors.push("REQUESTER_NOT_AUTHORISED");
      reasons.push("The requesting actor must hold " + REQUIRED_AUTHORITY + ".");
    }
    if (!r.question || !nonEmptyString(r.question.questionText) || !nonEmptyString(r.question.subjectKey)) {
      errors.push("REQUEST_INVALID"); reasons.push("A scientific question and subjectKey are required.");
    }
    if (!r.workspace || !nonEmptyString(r.workspace.workspaceId) || !nonEmptyString(r.workspace.jurisdictionCode)) {
      errors.push("REQUEST_INVALID"); reasons.push("Workspace and jurisdiction are required.");
    }
    if (!r.temporalScope || !nonEmptyString(r.temporalScope.from) || !nonEmptyString(r.temporalScope.to)) {
      errors.push("REQUEST_INVALID"); reasons.push("A temporal scope is required.");
    }
    if (!r.geographicScope || !Array.isArray(r.geographicScope.regionCodes) || r.geographicScope.regionCodes.length === 0) {
      errors.push("REQUEST_INVALID"); reasons.push("A geographic scope is required.");
    }
    if (!nonEmptyString(r.evidenceCutOff)) { errors.push("REQUEST_INVALID"); reasons.push("An evidence cut-off is required."); }

    const institutions = Array.isArray(r.participatingInstitutions) ? r.participatingInstitutions : [];
    if (institutions.length === 0) { errors.push("REQUEST_INVALID"); reasons.push("At least one participating institution is required."); }
    for (const institution of institutions) {
      if (!institution || !nonEmptyString(institution.institutionId) || !nonEmptyString(institution.participationAuthorityId)) {
        errors.push("PARTICIPATION_AUTHORITY_MISSING");
        reasons.push("Every participating institution must carry a participation authority: " + String(institution && institution.institutionId) + ".");
      }
    }
    const institutionIds = new Set(institutions.map((institution) => institution && institution.institutionId));
    const datasets = Array.isArray(r.authorisedDatasets) ? r.authorisedDatasets : [];
    if (datasets.length === 0) { errors.push("REQUEST_INVALID"); reasons.push("At least one authorised dataset is required."); }
    for (const dataset of datasets) {
      if (!dataset || !institutionIds.has(dataset.institutionId) || !nonEmptyString(dataset.datasetId) || !nonEmptyString(dataset.sharingAuthorityId)) {
        errors.push("DATASET_AUTHORITY_INVALID");
        reasons.push("Every authorised dataset must belong to a participating institution and carry a sharing authority: " + String(dataset && dataset.datasetId) + ".");
      }
    }

    const eligibility = r.cap04EligibilityRequirement || {};
    if (eligibility.requiredAdmissionDecision !== "ADMITTED" || eligibility.requireEligibleForScientificMemory !== true || eligibility.requireIntegrityVerified !== true) {
      errors.push("CAP04_ELIGIBILITY_REQUIREMENT_WEAKENED");
      reasons.push("The CAP-04 eligibility requirement cannot be weakened below ADMITTED, eligible for scientific memory and integrity VERIFIED.");
    }

    if (r.requestedCap05EvaluationVersion !== dependencies.cap05.implementationVersion) {
      errors.push("CAP05_VERSION_UNAVAILABLE");
      reasons.push("Requested CAP-05 evaluation version " + String(r.requestedCap05EvaluationVersion) + " is not the available version " + dependencies.cap05.implementationVersion + ".");
    }

    const disclosure = r.accessAndDisclosure || {};
    if (!Array.isArray(disclosure.disclosableClassifications) || disclosure.disclosableClassifications.length === 0) {
      errors.push("REQUEST_INVALID"); reasons.push("Disclosable access classifications must be declared.");
    }

    const outputs = Array.isArray(r.requestedOutputs) ? r.requestedOutputs : ["EVIDENCE_LANDSCAPE"];
    for (const output of outputs) {
      if (OPERATIONAL_OUTPUTS.includes(output)) {
        errors.push("OPERATIONAL_INTENT_BLOCKED");
        reasons.push("The candidate never produces " + output + ".");
      } else if (!PERMITTED_OUTPUTS.includes(output)) {
        errors.push("REQUEST_INVALID");
        reasons.push("Unknown requested output " + String(output) + ".");
      }
    }

    const comparability = r.comparability || {};
    if (!Array.isArray(comparability.requiredEvidenceCategories)) {
      errors.push("REQUEST_INVALID"); reasons.push("Required evidence categories must be declared (may be empty).");
    }

    return { errors: unique(errors), reasons };
  }

  function selectionScopeOf(request) {
    const r = request;
    return {
      requestId: r.requestId,
      question: { questionText: r.question.questionText, subjectKey: r.question.subjectKey, relatedSubjectKeys: sortStrings(r.question.relatedSubjectKeys || []) },
      workspace: { workspaceId: r.workspace.workspaceId, jurisdictionCode: r.workspace.jurisdictionCode },
      participatingInstitutions: r.participatingInstitutions
        .map((institution) => ({ institutionId: institution.institutionId, participationAuthorityId: institution.participationAuthorityId }))
        .sort((a, b) => (a.institutionId < b.institutionId ? -1 : 1)),
      authorisedDatasets: r.authorisedDatasets
        .map((dataset) => ({ institutionId: dataset.institutionId, datasetId: dataset.datasetId, sharingAuthorityId: dataset.sharingAuthorityId }))
        .sort((a, b) => canonicalize(a) < canonicalize(b) ? -1 : 1),
      temporalScope: { from: r.temporalScope.from, to: r.temporalScope.to },
      geographicScope: { regionCodes: sortStrings(r.geographicScope.regionCodes) },
      evidenceCutOff: r.evidenceCutOff,
      cap04EligibilityRequirement: {
        requiredAdmissionDecision: r.cap04EligibilityRequirement.requiredAdmissionDecision,
        requireEligibleForScientificMemory: r.cap04EligibilityRequirement.requireEligibleForScientificMemory,
        requireIntegrityVerified: r.cap04EligibilityRequirement.requireIntegrityVerified
      },
      requestedCap05EvaluationVersion: r.requestedCap05EvaluationVersion,
      accessAndDisclosure: { disclosableClassifications: sortStrings(r.accessAndDisclosure.disclosableClassifications) }
    };
  }

  function subjectsInScope(request) {
    return unique([request.question.subjectKey].concat(request.question.relatedSubjectKeys || []));
  }

  // --- 2. AuthorisedEvidenceSelection ----------------------------------------

  function exclusionReasonsFor(record, request, options) {
    const reasons = [];
    const r = request;
    const participating = new Set(r.participatingInstitutions.map((institution) => institution.institutionId));
    const datasetKeys = new Set(r.authorisedDatasets.map((dataset) => dataset.institutionId + "\u0000" + dataset.datasetId));
    const admission = record.admission || {};

    if (record.jurisdictionCode !== r.workspace.jurisdictionCode) reasons.push("JURISDICTION_OUT_OF_SCOPE");
    if (!participating.has(record.institutionId)) reasons.push("INSTITUTION_NOT_PARTICIPATING");
    else if (!datasetKeys.has(record.institutionId + "\u0000" + record.datasetId)) reasons.push("DATASET_NOT_AUTHORISED");
    if (admission.decision !== "ADMITTED" || admission.eligibleForScientificMemory !== true || !nonEmptyString(admission.admissionDecisionId)) reasons.push("CAP04_NOT_ADMITTED");
    if (record.integrityStatus !== "VERIFIED") reasons.push("INTEGRITY_NOT_VERIFIED");
    if (!options.ignoreCutOff && !(String(admission.admittedAt) <= r.evidenceCutOff)) reasons.push("ADMITTED_AFTER_EVIDENCE_CUT_OFF");
    if (!(String(record.dateObserved) >= r.temporalScope.from && String(record.dateObserved) <= r.temporalScope.to)) reasons.push("OUTSIDE_TEMPORAL_SCOPE");
    if (!r.geographicScope.regionCodes.includes(record.regionCode)) reasons.push("OUTSIDE_GEOGRAPHIC_SCOPE");
    if (!subjectsInScope(r).includes(record.subjectKey)) reasons.push("SUBJECT_OUT_OF_SCOPE");
    if (!DIRECTIONAL_STANCES.concat(NON_DIRECTIONAL_STANCES).includes(record.stance)) reasons.push("STANCE_NOT_ESTABLISHED");
    return reasons;
  }

  function selectAuthorisedEvidence(request, candidateRecords, options, digest) {
    const opts = options || {};
    const records = (Array.isArray(candidateRecords) ? candidateRecords : []).slice().sort(recordOrder);
    const disclosable = new Set(request.accessAndDisclosure.disclosableClassifications);
    const excluded = [];
    const withheld = [];
    const passing = [];

    for (const record of records) {
      const reasons = exclusionReasonsFor(record, request, opts);
      if (reasons.length > 0 && !disclosable.has(record.accessClassification)) {
        // Even an exclusion must not reveal a restricted record's identity.
        excluded.push({ withheldReference: digest("withheld\u0000" + record.evidenceRecordId + "@" + record.evidenceRecordVersion), institutionId: record.institutionId, reasonCodes: reasons, identityWithheld: true });
      } else if (reasons.length > 0) {
        excluded.push(Object.assign(recordRef(record), { institutionId: record.institutionId, reasonCodes: reasons }));
      } else if (!disclosable.has(record.accessClassification)) {
        withheld.push(record);
      } else {
        passing.push(record);
      }
    }

    // Only the latest version of a record admitted within the cut-off counts.
    const latestVersion = new Map();
    for (const record of passing) {
      const current = latestVersion.get(record.evidenceRecordId);
      if (current === undefined || record.evidenceRecordVersion > current) latestVersion.set(record.evidenceRecordId, record.evidenceRecordVersion);
    }
    const current = [];
    for (const record of passing) {
      if (record.evidenceRecordVersion !== latestVersion.get(record.evidenceRecordId)) {
        excluded.push(Object.assign(recordRef(record), { institutionId: record.institutionId, reasonCodes: ["SUPERSEDED_BY_LATER_VERSION_WITHIN_CUT_OFF"] }));
      } else {
        current.push(record);
      }
    }

    // Duplicates: the same underlying observation (content digest, or the same
    // source record at the same source authority) counts once, whoever submitted it.
    const firstByIdentity = new Map();
    const included = [];
    const duplicates = [];
    for (const record of current) {
      const keys = ["content:" + record.contentDigest, "source:" + record.sourceAuthority + "\u0000" + record.sourceRecordId];
      const original = keys.map((key) => firstByIdentity.get(key)).find(Boolean);
      if (original) {
        duplicates.push(Object.assign(recordRef(record), {
          institutionId: record.institutionId,
          duplicateOf: recordRef(original),
          duplicateBasis: firstByIdentity.get(keys[0]) ? "SAME_CONTENT_DIGEST" : "SAME_SOURCE_RECORD"
        }));
      } else {
        for (const key of keys) firstByIdentity.set(key, record);
        included.push(record);
      }
    }

    return { included, excluded, duplicates, withheld };
  }

  // --- 3. FrozenEvidenceSet --------------------------------------------------

  function freezeEvidenceSet(request, selection, dependencies) {
    const scope = selectionScopeOf(request);
    const withheldDisclosure = selection.withheld.map((record) => ({
      institutionId: record.institutionId,
      accessClassification: record.accessClassification,
      // Opaque reference: lets an authorised auditor confirm what was withheld
      // without the receipt exposing the record's identity or content.
      withheldReference: dependencies.digest("withheld\u0000" + record.evidenceRecordId + "@" + record.evidenceRecordVersion)
    })).sort((a, b) => (a.withheldReference < b.withheldReference ? -1 : 1));

    const body = {
      requestId: request.requestId,
      evidenceCutOff: request.evidenceCutOff,
      selectionScope: scope,
      selectionScopeDigest: dependencies.digest(canonicalize(scope)),
      includedRecords: selection.included.map((record) => ({
        evidenceRecordId: record.evidenceRecordId,
        evidenceRecordVersion: record.evidenceRecordVersion,
        institutionId: record.institutionId,
        datasetId: record.datasetId,
        subjectKey: record.subjectKey,
        admissionDecisionId: record.admission.admissionDecisionId,
        admissionDecision: record.admission.decision,
        admittedAt: record.admission.admittedAt,
        contentDigest: record.contentDigest
      })),
      excludedRecords: selection.excluded,
      duplicateRecords: selection.duplicates,
      withheldDisclosure
    };
    const evidenceSetDigest = dependencies.digest(canonicalize(body));
    return deepFreeze(Object.assign({ frozenSetId: "FROZEN-" + evidenceSetDigest.slice(-16), evidenceSetDigest }, body));
  }

  // --- 4. EvidenceComparabilityAssessment -------------------------------------

  function methodologyGroupsFor(records, declaredCompatible) {
    const methods = sortStrings(unique(records.map((record) => record.methodologyReference)));
    const parent = new Map(methods.map((method) => [method, method]));
    const find = (method) => (parent.get(method) === method ? method : find(parent.get(method)));
    for (const group of declaredCompatible || []) {
      const present = (group || []).filter((method) => parent.has(method));
      for (let i = 1; i < present.length; i += 1) parent.set(find(present[i]), find(present[0]));
    }
    const groups = new Map();
    for (const method of methods) {
      const root = find(method);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(method);
    }
    return Array.from(groups.values()).map((members) => {
      const methodologyReferences = sortStrings(members);
      return {
        methodologyGroupId: methodologyReferences.join("+"),
        methodologyReferences,
        recordIds: records.filter((record) => methodologyReferences.includes(record.methodologyReference)).map((record) => record.evidenceRecordId).sort()
      };
    }).sort((a, b) => (a.methodologyGroupId < b.methodologyGroupId ? -1 : 1));
  }

  function authorisedTransformationFor(record, measure) {
    if (!measure || !nonEmptyString(measure.canonicalUnit)) return null;
    if (record.unit === measure.canonicalUnit) return { identity: true };
    // Only request-declared, authority-referenced transformations to the
    // canonical unit are ever applied. Record-supplied conversions are ignored.
    return (measure.authorisedUnitTransformations || []).find((transformation) =>
      transformation
      && transformation.fromUnit === record.unit
      && transformation.toUnit === measure.canonicalUnit
      && nonEmptyString(transformation.transformationId)
      && nonEmptyString(transformation.authorisedBy)
      && nonEmptyString(transformation.authorityReference)
      && typeof transformation.multiplier === "number"
      && Number.isFinite(transformation.multiplier)) || null;
  }

  function assessComparability(request, includedRecords) {
    const comparability = request.comparability || {};
    const measure = comparability.measure || null;
    return subjectsInScope(request).sort().map((subjectKey) => {
      const records = includedRecords.filter((record) => record.subjectKey === subjectKey);
      const methodologyGroups = methodologyGroupsFor(records, comparability.declaredCompatibleMethodologies);
      const converted = [];
      const incomparable = [];
      const normalisedValues = {};
      for (const record of records) {
        if (typeof record.measuredValue !== "number" || !Number.isFinite(record.measuredValue)) {
          incomparable.push({ evidenceRecordId: record.evidenceRecordId, unit: record.unit, reasonCode: "NON_NUMERIC_VALUE" });
          continue;
        }
        const transformation = authorisedTransformationFor(record, measure);
        if (!transformation) {
          incomparable.push({ evidenceRecordId: record.evidenceRecordId, unit: record.unit, reasonCode: "NO_AUTHORISED_UNIT_TRANSFORMATION" });
        } else if (transformation.identity) {
          normalisedValues[record.evidenceRecordId] = record.measuredValue;
        } else {
          normalisedValues[record.evidenceRecordId] = record.measuredValue * transformation.multiplier;
          converted.push({
            evidenceRecordId: record.evidenceRecordId,
            fromUnit: record.unit,
            toUnit: measure.canonicalUnit,
            transformationId: transformation.transformationId,
            authorisedBy: transformation.authorisedBy,
            authorityReference: transformation.authorityReference
          });
        }
      }
      return {
        subjectKey,
        recordCount: records.length,
        methodologyGroups,
        methodologicallyIncompatible: methodologyGroups.length > 1,
        comparisonTreatment: methodologyGroups.length > 1 ? "EVALUATED_SEPARATELY_PER_METHODOLOGY_GROUP_NOT_POOLED" : "SINGLE_COMPARABLE_GROUP",
        unitAssessment: {
          canonicalUnit: measure ? measure.canonicalUnit : null,
          converted,
          incomparable,
          normalisedValues
        }
      };
    });
  }

  // --- 5. CAP-05 composition --------------------------------------------------

  function comparisonKey(subjectKey, methodologyGroupId) {
    return (subjectKey + "::" + methodologyGroupId).toLowerCase();
  }

  function runCap05(includedRecords, assessments, dependencies) {
    const keyToGroup = new Map();
    const cap05Input = [];
    for (const assessment of assessments) {
      for (const group of assessment.methodologyGroups) {
        const key = comparisonKey(assessment.subjectKey, group.methodologyGroupId);
        keyToGroup.set(key, { subjectKey: assessment.subjectKey, methodologyGroupId: group.methodologyGroupId });
        for (const record of includedRecords) {
          if (record.subjectKey === assessment.subjectKey && group.methodologyReferences.includes(record.methodologyReference) && DIRECTIONAL_STANCES.includes(record.stance)) {
            cap05Input.push({ id: record.evidenceRecordId, source: key, state: "ELIGIBLE", finding: CAP05_STANCE_TEXT[record.stance] });
          }
        }
      }
    }
    const evaluation = dependencies.cap05.evaluateReasoning(cap05Input);
    const contradictingKeys = new Set(((evaluation && evaluation.computedFacts && evaluation.computedFacts.contradictingSubjects) || []).map((key) => String(key).toLowerCase()));
    return {
      cap05Evaluation: {
        implementationVersion: dependencies.cap05.implementationVersion,
        inputRecordCount: cap05Input.length,
        outcome: evaluation && evaluation.outcome,
        computedFacts: evaluation && evaluation.computedFacts
      },
      isContradicting: (subjectKey, methodologyGroupId) => contradictingKeys.has(comparisonKey(subjectKey, methodologyGroupId)),
      unmappedContradictions: Array.from(contradictingKeys).filter((key) => !keyToGroup.has(key))
    };
  }

  // --- 6. CrossInstitutionalLandscapeResult ----------------------------------

  function buildLandscape(request, frozenSet, selection, assessments, cap05) {
    const included = selection.included;
    const byId = new Map(included.map((record) => [record.evidenceRecordId, record]));
    const duplicateInstitutions = new Map();
    for (const duplicate of selection.duplicates) {
      const key = duplicate.duplicateOf.evidenceRecordId;
      if (!duplicateInstitutions.has(key)) duplicateInstitutions.set(key, []);
      duplicateInstitutions.get(key).push(duplicate.institutionId);
    }

    const supportedObservations = [];
    const genuineContradictions = [];
    const directionalBySubject = new Map();

    for (const assessment of assessments) {
      for (const group of assessment.methodologyGroups) {
        const records = group.recordIds.map((id) => byId.get(id));
        const directional = records.filter((record) => DIRECTIONAL_STANCES.includes(record.stance));
        const nonDirectional = records.filter((record) => NON_DIRECTIONAL_STANCES.includes(record.stance));
        if (!directionalBySubject.has(assessment.subjectKey)) directionalBySubject.set(assessment.subjectKey, []);
        directionalBySubject.get(assessment.subjectKey).push(...directional);

        if (cap05.isContradicting(assessment.subjectKey, group.methodologyGroupId)) {
          const side = (stance) => directional.filter((record) => record.stance === stance);
          genuineContradictions.push({
            subjectKey: assessment.subjectKey,
            methodologyGroupId: group.methodologyGroupId,
            supportingRecordIds: side("SUPPORTS").map((record) => record.evidenceRecordId).sort(),
            opposingRecordIds: side("OPPOSES").map((record) => record.evidenceRecordId).sort(),
            supportingInstitutionIds: sortStrings(unique(side("SUPPORTS").map((record) => record.institutionId))),
            opposingInstitutionIds: sortStrings(unique(side("OPPOSES").map((record) => record.institutionId))),
            detectedBy: "CAP-05",
            resolutionStatus: "UNRESOLVED_HUMAN_REVIEW_REQUIRED"
          });
        } else if (directional.length > 0) {
          const institutionIds = sortStrings(unique(directional.map((record) => record.institutionId)));
          const alsoReportedBy = sortStrings(unique(directional.flatMap((record) => duplicateInstitutions.get(record.evidenceRecordId) || [])));
          const values = directional.map((record) => assessment.unitAssessment.normalisedValues[record.evidenceRecordId]).filter((value) => typeof value === "number");
          supportedObservations.push({
            subjectKey: assessment.subjectKey,
            methodologyGroupId: group.methodologyGroupId,
            stance: directional[0].stance,
            independentObservationCount: directional.length,
            recordIds: directional.map((record) => record.evidenceRecordId).sort(),
            contributingInstitutionIds: institutionIds,
            duplicateSubmissionsAlsoReportedBy: alsoReportedBy,
            crossInstitutionalAgreement: institutionIds.length >= 2,
            nonDirectionalRecordIds: nonDirectional.map((record) => record.evidenceRecordId).sort(),
            valueSummary: {
              canonicalUnit: assessment.unitAssessment.canonicalUnit,
              comparableValueCount: values.length,
              minimum: values.length ? Math.min.apply(null, values) : null,
              maximum: values.length ? Math.max.apply(null, values) : null
            }
          });
        }
      }
    }

    // Opposing results that concern different subjects are compatible, not contradictory.
    const compatibleDifferences = [];
    const subjectStance = new Map();
    for (const [subjectKey, records] of directionalBySubject.entries()) {
      const stances = unique(records.map((record) => record.stance));
      if (stances.length === 1) subjectStance.set(subjectKey, stances[0]);
    }
    const stanceSubjects = sortStrings(Array.from(subjectStance.keys()));
    for (let i = 0; i < stanceSubjects.length; i += 1) {
      for (let j = i + 1; j < stanceSubjects.length; j += 1) {
        if (subjectStance.get(stanceSubjects[i]) !== subjectStance.get(stanceSubjects[j])) {
          compatibleDifferences.push({
            subjectKeys: [stanceSubjects[i], stanceSubjects[j]],
            stances: [subjectStance.get(stanceSubjects[i]), subjectStance.get(stanceSubjects[j])],
            classification: "OPPOSING_RESULTS_CONCERN_DIFFERENT_SUBJECTS",
            isContradiction: false
          });
        }
      }
    }

    const methodologicalIncompatibilities = assessments
      .filter((assessment) => assessment.methodologicallyIncompatible)
      .map((assessment) => ({
        subjectKey: assessment.subjectKey,
        methodologyGroups: assessment.methodologyGroups,
        treatment: assessment.comparisonTreatment
      }));

    const requiredCategories = request.comparability.requiredEvidenceCategories || [];
    const knowledgeGaps = [];
    const subjects = [];
    for (const assessment of assessments) {
      const records = included.filter((record) => record.subjectKey === assessment.subjectKey);
      const categories = new Set(records.map((record) => record.evidenceCategory));
      for (const category of requiredCategories) {
        if (!categories.has(category)) {
          knowledgeGaps.push({ subjectKey: assessment.subjectKey, missingEvidenceCategory: category, consequence: "KNOWLEDGE_GAP_NOT_A_NEGATIVE_FINDING" });
        }
      }
      const contradicted = genuineContradictions.some((contradiction) => contradiction.subjectKey === assessment.subjectKey);
      let evidenceState;
      if (records.length === 0) evidenceState = "NO_ELIGIBLE_EVIDENCE_KNOWLEDGE_GAP";
      else if (contradicted) evidenceState = "CONTRADICTED_UNRESOLVED";
      else if (assessment.methodologicallyIncompatible) evidenceState = "NOT_COMPARABLE_ACROSS_METHODOLOGIES";
      else if (records.some((record) => DIRECTIONAL_STANCES.includes(record.stance))) evidenceState = "OBSERVED_WITHOUT_CONTRADICTION";
      else evidenceState = "NON_DIRECTIONAL_EVIDENCE_ONLY";
      subjects.push({ subjectKey: assessment.subjectKey, evidenceState, includedRecordCount: records.length });
    }

    const institutionCoverage = {};
    for (const institution of request.participatingInstitutions.slice().sort((a, b) => (a.institutionId < b.institutionId ? -1 : 1))) {
      const id = institution.institutionId;
      const mine = included.filter((record) => record.institutionId === id);
      institutionCoverage[id] = {
        institutionId: id,
        includedRecordCount: mine.length,
        independentObservationCount: mine.length,
        subjectsCovered: sortStrings(unique(mine.map((record) => record.subjectKey))),
        regionsCovered: sortStrings(unique(mine.map((record) => record.regionCode))),
        duplicateSubmissionCount: selection.duplicates.filter((duplicate) => duplicate.institutionId === id).length,
        excludedRecordCount: selection.excluded.filter((excluded) => excluded.institutionId === id).length,
        withheldRecordCount: selection.withheld.filter((record) => record.institutionId === id).length,
        coverageStatus: mine.length > 0 ? "CONTRIBUTED_ELIGIBLE_EVIDENCE" : "NO_ELIGIBLE_EVIDENCE_IN_SCOPE"
      };
    }

    const years = [];
    for (let year = yearOf(request.temporalScope.from); year <= yearOf(request.temporalScope.to); year += 1) years.push(year);
    const coveredYears = new Set(included.map((record) => yearOf(record.dateObserved)));
    const temporalGaps = years.filter((year) => !coveredYears.has(year)).map((year) => ({ year, consequence: "NO_ELIGIBLE_EVIDENCE_FOR_PERIOD" }));
    const coveredRegions = new Set(included.map((record) => record.regionCode));
    const geographicGaps = sortStrings(request.geographicScope.regionCodes).filter((region) => !coveredRegions.has(region)).map((regionCode) => ({ regionCode, consequence: "NO_ELIGIBLE_EVIDENCE_FOR_REGION" }));

    const limitationsPreventingComparison = [];
    for (const assessment of assessments) {
      for (const item of assessment.unitAssessment.incomparable) {
        limitationsPreventingComparison.push({ limitationCode: item.reasonCode, subjectKey: assessment.subjectKey, evidenceRecordId: item.evidenceRecordId, detail: "Value not compared: unit " + item.unit + " has no authorised transformation to " + assessment.unitAssessment.canonicalUnit + "." });
      }
      if (assessment.methodologicallyIncompatible) {
        limitationsPreventingComparison.push({ limitationCode: "METHODOLOGICAL_INCOMPATIBILITY", subjectKey: assessment.subjectKey, detail: "Records under " + assessment.methodologyGroups.length + " incompatible methodology groups were evaluated separately, not pooled." });
      }
    }
    const withheldByInstitution = {};
    for (const item of frozenSet.withheldDisclosure) {
      const key = item.institutionId + "\u0000" + item.accessClassification;
      withheldByInstitution[key] = (withheldByInstitution[key] || 0) + 1;
    }
    for (const key of sortStrings(Object.keys(withheldByInstitution))) {
      const [institutionId, accessClassification] = key.split("\u0000");
      limitationsPreventingComparison.push({
        limitationCode: "RESTRICTED_EVIDENCE_WITHHELD",
        institutionId,
        accessClassification,
        withheldRecordCount: withheldByInstitution[key],
        detail: "Evidence under " + accessClassification + " was withheld from this landscape; the comparison may be incomplete. Its content is not disclosed."
      });
    }
    limitationsPreventingComparison.push({
      limitationCode: "CAP05_STANCE_ADAPTER",
      detail: "CAP-05 compares explicit record stances mapped through a disclosed deterministic adapter; NEUTRAL and INCONCLUSIVE records are listed but not stance-compared."
    });

    return {
      question: { questionText: request.question.questionText, subjectKey: request.question.subjectKey },
      subjects,
      supportedObservations,
      genuineContradictions,
      compatibleDifferences,
      methodologicalIncompatibilities,
      unitComparability: assessments.map((assessment) => ({
        subjectKey: assessment.subjectKey,
        canonicalUnit: assessment.unitAssessment.canonicalUnit,
        converted: assessment.unitAssessment.converted,
        incomparable: assessment.unitAssessment.incomparable
      })),
      institutionCoverage,
      temporalGaps,
      geographicGaps,
      knowledgeGaps,
      excludedEvidence: frozenSet.excludedRecords,
      duplicateEvidence: frozenSet.duplicateRecords,
      limitationsPreventingComparison
    };
  }

  function evaluateLandscape(request, candidateRecords, dependencies) {
    const validation = validateRequest(request, dependencies);
    if (validation.errors.length > 0) return failClosed(validation.errors, validation.reasons);

    const selection = selectAuthorisedEvidence(request, candidateRecords, {}, dependencies.digest);
    if (selection.included.length === 0) {
      return failClosed(["EVIDENCE_SET_EMPTY"], [
        "No authorised, admitted, disclosable evidence falls within the declared scope. " + selection.withheld.length + " record(s) were withheld under access restrictions and " + selection.excluded.length + " were excluded."
      ]);
    }

    const frozenSet = freezeEvidenceSet(request, selection, dependencies);
    const assessments = assessComparability(request, selection.included);
    const cap05 = runCap05(selection.included, assessments, dependencies);
    if (cap05.unmappedContradictions.length > 0) {
      return failClosed(["CAP05_RESULT_UNMAPPABLE"], ["CAP-05 reported contradicting subjects that do not map to a declared comparison group."]);
    }
    const landscape = buildLandscape(request, frozenSet, selection, assessments, cap05);

    const versions = {
      candidateEvaluatorVersion: CANDIDATE_VERSION,
      cap05ImplementationVersion: dependencies.cap05.implementationVersion,
      requestedCap05EvaluationVersion: request.requestedCap05EvaluationVersion,
      includedRecordVersions: Object.fromEntries(frozenSet.includedRecords.map((record) => [record.evidenceRecordId, record.evidenceRecordVersion])),
      admissionDecisionIds: frozenSet.includedRecords.map((record) => record.admissionDecisionId).sort()
    };

    const binding = {
      requestId: request.requestId,
      frozenSetId: frozenSet.frozenSetId,
      evidenceSetDigest: frozenSet.evidenceSetDigest,
      selectionScopeDigest: frozenSet.selectionScopeDigest,
      evidenceCutOff: request.evidenceCutOff
    };

    const digestible = { candidateId: CANDIDATE_ID, binding, versions, landscape, cap05Evaluation: cap05.cap05Evaluation, authorityBoundary: AUTHORITY_BOUNDARY };
    const resultDigest = dependencies.digest(canonicalize(digestible));
    const landscapeId = "LANDSCAPE-" + resultDigest.slice(-16);
    const generatedAt = dependencies.now();

    const result = deepFreeze(Object.assign({
      ok: true,
      resultType: "CROSS_INSTITUTIONAL_EVIDENCE_LANDSCAPE",
      classification: CLASSIFICATION,
      landscapeId,
      generatedAt,
      resultDigest
    }, digestible));

    const receipt = deepFreeze(buildReceipt(request, frozenSet, result, dependencies));
    return deepFreeze({ ok: true, frozenEvidenceSet: frozenSet, comparabilityAssessments: deepFreeze(assessments.map((assessment) => Object.assign({}, assessment))), result, receipt });
  }

  // --- 7. LandscapeDisclosureReceipt ------------------------------------------

  function buildReceipt(request, frozenSet, result, dependencies) {
    const withheldCounts = {};
    for (const item of frozenSet.withheldDisclosure) {
      const key = item.institutionId + "\u0000" + item.accessClassification;
      withheldCounts[key] = (withheldCounts[key] || 0) + 1;
    }
    const body = {
      receiptType: "LANDSCAPE_DISCLOSURE_RECEIPT",
      candidateId: CANDIDATE_ID,
      landscapeId: result.landscapeId,
      resultDigest: result.resultDigest,
      requestId: request.requestId,
      requestedBy: { actorId: request.requestedBy.actorId, role: request.requestedBy.role || null },
      frozenSetId: frozenSet.frozenSetId,
      evidenceSetDigest: frozenSet.evidenceSetDigest,
      selectionScope: frozenSet.selectionScope,
      selectionScopeDigest: frozenSet.selectionScopeDigest,
      evidenceCutOff: frozenSet.evidenceCutOff,
      includedEvidence: frozenSet.includedRecords.map((record) => ({
        evidenceRecordId: record.evidenceRecordId,
        evidenceRecordVersion: record.evidenceRecordVersion,
        institutionId: record.institutionId,
        admissionDecisionId: record.admissionDecisionId,
        admissionDecision: record.admissionDecision
      })),
      excludedEvidence: frozenSet.excludedRecords,
      duplicateEvidence: frozenSet.duplicateRecords,
      withheldEvidence: sortStrings(Object.keys(withheldCounts)).map((key) => {
        const [institutionId, accessClassification] = key.split("\u0000");
        return { institutionId, accessClassification, withheldRecordCount: withheldCounts[key], contentDisclosed: false };
      }),
      withheldReferences: frozenSet.withheldDisclosure.map((item) => item.withheldReference),
      versions: result.versions,
      limitations: result.landscape.limitationsPreventingComparison.map((limitation) => limitation.limitationCode),
      authorityBoundary: AUTHORITY_BOUNDARY
    };
    const receiptDigest = dependencies.digest(canonicalize(body));
    return Object.assign({ receiptId: "RECEIPT-" + receiptDigest.slice(-16), receiptDigest }, body);
  }

  // --- 8. LandscapeStalenessNotice --------------------------------------------

  function assessStaleness(receipt, request, currentCandidateRecords, dependencies) {
    const validation = validateRequest(request, dependencies);
    if (validation.errors.length > 0) return failClosed(validation.errors, validation.reasons);
    if (!receipt || receipt.receiptType !== "LANDSCAPE_DISCLOSURE_RECEIPT" || receipt.requestId !== request.requestId
      || receipt.selectionScopeDigest !== dependencies.digest(canonicalize(selectionScopeOf(request)))) {
      return failClosed(["RECEIPT_REQUEST_MISMATCH"], ["The staleness check must use the exact request scope the receipt was bound to."]);
    }

    const includedVersions = new Map(receipt.includedEvidence.map((record) => [record.evidenceRecordId, record.evidenceRecordVersion]));
    const now = selectAuthorisedEvidence(request, currentCandidateRecords, { ignoreCutOff: true }, dependencies.digest);
    const triggers = [];
    for (const record of now.included) {
      if (!(String(record.admission.admittedAt) > receipt.evidenceCutOff)) continue;
      if (!includedVersions.has(record.evidenceRecordId)) {
        triggers.push({ reasonCode: "NEW_ELIGIBLE_EVIDENCE_ADMITTED_AFTER_CUT_OFF", evidenceRecordId: record.evidenceRecordId, evidenceRecordVersion: record.evidenceRecordVersion, subjectKey: record.subjectKey });
      } else if (record.evidenceRecordVersion > includedVersions.get(record.evidenceRecordId)) {
        triggers.push({ reasonCode: "NEWER_VERSION_OF_INCLUDED_EVIDENCE_ADMITTED", evidenceRecordId: record.evidenceRecordId, evidenceRecordVersion: record.evidenceRecordVersion, subjectKey: record.subjectKey });
      }
    }
    const currentById = new Map();
    for (const record of Array.isArray(currentCandidateRecords) ? currentCandidateRecords : []) {
      if (includedVersions.get(record.evidenceRecordId) === record.evidenceRecordVersion) currentById.set(record.evidenceRecordId, record);
    }
    for (const [id] of includedVersions.entries()) {
      const record = currentById.get(id);
      if (!record || !record.admission || record.admission.decision !== "ADMITTED" || record.admission.eligibleForScientificMemory !== true) {
        triggers.push({ reasonCode: "INCLUDED_EVIDENCE_ADMISSION_NO_LONGER_CURRENT", evidenceRecordId: id, evidenceRecordVersion: includedVersions.get(id) });
      }
    }
    // Withheld evidence can make a landscape stale without its content leaking.
    const newlyWithheld = now.withheld.filter((record) => String(record.admission.admittedAt) > receipt.evidenceCutOff).length;
    if (newlyWithheld > 0) triggers.push({ reasonCode: "NEW_RESTRICTED_EVIDENCE_ADMITTED_AFTER_CUT_OFF", withheldRecordCount: newlyWithheld, contentDisclosed: false });

    triggers.sort((a, b) => canonicalize(a) < canonicalize(b) ? -1 : 1);
    const body = {
      noticeType: "LANDSCAPE_STALENESS_NOTICE",
      candidateId: CANDIDATE_ID,
      landscapeId: receipt.landscapeId,
      receiptId: receipt.receiptId,
      frozenSetId: receipt.frozenSetId,
      evidenceSetDigest: receipt.evidenceSetDigest,
      originalResultDigest: receipt.resultDigest,
      evidenceCutOff: receipt.evidenceCutOff,
      status: triggers.length > 0 ? "POTENTIALLY_STALE" : "NO_NEWER_ELIGIBLE_EVIDENCE_FOUND",
      triggers,
      originalLandscapeUnchanged: true,
      reEvaluationRequiresDeliberateRequest: true,
      noAutomaticReEvaluation: true,
      noMonitoringEstablished: true
    };
    const noticeDigest = dependencies.digest(canonicalize(body));
    return deepFreeze(Object.assign({ ok: true, noticeId: "STALENESS-" + noticeDigest.slice(-16), assessedAt: dependencies.now(), noticeDigest }, body));
  }

  window.AAB_AGR_CROSS_INSTITUTIONAL_LANDSCAPE_CANDIDATE_01 = Object.freeze({
    candidateId: CANDIDATE_ID,
    candidateVersion: CANDIDATE_VERSION,
    classification: CLASSIFICATION,
    authorityBoundary: AUTHORITY_BOUNDARY,
    canonicalize,
    validateRequest,
    selectAuthorisedEvidence,
    evaluateLandscape,
    assessStaleness
  });
}());
