# AAB-PLATFORM-05 — Governed Provenance — Canonical Contract — 2026-09-27

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES PROVENANCE: WHAT IT RECORDS ABOUT A GOVERNED RECORD, WHICH OF IT IS VERIFIED AND WHICH IS DECLARED, HOW REFERENCES TO OTHER RECORDS ARE RESOLVED, HOW A RECORD IS CORRECTED WITHOUT BEING CHANGED, AND HOW PROVENANCE IS CARRIED INTO WHAT IS BUILT FROM A RECORD. It admits no record, grants no authority to anyone, amends no domain contract and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.
**Amended:** 2026-10-02 (the record digest, its calculation, service submitters, supersession, registered resolvers and conformance, with AAB-PLATFORM-10); and 2026-10-03 (the admission basis on resolved citations, and the reliance-closure assessment, with AAB-PLATFORM-07's amendment of 2026-10-03).

## Amendment of 2026-10-02: the record digest, its calculation, and what the domains found

**Why.** Every domain that adopted this contract relies on something it never defined. **A record's digest** is named here (`resolved.recordDigest`) and relied on by AAB-PLATFORM-06 (the admission decision binds it), AAB-PLATFORM-07 (a snapshot member's digest is the admitted record's) and every AGR contract, but its bytes and its envelope were never defined. The AGR contracts written since then also found that this contract's rules on supersession, citation, submitters and fields set after the write were not precise enough, and each began to answer them differently. **This amendment settles them at platform level, before any domain relies on a reading of its own.** Canonicalisation itself is not provenance's: it is defined by **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests** (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`), written in the same change, which this amendment cites.

> **A digest proves equality with the exact canonical data model hashed under the identified canonicalisation and hash algorithms. It does not prove that the record is true, authoritative or sufficient.**

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review):
1. **Canonicalisation is AAB-PLATFORM-10's,** never provenance's. A record digest is calculated under it, and identifies its canonicalisation and hash algorithm (AAB-PLATFORM-10, section 5).
2. **The record-digest envelope** is defined here (section A), and the exact field set is machine-readable for every record schema.
3. **The digest is calculated in nine steps, in one transaction** (section B). **Nothing may subsequently be inserted into the admitted record.**
4. **`SERVICE` submitters are permitted, under strict controls** (section C). A service never makes a human decision, and never disguises itself as a human submitter.
5. **Supersession is system-resolved, not system-invented,** with three platform reasons (section D).
6. **Citations resolve only through registered resolvers** (section E). The platform never searches a domain's tables.
7. **Licence, consent, permitted use and lawful basis stay outside the universal provenance object,** while their evidence participates in lineage (section F).
8. **Adoption is explicit:** every adopting contract states, for each of the six gaps, a limitation, a refusal, or not applicable with a reason, with a matrix covering all its record types (section G).
9. **SCS adoption is separate.** This amendment changes no SCS code, schema or stored value; SCS's adoption of this contract is a future decision, after the extraction.
10. **One citation rule.** Every reference a record relies on, as evidence or as a gate, follows the same cite-then-resolve behaviour, whether it is held in `lineage` or in a domain field that the domain's adoption maps to a `lineage` entry. A declared version that differs from the version found is unresolved. Consistency across the platform matters more than preserving the current inconsistency.
11. **Automated is declared per method term.** Every method term in every vocabulary states `automated: true` or `false` explicitly. Name-based inference (a method containing `AUTOMATED` or `MACHINE`, CAP-03's rule) is a fallback minimum check, never the definition.
12. **Offline capture is settled** by an optional declared `capture { deviceRecordedAt, deviceCaptureId }` block (section C). CAP-08 already settled the pattern with its own fields; this formalises it at platform level, and closes the open item.
13. **An `ActorReference` appears in a record's content only for a person who acted in AAB in that role.** A person named in a record's content, such as an author or a QC release person, who did not act in AAB in that role, is declared data, not an `ActorReference`, as decision 5 of 2026-09-27 already says. A correctness fix for CAP-11 and CAP-12, made in the AGR conformance change.

### A. The record-digest envelope

**Every written-once record that adopts this contract has a `recordDigest`:** a `DigestReference` of type `recordDigest` (AAB-PLATFORM-10, sections 5 and 6), set by the system.

**Included:**
- the schema identifier and version;
- the record identifier and record version;
- the country and the domain;
- the substantive content;
- the complete provenance, this contract's record, with its resolved references;
- the resolved supersession (section D);
- the immutable system acceptance fields, such as the admission time.

**Excluded:**
- the `recordDigest` itself;
- database storage internals, indexes and cache fields;
- derived current status, such as superseded, quarantined or current;
- later verification results;
- access logs;
- presentation-only fields.

**The exact field set is machine-readable for every record schema:** the schema declares, for each field, whether it is in the envelope, so that any verifier can rebuild the exact hashed value from the stored record (AAB-PLATFORM-10, section 6).

**`resolved.recordDigest` is now required** wherever the cited record kind has a record digest (section E), and is a `DigestReference`.

### B. When the digest is calculated

The admission transaction:
1. validates the submission;
2. resolves identity and authority;
3. resolves citations;
4. assigns record identity and version;
5. assigns the trusted acceptance time;
6. constructs the final immutable admitted record;
7. canonicalises it;
8. calculates its digest;
9. writes the record, its provenance, the admission decision and the receipt atomically.

**Nothing may subsequently be inserted into the admitted record.** Later integrity checks, currency evaluations, incidents, verification runs and similar acts are **separate immutable records referring to its digest.** A reference that a domain contract describes as "set by the system when a run is cited" on an already-written record is read as derived when read, never written into it (to be aligned in the AGR conformance change).

**Times** are fixed to AAB-PLATFORM-10's system-time form before step 7, so storing more precision never changes the digest (AAB-PLATFORM-10, section 4).

### C. Submission: people, services, and offline capture

**The submission block, extended:**

```typescript
submission: {
  submittedBy: ActorReference;          // set by the system: HUMAN, or SERVICE under the controls below
  submittedAt: string;                  // set by the system: the trusted acceptance time (section B, step 5)
  initiatedBy?: ActorReference;         // set by the system: the person who initiated a SERVICE submission
  service?: {                           // set by the system: required when submittedBy is a SERVICE
    serviceRegistrationId: string;      // the registered service identity
    executionIdentity: string;          // the authenticated identity it executed as
    softwareRelease: string;            // its software and release version
    correlationId: string;
    triggerKind: "RECORD" | "SCHEDULED_JOB";
    triggerRecord?: {                   // when triggerKind is RECORD: the triggering record
      recordKind: string;
      recordId: string;
      recordVersion: number;
    };
    triggerJobReference?: string;       // when triggerKind is SCHEDULED_JOB
    method: string;                     // the deterministic method
    methodVersion: string;
  };
};
capture?: {                             // declared: offline capture only (decision 12)
  deviceRecordedAt: string;             // the device's own clock, as declared
  deviceCaptureId: string;              // the device's own identifier for the capture
};
```

**A `SERVICE` may submit only with all of:**
- a registered identity;
- a country and domain scope;
- the record kinds it is permitted to submit;
- capability-specific authority, granted by the contract that owns the record kind;
- an authenticated execution identity;
- its software and release version;
- a correlation reference;
- the triggering record, or the scheduled job;
- a deterministic method and its version;
- `generation.automated: true`.

**Where a person initiated the operation,** both are recorded: `submittedBy` is the `SERVICE`, and `initiatedBy` is the person's `ActorReference`.

**A service may never:**
- make a human decision;
- approve;
- clear safety;
- verify regulatory meaning;
- promote knowledge;
- commission AAB;
- disguise itself as a human submitter.

**A domain contract may forbid service submitters entirely** for its record kinds, as CAP-02 does for submissions to CAP-04. Nothing here permits what a domain contract forbids.

**`provenanceVersion` becomes `"2"`** for records written under this amendment, with `initiatedBy`, `service` and `capture`. Records written under version 1 keep it, and are read by it.

### D. Supersession

**The submitter, or the authorised operation, declares:** what should be superseded, the proposed reason, and an explanation.

**The platform resolves and records:** the exact record identifier, version and digest superseded; whether the actor has authority to supersede it; and whether the relationship is valid. **A failed authority or validity check refuses the submission.** The platform never invents the scientific reason for the change.

```typescript
supersedes?: {
  declared: {
    citedId: string;                    // as the submitter gave it
    citedVersion?: number;
    reason: "CORRECTION" | "WITHDRAWAL" | "NEW_VERSION";
    explanation: string;
    domainClassification?: string;      // a domain's own, more detailed classification
  };
  resolved: {                           // set by the system
    recordKind: string;
    recordId: string;
    recordVersion: number;
    recordDigest: DigestReference;
  };
};
```

- **Three platform reasons:** `CORRECTION`, `WITHDRAWAL` and `NEW_VERSION`. A domain gives more detail in `domainClassification`, never by altering the platform enumeration. A domain's existing reason `UPDATE` maps to `NEW_VERSION`.
- **Supersession is recorded once, in this field.** A lineage relation that says the same thing, such as CAP-03's `SUPERSEDES`, maps to it, and is never recorded as a second, separate entry.
- **A record is identified by its identifier and version.** A domain may supersede by a new version of the same identifier, or by a new identifier; either way, the superseded record's identifier, version and digest are resolved.
- Section 5's other rules stand: at most once, same domain and tenancy, never a deletion, withdrawal only by supersession.

### E. Citation resolution through registered resolvers

**Each written-once record kind that may be cited registers:**
- its record-kind identifier;
- its owning domain;
- its resolver interface;
- its version rules;
- its digest field;
- its country boundary;
- its disclosure rules.

**The platform resolves a citation only through the resolver registered for the cited record kind.** It never searches a domain's tables for an identifier. This is consistent with the dependency audit's V1 and V13 remedies: domains register how their records are resolved, and the platform does not know their tables.

- **What may be resolved widens** from admitted records to any registered written-once record kind in the same domain and country: admitted records, evaluations (AAB-PLATFORM-07), human decisions (AAB-PLATFORM-08) and receipts, each when its kind is registered.
- **A lineage entry may name the record kind and a version:** `{ relation, recordKind?, citedId, citedVersion?, resolved? }`. A declared version that differs from the version found is unresolved, and disclosed as `CITATION_UNRESOLVED`.
- **Cross-domain resolution requires an explicit, governed evidence packet,** which is not yet defined. **Cross-country resolution never happens implicitly.** Until a packet is defined, such a citation stays cited only, and unresolved.

### F. Licence, consent, permitted use and lawful basis

- **They are conditions governing use, not universal provenance,** and stay outside this contract's record, in each domain's own fields (such as CAP-04's `classification.permittedUses`, and CAP-02's permitted-use basis).
- **But their evidence has provenance:** the documents that support them are admitted evidence; their issuer and authority have provenance; **the applicable version is cited** and resolved, so the governed record resolves the exact evidence it relied on; **expiry and withdrawal are tracked** by the owning domain.
- They therefore **participate in lineage** without becoming provenance fields.

### G. Adopting this contract, made explicit

Section 7 is strengthened. **Every adopting contract states, for each of the six gaps, one of:** a disclosed limitation, under its code; a refusal, under its code; or **not applicable, with the reason.** It provides **a matrix covering all its record types,** gap by gap, and declares, for every record schema, the machine-readable digest envelope (section A) and, for every record kind that may be cited, its resolver registration (section E). **An adoption without the matrix is incomplete.**

### What this amendment replaces

- **Section 2:** `submission` gains `initiatedBy` and `service`; the record may carry `capture` (decision 12); `lineage` entries may name `recordKind` and `citedVersion`; `resolved.recordDigest` is a required `DigestReference` where the kind has one; `provenanceVersion` `"2"`.
- **Section 4:** resolution is through registered resolvers, and may reach any registered written-once record kind in the same domain and country (section E).
- **Section 5:** supersession is declared, then resolved, with three platform reasons (section D).
- **Section 7:** the explicit adoption and matrix (section G).
- **Section 10:** a `SERVICE` submitter is valid only under section C's controls; a request that supplies `initiatedBy`, `service`, `supersedes.resolved` or `recordDigest` is refused, as for every system-set field.
- **Open items:** offline capture is settled (decision 12); canonicalisation is AAB-PLATFORM-10's.

**Sections 2, 4, 5, 7 and 10 are marked "(amended on 2026-10-02)" where they change.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Amendment of 2026-10-03: the admission basis on resolved citations, and the reliance-closure assessment

**Consequential to AAB-PLATFORM-07's amendment of 2026-10-03** (finding RD-01 of the retrospective decision cross-review), and approved with it by the Platform Owner in review on 2026-10-03. **Approved draft:** `governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md`, SHA-256 `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2`; its approval and review history: `governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md`.

- **Section 4 and amendment section E, the resolved citation:** `resolved` gains `admissionBasis` (AAB-PLATFORM-07, amendment of 2026-10-03, point 3). It is required where the cited record kind is admitted evidence, and is system-set at resolution and covered by the citing record's `recordDigest`. A citation is never re-resolved, and its basis is never refreshed.
- **`RELIANCE_CLOSURE_ASSESSMENT`** is a platform record kind:
  - written once, with `Provenance` (`provenanceVersion` "2") and a `recordDigest`;
  - submitted by a registered service under section C, or by a named person;
  - resolvable through its registered resolver, so that a notification or audit can cite it.
- **It is never admitted evidence, and never a basis for reliance.**

## Sources

- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`: primitive 4, Provenance ("submitter, submission time, cited and linked lineage, recorded at admission"); the mechanism and policy table; "domain → platform, never the reverse"
- `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md`: V12, provenance exists only as domain code, recorded by each admitting capability in its own columns; decision 2, this contract is the first of four
- `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md`: evidence is admitted "attributable, with its provenance, its limitations and its gaps"
- `governance/AAB-RESEARCHER-ADOPTION-AND-SCIENTIFIC-MEMORY-PRINCIPLES.md`: preserve the original source and provenance; an interpretation never becomes an observation; provenance survives offline operation
- `governance/AAB-COUNTRY-SCIENTIFIC-DATA-NON-RETURN-BOUNDARY-2026-09-13.md` and `governance/AAB-PLATFORM-AND-COUNTRY-ISOLATION-ARCHITECTURE-2026-09-12.md`: sharing is explicit, authorised and provenance-preserving; derived representations are protected
- `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`: who acted, and on what basis; no personal name leaves a country's boundary for an operational act
- `governance/workstream-b/AAB-PLATFORM-01-EVIDENCE-OBJECT-STORE-CANONICAL-CONTRACT-2026-09-25.md`: the store "vouches for bytes, not for meaning"
- The admission contracts of both domains, surveyed for this contract: the fields each already records, and the conflicts between them (section 8)

## Why this contract is needed

- **Every domain records provenance, and each records it differently.** Each admission contract defines its own submitter, time, source, original, integrity and lineage fields. They agree on the concepts and differ in names, required fields and meanings.
- **No platform contract defines it,** so the next domain would define it again. The dependency audit records provenance as a primitive that exists only as domain code, and makes this contract the first step before any of it is extracted.
- **Provenance is what everything after admission relies on.** An admission decision is bound to it; an evaluation reads it; a human decision is made on it; a record shared across a boundary must carry it. It must mean the same thing wherever it is read.

## 1. What provenance is

**Provenance is the record, captured when a record is admitted, of where it came from, who put it in, what it was made from, and what it refers to.** It is part of the record, written with it, and never changed afterwards. A record whose provenance needs correcting is superseded by a new record (section 5).

**Provenance asserts only what it says, and says how it knows each part.** Every field has one of three standings, recorded with the field's definition and never mixed:

| Standing | Meaning | Examples |
|---|---|---|
| **Set by the system** | Established by the platform at the moment of admission. It is a fact about the act. | Who submitted, when, the stored object's digest |
| **Declared** | Stated by the submitter, and recorded exactly as given. The platform has not verified it and never presents it as verified. | The source's own identifier, the organisation that produced it, when it originated, whether its custody is complete |
| **Resolved** | A declared reference that the platform matched to an existing admitted record, at admission. | A cited record found and pinned to its version |

**Provenance does not assert:**
- that anything declared is true;
- that the source is reliable, authoritative or independent;
- that the record is sufficient for any purpose;
- anything about acts after admission.

## 2. The provenance record (amended on 2026-10-02)

```typescript
interface Provenance {
  provenanceVersion: "1";

  // Submission — set by the system
  submission: {
    submittedBy: ActorReference;   // AAB-PLATFORM-03, with representation when present
    submittedAt: string;           // the moment of admission, from the platform's clock
  };

  // Source — declared: where the record came from, before it reached the platform
  source: {
    sourceType: string;            // the domain's vocabulary
    sourceId?: string;             // the source's own identifier for it
    sourceReference?: string;      // how to find it at the source
    sourceOrganizationId?: string; // who produced or holds it
    originatedAt?: string;         // when it came into being at the source
  };

  // Original — the thing the record was made from, when there is one
  original?: {
    objectId?: string;             // set by the system: an AAB-PLATFORM-01 stored object
    externalReference?: string;    // declared: where the original is held, when not stored
    declaredDigest?: string;       // declared: the submitter's digest of the original
    integrityStatus: "VERIFIED" | "UNVERIFIED";  // set by the system (section 3)
  };

  // How the record's content was produced from its inputs — declared, when it was produced at all
  generation?: {
    method: string;                // e.g. an analysis, an extraction, a transcription
    methodVersion?: string;
    generatedBy?: string;          // who or what performed it, as declared
    generatedAt?: string;
    automated: boolean;            // true when a system, not a person, produced the content
  };

  // Custody — declared
  custody?: {
    declaredComplete: boolean;     // the submitter's statement that custody is unbroken
    steps?: Array<{                // the custody the submitter can account for, in order
      custodian: string;           // as declared
      heldFrom?: string;
      heldUntil?: string;
      description?: string;
    }>;
  };

  // References to other records — declared, then resolved at admission (section 4)
  lineage: Array<{
    relation: string;              // the domain's vocabulary, e.g. "derived from", "follows"
    citedId: string;               // declared: exactly as given
    resolved?: {                   // set by the system, only when the citation resolved
      recordId: string;            // equal to citedId
      recordVersion: number;
      recordDigest?: string;
    };
  }>;

  // Disclosed gaps — set by the system (section 6)
  gaps: ProvenanceGap[];
}

type ProvenanceGap =
  | "SOURCE_UNIDENTIFIED"          // no sourceId and no sourceReference
  | "ORIGINAL_NOT_STORED"          // an original exists, but not in AAB-PLATFORM-01
  | "INTEGRITY_UNVERIFIED"         // the original's integrity could not be verified
  | "CITATION_UNRESOLVED"          // a lineage citation did not resolve
  | "CUSTODY_DECLARED_INCOMPLETE"  // the submitter declared custody incomplete
  | "CUSTODY_NOT_DECLARED";        // an original exists, and no custody was declared
```

**Field rules:**
- **`submittedBy` is always a complete `ActorReference`,** never an identifier alone. Representation, when present, is how the record shows that it was submitted for someone else, and on what basis (AAB-PLATFORM-03, section 3).
- **`submittedAt` is the platform's clock** at the moment of admission, never a client's.
- **`originatedAt` and `submittedAt` are different facts,** and are never merged. A record may originate years before it is submitted.
- **`objectId` is set only by the system,** when the original is an AAB-PLATFORM-01 stored object. A submitter cannot assert that an original is stored.
- **`generation.automated` is always stated when `generation` is present.** Content produced by an automated system is recorded as such, and is never presented as an original observation or a person's statement.
- **Every string field declared by the submitter is recorded exactly as given:** no normalisation, no correction, no inference.
- **The domain supplies the vocabularies** (`sourceType`, `generation.method`, `lineage.relation`), and which fields its records require (section 7). The platform defines what each field means, and how its standing is recorded.

## 3. Integrity of the original

- **`VERIFIED`** means the original is an AAB-PLATFORM-01 stored object, and the platform confirmed at admission that its digest is the one the record relies on. If the submitter declared a digest, it equals the stored object's.
- **`UNVERIFIED`** means nothing the platform holds confirms the original: it is held elsewhere, or no digest was declared, or it is not stored. The gap `INTEGRITY_UNVERIFIED` is disclosed.
- **A failed integrity check is never recorded as provenance.** A declared digest that does not match the stored object it names means the submission is not what it claims to be: it is refused, and nothing is written (AAB-PLATFORM-06, admission). There is no `FAILED` status, because a record never holds a claim the platform has found to be false.
- **Integrity is established once, at admission.** A later check that the stored object is still intact is a check on the store (AAB-PLATFORM-01), not a change to provenance.

## 4. References to other records: citation and resolution (amended on 2026-10-02)

**A reference is cited, then resolved.**
- **Cited:** the identifier exactly as the submitter gave it. It is always recorded, whatever happens next.
- **Resolved:** at admission, the platform looks for an admitted record with that identifier, in the same domain and the same country tenancy. If it finds one, it records that record's identifier (equal to the cited one), version and, where the record has one, digest. The reference then points at exactly that version, permanently.

**Rules:**
- **An unresolved citation is disclosed, never dropped and never guessed.** The gap `CITATION_UNRESOLVED` is recorded, naming the citation. Whether an unresolved citation limits or refuses the admission is the domain's decision (section 7).
- **Resolution happens once, at admission.** A record admitted later with the cited identifier does not retroactively resolve an earlier citation: the earlier record's provenance says what was known when it was admitted. What cites a record is derived when read, not written into the cited record.
- **A citation is never resolved across a country boundary or into another domain implicitly.** A reference to a record elsewhere stays cited only, unless an explicit, authorised sharing arrangement defines its resolution.
- **A record never cites itself.**
- **The relation is the domain's.** The platform records and resolves the reference. What "derived from" or "follows" means, and which relations a record may have, is the domain's vocabulary.

## 5. Correction without change (amended on 2026-10-02)

- **A record and its provenance are written once.** Nothing about them is updated or deleted. There is no "last updated" time, because there is no update.
- **A correction is a new record that supersedes the old one,** naming it. The superseding record has its own provenance: who submitted the correction, when, and why. The superseded record keeps its provenance unchanged.
- **Supersession is recorded on the new record only.** That a record has been superseded is derived when it is read.
- **A record is superseded at most once,** and only by a record in the same domain and tenancy. Superseding is not deleting: every act that relied on the superseded record still names it, and it can still be read.
- **Withdrawal is a supersession** by a record that states the withdrawal and its reason. There is no other way to withdraw a record.
- **Each domain defines which of its records can be superseded, and by whom.** The platform defines only the mechanism.

## 6. Disclosed gaps

**Gaps are disclosed, never hidden, and never treated as verification.** Every gap in section 2 is set by the system, from the record itself: none is chosen by the submitter, and none can be removed.

- **The domain maps each platform gap to its own consequence:** a limitation disclosed with the admission, or a refusal. The mapping is part of the domain's adoption of this contract (section 7), and it never removes a gap.
- **A gap is carried wherever the provenance is carried** (section 9).

## 7. Adopting this contract (amended on 2026-10-02)

A domain adopts this contract by amendment to its admission contracts. The amendment must document:
- **its vocabularies:** `sourceType`, `generation.method` and `lineage.relation`, with what each value means;
- **which fields its records require,** by record type. The platform requires only `submission`, `source.sourceType`, `lineage` (which may be empty) and `gaps`;
- **its gap mapping:** for each platform gap, whether it is a disclosed limitation or a refusal, and under which of the domain's own codes;
- **which records can be superseded, and by whom** (section 5);
- **what its existing records already store,** field by field, against this contract's fields. Stored records are never rewritten to adopt this contract. A domain's existing field names are kept where they are already stored or externally visible; the mapping says which platform field each one is.

## 8. Settled here: what the two domains' contracts disagreed on

The admission contracts of both domains were surveyed for this contract. Where they disagreed, this contract settles the platform meaning. Each domain's adoption records how its own fields map.

| Disagreement | Settled |
|---|---|
| A failed integrity status: one domain never records it; the other allows it | Never recorded. A failed check refuses the admission (section 3). |
| Chain of custody: a declared yes-or-no in one domain; a list of events, never defined, in the other | Both: `declaredComplete`, and optional declared `steps` (section 2). |
| The original's digest and reference: required in one domain, optional in the other | Optional at platform level. The domain says which of its records require them (section 7); their absence is a disclosed gap. |
| The submitter flattened to an identifier where provenance is copied into something built from the record | Never. Provenance is carried by reference to the record, with its full `ActorReference` recoverable (section 9). |
| A "last updated" time on a record | None. Records are written once; correction is by supersession (section 5). |
| The admission time called `recordedAt` in some records and `submittedAt` in others | The platform field is `submittedAt`. Existing stored names are kept, and mapped (section 7). |
| A second kind of person reference for people named in a record's content | The actor who submitted is always an `ActorReference`. People named in the content, such as a reviewer of an extraction, are declared data about the source or generation, not actors. |
| An untyped list of provenance identifiers attached to shared records | Replaced by typed `lineage` entries, each cited and, when found, resolved to a version (section 4). |

## 9. Carrying provenance

**When something is built from admitted records** (an evaluation, a package, a shared representation), it carries each record's provenance by reference: the record's identifier, version and digest, and the gaps disclosed with it.
- **The reference is the authority, never a copy.** A copy of provenance fields inside something built from the record is a convenience. Where the two differ, the record's own provenance is correct.
- **A copy never drops a gap,** and never reduces `submittedBy` to less than the record holds without saying so.
- **Across a country boundary,** provenance is carried only under an explicit, authorised sharing arrangement, and only as that arrangement permits. The authority for this is the country isolation architecture (`governance/AAB-PLATFORM-AND-COUNTRY-ISOLATION-ARCHITECTURE-2026-09-12.md`), under which cross-country sharing is never assumed and must be provenance-preserving, and the non-return boundary (`governance/AAB-COUNTRY-SCIENTIFIC-DATA-NON-RETURN-BOUNDARY-2026-09-13.md`), under which any sharing must be explicit, country-authorised and provenance-preserving, and derived representations are protected as the data they derive from:
  - operational provenance names actors by `actorId` and `issuer` only (AAB-PLATFORM-03, section 4);
  - an organisation's identity, and any personal name, cross only when separately authorised;
  - provenance is never stripped to make a record easier to share. A record that cannot be shared with its provenance is not shared. Stripping it would break the provenance-preserving requirement of both documents above, which this contract applies and does not relax.

## 10. Failure rules (amended on 2026-10-02)

- **No submitter, no record.** Provenance without a complete `ActorReference` for its submitter cannot be written.
- **The system-set fields are never taken from the request.** A request that supplies `submittedBy`, `submittedAt`, `objectId`, `integrityStatus`, `resolved` or `gaps` is refused.
- **A declared digest that contradicts the stored object it names refuses the admission** (section 3).
- **Everything else is disclosed, not refused, unless the domain's adoption says otherwise:** an unidentified source, an original not stored, an unverified original, an unresolved citation, and incomplete or undeclared custody.

## What this contract does not establish

- It admits no record, and defines no admission decision. Admission is AAB-PLATFORM-06, which binds its decision to this provenance.
- It does not judge any source, method or record.
- It does not define any domain's vocabularies, required fields or gap consequences.
- It does not define cross-boundary sharing. It requires only that sharing preserve provenance, as the sovereignty documents do.
- It does not change any stored record, and does not rename any existing field.
- It implements nothing.

## Decisions recorded on 2026-09-27

Confirmed in review:
1. **No `FAILED` integrity status.** A record never holds a claim the platform has found false; a failed check refuses the admission (section 3). A domain whose designed contract allows `FAILED` aligns with this when it adopts this contract.
2. **Custody is both declared completeness and optional declared steps.** Together they cover both domains' existing approaches, without either changing what it has stored (section 2).
3. **`generation.automated` is always stated.** Content produced by a system, presented as an original observation, would be a governed deception (section 2).
4. **`submittedAt` is the platform name for the admission time.** Existing stored names are kept and mapped, as the dependency audit's naming decision requires (sections 7 and 8).
5. **People named in a record's content are declared data, not actor references.** Who submitted a record and who is named in its content are different things (section 8).
6. **Resolution is fixed at admission.** Retroactive resolution would undermine the reproducibility of everything that read the record (section 4).
7. **Carrying provenance across a country boundary cites its authority directly:** the country isolation architecture and the non-return boundary (section 9).

Also as drafted: the three standings (section 1), correction and withdrawal only by supersession (section 5), the six platform gaps mapped by each domain (sections 6 and 7), and carrying provenance by reference (section 9).

## Open items

- **Contribution attribution:** crediting the people behind a record's content by role (observation, analysis, review) where governance and privacy permit. It is related to provenance, but it is not provenance, and needs its own treatment.
- **Offline capture:** provenance captured on a device without a connection, and admitted later. The platform clock sets `submittedAt` at admission; how the device's own time is recorded (as `originatedAt`, or a new declared field) is not yet settled. **Settled (amended on 2026-10-02; decision 12):** a declared `capture { deviceRecordedAt, deviceCaptureId }` block.
- **Cross-boundary sharing arrangements,** which this contract relies on and does not define. **Still open (amended on 2026-10-02):** cross-domain resolution waits for governed evidence packets, and cross-country resolution never happens implicitly (section E of the amendment).
- **Implementation:** a shared provenance module, a platform schema (in the `urn:aab:schema:` namespace, as the dependency audit's naming decision requires for new platform schemas), and each domain's adoption amendment. **Added (amended on 2026-10-02):** the record-kind resolver registry (section E), the machine-readable digest envelopes (section A), and the service registry (section C). Canonicalisation is AAB-PLATFORM-10's, with its own open items.
