# AAB-PLATFORM-05 — Governed Provenance — Canonical Contract — 2026-09-27

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES PROVENANCE: WHAT IT RECORDS ABOUT A GOVERNED RECORD, WHICH OF IT IS VERIFIED AND WHICH IS DECLARED, HOW REFERENCES TO OTHER RECORDS ARE RESOLVED, HOW A RECORD IS CORRECTED WITHOUT BEING CHANGED, AND HOW PROVENANCE IS CARRIED INTO WHAT IS BUILT FROM A RECORD. It admits no record, grants no authority to anyone, amends no domain contract and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.

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

## 2. The provenance record

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

## 4. References to other records: citation and resolution

**A reference is cited, then resolved.**
- **Cited:** the identifier exactly as the submitter gave it. It is always recorded, whatever happens next.
- **Resolved:** at admission, the platform looks for an admitted record with that identifier, in the same domain and the same country tenancy. If it finds one, it records that record's identifier (equal to the cited one), version and, where the record has one, digest. The reference then points at exactly that version, permanently.

**Rules:**
- **An unresolved citation is disclosed, never dropped and never guessed.** The gap `CITATION_UNRESOLVED` is recorded, naming the citation. Whether an unresolved citation limits or refuses the admission is the domain's decision (section 7).
- **Resolution happens once, at admission.** A record admitted later with the cited identifier does not retroactively resolve an earlier citation: the earlier record's provenance says what was known when it was admitted. What cites a record is derived when read, not written into the cited record.
- **A citation is never resolved across a country boundary or into another domain implicitly.** A reference to a record elsewhere stays cited only, unless an explicit, authorised sharing arrangement defines its resolution.
- **A record never cites itself.**
- **The relation is the domain's.** The platform records and resolves the reference. What "derived from" or "follows" means, and which relations a record may have, is the domain's vocabulary.

## 5. Correction without change

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

## 7. Adopting this contract

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

## 10. Failure rules

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
- **Offline capture:** provenance captured on a device without a connection, and admitted later. The platform clock sets `submittedAt` at admission; how the device's own time is recorded (as `originatedAt`, or a new declared field) is not yet settled.
- **Cross-boundary sharing arrangements,** which this contract relies on and does not define.
- **Implementation:** a shared provenance module, a platform schema (in the `urn:aab:schema:` namespace, as the dependency audit's naming decision requires for new platform schemas), and each domain's adoption amendment.
