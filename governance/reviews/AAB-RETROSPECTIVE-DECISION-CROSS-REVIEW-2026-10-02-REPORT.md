# AAB Retrospective Governance and Architecture Decision Cross-Review

**Review date:** 2026-10-02  
**Repository:** `AdvancedAgricultureBiometrix/aab-source-of-truth`  
**Pinned `main` commit:** `a3777ded3a6a91cee4cacffc97590e7157803f25`  
**Review type:** read-only advisory cross-review  
**Authority:** none. This report changes no contract, finding, capability state, admission state, Gate-D state, commissioning state, code, database or environment.

## Executive conclusion

The architecture is unusually disciplined about non-compensating controls, country sovereignty, persisted authority, immutable evidence, machine-output labelling and the separation between technical verification and human approval. The central direction is sound.

It is **not yet safe to treat the contract family as implementation-ready as a whole**. I identified nine implementation-gating issues, five material design/governance decisions requiring closure, and two traceability defects. The most consequential defect is a known gap in the currency chain: when a CAP-04 admission is invalidated after a successful challenge, AAB-PLATFORM-07 has no matching change type, so downstream reviews do not automatically become stale. The contracts disclose this repeatedly, but it has not been elevated into one owned platform blocker.

This review does not alter these standing conclusions:

- **COMMISSIONING OUTCOME: NOT AUTHORISED**
- No AGR capability is implemented, admitted or commissioned.
- An absent decision or absent evidence is not presumed safe.
- The independent dependency-audit verification remains a separate gate.

## Scope and method

The review covered the current canonical decision surface on `main`, with emphasis on:

- AAB-PLATFORM-01 through AAB-PLATFORM-10;
- AGR CAP-01 through CAP-12 and the AGR capability-identity decisions;
- platform purpose, domain separation, cognitive architecture, observation/brain governance;
- capability admission, Gate D, country egress/non-return controls; and
- the parallel-development protocol.

The review tested cross-document joins rather than merely reviewing each document in isolation: caller-to-authority paths; record admission and later invalidation; purpose and institution scoping; automated output to human decision; provenance and digest semantics; retention/erasure; country boundary; release dependencies; and designed-versus-implemented claims.

The repository does not provide reliable evidence of which historic decisions were or were not previously reviewed by ChatGPT. Therefore this report does **not** label a decision “unreviewed” without evidence. It supplies the missing cross-review at the pinned commit.

The uncommitted 25-file branch described as `governance/agr-provenance-conformance` was not present on GitHub or `main` at the pinned commit. Its exact contents are outside this evidence boundary; only the canonical documents already on `main` were assessed.

## Risk-ordered findings register

### RD-01 — Invalidated admission does not trigger downstream currency changes

**Classification:** IMPLEMENTATION GATE — HIGH  
**Evidence:** CAP-04 explicitly states that an upheld challenge can return an admitted record to held state, but AAB-PLATFORM-07 has no change kind for it. CAP-05 through CAP-12 repeat the consequence: dependent review triggers do not fire.  
**Risk:** reasoning landscapes, learning promotions, safety assessments, regulatory records and manufacturing decisions may remain apparently current after a supporting record is no longer admitted. Merely displaying the member’s present state is not equivalent to invalidating reliance.  
**Required decision:** amend AAB-PLATFORM-07 with an explicit invariant change such as `MEMBER_ADMISSION_INVALIDATED`; define propagation through AAB-PLATFORM-08 currency; add automatic negative tests for every dependent capability.  
**Closure evidence:** a challenged admission becomes held; every affected snapshot comparison changes; every relying review becomes non-current or undetermined; no downstream write can rely on it.

### RD-02 — Authority grants are consumed by contracts whose issuance governance is not defined

