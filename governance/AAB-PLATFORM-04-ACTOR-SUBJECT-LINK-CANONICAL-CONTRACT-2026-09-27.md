# AAB-PLATFORM-04 — Actor–Subject Link — Canonical Contract — 2026-09-27

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES THE ACTOR–SUBJECT LINK: WHAT IT ASSERTS, HOW IT IS CREATED, USED, SUSPENDED, REVOKED AND SUPERSEDED, AND WHERE IT LIVES. It creates no link, grants no role or authority to anyone, and amends no domain contract. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.

## Sources

- `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`: section 2 sets the rules this contract must keep; section 3 sets the mandate checks that use a link
- `identity/contracts/AAB-ID-02-IDENTITY-ACTOR-LINK-CONTRACT.js` and `AAB-ID-03-PROTECTED-MEMBERSHIP-AUTHORITY-RESOLVER-CONTRACT.js`: the identity doctrine ("account link does not grant authority"; "browser cannot create or alter link"; "missing or ambiguous link fails closed")
- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`: "SCS domain → AAB platform primitives. Never the reverse."
- `governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md`: parties, mandates, and the separation of duties for verification
- `governance/AAB-CAPABILITY-ADMISSION-REGISTRY-DEFINITION-2026-09-27.md`: write-once records, with status derived at read time

## Why this contract is needed

**AAB-PLATFORM-03 relies on a link it does not define.**
- **Mandate-based submission needs it.** An authenticated actor is not linked to any CAP-02 party, so no mandate can authorise a submission. SCS-CAP-02, SCS-CAP-04 and SCS-CAP-05 each record this as an open gap.
- **AAB-PLATFORM-03 fixed its rules, but left the definition to its own contract,** because the link is a platform concept that domains use. Defining it in a CAP-02 amendment would put a platform primitive inside a domain contract.

**Two links, at two layers.**

| | Account–actor link (ID-02) | Actor–subject link (this contract) |
|---|---|---|
| Binds | A login account to an AAB actor | An AAB actor to a domain subject, such as a CAP-02 party |
| Answers | "Which actor is this login?" | "May this actor act as, or for, this subject?" |
| Cardinality | One account to one actor | One actor to many subjects; one subject to many actors |

Neither grants authority. This contract concerns only the second.

## 1. What an actor–subject link is

**An actor–subject link is a governed record that binds one actor to one domain subject,** establishing that the actor may act *as* or *for* that subject.

**It asserts:**
- **Who:** the actor, identified as AAB-PLATFORM-03 identifies it, by (`issuer`, `actorId`).
- **For whom:** the subject, identified generically, by (`domain`, `subjectType`, `subjectId`).
- **How they are related:** either the actor *is* the subject (a natural person acting as themselves), or the actor acts *for* the subject (a staff member of an organisation).
- **On what evidence:** the evidence that the subject authorised the relationship.
- **Who recorded it, and when:** the creating actor, a named, accountable human who signs the link, and is never the linked actor.

**It does not assert, and never grants:**
- **Any authority to perform an act.** What an actor may do is decided by the capability, from the actor's `authorityBasis` and, for representation, the mandate. A link says only that the actor may be *associated* with the subject.
- **That the subject exists or is current.** That is checked, when the link is used, by the domain that owns the subject (section 3).
- **Anything about the actor's legal identity.**

### The link record

```typescript
interface ActorSubjectLink {
  linkId: string;
  schemaVersion: string;

  // Who: the actor, as AAB-PLATFORM-03 identifies it
  actor: {
    issuer: {
      issuerType: "PLATFORM_CONTROL_PLANE" | "COUNTRY_TENANCY";
      countryCode?: string;
    };
    actorId: string;
  };

  // For whom: named generically; the domain defines what the identifiers mean
  subject: {
    domain: string;        // e.g. "SCS"
    subjectType: string;   // e.g. "PARTY"
    subjectId: string;     // e.g. a CAP-02 party id
  };

  // How they are related
  relation: "IS_SUBJECT" | "ACTS_FOR_SUBJECT";

