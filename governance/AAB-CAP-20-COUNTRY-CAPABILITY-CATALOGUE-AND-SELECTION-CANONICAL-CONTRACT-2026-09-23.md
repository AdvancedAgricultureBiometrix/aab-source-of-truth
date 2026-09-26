# CAP-20 — Country Capability Catalogue and Selection — Canonical Contract — 2026-09-23

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Scope:** PLATFORM-WIDE CONTROL PLANE — governs all domains (AGR, SCS, and future domains)
**Authority:** DEFINES THE CONTRACT FOR CAP-20. Establishes no commissioning,
production, Gate D, WP05, scientific-validity or regulatory authority. This
capability is PROPOSED_NOT_ADMITTED. No implementation exists.

## Plain-English boundary statement

CAP-20 assembles, displays, and freezes an attributable view of every AAB
capability across every domain — showing each at its honest maturity status,
with its real availability in a specific jurisdiction, and with a permanent
record of what a buyer was shown when they expressed interest. It owns
presentation and selection. It cannot manufacture implementation, admission,
entitlement, provisioning, or activation status. It always defers to the
authoritative source for facts it does not own.

## The governing rule

> CAP-20 assembles, displays and freezes an attributable view of capability
> availability. It owns presentation and selection, but it cannot manufacture
> implementation, admission, entitlement, provisioning or activation status.

## Platform-wide scope

CAP-20 is not a domain capability. It is a platform-wide control-plane
capability governing catalogue visibility, filtering, selection requests, and
truthful availability disclosure across all domains — AGR, SCS, and every
future domain. Every capability on the platform appears in the CAP-20 catalogue.
Every buyer interaction with the catalogue is governed by CAP-20.

## The critical separation

A capability that is visible is not necessarily requestable.
A capability that is requestable is not necessarily commercially available.
A capability that is commercially available is not necessarily implemented.
A capability that is implemented is not necessarily admitted.
A capability that is admitted is not necessarily provisioned.
A capability that is provisioned is not necessarily activated.
A capability that is activated is not necessarily authorised for a specific user.

These must never be collapsed. A roadmap capability must not appear purchasable
merely because it is visible.

## The nine catalogue status fields

Each catalogue entry carries nine separate status fields. Each field has its
own authoritative source. CAP-20 assembles these fields into a snapshot for
display — it does not own the underlying facts.

| Field | CAP-20 owns? | Authoritative source |
|---|---|---|
| `maturityStatus` | No — derived | Lifecycle, implementation, and admission records |
| `catalogueVisibility` | Yes | CAP-20 catalogue policy |
| `requestabilityStatus` | Yes | CAP-20 selection policy |
| `commercialAvailability` | No — derived | Commercial offer policy, coordinated with CAP-21 |
| `jurisdictionAvailability` | No — derived | Country and jurisdiction policy |
| `implementationStatus` | No — derived | Capability implementation registry |
| `admissionStatus` | No — derived | Capability identity and admission authority |
| `provisioningStatus` | No — derived | Country-environment provisioning authority |
| `activationStatus` | No — derived | Tenant capability-activation registry |

**Note on the fidelity manifest:** The CAP-34 fidelity manifest may provide
evidence about implementation representation, but it does not automatically
become the implementation authority unless its contract explicitly establishes
that role. An entitlement does not prove activation. These meanings remain
separate.

## Catalogue snapshot freshness states

```typescript
type CatalogueSnapshotFreshnessState =
  | "CURRENT"
  | "STALE_REFRESH_REQUIRED"
  | "AUTHORITATIVE_CONFLICT"
  | "SOURCE_UNAVAILABLE"
  | "UNVERIFIABLE_FAIL_CLOSED";
```

A stale or unverifiable record may remain visible for transparency. It must
not appear selectable or activatable as though current.

## Conflict and freshness behaviour

**Admission states.** These are defined in `governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md` and `governance/AAB-CAPABILITY-ADMISSION-REGISTRY-DEFINITION-2026-09-27.md`. None of them counts as `ADMITTED`.
- `ADMISSION_SUSPENDED`: a safety or authority defect affecting the admitted version itself. Use is halted pending human review, and the outcome is not yet determined. It is neither stale nor withdrawn. **A suspended admission makes any Gate D grant that includes the capability stale immediately.**
- `ADMISSION_STALE_REASSESSMENT_REQUIRED`: the admission must be reassessed before it is relied on again.
- `ADMISSION_WITHDRAWN`: the admission was withdrawn by a superseding decision.

