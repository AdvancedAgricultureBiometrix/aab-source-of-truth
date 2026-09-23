# CAP-21 — Commercial Agreement and Entitlement Management — Canonical Contract — 2026-09-23

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Scope:** PLATFORM-WIDE CONTROL PLANE — governs all domains (AGR, SCS, and future domains)
**Authority:** DEFINES THE CONTRACT FOR CAP-21. Establishes no commissioning,
production, Gate D, WP05, scientific-validity or regulatory authority. This
capability is PROPOSED_NOT_ADMITTED. No implementation exists.

## Plain-English boundary statement

CAP-21 governs two distinct instruments: the country deployment agreement, which
authorises whether and under what sovereignty conditions AAB may operate a
country environment; and the participant entitlement, which defines what a
specific organisation may access within that environment. It stores entitlement
scope, term, sponsor, and status — with a reference to an external commercial
agreement where financial terms live. It does not store prices. It does not
perform provisioning, capability activation, or user authorisation. Every state
change receives a permanent, attributable record.

## The governing rule

> The country agreement authorises the existence and governance conditions of
> the environment. The participant entitlement defines an organisation's
> contractual scope within it. Neither instrument performs provisioning,
> capability activation or user authorisation.

## Platform-wide scope

CAP-21 is not a domain capability. It is a platform-wide control-plane
capability governing commercial agreements and entitlements across all domains —
AGR, SCS, and every future domain. Every country deployment and every
participant entitlement on the platform is governed by CAP-21.

## Two separate instruments

| Instrument | Governs |
|---|---|
| `CountryDeploymentAgreement` | Whether and under what sovereignty conditions AAB may operate a country environment |
| `ParticipantEntitlement` | What a specific organisation may access within that environment |

These are not variants of the same legal and governance object. They differ in
purpose, authority, parties, scope, lifecycle, termination conditions, and
consequences. They are linked by reference — not merged into a single record.

```
ParticipantEntitlement.countryDeploymentAgreementId → CountryDeploymentAgreement
```

A participant entitlement cannot exist in an active operational state unless
its referenced country deployment agreement is valid and permits that
participant type and capability scope. But it must remain its own record,
independently versioned and independently auditable.

## Dependency rules

CAP-21 enforces these distinctions across all operations:

- An active country agreement does not automatically entitle any participant
- An active participant entitlement does not activate a capability
- A capability may be entitled only if commercially permitted, but entitlement
  still does not prove implementation, admission, provisioning or user
  authorisation
- Suspending one participant must not suspend unrelated participants
- Suspending the country deployment prevents operational reliance on participant
  entitlements, but does not delete or rewrite them
- Termination preserves all historical agreements, receipts and evidence
- Expiry must not erase access needed for legally required retention, audit,
  export or dispute handling
- A replacement agreement supersedes the prior record — it does not mutate
  its historical terms

## The entitlementStatus / operabilityStatus separation

When a country agreement is suspended, participant entitlements become
operationally unusable — but their commercial state must not be silently
changed. Both dimensions are recorded:

```typescript
{
  entitlementStatus: "ACTIVE",       // The contractual entitlement is still valid
  operabilityStatus: "BLOCKED_BY_COUNTRY_AGREEMENT",  // But it cannot be used
  blockingAgreementId: "country-agreement-..."
}
```

This preserves the truth: the participant may still possess an unexpired
contractual entitlement, while the country-level governance conditions
prevent its use. Conflating these two dimensions would destroy the evidentiary
record of what was commercially agreed.

## Core interface 1 — Country Deployment Agreement

