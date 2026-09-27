# AAB-PLATFORM-03 — ActorReference — Canonical Contract — 2026-09-27

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES THE SHARED `ActorReference` TYPE: WHAT IT RECORDS AND ASSERTS, HOW IT RELATES TO DOMAIN PARTIES, HOW REPRESENTATION UNDER A MANDATE IS RECORDED, AND ITS USE IN PLATFORM RECORDS. It grants no role, membership or authority to anyone, admits no capability, and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. Version 1 of the type is the SCS pilot's definition; version 2, defined here, is not implemented.

## Sources

- `scs-pilot/packages/api/src/schemas/shared/actor-reference.schema.json`: the pilot definition, recorded "because no contract defines it"
- `scs-pilot/packages/api/src/foundation/auth.ts`: the pilot authenticator
- `scs-pilot/README.md`: `TODO(actor-reference)`, "before any capability is admitted"
- `identity/contracts/AAB-ID-01` to `AAB-ID-03`: the rehearsal identity doctrine (account link, actor link, membership authority)
- `handovers/AAB-COUNTRY-ONBOARDING-CANONICAL-PATH.md`: "Authentication is not authority"
- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`: identity is a platform primitive, and "SCS domain → AAB platform primitives. Never the reverse."
- every canonical contract that uses `ActorReference`: SCS-CAP-01 to SCS-CAP-09, AAB-PLATFORM-01 and -02, CAP-04, CAP-20 and CAP-21
- the SCS-CAP-02 representation mandate, and the mandate gaps in SCS-CAP-02, SCS-CAP-04 and SCS-CAP-05
- the Gate D, capability admission authority and capability admission registry definitions

## Why this contract is needed

**Every canonical contract uses `ActorReference`, and none defines it.**
- It appears 60 times across 13 canonical contracts: `registeredBy`, `submittedBy`, `decidedBy`, `reviewer`, `storedBy`, `renderedFor` and more.
- CAP-20 says it is a "shared platform type — defined in platform type registry". No such registry exists.
- The SCS pilot records a shape of its own, marked "PILOT DEFINITION": `actorId`, `actorType`, `roles`, an optional `organizationId`, and `authenticationMethod`.
- `TODO(actor-reference)` says it "must be confirmed in a shared contract before any capability is admitted". The admission authority definition lists it as blocking the first admission.

**Three gaps depend on it:**
- **Mandate-based submission.** SCS-CAP-04 and SCS-CAP-05 say: "an authenticated actor is not linked to a CAP-02 party: `ActorReference` has no `partyId`". Until that link exists, only a `COMPLIANCE_OFFICER` may submit, and a cited mandate "never authorises the submission". SCS-CAP-02 has the same gap for representative submission.
- **Scoped authority.** The pilot records roles as unscoped strings from a configuration file. The identity doctrine (ID-03) holds that authority comes only from protected membership records, with country and institution scope "explicit". The two do not meet.
- **Governance records.** Admission records, Gate D decisions, change records and reviewer assessments must name accountable people, some from the platform control plane acting on records in a country's tenancy. The pilot shape cannot say which environment an actor belongs to, or who a person is.

## 1. What an ActorReference is

**An `ActorReference` is the record, captured when an act is performed, of who performed it and on what basis the platform accepted it.** It is written into the record of the act (a receipt, a decision, an admission record) and never changes afterwards. It is a statement about that moment, not a live pointer to an account.

**It asserts exactly four things:**
1. **Identity:** this act was performed by the actor `actorId`, issued by the identity domain `issuer`.
2. **Authentication:** the actor was authenticated for this request by `authenticationMethod`.
3. **Authority basis:** the platform resolved these authority grants for the actor when it accepted the act (`authorityBasis`).
4. **Representation, when present:** the actor acted for a domain subject, under a basis the capability verified in the same transaction (`representation`).

**It does not assert:**
- that the actor's legal identity has been verified;
- that the authority grants were appropriate: only that they were the grants on record when the act was accepted;
- that the actor *is* any party, institution or organisation. An actor is never a party (section 2);
- anything about later acts. Revoking a grant never changes an `ActorReference` already recorded.

### Fields

```typescript
interface ActorReference {
  referenceVersion: "2";