**How `maturityStatus` follows these admission states:**
- **`admissionStatus: ADMISSION_STALE_REASSESSMENT_REQUIRED`.** `maturityStatus` is `IMPLEMENTED_NOT_YET_ADMITTED`. `maturityDisclosure.currentMaturityExplanation` must state that the capability was admitted, and that its admission must be reassessed before it is relied on again. It must not read as though the capability had never been admitted.
- **`admissionStatus: ADMISSION_SUSPENDED`.** `maturityStatus` is `ADMISSION_SUSPENDED`, and the two fields agree. `maturityDisclosure.currentMaturityExplanation` must state that use is halted pending human review of a defect, and that the outcome is not yet determined. Neither `IMPLEMENTED_NOT_YET_ADMITTED` nor `ADMISSION_WITHDRAWN` is used for a suspension.
- **`admissionStatus: ADMISSION_WITHDRAWN`.** `maturityStatus` is `ADMISSION_WITHDRAWN`, and the two fields agree. `IMPLEMENTED_NOT_YET_ADMITTED` is never used for a withdrawn admission: withdrawn and never admitted are different states, and conflating them loses information.

The authoritative source always wins. CAP-20 must never present an optimistic
cached value when the authoritative source says otherwise.

| Conflict scenario | Required behaviour |
|---|---|
| Catalogue says ADMITTED, admission registry says NOT_ADMITTED | Display NOT_ADMITTED |
| Admission registry says ADMISSION_SUSPENDED | Display it, with `maturityStatus` `ADMISSION_SUSPENDED` and a disclosure that use is halted pending review; not selectable or activatable; any Gate D grant including the capability is stale |
| Admission registry says ADMISSION_STALE_REASSESSMENT_REQUIRED | Display it, with `maturityStatus` `IMPLEMENTED_NOT_YET_ADMITTED` and a disclosure that reassessment is required; not selectable or activatable as admitted until reassessed |
| Admission registry says ADMISSION_WITHDRAWN | Display it, with `maturityStatus` `ADMISSION_WITHDRAWN`; not selectable or activatable as admitted |
| `maturityStatus` says OPERATIONAL_AND_ADMITTED, admission registry says suspended, stale or withdrawn | The admission registry wins: display `maturityStatus` as the rules above require |
| Catalogue says IMPLEMENTED, implementation authority unavailable | Display IMPLEMENTATION_STATUS_UNVERIFIABLE |
| Entitlement exists, activation registry says inactive | Display NOT_ACTIVATED |
| Commercially available globally, unavailable in this jurisdiction | Display jurisdiction restriction prominently |
| Source versions conflict | Fail closed for selection or activation, disclose the mismatch |

## Core interfaces

### Catalogue entry record