```typescript
interface AabCountryDeploymentAgreement {
  // Canonical identity
  agreementId: string;
  agreementVersion: number;
  schemaVersion: string;

  // Country and jurisdiction
  countryCode: string;
  jurisdictionCodes: string[];
  deploymentPurpose: string;

  // Parties
  parties: {
    tenantOwner: {
      organisationId: string;
      organisationName: string;
      organisationType: string;
      countryCode: string;
    };
    contractingParty: {
      organisationId: string;
      organisationName: string;
      authorisedSignatoryId: string;
      authorisedSignatoryName: string;
    };
    countryAuthority?: {
      organisationId: string;
      organisationName: string;
      authorityBasis: string;
    };
    aabSignatory: {
      authorisedSignatoryId: string;
      authorisedSignatoryName: string;
    };
  };

  // Sovereignty and data requirements
  sovereigntyRequirements: {
    dataResidencyCountryCode: string;
    permittedInfrastructureProviders: string[];
    administrativeIsolationRequired: boolean;
    isolationDescription?: string;
    sovereigntyResponsibilities: string[];
    custodyResponsibilities: string[];
    auditObligations: string[];
    governanceObligations: string[];
  };

  // What is permitted under this agreement
  permittedScope: {
    domainIds: string[];
    permittedParticipantCategories: Array<
      | "GOVERNMENT_AGENCY"
      | "COMMERCIAL_OPERATOR"
      | "COOPERATIVE"
      | "RESEARCH_INSTITUTION"
      | "INDUSTRY_BODY"
      | "DEVELOPMENT_FUNDER"
      | "OTHER"
    >;
    infrastructureResponsibility:
      | "AAB_MANAGED"
      | "TENANT_MANAGED"
      | "JOINTLY_MANAGED";
  };

  // Term
  effectiveDate: string;
  expiryDate?: string;
  renewalTerms?: string;

  // Commercial reference — financial terms live outside the platform
  externalAgreementReference: {
    documentId: string;
    documentTitle: string;
    executedAt: string;
    parties: string[];
  };

  // Exit and termination
  exitProvisions: {
    terminationNoticePeriodDays: number;
    suspensionConditions: string[];
    terminationConditions: string[];
    dataReturnRequirements: string;
    dataRetentionPeriodDays: number;
    dataExportFormat?: string;
    dataDeletionRequirements: string;
  };

  // Lifecycle state
  agreementStatus:
    | "DRAFT"
    | "UNDER_REVIEW"
    | "APPROVED_NOT_EFFECTIVE"
    | "ACTIVE"
    | "SUSPENDED"
    | "EXPIRING"
    | "EXPIRED"
    | "TERMINATED"
    | "SUPERSEDED"
    | "FAIL_CLOSED";

  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: ActorReference;

  terminationReason?: string;
  terminatedAt?: string;
  terminatedBy?: ActorReference;

  // Supersession — replacement does not mutate historical terms
  supersedesAgreementId?: string;
  supersededByAgreementId?: string;
  supersededAt?: string;
  supersessionReason?: string;

  // Provenance
  createdAt: string;
  createdBy: ActorReference;
  lastModifiedAt: string;
  lastModifiedBy: ActorReference;
  representationVersion: string;
}
```

### Country deployment agreement states

| State | Meaning |
|---|---|
| `DRAFT` | Being prepared — not yet under review |
| `UNDER_REVIEW` | Submitted for review — not yet approved |
| `APPROVED_NOT_EFFECTIVE` | Approved but effective date not yet reached |
| `ACTIVE` | In force — country environment may operate |
| `SUSPENDED` | Temporarily inoperative — participant entitlements blocked but not deleted |
| `EXPIRING` | Within notice period — no new participant entitlements may be created |
| `EXPIRED` | Term ended — access for legally required retention only |
| `TERMINATED` | Ended for cause — all records preserved |
| `SUPERSEDED` | Replaced by a new agreement — historical record preserved |
| `FAIL_CLOSED` | Unresolvable state — requires human intervention |

## Core interface 2 — Participant Entitlement