  // Identity: who, and which identity domain issued the identifier
  actorId: string;
  issuer: {
    issuerType: "PLATFORM_CONTROL_PLANE" | "COUNTRY_TENANCY";
    countryCode?: string;              // ISO 3166-1 alpha-2; required for COUNTRY_TENANCY
  };
  actorType: "HUMAN" | "SERVICE";
  authenticationMethod: "STATIC_TOKEN" | "OIDC";

  // Accountability: required whenever the act is a governance decision (section 4)
  accountableName?: string;

  // Authority basis: the grants resolved when the act was accepted
  authorityBasis: Array<{
    role: string;                      // e.g. COMPLIANCE_OFFICER
    scopeType: "PLATFORM" | "COUNTRY" | "INSTITUTION" | "DOMAIN" | "DEPLOYMENT";
    scopeId: string;
    grantId?: string;                  // the membership or grant record, where one exists
  }>;

  // Representation: present only when the actor acts for a domain subject
  representation?: {
    domain: string;                    // e.g. "SCS"
    subjectType: string;               // e.g. "PARTY"
    subjectId: string;                 // e.g. the representative party's id
    actorLinkId: string;               // the actor–subject link (section 2)
    basis?: {
      basisType: string;               // e.g. "MANDATE"
      basisId: string;                 // e.g. the mandate id
      onBehalfOfSubjectId: string;     // e.g. the granting party's id
    };
  };
}
```

**Field rules:**
- **`actorId`** is stable, and unique within its `issuer`. The pair (`issuer`, `actorId`) identifies an actor across the platform.
- **`issuer`** says which identity domain authenticated the actor. The Platform Owner acting on a record in a country's tenancy is issued by `PLATFORM_CONTROL_PLANE`. This is how the onboarding rule holds: the Platform Owner does not become a tenancy member in order to act.
- **`actorType: SERVICE`** is an automated service, for example SCS-CAP-08's compilation service identity. A service never makes a governance decision (section 4).
- **`authenticationMethod`** records how. Changing from static tokens to OIDC changes only this value.
- **`authorityBasis`** replaces the pilot's unscoped `roles`.
  - Each grant names its scope, using the ID-03 scope types plus `DEPLOYMENT` for the pilot.
  - In the pilot, grants come from the actors file with `scopeType: DEPLOYMENT`. They have no `grantId`.
  - Once protected membership records exist, grants come from them, and carry their `grantId`.
  - The authority basis is resolved by the server from protected records. It is never taken from the client, from user metadata or from the request.
- **`representation`** is present only when the act is performed for a domain subject (section 3). The platform defines its shape; the domain defines what a subject and a basis are.
- **`accountableName`** is the actor's name, as recorded in the issuer's identity records, for acts that require a named, accountable person (section 4). It is not included otherwise: it is personal data, and the country's boundary applies to it.

### The pilot definition

**Version 1 is the pilot shape,** with no `referenceVersion` field: `actorId`, `actorType`, `roles`, `organizationId` and `authenticationMethod`.
- Every record already stored with a version 1 reference keeps it, unchanged. Evidence belongs to the state that produced it, and stored records are append-only.
- A reader treats a reference without `referenceVersion` as version 1. It reads `roles` as grants with `scopeType: DEPLOYMENT`, `organizationId` as unverified, and the issuer as the deployment's own.
- New records use version 2 once it is implemented.

## 2. Actors and parties

**An actor is not a party, and a party is not an actor.**

| | Actor | CAP-02 party |
|---|---|---|
| What it is | A person or service that operates AAB and is authenticated by it | An entity in a supply chain: a legal entity, cooperative, community group, government body or natural person |
| Defined by | This contract (platform) | SCS-CAP-02 (SCS domain) |
| Examples | A compliance officer, a regulatory reviewer, the Platform Owner, a compilation service | An operator, a supplier, a smallholder, an aggregator |

- **Most actors are not parties.** The compliance officer, the reviewer, the Platform Owner, an admission reviewer and every service act without being a party.
- **Most parties are never actors.** A smallholder registered as a party may never operate AAB.
- **An actor exists without any party record.** Nothing in this contract requires one.

**When an actor acts for a party, the link is an actor–subject link:** a governed record binding one actor to one domain subject (for SCS, one CAP-02 party). It is a platform concept, defined in its own contract, **AAB-PLATFORM-04 Actor–Subject Link**, which is written after this one. This contract relies on the rules below, which AAB-PLATFORM-04 must keep.
- **It is created by an authorised role, with evidence,** and never by the actor, the browser or user metadata. This follows ID-02: "browser cannot create or alter link".
- **It has a state:** `ACTIVE`, `SUSPENDED`, `REVOKED` or `EXPIRED` (AAB-PLATFORM-04 adds `EXPIRED`, because every link expires). Only an `ACTIVE` link can be used. A missing, ambiguous, suspended, revoked or expired link fails closed.
- **It grants no authority.** It establishes that the actor may act *as or for* the subject. What they may do is decided by the capability, from the actor's authority basis and, for representation, the mandate (ID-02: "account link does not grant authority"; ID-03: "identity link is not authority").
- **One actor may hold links to several subjects** (for example, a staff member of two cooperatives). Each act names the one it is performed for.
- **The link is a platform concept, and domains reference it.** AAB-PLATFORM-04 defines it, naming the subject generically (domain, subject type, subject id). SCS references it for CAP-02 parties, and the platform never reads CAP-02. Specifying it inside a CAP-02 amendment would embed a platform primitive in a domain contract, reversing the dependency direction the separation decision requires.

## 3. Mandate-based submission

**How a logged-in actor proves they are acting under a CAP-02 mandate:**

1. **The actor authenticates.** The platform builds the `ActorReference`, with `issuer` and `authorityBasis` resolved from protected records.
2. **The request names who the actor acts for, and on what basis:** the representative party, the mandate, and the granting party.
3. **The capability verifies, in the same transaction and snapshot as the act,** failing closed at the first unmet check:
   1. **An `ACTIVE` actor–party link** binds this actor to the representative party.
   2. **The mandate exists,** and its `representativePartyId` is that party, and its `grantingPartyId` is the party acted for.
   3. **The mandate is current:** `NOT_REVOKED`, and the act falls within `validFrom` and `validUntil`.
   4. **The mandate permits the act:** its `permittedActions` include the capability's action (for example `SUBMIT_CUSTODY_EVIDENCE`).
   5. **The act is within the mandate's scope:** its framework, commodity and geography fall within the mandate's `frameworkAssociationIds`, `commodityScope` and `geographicScope`.
   6. **The governing relationship is `ACTIVE`** between the two parties, as SCS-CAP-02 requires for the mandate.
   7. **The mandate is `VERIFIED_FOR_DECLARED_SCOPE`.** A mandate that is `CLAIMED_UNVERIFIED`, `EVIDENCE_SUBMITTED`, `PARTIALLY_VERIFIED`, `DISPUTED` or `FAIL_CLOSED` is insufficient for representation. The act is refused; it is not accepted with a disclosed limitation.
   8. **The actor's authority basis includes `PARTY_REPRESENTATIVE`,** in a scope that covers the act.
4. **The capability records the result.** The `ActorReference` carries `representation`, with the link, the representative party, the mandate and the granting party. The decision records which checks passed.

**`PARTY_REPRESENTATIVE` is a role of its own.**
- The existing submission roles, such as `COMPLIANCE_OFFICER`, assert the actor's own authority. A representative acts for someone else under a mandate, which is a structurally different claim, so it never shares a role name with direct authority.
- A representative act requires `PARTY_REPRESENTATIVE` and passes all eight checks. It never proceeds on a direct-authority role instead.
- A direct act never proceeds on `PARTY_REPRESENTATIVE`.
- The role appears in every representative act's receipt and audit record, so the two kinds of act are distinguishable wherever they are read.

**What this changes, and what it does not:**
- **It closes the actor–party gap** stated in SCS-CAP-02, SCS-CAP-04 and SCS-CAP-05, once each contract adopts it. That adoption is an amendment to each contract.
- **A mandate never authorises anything outside itself.** SCS-CAP-02's `authorityBoundary` still applies: a mandate does not permit approving the granting party, altering its identity, making legal declarations without explicit authority, or reuse outside its declared scope.
- **A cited mandate that fails any check refuses the act.** It is never recorded as a limitation and accepted anyway. This differs from the pilot today, where SCS-CAP-05 records a cited mandate but it "never authorises the submission".

## 4. Platform uses

**Every platform record that names an actor uses this contract.** The requirements depend on what the record is.

| Record | Actor field | Additional requirement |
|---|---|---|
| Decision receipts (every governed write) | the receipt's `actor` | None beyond this contract |
| Idempotency records | the actor's identity | Keyed by `actorId`, which is unique while a deployment has one issuer. `TODO(multi-issuer-idempotency)`: when a second issuer first acts in a deployment, keys become (`issuer`, `actorId`), by a migration defined at that point. |
| Evidence objects, renditions (AAB-PLATFORM-01, -02) | `storedBy`, `renderedFor` | None beyond this contract |
| Capability decisions (for example CAP-09 review decisions) | `decidedBy`, `reviewer`, `assessedBy` | As each capability's contract requires |
| **Capability admission records** | each party's decision | **Governance decision:** `HUMAN`, `accountableName` present, and the decision signed |
| **Change and resolution records** (admission registry) | the signing parties | **Governance decision** |
| **Independent reviewer assessments** (admission and Gate D) | the reviewer | **Governance decision** |
| **Gate D decisions** | the Platform Owner, the reviewer | **Governance decision** |
| **Actor–subject link creation and status records** (AAB-PLATFORM-04) | `createdBy`, and the writer of each status record | **Governance decision** |
| Commercial and catalogue records (CAP-20, CAP-21) | `decidedBy`, `createdBy`, `changedBy` | As each contract requires |

**Governance decisions and operational acts.**
- **Governance decisions** create permanent platform records: admission decisions, Gate D decisions, change classifications, resolutions, reviewer assessments, and actor–subject link creation and status records (AAB-PLATFORM-04). They require a named, accountable human.
- **Operational acts** within a country's tenancy (receipts, submissions, capability decisions) are identified by `actorId` and `issuer`. That is sufficient for audit, and no personal name leaves the country's boundary for them.

**For a governance decision:**
- **The actor is `HUMAN`,** never `SERVICE`. Approval is never automated.
- **`accountableName` is present.** The reviewer criteria require a reviewer who is "named and accountable — not anonymous", and the same holds for every party to a governance decision.
- **The `ActorReference` identifies the actor, and the signature proves the decision.** The record's signature, required by the registry and Gate D definitions, is separate from the `ActorReference` and verified against the actor's key.
- **The issuer is recorded.** A country-scoped admission record in a country's tenancy may carry a Platform Owner reference issued by `PLATFORM_CONTROL_PLANE`, and a country representative issued by `COUNTRY_TENANCY`. Neither issuer's identity records are copied across the boundary.

## 5. Failure rules

- **No actor, no act.** A request without a valid, authenticated `ActorReference` is refused (`UNAUTHENTICATED`, as in the pilot).
- **The client never supplies authority.** An `authorityBasis` taken from a request, the browser or user metadata is refused.
- **Representation fails closed.** A missing, ambiguous, suspended or revoked actor–subject link, or any failed mandate check, refuses the act.
- **A governance decision without a human, a name or a valid signature is not a decision.**
- **References are immutable.** A stored `ActorReference` is never rewritten, including when version 2 replaces version 1.

## What this contract does not establish

- It grants no role, membership, link or authority to anyone.
- It does not define the protected membership records, or the actor–subject link store. It defines only their use.
- It does not amend SCS-CAP-02, SCS-CAP-04 or SCS-CAP-05. Each adopts section 3 by its own amendment.
- It does not implement version 2, or change any stored record.
- It does not admit any capability, or satisfy admission's `ActorReference` prerequisite until it is itself reviewed and adopted.

## Decisions recorded on 2026-09-27

1. **Numbering.** Platform contracts are numbered `AAB-PLATFORM-NN`. This contract is `AAB-PLATFORM-03`. `SCS-PLATFORM-01` and `SCS-PLATFORM-02` carry the wrong prefix, because they were written before the platform–domain separation was formalised. They are renamed `AAB-PLATFORM-01` (Evidence Object Store) and `AAB-PLATFORM-02` (Governed Document Rendition) in a follow-up commit.
2. **Scoped authority.** `authorityBasis`, with scoped grants, replaces the pilot's unscoped `roles`, closing the clash with the identity doctrine. The pilot's actors-file roles were a deliberate TODO, which this contract closes. Version 1 records stay unchanged and readable.
3. **Mandate verification.** A mandate must be `VERIFIED_FOR_DECLARED_SCOPE` before anyone acts under it for a governed act. Any lesser status is insufficient for representation, and is never a disclosed limitation (section 3, check 7).
4. **`PARTY_REPRESENTATIVE`** is a new role for acting under a mandate, never shared with direct-authority roles (section 3).
5. **`accountableName`** is required for governance decisions, and absent otherwise (section 4).
6. **The actor–subject link** has its own platform contract, AAB-PLATFORM-04, defined after this one. It is not a CAP-02 amendment (section 2).
7. **Idempotency keys** stay keyed by `actorId` until a second issuer first acts in a deployment: `TODO(multi-issuer-idempotency)`, in this contract and in the code (section 4).

## Follow-up work

- **Rename `SCS-PLATFORM-01` and `SCS-PLATFORM-02`** to `AAB-PLATFORM-01` (Evidence Object Store) and `AAB-PLATFORM-02` (Governed Document Rendition), in a follow-up commit. The rename covers the contract files, their HTML, and every reference to them in contracts, READMEs, code comments and error attributions. Records already stored keep the identifiers they were written with. *Done on 2026-09-27, with migration 020 reissuing the two table comments. Left for their own changes: the runtime error attribution `SCS-PLATFORM`, which waits for extraction, and the PDF metadata below.*
- **The PDF metadata written by the AAB-PLATFORM-02 renderer** (`Producer` and `Creator`) still reads `SCS-PLATFORM-02`, with the matching font-check error message. Changing it changes the bytes of every new PDF and the cross-platform rendition digest, so it is its own change: a new expected digest, a renderer version bump, and the digest re-verified across platforms.
- **AAB-PLATFORM-04 Actor–Subject Link:** its own contract. *Defined on 2026-09-27; it makes link creation and link status records governance decisions, added to section 4.*
- **Amendments adopting section 3** in SCS-CAP-02, SCS-CAP-04 and SCS-CAP-05.

## Open items

- **Protected membership records** for the SCS pilot, replacing the actors file's roles as the source of `authorityBasis`.
- **The actor–subject link store,** once AAB-PLATFORM-04 defines it.
- **Signing keys** for governance decisions (shared with the registry and Gate D open items).
- **Implementing version 2** in the pilot: the schema, the authenticator and the readers of version 1 records.
- **`PARTY_REPRESENTATIVE`** added to the role registry (`TODO(role-registry)`) when the role registry exists.