  // Validity: a link always expires
  validFrom: string;
  validUntil: string;

  // Evidence that the subject authorised this relationship: at least one
  authorisationEvidence: Array<{
    evidenceObjectSha256: string;  // an AAB-PLATFORM-01 stored object
    description: string;
  }>;

  // Replaces an earlier link, if any
  supersedesLinkId?: string;

  createdAt: string;
  createdBy: ActorReference;       // AAB-PLATFORM-03: HUMAN, with accountableName; never the linked actor

  // Link creation is a governance decision: signed by the named creator
  linkDigest: string;              // SHA-256 over the canonical JSON of every field above
  creatorSignature: string;        // the creator's signature over linkDigest
}
```

**The link record is written once, and never changed.** Its current state is derived when it is read, from the record and the status records against it (section 4). This is the pattern of the capability admission registry, and of currency in SCS-CAP-09.

**States**, derived at read time:

| State | When | Usable |
|---|---|---|
| `ACTIVE` | Within its validity period, and not suspended, revoked or superseded | Yes |
| `SUSPENDED` | A suspension record is in effect | No |
| `REVOKED` | A revocation record exists, or a later link supersedes it | No |
| `EXPIRED` | Its `validUntil` has passed | No |

`ACTIVE`, `SUSPENDED` and `REVOKED` are the states AAB-PLATFORM-03 fixed. `EXPIRED` is a fourth, distinct state. Every link expires, and ending on schedule is a different event from being withdrawn; recording them the same way would make audit records less meaningful.

## 2. How a link is created

**Who may create a link.**
- **A holder of the role the subject's domain designates.** The platform defines no creator role of its own. Each domain names the role, in its own contract.
  - For SCS, the creating role is **`LINK_OFFICER`**, a dedicated role. It is not `VERIFICATION_OFFICER`: a verifier who could also create the links they later rely on would have a conflict, so link creation and verification stay separate duties.
  - The creating role is held in the creator's `authorityBasis`, in a scope that covers the subject.
- **Never the linked actor.** A link whose `createdBy` is the linked actor is refused. A link is never self-asserted.
- **Never the browser, the request or user metadata.** Only a server-side operation, performed by an authenticated actor holding the creating role, creates a link.

**What evidence is required:**
- **Authorisation by the subject:** at least one stored object, in AAB-PLATFORM-01, showing that the subject authorised the relationship. For `ACTS_FOR_SUBJECT`, for example, a letter of authority from the organisation. For `IS_SUBJECT`, evidence that the person is the natural-person subject.
- **The subject exists and is current,** confirmed by the subject's domain when the link is created: for SCS, the CAP-02 party exists and is not `RETIRED`.
- **The actor exists,** confirmed by its issuer.

**The creation rules**, each failing closed:
1. The creator holds the domain's creating role, in scope: otherwise `LINK_CREATOR_NOT_AUTHORISED`.
2. The creator is not the linked actor: otherwise `LINK_SELF_ASSERTED`.
3. The subject exists and is current: otherwise `LINK_SUBJECT_NOT_FOUND` or `LINK_SUBJECT_NOT_CURRENT`.
4. At least one authorisation evidence object exists in AAB-PLATFORM-01: otherwise `LINK_EVIDENCE_MISSING`.
5. `validUntil` is after `validFrom`, and within the domain's maximum link period: otherwise `LINK_VALIDITY_INVALID`. The platform requires an expiry date, and sets no universal maximum. Each domain sets its own, from its regulatory context.
6. There is no other `ACTIVE` link for the same actor, subject and relation whose validity overlaps: otherwise `LINK_ALREADY_ACTIVE`. To change a link, supersede it (section 4).
7. The creator is `HUMAN`, names an `accountableName`, and signs the link: otherwise `LINK_SIGNATURE_INVALID`.

**Link creation is a governance decision.** Every mandate-based act rests on a link, so no link rests on an unsigned operational record. As for admission and Gate D:
- **The creator is `HUMAN`,** and their `ActorReference` carries `accountableName`.
- **The creator signs the link:** `creatorSignature` over `linkDigest`. A link without a valid signature is not a link. It is refused at creation, and unusable if found later.
- **The link is written with a decision receipt,** in the same transaction, as every governed write is, and is idempotent under the platform's idempotency rule. The receipt names the link, the creator and the evidence.

## 3. How a link is used

**When an actor claims to act as or for a subject,** the capability checks the link, in the same transaction and snapshot as the act, failing closed at the first unmet check:

1. **Exactly one link applies:** one link for this actor (`issuer`, `actorId`) and this subject, with the relation the act requires. None is `LINK_NOT_FOUND`. More than one is `LINK_AMBIGUOUS`; it never picks one.
2. **The link is `ACTIVE` at the time of the act, and its signature verifies:** otherwise `LINK_NOT_ACTIVE`, naming the state, or `LINK_SIGNATURE_INVALID`.
3. **The relation fits the act:**
   - acting as oneself requires `IS_SUBJECT`;
   - representation requires `ACTS_FOR_SUBJECT`.

   Otherwise `LINK_RELATION_NOT_PERMITTED`.
4. **The subject is still current,** confirmed by its domain at the time of the act: otherwise `LINK_SUBJECT_NOT_CURRENT`. A link to a party that has since been retired cannot be used, whatever the link's own state.

**Then the capability's own checks apply.** A link never ends the checking. For representation under a mandate, the capability continues with AAB-PLATFORM-03's eight checks:
- the mandate names the linked subject as its representative party;
- the mandate is current, verified, and permits the act;
- the actor holds `PARTY_REPRESENTATIVE`.

**The act records the link.** The act's `ActorReference` carries `representation.actorLinkId`, so every representative act names the exact link it relied on.

## 4. Suspension, revocation and supersession

**Status records.** A link's state changes only through status records, which are written once against the link and never changed:

| Status record | Effect | Reversible |
|---|---|---|
| `SUSPEND` | The link is `SUSPENDED`: authorisation is withdrawn temporarily, or pending review | Yes: by `REINSTATE` |
| `REINSTATE` | Ends a suspension; the link is `ACTIVE` again, if still within its validity | — |
| `REVOKE` | The link is `REVOKED`, permanently | No. A new link, created with fresh evidence, is required. |

**Who may write a status record:**

| Status record | Creating role (for SCS, `LINK_OFFICER`) | The subject's authorised representative |
|---|---|---|
| `SUSPEND` | Yes | Yes: the subject withdraws its authorisation, temporarily or pending review |
| `REINSTATE` | Yes, including after a suspension by the subject's representative | No. The representative can never reinstate unilaterally. |
| `REVOKE` | Yes | No. Revocation is permanent, and affects the audit record of every act the link ever authorised, so it requires the creating role. |

- **Every status record is signed** by the named human who writes it, carries a receipt, and names its reason. It is never written by the linked actor about their own link.
- **A representative's suspension needs the creating role to end it.** After review, the creating role either reinstates or revokes the link.

**Supersession.** To change a link's relation, validity or evidence, a new link is created with `supersedesLinkId`. The superseded link is `REVOKED` from the moment its successor is recorded. There is never more than one active link for the same actor, subject and relation.

**Automatic effects, derived rather than written:**
- **Expiry:** the link is `EXPIRED` after `validUntil`. There is no grace period.
- **The subject ends:** if the subject is retired, the link cannot be used (section 3, check 4). It is not rewritten.
- **The actor's identity ends:** if the issuer no longer recognises the actor (for example, the account link in ID-02 is revoked), the actor cannot authenticate, so the link cannot be used.

**Past acts are unchanged.** Revoking, suspending or superseding a link never changes an act already recorded. That act's `ActorReference` still names the link it relied on at the time, which was valid then.

## 5. Where the link lives, and the dependency direction

**The platform defines the link. Domains store and resolve it.**

| Concern | Platform (this contract) | Domain (for example SCS) |
|---|---|---|
| The record's shape, states, status records and failure codes | Defined here | Used as defined |
| Where link records are stored | — | In the domain's store, in the country's tenancy |
| What a subject is, and whether it exists and is current | Never | The domain answers, through a subject resolver |
| The creating role | Requires one | Names it, in its own contract |
| Evidence requirements beyond section 2 | — | May add to them, never remove |
| The use checks (section 3, checks 1–3) | Defined here | Applied as defined |
| Check 4, whether the subject is current | Asks through the subject resolver | Answers |

**Subject resolver.** The platform defines one interface, which each domain implements:

```typescript
interface SubjectKey {
  domain: string;
  subjectType: string;
  subjectId: string;
}

