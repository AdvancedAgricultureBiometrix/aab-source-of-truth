# AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01 — Governed Cross-Institutional Evidence Landscape — 2026-09-22

**Status:** CANDIDATE DESIGN RECORD — NOT A CAPABILITY CONTRACT — NOT ADMITTED — NOT IMPLEMENTED
**Domain:** Agricultural Science (AGR)
**Designation:** AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01
**Authority:** RECORDS A PROPOSED COMPOSITION PROFILE FOR REVIEW. This document does not admit any capability. It does not assign a CAP number. It does not grant implementation authority. It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production authority.

## What this document is

This is a candidate design record for a governed composition profile that uses CAP-04 scientific memory and CAP-05 governed reasoning across explicitly authorised institutional boundaries — producing an honest evidence landscape that shows agreement, contradiction, and genuine uncertainty without manufacturing a verdict.

It is not a capability contract. It has not been through the ten-point admission checklist. It has not been behaviourally proven.

It is recorded here so the design is not lost, the architecture is explicit before any implementation is considered, and the authority boundary is stated precisely before any code is written.

## Why this is a candidate, not a numbered capability

CAP-04 and CAP-05 already establish the essential mechanisms:

- **CAP-04** admits attributable evidence into governed scientific memory
- **CAP-05** evaluates admitted evidence by subject, surfaces contradictions, and identifies knowledge gaps without producing a verdict

Neither mechanism needs to change merely because records originated from Kasetsart, ARDA, BIOTEC, a Vietnamese institute, or another authorised source. Institutional provenance remains attached to every record. The scientific reasoning operates on evidence — not on institutional prestige.

The correct starting classification is therefore a **governed composition profile** — not a new numbered capability. A CAP number would exaggerate the platform's capability count without adding a distinct governed mechanism.

## The decisive admission test

Only consider making this a numbered capability if controlled fixtures demonstrate that it needs its own:

- Authority boundary distinct from CAP-04 and CAP-05
- Lifecycle independent of those capabilities
- Gateway action not present in either
- Disclosure receipt type not covered by either
- Failure contract not already expressed in either
- Material logic beyond CAP-04 retrieval plus CAP-05 evaluation

If it merely selects an authorised multi-institution evidence set and invokes CAP-05, it must remain a composition profile. If it independently handles institutional consent, restricted sharing, evidence-set freezing, provenance comparison, methodological comparability, and cross-institution disclosure in ways that CAP-04 and CAP-05 cannot honestly provide through composition — then it may earn admission as a separate capability after review.

## The commercial purpose

EUDR provides the urgent institutional entry point. The cross-institutional evidence landscape demonstrates why scientists would continue using AAB after the first meeting — because it can show agreement, contradiction, and genuine uncertainty across institutions without turning any of them into a manufactured verdict.

The specific thing that does not exist anywhere in Thailand or Vietnam right now is a system that can honestly say:

> *Here is what the admitted evidence from multiple institutions actually shows. Here is where it contradicts itself. Here is what is genuinely unknown — without asserting a conclusion.*

Vietnam's 18 fragmented agricultural research institutes are conducting the same research repeatedly without cross-institute learning. Contradictory findings go unresolved because there is no neutral, governed place to surface them. Thailand has the same silo problem across Kasetsart, ARDA, and regional agricultural stations.

AAB's governance discipline — admitted does not mean proven, evidence chains are traceable, contradictions are surfaced not suppressed — is the precise thing that would make serious scientists trust it. Every other agricultural software system in these markets either makes confident claims it cannot support or produces black-box outputs scientists cannot audit.

## What the candidate would do

### 1. Receive a deliberate human request

A human operator explicitly defines:
- Scientific subject or question
- Participating institutions — named and authorised
- Permitted datasets per institution
- Jurisdiction and workspace
- Time range
- Evidence cut-off — immutable once set
- Applicable access restrictions and sharing authorities

The request is not automated. It is a deliberate human act that defines the exact scope of the evaluation before any retrieval occurs.

### 2. Retrieve only eligible CAP-04 records