**Classification:** IMPLEMENTATION GATE — HIGH  
**Evidence:** AAB-PLATFORM-03 requires server-resolved protected membership/grant records, but its open items retain protected membership implementation and a missing role registry. AAB-PLATFORM-08 separately says how authority grants are issued, scoped and revoked is not defined.  
**Risk:** the contracts correctly reject client-supplied roles, yet the upstream act that creates a trusted role may remain an operator/configuration act rather than a governed, evidenced decision. The authority path is incomplete at its root.  
**Required decision:** define one platform authority-grant lifecycle: authorised grantor, evidence, separation of duties, scope, expiry, suspension/revocation, audit receipt, challenge and reconstruction invariants. Define the canonical role registry before capability code relies on role names.

### RD-03 — Same-country cross-institution access lacks an enforceable authority model

**Classification:** IMPLEMENTATION GATE — HIGH  
**Evidence:** CAP-04 says a `MEMORY_READER` within a country workspace may read another institution’s records according only to record-declared `permittedUses` and `sharingClassification`. CAP-23/CAP-24 are deferred.  
**Risk:** country sovereignty does not itself confer institutional authority. A user with a country-scoped reader grant could obtain commercially sensitive institutional science unless institution membership, ownership and sharing authority are separately enforced.  
**Required decision:** define institution-scoped access, explicit sharing grants/arrangements, grantor authority, permitted recipients and revocation. Until then, cross-institution reads must fail closed.

### RD-04 — Declared-purpose access control has no governed vocabulary or role-to-purpose rule

**Classification:** IMPLEMENTATION GATE — HIGH  
**Evidence:** CAP-04 requires a declared purpose and exact string match, but openly states there is no governed purpose vocabulary and no rule for which roles may declare which purpose.  
**Risk:** purpose limitation becomes a caller-selected label. Exact string matching prevents spelling drift but does not establish authority to claim the purpose.  
**Required decision:** create a versioned purpose registry and an authority matrix mapping role + scope + operation to permitted purpose; record the resolved purpose authority in read audit evidence.

### RD-05 — Retention, lawful erasure, legal hold and override custody remain unresolved

**Classification:** REAL-DATA GATE — HIGH  
**Evidence:** AAB-PLATFORM-01 explicitly requires closure before real data for override credential governance and legal hold. It also leaves backup erasure propagation, citation behaviour after erasure, package verification after erasure, lock renewal and overwrite recovery unresolved.  
**Risk:** a design centred on immutable evidence currently has no complete answer for a lawful erasure or a legal hold. An administrator can technically override retention even though governance says the credential is held and never used.  
**Required decision:** settle erasure tombstones, derived-record treatment, backup/replica propagation, audit evidence, legal grounds, dual control, notification, and recovery behaviour before admitting real AGR data.

### RD-06 — Strong authentication for high-consequence regulatory acts has no platform contract

**Classification:** IMPLEMENTATION GATE — HIGH  
**Evidence:** CAP-11 identifies MFA and re-authentication before regulatory actions as a platform requirement with no contract.  
**Risk:** ordinary authentication plus a persisted role is insufficient for dossier egress, regulator-decision recording or other high-impact acts if the live session is compromised.  
**Required decision:** define risk-based step-up authentication, freshness, authenticator class, failure behaviour, recovery, and audit evidence as a vendor-neutral platform primitive.

### RD-07 — Trial ethics and landholder consent are recorded but not verified

**Classification:** TRIAL-ACTIVATION GATE — HIGH  
**Evidence:** CAP-08 defers country permit rules and records ethics/consent as declared. CAP-11 later gates relevant regulatory permits, but explicitly leaves ethics approval and landholder consent in CAP-08.  
**Risk:** a technically valid trial activation could rely on unverified declarations for permission to use land or involve people. This is distinct from scientific review and regulatory permitting.  
**Required decision:** country policy must identify required consent/ethics classes, authoritative issuers, evidence, currency, withdrawal and activation consequences. Missing or unverified mandatory consent must block activation.

### RD-08 — Safety authority is defined as a role but not as a governed appointment

