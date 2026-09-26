# AAB Capability Admission Registry — Definition — 2026-09-27

**Status:** GOVERNANCE DEFINITION
**Authority:** DEFINES WHERE CAPABILITY ADMISSION DECISIONS ARE RECORDED, WHAT EACH RECORD HOLDS, HOW A CHANGE TO AN ADMITTED CAPABILITY IS CLASSIFIED, AND HOW ADMISSION STATUS IS READ. This document admits no capability, creates no record, activates nothing, and establishes no platform-wide governance authority.
**Sources:**
- `governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md`
- `governance/AAB-CAP-20-COUNTRY-CAPABILITY-CATALOGUE-AND-SELECTION-CANONICAL-CONTRACT-2026-09-23.md` (the `CAPABILITY_ADMISSION_REGISTRY` as the authoritative source of admission status)
- `governance/AAB-GATE-D-DEPLOYMENT-QUALIFICATION-DEFINITION-2026-09-27.md`
- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md` (receipts, derived currency, append-only records)
- `governance/AAB-COUNTRY-ISOLATION-ARCHITECTURE-2026-09-22.md` and `governance/AAB-PLATFORM-AND-COUNTRY-ISOLATION-ARCHITECTURE-2026-09-12.md`
- `governance/workstream-b/AAB-WORKSTREAM-B-CAPABILITY-LANDSCAPE-LAUNCH-GAP-FREEZE-2026-09-19.md` (evidence belongs to the state that produced it)
- the Platform Owner's decisions of 2026-09-27 on the pilot admission authority, the location of decisions, re-admission and scope extension, recorded below

## Why this definition is needed

**The admission authority definition names a registry that does not exist.**
- It requires every admission to be recorded "in the capability admission registry", and makes that registry authoritative for admission status everywhere.
- CAP-20 names it as `CAPABILITY_ADMISSION_REGISTRY`, the source for `admissionStatus`, and requires that it wins over any other claim.
- No document defines what the registry holds, where it lives, who writes to it, or how a change to an admitted capability is handled.

**Without it, an admission decision has nowhere to land.** It is the first of the three items blocking the first admission.

## Decisions recorded on 2026-09-27

These decisions were made by the Platform Owner in review. This definition implements them.

1. **The pilot admission authority.**
   - For the first country pilot, admission requires two recorded human decisions: the Platform Owner, and an authorised representative of the founding country institution.
   - An independent reviewer supplies a recorded assessment, but does not grant admission.
   - Neither party can admit alone.
   - The joint decision is scoped to that country, capability, contract version and implementation commit. It creates no platform-wide admission or commissioning authority.
   - It is time-limited and scope-limited. It is not a permanent model, and it is not the platform-wide governance authority by default.
   - When a platform-wide governance authority is established, it supersedes the pilot arrangement.
2. **Where decisions live.**
   - A platform admission record, when that authority exists, lives in the governed platform control plane.
   - The pilot's country-scoped admission, and any later activation decision, live in the country's isolated tenancy.
   - They are separate record types: *admitted for this scope*, and *activated in this country*.
   - Activation references the exact admitted version, and requires its own country authority and commissioning gate.
   - A platform record cannot write to or activate a country tenancy automatically.
3. **Re-admission.** An admission is bound to the assessed contract version, implementation commit, dependencies and approved scope. Every proposed change receives a recorded change classification, rationale, evidence and human sign-off (section 5).
4. **Scope extension.** Proposing the same capability version for a wider scope than was assessed, for example SCS-CAP-06 for a second commodity or jurisdiction without changing the implementation, is its own classification. It is not a material change to the capability, but it requires its own assessment of whether the existing proof covers the new scope.
5. **Traceable authority.** Every admission record names the authority body that made the decision, so the transition from the pilot arrangement to a platform-wide authority can be traced.
6. **Status is derived, not stored.** A digest-covered record cannot hold mutable values. Change classifications are separate change records, and status is derived when read from the admission record and the change records against it. This is the same pattern as currency in SCS-CAP-09 and verification status in SCS-CAP-02.
7. **Suspension is its own state.** A safety or authority defect suspends the admission: `ADMISSION_SUSPENDED` means use is halted pending human review, and the outcome is not yet determined. It is neither stale (which implies reassessment will restore it) nor withdrawn. A suspended admission makes any Gate D grant that includes it stale immediately.
8. **Every change record is signed by the authority that holds the admission,** which under the pilot means both parties. There is no lighter sign-off for any classification, including `NON_MATERIAL_CORRECTION`. The classification is a human determination that must be defended. If a correction is genuinely non-material, signing it costs very little; if it is misclassified, the signature creates accountability.
9. **Pilot records after a platform authority exists** remain valid for exactly what they admitted, scoped to their country, and cannot be extended to another country. The platform authority decides whether to issue a platform-wide admission for the same capability. It does not inherit or ratify the pilot record automatically.

## 1. What the registry is

**The registry is the set of admission records, and the change and resolution records against them.** Current admission status is derived from those records when it is read, never stored as a mutable value.

**It has two parts, in two places, and neither writes to the other:**

| Part | Holds | Lives in | Written by |
|---|---|---|---|
| **Country admission registry** | Country-scoped admission records made under the pilot joint authority, and their change records | The country's isolated tenancy | The pilot joint authority for that country |
| **Platform admission registry** | Platform admission records made by a platform-wide governance authority, and their change records | The governed platform control plane | That authority, once established. **Until then it holds no records.** |

**What the registry does not hold:**
- **Activation decisions.** These are a separate record type, in the country's tenancy, under the country's own authority and commissioning gate. Each references the exact admission record it relies on.
- **Gate D decisions.** These are recorded under the Gate D definition.
- **Record admission** (evidence and other records admitted into a capability's store). That is governed by each capability's contract.

**Boundaries:**
- **A country-scoped admission is not a platform admission.** It admits a capability in one country, and nowhere else.
- **A platform admission never writes to a country tenancy.** A country relies on it only through its own activation decision.
- **No country's admission records leave its tenancy.** A platform record may cite a country admission as evidence only through a governed, provenance-preserving reference, never by copying it.

## 2. The admission record

**Every admission decision, granted or refused, is one admission record.** It is written once, and never updated or deleted.

| Field | Content |
|---|---|
| `admissionId` | Unique and immutable. Assigned when the record is written. |
| `capabilityId` | The capability's identifier, for example `SCS-CAP-06`. |
| `capabilityVersion` | The exact canonical contract version assessed, as a contract path and commit. |
| `implementationCommit` | The exact commit hash of the implementation assessed. |
| `scope` | What is admitted: the named operations; the commodities, jurisdictions and other scope dimensions the capability's contract defines; and the country, for a country-scoped admission. |
| `authorityBody` | Which authority made the decision: `PILOT_JOINT_AUTHORITY`, naming the country, or the platform-wide governance authority once established. |
| `platformOwnerDecision` | The Platform Owner's decision (`GRANT` or `REFUSE`), signed. |
| `countryRepresentativeDecision` | The founding country institution representative's decision (`GRANT` or `REFUSE`), signed, naming the representative and the basis of their authorisation. **Pilot only;** absent under a platform-wide authority. |
| `reviewerAssessment` | A reference, by digest, to the independent reviewer's written assessment, and to their appointment record and signed declaration. |
| `dependencies` | Every admitted capability this one depends on, each with its `admissionId`. Each must be current in the same scope when the record is written. |
| `outcome` | `ADMISSION_GRANTED` or `ADMISSION_REFUSED`. For a refusal, every unsatisfied item. |
| `disclosedLimitations` | Every limitation, deferred operation and open `TODO(` of the capability, as recorded in the admission evidence. |
| `supersedes` | Where the record supersedes an earlier one (for example a re-admission after a material change), that record's `admissionId`. |
| `timestamp` | When the record was written. |
| `digest` | SHA-256 over the canonical JSON of every other field. |

**How the two decisions combine under the pilot:**
- The outcome is `ADMISSION_GRANTED` only if both parties grant.
- If either refuses, the outcome is `ADMISSION_REFUSED`.
- Neither party's decision can be supplied by the other, delegated to the reviewer, or produced by an automated system.

**Two fields from the starting list are placed outside the admission record,** because a record that is written once and digested cannot hold values that change after it is written:
- **`changeClassification`** records a change proposed *against* an admission. It is a separate change record (section 5), which references the `admissionId`.
- **`status`,** the current admission status, changes as change records arrive. It is derived when read (section 4). The admission record holds only the decision's `outcome`.

This follows the platform's existing mechanism, "deriving status at read time, never storing it; append-only assessments" (platform–domain separation decision), as currency does in SCS-CAP-09 and verification status in SCS-CAP-02.

## 3. Integrity

- **Append-only.** Admission, change and resolution records are only ever inserted. The store refuses update and delete, in the same way as decision receipts in the SCS pilot.
- **Digested.** Each record carries a SHA-256 digest over its canonical JSON. A record whose digest does not match its content is not a valid record.
- **Signed.**
  - The Platform Owner's decision and the country representative's decision are each signed by their author.
  - The reviewer's assessment is signed by the reviewer.
  - A record missing a required signature is not a valid record.
- **Bound to evidence.** The reviewer's assessment, and the evidence it assessed, are referenced by digest. The evidence is kept where it can be verified for as long as the admission may be relied on.
- **Country records stay in the country.** A country admission registry's records, evidence and signatures are country data, inside the country's information boundary.

## 4. Reading admission status

**Admission status is derived, for one capability at one scope, from:**
- its most recent admission record in that scope;
- every change record and resolution record against it;
- the admission status of every dependency.

It maps to CAP-20's `admissionStatus`:

| Condition | Status |
|---|---|
| No admission record exists for this capability and scope | `NOT_ADMITTED` |
| The most recent record's outcome is `ADMISSION_REFUSED` | `NOT_ADMITTED` |
| The most recent record's outcome is `ADMISSION_GRANTED`, and no change or resolution record suspends it, makes it stale or withdraws it | `ADMITTED`, for exactly the recorded contract version, implementation commit and scope |
| A `SAFETY_OR_AUTHORITY_DEFECT` change record, not yet resolved | `ADMISSION_SUSPENDED` |
| A resolution record requires reassessment without halting use | `ADMISSION_STALE_REASSESSMENT_REQUIRED` |
| A resolution record withdraws it | `ADMISSION_WITHDRAWN` |
| An admission is being assessed and no decision is recorded | `ADMISSION_IN_PROGRESS` (the capability is not admitted) |
| The registry cannot be read, a digest does not match, or a signature does not verify | `ADMISSION_STATUS_UNVERIFIABLE` (the capability is not admitted) |
| A dependency is not `ADMITTED` in the same scope | Not `ADMITTED`; the dependency's status is reported alongside |

**Admission is exact.**
- `ADMITTED` applies only to the recorded `capabilityVersion`, `implementationCommit` and `scope`.
- A different contract version, a different commit, or a wider scope is not admitted unless a change record carries the admission to it (section 5), or a new admission record admits it.

## 5. Change classification

**Every proposed change to an admitted capability receives a change record** before anything relies on the changed version.

**A change record holds:**
- `changeId`;
- the `admissionId` it is classified against;
- the exact changed artefact: contract version and commit, implementation commit, or proposed scope;
- the `changeClassification`;
- the rationale;
- the evidence: what changed against the exact admitted version;
- the human sign-off;
- the timestamp;
- a digest.

**The five classifications:**

| Classification | When | Effect |
|---|---|---|
| `NON_MATERIAL_CORRECTION` | Spelling, formatting or reference repair, with demonstrated no change to behaviour, authority, evidence, interfaces or dependencies | The existing admission remains current. The correction is linked to it. |
| `MATERIAL_CHANGE` | Any change to behaviour, authority, evidence, interfaces or dependencies, or to the assessed implementation | The changed version is not admitted until reassessed. The existing admission of the unchanged version stands. |
| `SAFETY_OR_AUTHORITY_DEFECT` | A defect affecting the admitted version itself | The admission is `ADMISSION_SUSPENDED` at once: use is halted pending human review. Any Gate D grant that includes it becomes stale immediately. Nothing waits for a replacement. |
| `SCOPE_EXTENSION` | The same capability version, unchanged, proposed for admission to a wider scope than was assessed, for example SCS-CAP-06 for a second commodity or jurisdiction | Not a change to the capability. The wider scope is not admitted until it is assessed, and the assessment decides whether the existing proof covers the new scope. |
| `UNDETERMINED` | Insufficient evidence to classify | Fail closed: the changed version cannot inherit admission. |

**The classification must demonstrate its case:**
- **A new commit does not erase the historical admission** of the old, unchanged artefact. That admission stays what it was.
- **A new commit cannot inherit admission** merely by being called a correction. `NON_MATERIAL_CORRECTION` must demonstrate, against the exact admitted version, that nothing in the protected properties changed. If it cannot, the change is `MATERIAL_CHANGE` or `UNDETERMINED`.
- **A scope extension carries no admission by itself.** `SCOPE_EXTENSION` must be assessed like an admission for the new scope. Under the pilot, that is by the reviewer and both parties, and the result is a new admission record for the wider scope.

**Human sign-off:**
- **Every change record is signed by the authority body that holds the admission.** Under the pilot, that is both parties.
- **There is no lighter sign-off for any classification,** including `NON_MATERIAL_CORRECTION`. The classification is a human determination that must be defended. A genuinely non-material correction costs very little to sign; a misclassified one is accountable because it was signed.
- **A classification is never made or signed by an automated system.** Automated tooling may produce the evidence of what changed.

### Resolving a suspension

**A suspension is resolved only by a resolution record.** It is signed by the authority body that holds the admission (under the pilot, both parties), references the `SAFETY_OR_AUTHORITY_DEFECT` change record, and records one of three outcomes, with its rationale and evidence:

| Resolution | When | Status afterwards |
|---|---|---|
| `SUSPENSION_LIFTED` | Human review shows the defect does not affect the admitted version within its admitted scope | `ADMITTED` |
| `REASSESSMENT_REQUIRED` | The admitted version may be used, but its admission must be reassessed before it is relied on again | `ADMISSION_STALE_REASSESSMENT_REQUIRED` |
| `ADMISSION_WITHDRAWN` | The admitted version must not be used | `ADMISSION_WITHDRAWN` |

- **A correction of the defect is a new version,** classified `MATERIAL_CHANGE` and admitted by its own assessment. It never lifts the suspension of the old version.
- **Until a resolution is recorded,** the admission stays `ADMISSION_SUSPENDED`. There is no time-out that restores it.

**Effect on activation:** if a deployed artefact or one of its required dependencies changes, the country must check whether its activation remains valid. The change record is the input to that check. The country's activation and commissioning authority makes the decision, not the registry.

## 6. The fail-closed rule

- **No record, no admission.** A capability with no valid `ADMISSION_GRANTED` record for the exact version and scope is not admitted.
- **An invalid record is no record.** A record with a mismatched digest, a missing or invalid signature, or an unresolvable dependency `admissionId` does not admit anything.
- **An unreadable registry admits nothing.** If the registry cannot be read, status is `ADMISSION_STATUS_UNVERIFIABLE`, and every consumer (CAP-20, Gate D, activation) treats the capability as not admitted.
- **No automatic writes across the boundary.** A platform record cannot write to, admit in, or activate a country tenancy. A country record cannot create a platform admission.
- **The pilot arrangement ends when it is superseded.**
  - Once a platform-wide governance authority is established, pilot-authority records stay valid for exactly what they admitted: their country, capability, version, commit and scope.
  - They cannot be extended by `SCOPE_EXTENSION` to another country.
  - The platform authority does not inherit or ratify them automatically. It decides whether to issue a platform-wide admission for the same capability, by its own assessment.
- **Undefined classification fails closed.** A change that has no change record, or is `UNDETERMINED`, cannot inherit admission.

## Amendments made with this definition

This definition implements decisions that differ from what was merged earlier on 2026-09-27. These are reconciled in the same change, so that no superseded definition stands beside this one on `main`:
- **`governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md`:**
  - the joint pilot authority replaces the Platform Owner deciding alone;
  - country-scoped pilot admission is distinguished from platform-wide admission, and the platform-wide authority is recorded as not yet established;
  - the change classifications of section 5 here replace "any change makes the admission stale";
  - scope includes commodities, jurisdictions and the country.
- **`governance/AAB-CAP-20-COUNTRY-CAPABILITY-CATALOGUE-AND-SELECTION-CANONICAL-CONTRACT-2026-09-23.md`:** `ADMISSION_SUSPENDED` is added to `admissionStatus` and `maturityStatus`, with its display rule, and the rule that a suspended admission makes any Gate D grant including it stale immediately.

## Open items

- **The founding country institution representative:** who they are, and how their authorisation is established and recorded. This is a country-specific decision.
- **Signing keys** for the Platform Owner, the country representative and the reviewer. For the country, these are country-controlled keys, consistent with the Gate D evidence requirement.
- **The store.** Where the country admission registry is implemented in the pilot country's tenancy, and how append-only is enforced there.
- **The activation record type.** It is referenced here, and defined nowhere. Activation must also respond to a suspended, stale or withdrawn admission; how it does is the country's decision under its commissioning governance.
- **The platform-wide governance authority.** Not established. The platform admission registry holds no records until it is.

## What this document does not establish

- It does not admit any capability, or create any registry record.
- It does not establish a platform-wide governance authority, and does not make the pilot joint authority one.
- It does not define activation, Gate D or commissioning.
- It does not implement the registry.