```typescript
interface AabParticipantEntitlement {
  // Canonical identity
  entitlementId: string;
  entitlementVersion: number;
  schemaVersion: string;

  // Link to country deployment — required
  countryDeploymentAgreementId: string;
  countryDeploymentAgreementVersion: number;
  tenantId: string;
  jurisdictionCode: string;

  // Parties
  parties: {
    participantOrganisation: {
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
    };
    // Beneficiary if different from participant
    beneficiaryOrganisation?: {
      organisationId: string;
      organisationName: string;
    };
    // Who is paying or sponsoring
    payingParty: {
      organisationId: string;
      organisationName: string;
      paymentBasis:
        | "DIRECT_COMMERCIAL"
        | "GOVERNMENT_FUNDED"
        | "DEVELOPMENT_GRANT"
        | "EXPORTER_SPONSORED"
        | "STRATEGIC_SUBSIDY"
        | "OTHER";
    };
    contractingParty: {
      organisationId: string;
      authorisedSignatoryId: string;
      authorisedSignatoryName: string;
    };
    sponsoringParty?: {
      organisationId: string;
      sponsorshipBasis: string;
      // Subsidies are explicit — never unexplained
      // Subsidy amounts and currency live in the external commercial agreement
      subsidySource: string;
    };
  };

  // What is entitled — by domain and capability version
  entitledScope: {
    domainEntitlements: Array<{
      domainId: string;
      entitlementType: "FULL_DOMAIN" | "SPECIFIED_CAPABILITIES_ONLY";
      entitledCapabilityIds?: string[];
      capabilityVersionConstraints?: Record<string, string>;
    }>;
    permittedUsageScope: string;
    volumeLimits?: {
      maxPlotsRegistered?: number;
      maxSuppliersRegistered?: number;
      maxEvidenceRecordsPerMonth?: number;
      maxDueDiligencePackagesPerMonth?: number;
      maxUsersAuthorised?: number;
    };
  };

  // Term
  effectiveDate: string;
  expiryDate?: string;
  renewalTerms?: string;

  // Dependencies and restrictions
  dependencies: string[];
  restrictions: string[];

  // Audit trail from initial interest to commercial commitment
  originatingSelectionRequestId?: string;

  // Commercial reference — financial terms live outside the platform
  externalAgreementReference: {
    documentId: string;
    documentTitle: string;
    executedAt: string;
  };

  // Lifecycle state — commercial dimension
  entitlementStatus:
    | "REQUESTED"
    | "UNDER_REVIEW"
    | "APPROVED_NOT_ACTIVE"
    | "ACTIVE"
    | "SUSPENDED"
    | "EXPIRED"
    | "TERMINATED"
    | "SUPERSEDED"
    | "FAIL_CLOSED";

  // Operability dimension — separate from commercial state
  // When a country agreement is suspended, entitlements become blocked
  // without their commercial state changing
  operabilityStatus:
    | "OPERABLE"
    | "BLOCKED_BY_COUNTRY_AGREEMENT"
    | "BLOCKED_PENDING_PROVISIONING"
    | "BLOCKED_PENDING_GOVERNANCE_APPROVAL"
    | "INOPERABLE";

  blockingAgreementId?: string;
  operabilityBlockReason?: string;

  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: ActorReference;

  terminationReason?: string;
  terminatedAt?: string;
  terminatedBy?: ActorReference;

  // Supersession — replacement does not mutate historical terms
  supersedesEntitlementId?: string;
  supersededByEntitlementId?: string;
  supersededAt?: string;
  supersessionReason?: string;

  // Provenance
  createdAt: string;
  createdBy: ActorReference;
  lastModifiedAt: string;
  lastModifiedBy: ActorReference;
  representationVersion: string;
}
```

### Participant entitlement states

| State | Meaning |
|---|---|
| `REQUESTED` | Entitlement requested following a CAP-20 selection request |
| `UNDER_REVIEW` | Commercial and governance review in progress |
| `APPROVED_NOT_ACTIVE` | Approved but effective date not yet reached |
| `ACTIVE` | Commercially entitled — subject to operabilityStatus |
| `SUSPENDED` | Commercially suspended — operabilityStatus is INOPERABLE |
| `EXPIRED` | Term ended — access for legally required retention only |
| `TERMINATED` | Ended for cause — all records preserved |
| `SUPERSEDED` | Replaced by a new entitlement — historical record preserved |
| `FAIL_CLOSED` | Unresolvable state — requires human intervention |

### Operability states

| State | Meaning |
|---|---|
| `OPERABLE` | Entitlement is active and country conditions permit use |
| `BLOCKED_BY_COUNTRY_AGREEMENT` | Country agreement suspended — entitlement valid but unusable |
| `BLOCKED_PENDING_PROVISIONING` | Entitlement active — provisioning not yet complete |
| `BLOCKED_PENDING_GOVERNANCE_APPROVAL` | Entitlement active — governance approval pending |
| `INOPERABLE` | Entitlement suspended or terminated |

## Attributable record — every state change

Every state change to either instrument must produce a permanent, attributable
record. No state change is unrecorded.

```typescript
interface AabEntitlementStateChange {
  changeId: string;
  instrumentType: "COUNTRY_DEPLOYMENT_AGREEMENT" | "PARTICIPANT_ENTITLEMENT";
  instrumentId: string;
  instrumentVersion: number;

  previousState: string;
  newState: string;
  previousOperabilityStatus?: string;
  newOperabilityStatus?: string;

  changeReason: string;
  changeAuthority: string;
  changedBy: ActorReference;
  changedAt: string;

  // What triggered this change
  trigger:
    | "COMMERCIAL_DECISION"
    | "GOVERNANCE_DECISION"
    | "COUNTRY_AGREEMENT_STATE_CHANGE"
    | "EXPIRY"
    | "SUPERSESSION"
    | "SYSTEM_ENFORCEMENT"
    | "HUMAN_OVERRIDE";

  triggeringInstrumentId?: string;
  evidence: string[];
  notes?: string;
}
```

## Provider-neutral interface