**Classification:** SAFETY-OPERATION GATE — HIGH  
**Evidence:** CAP-10 relies on `SAFETY_GOVERNOR` while leaving who may hold it and how a country appoints one to CAP-24/country governance.  
**Risk:** safety holds, releases and directions could be technically well recorded but issued under a role whose competence and authority were never established.  
**Required decision:** define appointment evidence, qualifications, conflict rules, scope, term, suspension, emergency delegation and challenge before CAP-10 operates.

### RD-09 — Production cryptographic trust bootstrap and custody remain open

**Classification:** GATE-D BLOCKER — HIGH  
**Evidence:** AAB-PLATFORM-09 proves pilot mechanics but leaves production bootstrap, attestation-key lifecycle, compromise communication, algorithm withdrawal and private-key custody open. Gate D separately requires a country-controlled evidence verification key.  
**Risk:** test success can be mistaken for an established production trust root. A pilot ceremony co-signed by the Platform Owner is not automatically compatible with country administrative sovereignty.  
**Required decision:** define country-owned-from-creation trust anchors and custody, with AAB limited to scoped deployment authority. Keep the test key explicitly non-production.

### RD-10 — Acquisition basis can lapse after retrieval while staged material remains eligible for later submission

**Classification:** MATERIAL DECISION REQUIRED — HIGH  
**Evidence:** CAP-02 says source-approval lapse stops new runs only; already staged/submitted items keep the basis they had. CAP-04 check 13 tests validity when the run started.  
**Risk:** this is reasonable for an ordinary licence expiry, but unsafe as a universal rule. A basis may be challenged, withdrawn, legally invalidated or found to have prohibited the use. Those events should not necessarily leave unsubmitted staged material eligible for admission.  
**Required decision:** distinguish expiry from retroactive invalidity/revocation. Define which events block future submission, require quarantine, trigger deletion/retention review, or merely add a limitation.

### RD-11 — Disposable staging sacrifices reconstructability without a stated evidence consequence

**Classification:** MATERIAL DECISION REQUIRED — MEDIUM  
**Evidence:** acquisition bytes are retained for 90 days, are not backed up and are permanently represented only by digest/size/media-type metadata unless submitted to CAP-04.  
**Risk:** after expiry, AAB may be unable to reproduce a mapping, investigate why an item was not submitted, or prove what a withdrawn run actually received. This may be an acceptable minimisation choice, but the evidentiary consequence is not explicit.  
**Required decision:** state what claims remain supportable after purge and what audit disputes become `EVIDENCE REQUIRED`; consider preserving a non-content retrieval receipt and mapping/test evidence without retaining protected bytes.

### RD-12 — Refusals have no governed history

**Classification:** MATERIAL DECISION REQUIRED — MEDIUM  
**Evidence:** AAB-PLATFORM-06 says refusal writes nothing to the governed domain store and leaves only operational logs; a governed refusal history is deferred.  
**Risk:** systematic failed submissions, abuse, discriminatory rejection patterns and later challenges may not be auditable after log expiry. Logs may also contain protected material and have unresolved residency/retention.  
**Required decision:** before production, decide whether a minimal non-content refusal receipt is mandatory, with reason code, actor, time, request digest and protected-data minimisation.

### RD-13 — Main Brain packet and Intelligent Node contracts are still proposals

**Classification:** DESIGN BOUNDARY — MEDIUM  
**Evidence:** the cognitive architecture correctly requires evidence-linked, versioned, labelled outputs and country-local brains, but identifies the governed packet and Intelligent Node Model as open/proposed.  
**Risk:** building the Main Brain before those contracts exist would recreate hidden coupling and allow each domain to invent incompatible confidence, contradiction and authority semantics.  
**Required decision:** no Main Brain implementation until packet schemas, admissible inputs, authority checks, model/rule identity, failure semantics and output lifecycle are canonical.

### RD-14 — Capability admission authority is intentionally temporary and must not become the production norm by inertia