Records must satisfy all of the following:
- Passed the scientific-memory admission gate through CAP-04
- Retain complete source and institutional provenance
- Are authorised for the requesting workspace and purpose
- Existed at the declared evidence cut-off
- Fall within the declared participating-institution scope

Records that do not satisfy all conditions are excluded. Exclusions are recorded with their reasons — not silently dropped.

### 3. Pass a fixed, immutable evidence set to CAP-05

The evidence set is frozen at the moment of retrieval. No record may be added, removed, or modified after the set is passed to CAP-05. CAP-05 evaluates the set as it stands — not as it might stand after future admissions.

### 4. Produce an honest evidence landscape

The landscape must include:
- Areas of agreement across institutions
- Material contradictions — where admitted evidence from different institutions supports incompatible propositions about the same subject
- Apparent but compatible differences — where records differ without genuine incompatibility
- Institution-specific coverage — what each participating institution has contributed
- Missing evidence categories — what is absent from every institution's admitted records
- Geographic and temporal gaps
- Methodological incompatibilities — where different methods produce results that cannot be directly compared
- Excluded records and the specific reasons for each exclusion

### 5. Stop without

The composition profile must never:
- Choose the "winning" institution
- Weight evidence by institutional reputation or prestige
- Resolve contradictions automatically
- Recommend policy
- Promote findings into accepted knowledge
- Write back into any institution's scientific memory
- Produce a verdict

## Essential evidence record fields

Every included evidence record must preserve institutional provenance at the record level — not as a general label but as structured, traceable fields:

```typescript
interface AgrCrossInstitutionalEvidenceRecord {
  evidenceRecordId: string;
  evidenceRecordVersion: number;

  // Institutional provenance — travels with every record
  institutionId: string;
  institutionWorkspaceId: string;
  sourceRecordId: string;
  sourceAuthority: string;

  // Scientific content
  subjectKey: string;
  treatmentLabel: string;
  location: string;
  dateObserved: string;
  measuredValue: unknown;
  unit: string;
  outcomePolarity:
    | "POSITIVE"
    | "NEGATIVE"
    | "NEUTRAL"
    | "INCONCLUSIVE";

  // Method and provenance
  methodologyReference: string;
  provenanceChain: string[];

  // Admission record — links back to CAP-04
  admissionDecisionId: string;
  admittedAt: string;

  // Access control
  accessClassification: string;
  sharingAuthority: string;

  // Version at time of landscape generation
  representationVersion: string;
}
```

Institutional provenance is data — not a weighting factor. Two records from different institutions covering the same subject, treatment, and location are evaluated by the same CAP-05 logic against the same admission standard. The institution that produced the record does not weight the outcome.

## Permanent binding of landscape results

The landscape result must be permanently bound to:
- The exact evidence record IDs and their versions at the time of generation
- The CAP-04 admission decision IDs for every included record
- The CAP-05 implementation version used
- The evidence cut-off timestamp — immutable
- The participating institution scope — exactly as declared in the request
- Every exclusion and its reason
- Applicable access limitations

This prevents later evidence admissions from silently rewriting what the landscape showed when it was generated. A landscape produced today remains a permanent, retrievable record of what the evidence showed today — not what it shows after future admissions.

```typescript
interface AgrCrossInstitutionalLandscapeResult {
  landscapeId: string;
  generatedAt: string;
  generatorVersion: string;

  // Permanent binding — immutable after generation
  binding: {
    evidenceCutOff: string;
    participatingInstitutionIds: string[];
    includedRecordIds: string[];
    includedRecordVersions: Record<string, number>;
    admissionDecisionIds: string[];
    cap05ImplementationVersion: string;
    excludedRecordIds: string[];
    exclusionReasons: Record<string, string>;
    accessLimitations: string[];
  };

  // The landscape itself
  landscape: {
    areasOfAgreement: AgrEvidenceLandscapeArea[];
    materialContradictions: AgrEvidenceContradiction[];
    apparentButCompatibleDifferences: AgrEvidenceDifference[];
    institutionCoverage: Record<string, AgrInstitutionCoverageRecord>;
    missingEvidenceCategories: string[];
    geographicGaps: AgrGeographicGap[];
    temporalGaps: AgrTemporalGap[];
    methodologicalIncompatibilities: AgrMethodologicalIncompatibility[];
  };

  // Authority boundary — present on every result
  authorityBoundary: {
    advisoryOnly: true;
    noVerdictProduced: true;
    noInstitutionRanked: true;
    noContradictionResolved: true;
    noPolicyRecommendation: true;
    noKnowledgePromotion: true;
    noWriteBackToInstitutionalMemory: true;
    institutionalProvenanceIsDataNotWeighting: true;
  };
}
```