```typescript
interface AabCatalogueEntry {
  // Canonical identity
  catalogueEntryId: string;
  capabilityId: string;
  domainId: string;
  schemaVersion: string;

  // Buyer-facing presentation — CAP-20 owns these
  displayName: string;
  description: string;
  intendedPurpose: string;
  displayOrder?: number;
  displayGroup?: string;

  // Nine status fields — assembled from authoritative sources
  statusSnapshot: {
    maturityStatus:
      | "OPERATIONAL_AND_ADMITTED"
      | "IMPLEMENTED_NOT_YET_ADMITTED"
      | "ADMISSION_SUSPENDED"
      | "ADMISSION_WITHDRAWN"
      | "DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED"
      | "CONCEPT_PREVIEW_NOT_IMPLEMENTED"
      | "RETIRED"
      | "UNAVAILABLE";
    catalogueVisibility:
      | "VISIBLE"
      | "HIDDEN"
      | "VISIBLE_TO_AUTHORISED_PARTIES_ONLY";
    requestabilityStatus:
      | "INTEREST_REQUEST_ALLOWED"
      | "NOT_YET_REQUESTABLE"
      | "REQUESTABLE_BY_AUTHORISED_PARTIES_ONLY"
      | "NOT_REQUESTABLE";
    commercialAvailability:
      | "COMMERCIALLY_AVAILABLE"
      | "PILOT_ONLY"
      | "GRANT_FUNDED_ONLY"
      | "NOT_COMMERCIALLY_AVAILABLE"
      | "AVAILABILITY_UNDER_ASSESSMENT";
    jurisdictionAvailability:
      | "AVAILABLE_IN_THIS_JURISDICTION"
      | "REQUIRES_ASSESSMENT"
      | "NOT_AVAILABLE_IN_THIS_JURISDICTION"
      | "JURISDICTION_UNKNOWN";
    implementationStatus:
      | "IMPLEMENTED_AND_PROVEN"
      | "IMPLEMENTED_NOT_YET_PROVEN"
      | "NOT_IMPLEMENTED"
      | "IMPLEMENTATION_STATUS_UNVERIFIABLE";
    admissionStatus:
      | "ADMITTED"
      | "ADMISSION_SUSPENDED"
      | "ADMISSION_STALE_REASSESSMENT_REQUIRED"
      | "ADMISSION_WITHDRAWN"
      | "ADMISSION_IN_PROGRESS"
      | "NOT_ADMITTED"
      | "ADMISSION_STATUS_UNVERIFIABLE";
    provisioningStatus:
      | "PROVISIONED_IN_THIS_ENVIRONMENT"
      | "PROVISIONING_IN_PROGRESS"
      | "NOT_PROVISIONED"
      | "PROVISIONING_STATUS_UNVERIFIABLE";
    activationStatus:
      | "ACTIVATED_FOR_THIS_TENANT"
      | "ACTIVATION_IN_PROGRESS"
      | "NOT_ACTIVATED"
      | "ACTIVATION_STATUS_UNVERIFIABLE";
  };

  // Authoritative source attribution for each derived field
  statusSources: {
    implementationStatus?: {
      authorityType: "IMPLEMENTATION_REGISTRY";
      recordId: string;
      recordVersion: string;
      observedAt: string;
      freshnessLimitHours: number;
    };
    admissionStatus?: {
      authorityType: "CAPABILITY_ADMISSION_REGISTRY";
      recordId: string;
      recordVersion: string;
      observedAt: string;
      freshnessLimitHours: number;
    };
    commercialAvailability?: {
      authorityType: "COMMERCIAL_OFFER_REGISTRY";
      recordId: string;
      recordVersion: string;
      observedAt: string;
      freshnessLimitHours: number;
    };
    jurisdictionAvailability?: {
      authorityType: "JURISDICTION_POLICY_REGISTRY";
      recordId: string;
      recordVersion: string;
      observedAt: string;
      freshnessLimitHours: number;
    };
    provisioningStatus?: {
      authorityType: "PROVISIONING_AUTHORITY";
      recordId: string;
      recordVersion: string;
      observedAt: string;
      freshnessLimitHours: number;
    };
    activationStatus?: {
      authorityType: "TENANT_ACTIVATION_REGISTRY";
      recordId: string;
      recordVersion: string;
      observedAt: string;
      freshnessLimitHours: number;
    };
  };

  // Conflict resolution outcome if sources disagree
  freshnessState: CatalogueSnapshotFreshnessState;
  conflictResolution?: string;

  // Maturity disclosure — honest, buyer-facing explanation
  maturityDisclosure: {
    currentMaturityExplanation: string;
    whatItWillDo: string;
    whatItCannotDoToday: string;
    estimatedAvailability?: string;
    dependencies: string[];
  };

  // Snapshot identity
  assembledAt: string;
  validUntil: string;
  catalogueSnapshotId: string;
  representationVersion: string;
}
```

### Selection request — permanently bound to what the buyer saw

When an institution expresses interest, the selection request permanently
records the exact catalogue state they were shown. If the capability's status
changes later, the historical record proves what the buyer was told at the time
of their request.