**Classification:** GOVERNANCE DECISION REQUIRED — MEDIUM  
**Evidence:** the first pilot uses joint Platform Owner + founding-country representative admission and explicitly says platform-wide governance does not exist.  
**Risk:** the pilot’s Platform Owner veto could be mistaken for permanent central authority over country capabilities, conflicting with country-owned administration.  
**Required decision:** retain the temporary label; define the future platform-wide contract authority separately from country deployment/commissioning authority; ensure canonical admission does not confer country activation.

### RD-15 — Later amendments have not reconciled stale open-gap and dependency text

**Classification:** TRACEABILITY DEFECT — MEDIUM  
**Evidence:** CAP-06/07 still say CAP-10 and CAP-11 have no contract; CAP-08 still lists CAP-10 and permit gaps in pre-amendment form; CAP-09 still says CAP-10 does not exist; CAP-10 still lists CAP-11 as absent; CAP-11 still lists CAP-12 as undefined. Amendments elsewhere partly or wholly supersede those statements.  
**Risk:** implementers can follow obsolete text in the same canonical file. “Amendment wins” is legally traceable but operationally error-prone.  
**Required action:** a clerical-only reconciliation PR should mark each stale row/gap `CLOSED`, `PARTIALLY CLOSED`, or `SUPERSEDED BY [amendment]` without changing substantive decisions.

### RD-16 — Review provenance is not machine-readable

**Classification:** TRACEABILITY DEFECT — LOW/MEDIUM  
**Evidence:** contracts and PRs often say “approved by the Platform Owner in review,” while repository metadata does not consistently identify the review artifact, reviewer independence, reviewed SHA and disposition of comments.  
**Risk:** later readers cannot reliably distinguish author approval, governance approval, independent review and cross-model editorial review.  
**Required decision:** introduce a small review-attestation record: artifact SHA, reviewer identity/type, scope, conflicts, outcome, findings, disposition commit and timestamp. Do not retroactively manufacture reviews.

## Decisions assessed as sound

The following should be preserved unless contrary evidence emerges:

1. Automated brains may reason, but automated output is not governed truth or authority.
2. Persistent machine state is versioned, evidence-linked, labelled, reversible/supersedable and separate from scientific memory.
3. Protected country information and derivatives—including embeddings, summaries and brain outputs—remain within the sovereign boundary. Transformation does not remove sovereignty.
4. No global Main Brain absorbs country knowledge; domains return bounded packets rather than surrendering their stores.
5. Authentication is not authority; authority is resolved from persisted server-side records, never caller-supplied roles.
6. Digests prove equality to canonical bytes, not truth, authenticity in the world, sufficiency or authority.
7. Record admission is separate from scientific promotion; CAP-04 admission never means a claim is validated knowledge.
8. Human review is attributable, signed, immutable, challengeable and bound to exact evidence/evaluation digests.
9. Capability admission, Gate D and country commissioning are separate non-automatic decisions.
10. The overview accurately says no capability or environment is admitted or commissioned and scopes pilot “proven” claims.
11. CAP-02’s prohibition on caller URLs, unapproved destinations, guessed mappings and automatic knowledge creation is strong.
12. The parallel-development protocol’s pinned baselines, one-owner-per-file rule, no shared live environment and mandatory handover are appropriate.

## Recommended correction order

1. **Before extraction/new capability implementation:** RD-01 to RD-04 and RD-15.
2. **Before any real AGR data:** RD-05, RD-09, RD-10 to RD-12.
3. **Before CAP-10/CAP-11/CAP-08 high-consequence operations:** RD-06 to RD-08.
4. **Before any Main Brain build:** RD-13.
5. **Before first admission/production governance:** RD-14 and RD-16.

These are non-compensating gates. No aggregate compliance percentage is appropriate.

## Review limitation and disposition

This is a technical/governance cross-review by a collaborating AI system, not the independent reviewer required by AAB’s admission or Gate-D contracts. It should be treated as an input to controlled correction and human review. No finding should be silently repaired inside an unrelated PR; each substantive change needs a traceable decision and tests where applicable.

**Result:** the existing architectural direction remains viable, but the listed implementation gates should be resolved before the contracts are treated as executable specifications.