## What the landscape shows — honest examples

**For a Thai rubber yield subject across Kasetsart, ARDA, and three regional stations:**

```
Subject: Rubber yield response to rainfall deficit — Thailand — 2019–2024

Institutions participating: 5 (Kasetsart, ARDA Central, ARDA North,
Chiang Rai Regional Station, Surat Thani Regional Station)

Areas of agreement: All five institutions' admitted records show
yield reduction under rainfall deficit below 1,200mm annual.
Evidence: 23 records across 4 provinces.

Material contradictions: Kasetsart (3 records, 2021–2023) and ARDA
North (2 records, 2022–2023) report incompatible threshold values
for critical deficit onset — 1,100mm vs 1,350mm. Both passed
admission. Contradiction is unresolved. Human review required.

Missing evidence categories: No admitted records from any institution
cover the eastern provinces. No institution has submitted evidence
covering the 2016–2018 baseline period.

Methodological incompatibility: Chiang Rai Regional Station uses a
different rainfall measurement methodology (AWS-hourly) that cannot
be directly compared with the monthly-aggregate methodology used by
all other institutions in this landscape. Excluded from the threshold
contradiction analysis for this reason. Included in coverage record.

Excluded records: 4 records excluded — 2 for evidence cut-off
(admitted after declared cut-off), 2 for access restriction
(Kasetsart workspace restriction applies).
```

That output is more useful to a scientist than any verdict. It tells them exactly what is agreed, what is disputed, what is missing, and what cannot be compared. It does not tell them what to conclude.

## The Vietnam context

Vietnam's 18 fragmented agricultural research institutes — under VAAS (Vietnam Academy of Agricultural Sciences) and its affiliated bodies — conduct overlapping research without a governed mechanism for surfacing contradictions or identifying genuine knowledge gaps. When a ministry needs to make a policy decision, it typically selects findings from whichever institute's results support the preferred conclusion. The problem is not lack of research. The problem is lack of a neutral, governed place to see what the research collectively shows.

AAB's honest uncertainty — surfacing contradictions rather than resolving them, identifying gaps rather than filling them — is precisely the thing that would make VAAS scientists trust it. It does not threaten any institution's findings. It makes every institution's findings more legible by placing them alongside the findings of every other institution.

## Sequencing before implementation

1. ~~Complete independent PR reviews~~ — done
2. ~~Merge PR #18~~ — done at `e24f7f2`
3. ~~Record this candidate design~~ — this document
4. Define provider-neutral interfaces in a full candidate contract
5. Build controlled multi-institution test fixtures — at minimum three institutions, two contradictions, one methodological incompatibility, one excluded record
6. Confirm that CAP-04 and CAP-05 can provide the function through composition
7. Determine whether an independent authority boundary, lifecycle, or disclosure receipt type is required
8. If composition is sufficient — document as a composition profile, no CAP number
9. If genuinely independent function is demonstrated — consider formal admission as CAP-35 or later, after review

## What this document does not establish

- It does not admit this candidate as a canonical capability
- It does not assign a CAP number — designation remains `AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01` until the decisive admission test is passed
- It does not implement, deploy or migrate anything
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production authority
- It does not update the Capability Identity Roster — this is not yet a numbered capability
- The legal and scientific responsibility for any cross-institutional evidence landscape remains with the authorised human reviewer who requests and acts on it