```typescript
interface AabEntitlementProvider {
  // Country deployment agreements
  createCountryDeploymentAgreement(
    agreement: AabCountryDeploymentAgreement
  ): Promise<AabCountryDeploymentAgreement>;

  getCountryDeploymentAgreement(
    agreementId: string,
    version?: number
  ): Promise<AabCountryDeploymentAgreement>;

  updateCountryDeploymentAgreementStatus(
    agreementId: string,
    newStatus: string,
    reason: string,
    updatedBy: ActorReference
  ): Promise<AabCountryDeploymentAgreement>;

  supersedeCountryDeploymentAgreement(
    priorAgreementId: string,
    replacementAgreement: AabCountryDeploymentAgreement,
    supersessionReason: string,
    updatedBy: ActorReference
  ): Promise<AabCountryDeploymentAgreement>;

  // Participant entitlements
  createParticipantEntitlement(
    entitlement: AabParticipantEntitlement
  ): Promise<AabParticipantEntitlement>;

  getParticipantEntitlement(
    entitlementId: string,
    version?: number
  ): Promise<AabParticipantEntitlement>;

  updateParticipantEntitlementStatus(
    entitlementId: string,
    newEntitlementStatus: string,
    newOperabilityStatus: string,
    reason: string,
    updatedBy: ActorReference
  ): Promise<AabParticipantEntitlement>;

  listParticipantEntitlementsForCountry(
    countryDeploymentAgreementId: string
  ): Promise<AabParticipantEntitlement[]>;

  listParticipantEntitlementsForOrganisation(
    organisationId: string
  ): Promise<AabParticipantEntitlement[]>;

  // State change history
  getStateChangeHistory(
    instrumentType: string,
    instrumentId: string
  ): Promise<AabEntitlementStateChange[]>;

  // Cascade — when country agreement is suspended
  // Updates operabilityStatus of all participant entitlements
  // without changing their entitlementStatus
  propagateCountryAgreementSuspension(
    agreementId: string,
    suspensionReason: string,
    suspendedBy: ActorReference
  ): Promise<{
    agreementId: string;
    affectedEntitlementIds: string[];
    newOperabilityStatus: "BLOCKED_BY_COUNTRY_AGREEMENT";
  }>;
}
```

## Failure contract

```typescript
interface AabEntitlementFailure {
  ok: false;
  capabilityId: "CAP-21";
  result: "FAIL_CLOSED";

  error:
    | "COUNTRY_DEPLOYMENT_AGREEMENT_NOT_FOUND"
    | "COUNTRY_DEPLOYMENT_AGREEMENT_NOT_ACTIVE"
    | "PARTICIPANT_CATEGORY_NOT_PERMITTED"
    | "CAPABILITY_SCOPE_EXCEEDS_AGREEMENT"
    | "ENTITLEMENT_NOT_FOUND"
    | "ENTITLEMENT_NOT_ACTIVE"
    | "ENTITLEMENT_BLOCKED_BY_COUNTRY_AGREEMENT"
    | "COMMERCIAL_AGREEMENT_REFERENCE_MISSING"
    | "AUTHORISED_SIGNATORY_NOT_VERIFIED"
    | "SUPERSESSION_REQUIRES_ACTIVE_PRIOR_AGREEMENT"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  noWrites: true;
}
```

## Relationship to CAP-20

A selection request from CAP-20 may initiate a commercial engagement leading
to a CAP-21 entitlement. The selection request does not create the entitlement.
The entitlement is created only on execution of a commercial agreement. The
selection request ID may be referenced in the entitlement record to preserve
the audit trail from initial interest to commercial commitment.

## Relationship to pricing principles

CAP-21 does not store prices. All financial terms live in the external
commercial agreement referenced by `externalAgreementReference`. The pricing
principles in `governance/AAB-COMMERCIAL-PRICING-PRINCIPLES-2026-09-23.md`
govern how the external commercial agreement is negotiated and structured.
Subsidies must appear explicitly in the `sponsoringParty.subsidySource` field
and related fields — never as unexplained discounts.

## What this document does not establish

- It does not admit CAP-21 as a canonical capability — that requires the
  ten-point admission checklist
- It does not implement, deploy or migrate anything
- It does not create any commercial entitlement for any organisation
- It does not grant any organisation the right to activate any capability
- An active participant entitlement does not prove capability implementation,
  admission, provisioning, or user authorisation
- It does not alter commissioning status, satisfy Gate D, close WP05, or
  grant any production or commissioning authority
- Expiry of an entitlement must not erase access needed for legally required
  retention, audit, export or dispute handling
- Termination preserves all historical agreements, receipts and evidence —
  records are never deleted on termination