```typescript
interface AabSelectionRequest {
  requestId: string;
  schemaVersion: string;

  // Who is requesting
  requestingOrganisation: {
    organisationId: string;
    organisationName: string;
    organisationType:
      | "GOVERNMENT_AGENCY"
      | "COMMERCIAL_OPERATOR"
      | "COOPERATIVE"
      | "RESEARCH_INSTITUTION"
      | "INDUSTRY_BODY"
      | "DEVELOPMENT_FUNDER"
      | "OTHER";
    countryCode: string;
    jurisdictionCode?: string;
  };

  // What is being selected
  selectedItems: Array<{
    domainId: string;
    capabilityId?: string;
    selectionType: "DOMAIN" | "CAPABILITY";
    // The exact catalogue entry state at time of selection
    catalogueEntryId: string;
    catalogueSnapshotId: string;
    // Status values displayed to the buyer at time of selection
    displayedStatusValues: {
      maturityStatus: string;
      requestabilityStatus: string;
      commercialAvailability: string;
      jurisdictionAvailability: string;
      implementationStatus: string;
      admissionStatus: string;
    };
    authoritySourceVersions: Record<string, string>;
  }>;

  // Disclosures acknowledged by the buyer
  acknowledgedDisclosures: Array<{
    disclosureId: string;
    disclosureText: string;
    acknowledgedAt: string;
  }>;

  // Mandatory explicit acknowledgement
  explicitAcknowledgement: {
    // Selection is not entitlement or activation
    selectionIsNotEntitlement: true;
    selectionIsNotActivation: true;
    selectionIsNotCommercialCommitment: true;
    maturityStatusAcknowledged: true;
    acknowledgedAt: string;
    acknowledgedBy: ActorReference;
  };

  // Request metadata
  requestedAt: string;
  requestStatus:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED_TO_PROCEED"
    | "MODIFIED"
    | "DECLINED"
    | "WITHDRAWN";

  purposeStatement: string;
  additionalContext?: string;
}
```

### Selection request decision

```typescript
interface AabSelectionRequestDecision {
  decisionId: string;
  requestId: string;

  decision:
    | "APPROVED_TO_PROCEED"
    | "APPROVED_WITH_MODIFICATIONS"
    | "DECLINED"
    | "REQUIRES_ADDITIONAL_INFORMATION"
    | "WITHDRAWN";

  reviewedItems: Array<{
    capabilityId: string;
    domainId: string;
    itemDecision:
      | "APPROVED"
      | "APPROVED_WITH_MODIFICATIONS"
      | "DECLINED"
      | "DEFERRED";
    reasons: string[];
  }>;

  decisionReasons: string[];
  modifications?: string[];
  nextSteps?: string[];

  decidedBy: ActorReference; // Shared platform type — defined in platform type registry
  decidedAt: string;

  // Decision is not entitlement
  authorityBoundary: {
    approvalIsNotEntitlement: true;
    approvalIsNotActivation: true;
    approvalIsNotCommercialCommitment: true;
  };
}
```

### Catalogue query — jurisdiction-aware

```typescript
interface AabCatalogueQuery {
  requestingOrganisationId?: string;
  countryCode?: string;
  jurisdictionCode?: string;

  // Filter by domain
  domainIds?: string[];

  // Filter by status
  maturityStatuses?: string[];
  requestabilityStatuses?: string[];
  commercialAvailabilityStatuses?: string[];

  // Display options
  includeRoadmapItems: boolean;
  includeRetiredItems: boolean;
  includeHiddenItems: boolean;

  // Freshness requirement
  requireCurrentSnapshots: boolean;
}

interface AabCatalogueQueryResult {
  entries: AabCatalogueEntry[];
  queryExecutedAt: string;
  jurisdictionCode?: string;
  totalEntries: number;
  staleCatalogueEntryCount: number;
  unverifiableEntryCount: number;

  // If any entries are stale or unverifiable, this is explicit
  catalogueIntegrityStatement: string;
}
```

### What a roadmap capability displays

A capability that is not yet implemented and not yet admitted displays:

```typescript
// Example: SCS-CAP-07 Evidence Source Discovery
{
  statusSnapshot: {
    maturityStatus: "CONCEPT_PREVIEW_NOT_IMPLEMENTED",
    catalogueVisibility: "VISIBLE",
    requestabilityStatus: "INTEREST_REQUEST_ALLOWED",
    commercialAvailability: "NOT_COMMERCIALLY_AVAILABLE",
    jurisdictionAvailability: "REQUIRES_ASSESSMENT",
    implementationStatus: "NOT_IMPLEMENTED",
    admissionStatus: "NOT_ADMITTED",
    provisioningStatus: "NOT_PROVISIONED",
    activationStatus: "NOT_ACTIVATED"
  },
  maturityDisclosure: {
    currentMaturityExplanation: "This capability exists as a concept preview only. No implementation exists. No admission has been granted.",
    whatItWillDo: "For a specific country, commodity and gap type, surface authoritative sources that could provide missing deforestation or custody evidence.",
    whatItCannotDoToday: "Cannot be purchased, provisioned or activated. An interest request may be submitted but does not create a commercial commitment. Cannot provide evidence source recommendations.",
    estimatedAvailability: "Not determined. Depends on prior capability implementation and admission.",
    dependencies: ["SCS-CAP-01", "SCS-CAP-06"]
  }
}
```