interface SubjectResolver {
  // Is this subject known to the domain, and current at this time?
  resolve(subject: SubjectKey, at: string): Promise<"CURRENT" | "NOT_CURRENT" | "NOT_FOUND">;
}
```

**Direction:**
- **Platform code never imports domain types.** It does not import SCS types, and never reads CAP-02 tables. It sees only the generic subject triple and the resolver's answer.
- **SCS implements the resolver for `domain: "SCS"`, `subjectType: "PARTY"`.** It answers from CAP-02 parties: `NOT_FOUND` if no party has the id, `NOT_CURRENT` if the party is `RETIRED`, `CURRENT` otherwise.
- **SCS stores its link records** in its own store, in the country's tenancy, with the subject's CAP-02 party id recorded as the generic `subjectId`.
- **A domain that stores links keeps the platform's rules.** Write-once link records, status records, derived state, receipts and the use checks all apply unchanged.

## Adopting this contract

A domain that uses actor–subject links adopts this contract by amendment to its own contracts. That amendment must document:
- **its subject types,** and the identifiers each uses as `subjectId`;
- **its creating role,** named and held only in scope (for SCS, `LINK_OFFICER`);
- **its maximum link period,** from its regulatory context;
- **any evidence it requires beyond section 2.** It may add requirements, never remove them;
- **its subject resolver:** which records it reads, and exactly when it answers `CURRENT`, `NOT_CURRENT` and `NOT_FOUND`. The platform defines one resolver interface and nothing more, so documenting the implementation is a required adoption step, not optional;
- **where it stores links and status records,** and how write-once is enforced there.

## What this contract does not establish

- It creates no link, and grants no role, membership or authority to anyone.
- It does not amend SCS-CAP-02, SCS-CAP-04 or SCS-CAP-05. Their adoption of links and mandates is by their own amendments.
- It does not implement anything, or change any stored record.
- It does not replace the account–actor link of ID-02.

## Decisions recorded on 2026-09-27

1. **`EXPIRED` is a fourth, distinct state.** Expiry on schedule is a different event from revocation (section 1).
2. **SCS's creating role is `LINK_OFFICER`,** a dedicated role, separate from `VERIFICATION_OFFICER` (section 2).
3. **The maximum link period is left to each domain.** The platform requires an expiry date, and sets no universal maximum (section 2).
4. **The subject's representative may suspend, but not revoke or reinstate.** Revocation and reinstatement require the creating role (section 4).
5. **Link creation is a governance decision,** signed by a named, accountable human, as for admission and Gate D (section 2). Status records are signed by whoever writes them (section 4).
6. **One subject resolver interface.** Each adopting domain must document how it implements it, as a required adoption step ("Adopting this contract").

## Open items

- **SCS amendments:** SCS-CAP-02 adopts this contract, covering every item under "Adopting this contract", including `LINK_OFFICER` and the resolver's documented implementation. SCS-CAP-04 and SCS-CAP-05 adopt the link and mandate checks for representative submission.
- **AAB-PLATFORM-03 amendment:** its list of governance decisions (section 4) gains link creation and link status records, which this contract makes signed.
- **Implementation:** the link store and status records in the SCS pilot, the resolver, and the use checks in the platform foundation.
- **`LINK_OFFICER` and `PARTY_REPRESENTATIVE`** in the role registry (`TODO(role-registry)`).
- **Signing keys** for link creators and status-record writers, shared with the admission and Gate D open items.
