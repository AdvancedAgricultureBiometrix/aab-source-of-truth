(function () {
  "use strict";

  /**
   * CAP-02 (Governed Scientific Data Acquisition & Interoperability)
   * live-simulation evaluator -- Historical Scientific Memory Recovery,
   * stages 1-2 only (register source, preserve original).
   *
   * This is a deliberately narrow slice of the full pathway described in
   * governance/workstream-b/CAP-34-CAPABILITY-PATHWAY-RECONCILIATION-2026-09-20.md.
   * Format/unit interoperability mapping, legacy-system adapters, real
   * document extraction and corpus-scale acquisition remain unbuilt; see
   * this capability's manifest entry limitations. What IS real here: a
   * source cannot be registered without complete attribution, and original
   * material cannot be preserved against a source that was not registered.
   * See cap02-source-acquisition.behavioural-test.js.
   */

  const CAP02_IMPLEMENTATION_VERSION = "0.4.0";
  const CAPABILITY_ID = "CAP-02";
  const CAPABILITY_NAME = "Governed Scientific Data Acquisition & Interoperability";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";

  const REQUIRED_SOURCE_FIELDS = Object.freeze([
    "country", "institution", "department", "originalSystem",
    "datasetName", "responsibleOwner", "dateRangeStart", "dateRangeEnd",
    "authorityToProvide", "accessRestrictions"
  ]);

  // Pure-JS SHA-256 (no Node/browser crypto dependency, matching the
  // pattern already used by capability-fidelity-manifest.js) so this file
  // can be loaded as a plain <script> and still produce a real, verifiable
  // content hash for preserved originals.
  function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text), words = [], bitLength = bytes.length * 8;
    for (let i = 0; i < bytes.length; i += 1) words[i >> 2] = (words[i >> 2] || 0) | bytes[i] << (24 - (i % 4) * 8);
    words[bitLength >> 5] = (words[bitLength >> 5] || 0) | 0x80 << (24 - bitLength % 32);
    words[((bitLength + 64 >> 9) << 4) + 15] = bitLength;
    const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    for (let offset = 0; offset < words.length; offset += 16) {
      const w = new Array(64);
      for (let i = 0; i < 16; i += 1) w[i] = words[offset + i] | 0;
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
        const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i += 1) {
        const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e), ch = (e & f) ^ (~e & g), t1 = (hh + s1 + ch + k[i] + w[i]) | 0;
        const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (s0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0; h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
    }
    return h.map((value) => (value >>> 0).toString(16).padStart(8, "0")).join("");
  }

  // Stage 1: an uploaded record must never become unattributed AAB data.
  // A source cannot be registered without every required attribution field.
  function registerSource(sourceMetadata) {
    const metadata = sourceMetadata || {};
    const missingFields = REQUIRED_SOURCE_FIELDS.filter((field) => {
      const value = metadata[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "SOURCE_REGISTRATION_REFUSED",
        refusalReasons: Object.freeze(missingFields.map((field) => "MISSING_FIELD:" + field)),
        explanation: "Source registration refused: an uploaded record must never become unattributed AAB data. Missing required attribution field(s): " + missingFields.join(", ") + ".",
        sourceRecord: null
      });
    }

    const sourceId = "SRC-" + String(metadata.country) + "-" + String(metadata.institution) + "-" + String(metadata.datasetName);
    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      status: "SOURCE_REGISTERED",
      refusalReasons: Object.freeze([]),
      explanation: "Source registered with complete attribution. No material has been imported, extracted or admitted yet.",
      sourceRecord: Object.freeze({
        sourceId,
        country: metadata.country,
        institution: metadata.institution,
        department: metadata.department,
        originalSystem: metadata.originalSystem,
        datasetName: metadata.datasetName,
        responsibleOwner: metadata.responsibleOwner,
        dateRangeStart: metadata.dateRangeStart,
        dateRangeEnd: metadata.dateRangeEnd,
        authorityToProvide: metadata.authorityToProvide,
        accessRestrictions: metadata.accessRestrictions
      })
    });
  }

  // Stage 2: preserve the original and its immutable content hash so any
  // later extraction can always trace back to the exact original material.
  // Refuses if the source it would attach to was never registered.
  function preserveOriginal(sourceRegistration, fileMaterial) {
    const material = fileMaterial || {};

    if (!sourceRegistration || sourceRegistration.status !== "SOURCE_REGISTERED" || !sourceRegistration.sourceRecord) {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "PRESERVATION_REFUSED",
        refusalReasons: Object.freeze(["SOURCE_NOT_REGISTERED"]),
        explanation: "Original material cannot be preserved against a source that has not been registered with complete attribution.",
        preservedRecord: null
      });
    }

    if (typeof material.originalContent !== "string" || material.originalContent.length === 0) {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        status: "PRESERVATION_REFUSED",
        refusalReasons: Object.freeze(["ORIGINAL_MATERIAL_REQUIRED"]),
        explanation: "Original material cannot be preserved: no original content was supplied to hash and reference.",
        preservedRecord: null
      });
    }

    const contentHash = "sha256:" + sha256Hex(material.originalContent);
    const fileId = "FILE-" + sourceRegistration.sourceRecord.sourceId + "-" + String(material.originalFileName || "unnamed");

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      status: "ORIGINAL_PRESERVED",
      refusalReasons: Object.freeze([]),
      explanation: "Original material preserved with an immutable content hash. Any later extraction must trace back to this exact reference; it does not itself become scientific memory.",
      preservedRecord: Object.freeze({
        fileId,
        sourceId: sourceRegistration.sourceRecord.sourceId,
        originalFileName: material.originalFileName || null,
        originalReference: material.originalReference || fileId,
        contentHash,
        preservedAt: material.preservedAt || null
      })
    });
  }

  // Dispatcher entry point: sequences stage 1 then stage 2.
  function evaluateAcquisition(request) {
    const req = request || {};
    const registration = registerSource(req.sourceMetadata);
    if (registration.status !== "SOURCE_REGISTERED") {
      return Object.freeze({
        capabilityId: CAPABILITY_ID,
        capabilityName: CAPABILITY_NAME,
        classification: CLASSIFICATION,
        productionAuthority: false,
        outcome: "ACQUISITION_REFUSED",
        registration,
        preservation: null
      });
    }
    const preservation = preserveOriginal(registration, req.fileMaterial);
    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      capabilityName: CAPABILITY_NAME,
      classification: CLASSIFICATION,
      productionAuthority: false,
      outcome: preservation.status === "ORIGINAL_PRESERVED" ? "SOURCE_ACQUIRED_AND_PRESERVED" : "ACQUISITION_REFUSED",
      registration,
      preservation
    });
  }

  // Stage 4 (the "Interoperability" half of this capability's name): propose
  // a mapping from an institution's own wording/units to a governed
  // reference vocabulary. The load-bearing rule, straight from the design
  // document: "The original wording and value would remain preserved
  // alongside any normalized representation." A mapping is a PROPOSAL, not
  // a silent overwrite -- it never invents a canonical term for something
  // the vocabulary does not recognise, and it never guesses between two
  // candidates when a raw term is genuinely ambiguous in the vocabulary.
  // It also never changes governanceState or reviewGate: proposing a
  // mapping does not move a record any closer to scientific-memory
  // eligibility (see CAP-04's isEligibleForScientificMemory).
  const DEFAULT_REFERENCE_VOCABULARY = Object.freeze({
    subjects: Object.freeze([
      Object.freeze({ canonicalTerm: "Reference Subject C7", synonyms: Object.freeze(["Trial Site 7", "Site Seven", "TS-7"]) }),
      Object.freeze({ canonicalTerm: "Reference Subject C12", synonyms: Object.freeze(["Trial Site 12"]) })
    ]),
    units: Object.freeze([
      Object.freeze({ canonicalUnit: "reference index units", synonyms: Object.freeze([
        Object.freeze({ unit: "index units", factor: 1 }),
        Object.freeze({ unit: "legacy index scale", factor: 0.1 })
      ]) })
    ])
  });

  function lookupSynonym(entries, rawValue, entryKey, synonymKey) {
    if (!rawValue) return { matches: [] };
    const matches = entries.filter((entry) => entry[synonymKey].some((candidate) => (candidate.unit || candidate) === rawValue || String(candidate.unit || candidate).toLowerCase() === String(rawValue).toLowerCase()));
    return { matches };
  }

  function proposeSubjectMapping(rawSubjectKey, vocabulary) {
    if (!rawSubjectKey) {
      return { mappingStatus: "SUBJECT_KEY_REQUIRED_FOR_MAPPING", normalizedSubjectKey: null, candidates: [] };
    }
    const { matches } = lookupSynonym(vocabulary.subjects, rawSubjectKey, "canonicalTerm", "synonyms");
    if (matches.length === 0) {
      return { mappingStatus: "UNMAPPED_NO_REFERENCE_MATCH", normalizedSubjectKey: null, candidates: [] };
    }
    if (matches.length > 1) {
      return { mappingStatus: "AMBIGUOUS_MULTIPLE_REFERENCE_MATCHES", normalizedSubjectKey: null, candidates: matches.map((m) => m.canonicalTerm) };
    }
    return { mappingStatus: "PROPOSED_MAPPING", normalizedSubjectKey: matches[0].canonicalTerm, candidates: Object.freeze([matches[0].canonicalTerm]) };
  }

  function proposeUnitMapping(rawUnit, rawMeasuredValue, vocabulary) {
    if (!rawUnit) {
      return { mappingStatus: "UNIT_REQUIRED_FOR_MAPPING", normalizedUnit: null, normalizedValue: null, candidates: [] };
    }
    const matchingGroups = vocabulary.units
      .map((group) => ({ group, synonym: group.synonyms.find((s) => s.unit.toLowerCase() === String(rawUnit).toLowerCase()) }))
      .filter((entry) => entry.synonym);
    if (matchingGroups.length === 0) {
      return { mappingStatus: "UNMAPPED_UNIT_NO_REFERENCE_MATCH", normalizedUnit: null, normalizedValue: null, candidates: [] };
    }
    if (matchingGroups.length > 1) {
      return { mappingStatus: "AMBIGUOUS_MULTIPLE_UNIT_MATCHES", normalizedUnit: null, normalizedValue: null, candidates: matchingGroups.map((m) => m.group.canonicalUnit) };
    }
    const { group, synonym } = matchingGroups[0];
    const normalizedValue = typeof rawMeasuredValue === "number" ? rawMeasuredValue * synonym.factor : null;
    return { mappingStatus: "PROPOSED_MAPPING", normalizedUnit: group.canonicalUnit, normalizedValue, candidates: Object.freeze([group.canonicalUnit]) };
  }

  function proposeInteroperabilityMapping(extractedRecord, referenceVocabulary) {
    const vocabulary = referenceVocabulary || DEFAULT_REFERENCE_VOCABULARY;
    if (!extractedRecord) {
      return Object.freeze({ capabilityId: CAPABILITY_ID, status: "MAPPING_REFUSED", refusalReasons: Object.freeze(["EXTRACTED_RECORD_REQUIRED"]), mappingRecord: null });
    }

    const subjectMapping = proposeSubjectMapping(extractedRecord.subjectKey, vocabulary);
    const unitMapping = proposeUnitMapping(extractedRecord.unit, extractedRecord.measuredValue, vocabulary);

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      status: "MAPPING_PROPOSED",
      mappingRecord: Object.freeze({
        recordId: extractedRecord.recordId,
        // The original wording and value are preserved unchanged alongside
        // the proposed normalization -- never overwritten, never dropped.
        rawSubjectKey: extractedRecord.subjectKey,
        rawUnit: extractedRecord.unit,
        rawMeasuredValue: extractedRecord.measuredValue,
        subjectMappingStatus: subjectMapping.mappingStatus,
        normalizedSubjectKey: subjectMapping.normalizedSubjectKey,
        subjectMappingCandidates: Object.freeze(subjectMapping.candidates),
        unitMappingStatus: unitMapping.mappingStatus,
        normalizedUnit: unitMapping.normalizedUnit,
        normalizedValue: unitMapping.normalizedValue,
        unitMappingCandidates: Object.freeze(unitMapping.candidates),
        // Mapping never touches review/governance state: a proposed
        // normalization is not scientific memory admission.
        governanceState: extractedRecord.governanceState,
        reviewGate: extractedRecord.reviewGate
      })
    });
  }

  window.AAB_CAP34_LIVE_CAP02_SOURCE_ACQUISITION = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    implementationVersion: CAP02_IMPLEMENTATION_VERSION,
    requiredSourceFields: REQUIRED_SOURCE_FIELDS,
    defaultReferenceVocabulary: DEFAULT_REFERENCE_VOCABULARY,
    sha256Hex,
    registerSource,
    preserveOriginal,
    evaluateAcquisition,
    proposeInteroperabilityMapping
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluateAcquisition);
  }
}());