A roadmap capability must not display a purchase button, a price, an activation
path, or any implication that it is currently operational.

## Provider-neutral interface

```typescript
interface AabCatalogueProvider {
  queryCatalogue(
    query: AabCatalogueQuery
  ): Promise<AabCatalogueQueryResult>;

  getCatalogueEntry(
    capabilityId: string,
    jurisdictionCode?: string
  ): Promise<AabCatalogueEntry>;

  refreshCatalogueEntry(
    capabilityId: string
  ): Promise<AabCatalogueEntry>;

  submitSelectionRequest(
    request: AabSelectionRequest
  ): Promise<AabSelectionRequestDecision>;

  getSelectionRequest(
    requestId: string
  ): Promise<AabSelectionRequest>;

  updateSelectionRequestStatus(
    requestId: string,
    status: string,
    reason: string,
    updatedBy: ActorReference
  ): Promise<AabSelectionRequest>;

  listSelectionRequestsForOrganisation(
    organisationId: string
  ): Promise<AabSelectionRequest[]>;
}
```

## Failure contract

```typescript
interface AabCatalogueFailure {
  ok: false;
  capabilityId: "CAP-20";
  result: "FAIL_CLOSED";

  error:
    | "CATALOGUE_ENTRY_NOT_FOUND"
    | "CAPABILITY_NOT_REQUESTABLE"
    | "JURISDICTION_NOT_SUPPORTED"
    | "AUTHORITATIVE_SOURCE_CONFLICT"
    | "CATALOGUE_SNAPSHOT_STALE"
    | "SELECTION_ACKNOWLEDGEMENT_INCOMPLETE"
    | "REQUESTING_ORGANISATION_NOT_IDENTIFIED"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  freshnessState?: CatalogueSnapshotFreshnessState;
  noSelectionRecorded: true;
}
```

## CAP-20 catalogue entry for itself

CAP-20 must appear in its own catalogue — honestly.

```typescript
{
  capabilityId: "CAP-20",
  domainId: "PLATFORM",
  displayName: "Country Capability Catalogue and Selection",
  statusSnapshot: {
    maturityStatus: "DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED",
    catalogueVisibility: "VISIBLE",
    requestabilityStatus: "NOT_YET_REQUESTABLE",
    commercialAvailability: "NOT_COMMERCIALLY_AVAILABLE",
    jurisdictionAvailability: "REQUIRES_ASSESSMENT",
    implementationStatus: "NOT_IMPLEMENTED",
    admissionStatus: "NOT_ADMITTED",
    provisioningStatus: "NOT_PROVISIONED",
    activationStatus: "NOT_ACTIVATED"
  }
}
```

## Relationship to CAP-21

CAP-20 governs what is visible and what may be requested. CAP-21 governs what
is commercially agreed and what is entitled. A selection request from CAP-20
may initiate a commercial engagement leading to a CAP-21 entitlement — but the
selection request does not create the entitlement. The entitlement is created
only on execution of a commercial agreement through CAP-21.

## What this document does not establish

- It does not admit CAP-20 as a canonical capability — that requires the
  ten-point admission checklist
- It does not implement, deploy or migrate anything
- It does not create any commercial entitlement for any organisation
- It does not grant any organisation the right to activate any capability
- It does not alter commissioning status, satisfy Gate D, close WP05, or
  grant any production or commissioning authority
- The existing `ACTIVE` and `LAUNCH_RELEASE` fields in the capability identity
  roster record identity completeness status and build-plan scope respectively —
  they do not imply implementation, admission, or commercial availability, and
  must not be used as the sole basis for any buyer-facing maturity claim
