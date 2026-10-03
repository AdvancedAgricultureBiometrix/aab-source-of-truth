# RD-02: AAB-PLATFORM-11 Governed Authority Grants, with consequential amendments to AAB-PLATFORM-03, 05 and 08: draft, revision 8

**Status:** REVIEW DRAFT, REVISION 8. Not normative. Not committed. No contract file is written, and nothing in the repository is changed by it.
**Proposed future path:** `governance/reviews/RD-02-AAB-PLATFORM-11-DRAFT-2026-10-03-r8.md`. It is held outside the repository until the Platform Owner decides otherwise.
**Pinned at:** `main` `8eb12c0ff06df2abc95a2d7e7cd40efff5582088`, the same commit as the evidence pin and as revisions 1 to 7 (section 7).
**Supersedes, for review:** revision 7, SHA-256 `1811877791c9d64a78402148f8a1d326f4ebf2bfd9240f9748e3ecd82721ded7`. Earlier revisions: revision 6, `2b70dddce329f2f1c2c8c27c3e42578e72b9b91b9a4f0fbe48a62446027d3f7c`; revision 5, `9e63fd302526583e35bb6f112b74e47b390cedcd461a162bd37a98ef1d97c82a`; revision 4, `46da4f3e0d3419d16f976d35788937fb5e557644938e6df4fb4d40de3394c4b4`; revision 3, `f4c6eb2a017c3c684212b0bf6c584f73f39beb137c248d1bad4c225d58b75383`; revision 2, `ab12b1902404507de0f1bcaeb8e1146de58c6128e1fe7889e42c862f87054034`; revision 1, `2e4bfe501d68e75a3e60823f0b01aa598c6b686380c68daea21f8d647223c237`.
- Section 8 maps revision 2's review items to their changes.
- Section 9 maps revision 3's review items to theirs.
- Section 10 maps revision 4's review items to theirs.
- Section 11 maps revision 5's review items to theirs.
- Section 12 maps revision 6's review items to theirs.
- Section 13 maps revision 7's review items to theirs.
- Section 14 maps revision 8's review item to its change.
- **Every PROPOSED item is listed, one line each, in the separate decision sheet** (`RD-02-AAB-PLATFORM-11-DECISION-SHEET-r8.md`). **No item is approved by silence or omission.**
**Decided basis:** the RD-02 decision record, revision 3, **DECIDED 2026-10-03** by the Platform Owner.
- The approved artifact has SHA-256 `4303ceeee4693050958db71c405953ebeabcc4e7105c9a958be0002269958314`.
- The decided file has SHA-256 `dcf08444f997e7698838d24a0ec54ecc837b7e9b310da27601fe691783e63dce`.

**Evidence:** the RD-02 evidence and gap report, revision 4, SHA-256 `42e2a21a0993023d5ee2ffcfc313c16df188400fe6a689d680c4c9c3713ef008`.

**What the decision record authorises:** drafting for review. **Nothing else.**
- It does not authorise committing contract text, implementation, extraction, or any change to a database, environment or deployment.
- It does not mark RD-02 `CONTRACT-RESOLVED` or closed.
- **RD-02 stays open.**

**How to read this draft:**
- Section 0 reproduces the decided record's sections 1 and 2 byte for byte. **Nothing decided there is changed or reopened.**
- Text taken from the decided record carries no label.
- **Every other rule is marked `[PROPOSED — PLATFORM OWNER DECISION REQUIRED]`, or sits inside a section so marked.** That covers every choice added in revisions 1 to 8 that the record does not decide. The decision sheet numbers each one.
- Citations are `path:line` at `8eb12c0`. Short forms used below:
  - P03 = `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`
  - P04 = `governance/AAB-PLATFORM-04-ACTOR-SUBJECT-LINK-CANONICAL-CONTRACT-2026-09-27.md`
  - P05 = `governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md`
  - P07 = `governance/AAB-PLATFORM-07-FROZEN-EVALUATION-SNAPSHOTS-CANONICAL-CONTRACT-2026-09-28.md`
  - P08 = `governance/AAB-PLATFORM-08-ATTRIBUTABLE-HUMAN-REVIEW-WITH-CURRENCY-CANONICAL-CONTRACT-2026-09-28.md`
  - P09 = `governance/AAB-PLATFORM-09-GOVERNED-PUBLIC-KEY-REGISTRY-CANONICAL-CONTRACT-2026-09-28.md`
  - PLAT10 = `governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`
  - SEP = `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`
  - RM = `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`
  - ST = `governance/AAB-STOCK-TAKE-2026-09-28.md`
  - CAP-nn = `governance/workstream-b/CAP-nn-…-CANONICAL-CONTRACT-….md`

---

## 0. The decided basis (reproduced byte for byte from the decided file, sections 1 and 2)

```markdown
## 1. Inherited invariants

These are already established on `main` (report, section 4(a)). The contract restates or cites them, and does not reopen them.

| # | Invariant |
|---|---|
| I1 | Authority is resolved on the server, from protected records. |
| I2 | A claim in a request confers nothing. |
| I3 | Country authority is explicitly country-scoped, and is never inferred as global. |
| I4 | A service never inherits human authority. |
| I5 | Unresolved authority fails closed. |
| I6 | **Stated as a requirement:** "No canonical, Platform Owner, AAB staff or other-country administrator role confers authority inside a country environment. Any access granted to canonical AAB, the Platform Owner, AAB personnel or AAB-operated services must be temporary, explicitly country-authorised, scoped, auditable and revocable." |

I4 and I6 are confirmed readings of their sources. I6 is strengthened from the egress specification's "should" to "must". **Its wording here supersedes the wording proposed in the report's section 4(a):** the temporary-access requirement applies to access granted to AAB itself, not to a country's own users of its deployment. *(Refined in review; approved by the Platform Owner, 2026-10-03.)*

---

## 2. Decisions

### D1. Structure

- A new platform contract, **AAB-PLATFORM-11 Governed Authority Grants** (the name is decided by this record).
- Consequential amendments to AAB-PLATFORM-03, 05 and 08.
- AAB-PLATFORM-03's stale text is corrected in its consequential amendment: the statement that version 2 "is not implemented" (report, C3), and its pilot scope statement (C4).

### D2. A federated registry

- **The platform** defines the role-definition schema, the grant lifecycle, the identifier rules and the verification invariants.
- **Each domain's contract** owns the meaning of its roles, and the operations each role permits. A role is changed only by amending its owning contract.
- **The canonical index** is derived from the contracts and checked by script. It indexes domain-owned definitions; it invents no authority.
- **A cross-capability use of a role** (for example, CAP-07 letting CAP-10's `SAFETY_GOVERNOR` revoke a composition grant; report, C6) is registered in both the role-owning contract and the consuming contract. The check refuses a use registered in only one.
- **Each country** owns its appointments and grant records, in its own environment.

### D3. Who may grant, and the founding rule

- Grants are made by the country's **grant authority**, a role held within the country.
- **Canonical AAB holds no standing grantor authority** in any country (I6).
- **Founding rule.** Until CAP-24 has a contract, the grant authority is the country's authorised representative, on these conditions:
  - their authority is supported by **recorded country-governance evidence**;
  - **they cannot appoint themselves;**
  - **disclosure alone is not sufficient.**

### D4. A grant is decided as a proposal

- A grant begins as a **grant proposal**, a record with its own `proposalId`.
- The proposal is decided by an **AAB-PLATFORM-08 human decision**, which cites the `proposalId`. AAB-PLATFORM-08 supplies the decision mechanism: attribution, signature, receipt and challenge, and its platform-minimum independence rules (P08:97-102). **AAB-PLATFORM-11 defines and enforces the grant-specific independence rules** (D5).
- **The immutable `grantId` is created only when a proposal is approved.** No decision is ever required to cite a `grantId` that does not yet exist.

### D5. Two-person control

For a **governor** grant, and for a **grant-authority** grant:
- **two independent, authorised people** must approve;
- neither may be the proposed recipient;
- neither may approve their own authority;
- conflicts are declared and checked before approval;
- the two approvals are **two separately attributable and signed human decisions**, each bound to the same `proposalId`;
- the grant is created only once **both** valid approvals exist. **One approval alone creates no authority;**
- the result is **one grant, with one `grantId`**.

### D6. Delegation

- Acting for another person happens only through a **governed mandate under an existing contract**. No new delegation mechanism is created.
- **Onward delegation is prohibited:** neither a grant nor a mandate may be passed on.
- Human decisions are never delegated (AAB-PLATFORM-08:92).

### D7. The lifecycle

- **Identity.** Every grant has an immutable `grantId`. A role definition is versioned. Changing a role's meaning creates a new role-definition version; the old one is deprecated, never silently altered or reused.
- **Fresh check.** Authority is checked again at the time of every protected act.
- **Expiry** immediately removes authority, and fails closed.
- **Suspension** takes effect immediately. A grant may be suspended for cause by the country's **grant authority**, or by the **governing role of the capability** whose protected operation is affected. Protective suspension does not wait for any challenge to be resolved. **Nobody may suspend or reinstate their own grant.**
- **Reinstatement** of a suspended grant only by a new, independent human decision, on current evidence, made by **the same approval class required to issue that grant**: a governor or grant-authority grant therefore needs two new independent approvals (D5). **Reinstatement never refreshes or extends the original expiry.** *(The approval class and expiry rule were added in review; approved by the Platform Owner, 2026-10-03.)*
- **Revocation** is permanent. A revoked grant is never reinstated; restoring authority needs a new proposal and a new grant.
- **Emergency authority** can only reduce reliance, suspend, quarantine, hold or deny. It can never approve, disclose, export, commission or increase authority.
- **Services** are registered separately, each with a named human sponsor who is accountable for the registration. A service never inherits its sponsor's authority (I4).
- **History.** Every lifecycle event is receipted in append-only storage, and supports reconstructing who held what authority at any past time.
- **Pilot grants** are never relabelled or migrated as compliant. They are replaced by newly evidenced and approved grants **before any operational reliance on protected country information**. Until then they remain disclosed as legacy operator configuration.

### D8. Grant term

- **The absolute maximum is 12 months.** It is a ceiling, not a default.
- **Every grant expires at the earliest applicable limit:**
  - the expiry of a qualification it depends on;
  - a shorter period set by country or capability policy;
  - the end of a mandate or institutional membership it depends on;
  - a shorter limit for privileged, temporary, deployment-related or emergency authority.
- **Emergency authority** is measured in hours or days, not months.
- **Temporary AAB deployment access** is limited to the approved deployment window.
- **Service grants** have bounded terms, and separate credential-rotation requirements.
```

---

## 1. Proposed contract text: AAB-PLATFORM-11 Governed Authority Grants

> # AAB-PLATFORM-11 — Governed Authority Grants — Canonical Contract — [date]
>
> **Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
> **Domain:** AAB platform (shared by every domain)
> **Authority:** DEFINES HOW AUTHORITY IS GRANTED, HELD, CHECKED, SUSPENDED, REINSTATED, REVOKED AND RECONSTRUCTED: THE ROLE-DEFINITION SCHEMA, THE GRANT LIFECYCLE, THE IDENTIFIER RULES AND THE VERIFICATION INVARIANTS. It grants no role to anyone, makes no appointment in any country, defines no domain's roles, admits no capability, and changes no stored record. This contract is PROPOSED_NOT_ADMITTED.
> **Resolves:** finding RD-02 of the retrospective decision cross-review, as decided in the RD-02 decision record (revision 3, DECIDED 2026-10-03).
> **Depends on** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - AAB-PLATFORM-03 (the `ActorReference`);
> - AAB-PLATFORM-05 (governed provenance, the record-digest envelope and registered resolvers);
> - AAB-PLATFORM-08 (human decisions);
> - AAB-PLATFORM-09 (signing keys);
> - AAB-PLATFORM-10 (canonical serialisation and `DigestReference`).
>
> ## 1. Invariants
>
> **§1.1** These invariants are inherited, and this contract does not reopen them:
> - **I1.** Authority is resolved on the server, from protected records. (P03:112; CAP-04:579)
> - **I2.** A claim in a request confers nothing. (P03:202; P08:93)
> - **I3.** Country authority is explicitly country-scoped, and is never inferred as global. (CAP-01:562, and CAP-02:524, CAP-06:533, CAP-07:601, CAP-08:769, CAP-09:493, CAP-10:895, CAP-11:769, CAP-12:523)
> - **I4.** A service never inherits human authority. (P05:102-125; P03:105; P08:90)
> - **I5.** Unresolved authority fails closed. (P03:201-203; P08:93; CAP-10:656)
> - **I6.** "No canonical, Platform Owner, AAB staff or other-country administrator role confers authority inside a country environment. Any access granted to canonical AAB, the Platform Owner, AAB personnel or AAB-operated services must be temporary, explicitly country-authorised, scoped, auditable and revocable."
>
> **§1.2** I6 is stated as a requirement ("must"). It strengthens the egress specification's "should" (`governance/AAB-COUNTRY-DATA-EGRESS-TECHNICAL-CONTROL-SPEC-2026-09-13.md`:117). The temporary-access requirement applies to access granted to AAB itself, not to a country's own users of its deployment.
>
> ## 2. Roles: a federated registry
>
> **§2.1** **The platform** defines the role-definition schema, the grant lifecycle, the identifier rules and the verification invariants. (Here: §2.5; sections 4 to 10; §2.6, §2.8 and §4.6; section 1 and §5.1.)
>
> **§2.2** **Each domain's contract** owns the meaning of its roles, and the operations each role permits. A role is changed only by amending its owning contract.
>
> **§2.3** **The canonical index** is derived from the contracts and checked by script. It indexes domain-owned definitions; it invents no authority. *How it is derived and checked: P6 (PROPOSED).*
>
> **§2.4** **A cross-capability use of a role** (for example, CAP-07 letting CAP-10's `SAFETY_GOVERNOR` revoke a composition grant; report, C6) is registered in both the role-owning contract and the consuming contract. The check refuses a use registered in only one. (CAP-07:18.)
>
> **§2.5 A role definition** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* states:
> - its role reference (§2.8) and version;
> - its owning contract;
> - the operations it permits;
> - its approval class (`SINGLE` or `TWO_PERSON`, §4.4);
> - the scope types it may be granted in (§3.4);
> - any shorter maximum term its owning contract sets (§5.3);
> - its kind (`ORDINARY`, `GOVERNOR` or `GRANT_AUTHORITY`);
> - its status (`IN_FORCE` or `DEPRECATED`).
>
> **§2.6** **Identity.** Every grant has an immutable `grantId`. A role definition is versioned. Changing a role's meaning creates a new role-definition version; the old one is deprecated, never silently altered or reused. A grant names the role-definition version it was granted under, and a deprecated version is never granted again *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*.
>
> **§2.7** **Each country** owns its appointments and grant records, in its own environment.
>
> **§2.8 Role references** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. See P6 for the full rule.
> - A role is identified by its owner and its name together: `{ roleDomain, roleOwner, roleName }`, for example `{ "AGR", "CAP-10", "SAFETY_GOVERNOR" }`.
> - `roleName` keeps today's syntax and validator, `^[A-Z][A-Z0-9_]{1,63}$` (`scs-pilot/packages/api/src/foundation/auth.ts:147`; `actor-reference-v2.schema.json:63`).
> - **No stored role name is renamed.**
>
> ## 3. Who may grant
>
> **§3.1** Grants are made by the country's **grant authority**, a role held within the country.
>
> **§3.2** **Canonical AAB holds no standing grantor authority** in any country (I6). No grant is approved by a person whose authority comes from the platform control plane *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*.
>
> **§3.3** **Founding rule.** Until CAP-24 has a contract, the grant authority is the country's authorised representative, on these conditions:
> - their authority is supported by **recorded country-governance evidence**;
> - **they cannot appoint themselves;**
> - **disclosure alone is not sufficient.**
>
> *How founding works, and how the authorised representative comes to hold the grant authority inside the grant model: P1 (PROPOSED). What counts as the evidence: P2 (PROPOSED).*
>
> **§3.4 Scope** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. A grant names exactly one scope:
> - `COUNTRY`: one country environment;
> - `SUBJECT`: one domain subject, in one country (P03:108-109);
> - `INSTITUTION`: refused (`GRANT_SCOPE_NOT_HONOURED`) until RD-03 defines institutional authority;
> - `DOMAIN` and `PLATFORM`: never confer authority inside a country environment (I3, I6). A `PLATFORM` scope exists only for the platform control plane's own records;
> - `DEPLOYMENT`: a legacy pilot scope, never granted under this contract (section 11).
>
> A grant with no country is never read as covering every country (I3).
>
> ## 4. Grant proposals, decisions and approval
>
> **§4.1** A grant begins as a **grant proposal**, a record with its own `proposalId`. *Its fields: section 13 and P5 (PROPOSED).*
>
> **§4.2** The proposal is decided by an **AAB-PLATFORM-08 human decision**, which cites the `proposalId`. AAB-PLATFORM-08 supplies the decision mechanism: attribution, signature, receipt and challenge, and its platform-minimum independence rules (P08:97-102). **AAB-PLATFORM-11 defines and enforces the grant-specific independence rules** (D5). (Here: §4.4 and §4.7.)
>
> **§4.3** The immutable `grantId` is created only when a proposal is approved. No decision is ever required to cite a `grantId` that does not yet exist.
>
> **§4.4 Two-person control.** For a governor grant, and for a grant-authority grant:
> - two independent, authorised people must approve;
> - neither may be the proposed recipient;
> - neither may approve their own authority;
> - conflicts are declared and checked before approval;
> - the two approvals are two separately attributable and signed human decisions, each bound to the same `proposalId`;
> - the grant is created only once both valid approvals exist. One approval alone creates no authority;
> - the result is one grant, with one `grantId`.
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* An `AAB_ACCESS` grant also needs two independent approvals, under the same rules (I6). Every other grant is approved by one decision of a person holding the grant authority, who is never the recipient and never approves their own authority.
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* **For `GOVERNOR`, `GRANT_AUTHORITY` and `AAB_ACCESS` grants, the proposer never counts as either required approver** (`PROPOSER_CANNOT_APPROVE`). For an `ORDINARY` grant, the proposer may be the approver, under the independence rules above.
>
> **§4.5 Two kinds of "refusal"** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. They are never confused:
> - **A human `REFUSE` decision** is a judgement. It is signed, written, receipted and kept (P08). The proposal it refuses is `REFUSED`.
> - **A platform refusal** answers an invalid request: no authority, a malformed request, a self-approval, a missing conflict declaration, and the like. It writes nothing (P08:185), and its code is one of section 13's.
>
> **§4.6 Combining the decisions on a proposal** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. The decisions are combined as several single decisions (P08:200-204), never as supersession.
> - **Two-person class:**
>   - two valid `APPROVE` decisions create the grant;
>   - any valid `REFUSE` refuses the proposal;
>   - a `DEFER` leaves the proposal `OPEN`, until another decision or until it lapses.
>
>   Disagreement is preserved: an `APPROVE` that a `REFUSE` outweighs stays on the record (P08:204).
> - **Single class:** one valid `APPROVE` creates the grant, and one valid `REFUSE` refuses the proposal.
> - **Creation:** the decision that completes the approval class creates the grant, its `GRANT_CREATED` event and their receipts, in one transaction (P08:184).
> - **"Valid"** means AAB-PLATFORM-08's derived validity, `VALID`, at that moment (P08:211-213).
> - **Identifiers:** a `grantId` is assigned by the server, unique in the country environment, and never reused or changed. A proposal yields at most one grant. A changed proposal is a new proposal.
>
> **§4.7 The minimum independence test** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. It applies to every two-person decision under this contract: approvals, two-person revocations and two-person reinstatements. For each pair:
> - neither decider is the recipient;
> - neither approves their own authority;
> - each declared conflict is assessed, and the assessment recorded, before the decision;
> - there is no disqualifying reporting or control relationship between the deciders, or between either and the recipient. **There is no exception to this rule;**
> - neither decision depends on the other;
> - each decider holds independently valid authority: a different grant, not derived from the other decider's approval.
>
> **§4.8 Withdrawal** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - **A withdrawal is an AAB-PLATFORM-08 human decision:** attributable, signed and challengeable. Its kind is `PROPOSAL_WITHDRAWAL`, or `REVOCATION_REQUEST_WITHDRAWAL`. **It is never a record operation alone.**
> - **It states its reason and its authority.** The system then writes the AAB-PLATFORM-05 supersession record with the reason `WITHDRAWAL` (P05:129-157), citing the decision, in the same transaction.
> - **A grant proposal is withdrawn only by its proposer.** Anyone else who objects decides `REFUSE` instead.
> - **When:** while the proposal is `OPEN` or `EVIDENCE_REQUIRED`, including after one approval of a two-person class. Not once it is `APPROVED` or `REFUSED` (`PROPOSAL_NOT_OPEN`).
> - **After an approval, a withdrawal never erases or obscures it.** The approval stays on the record, visible with its own validity, and is shown beside the withdrawal. It never counts toward any grant. History stays append-only.
> - **Effect:** a withdrawn proposal never creates a grant. A decision attempted after withdrawal is refused (`PROPOSAL_NOT_OPEN`).
> - **A withdrawal under challenge:**
>   - **while a `PROPOSAL_WITHDRAWAL` is under challenge,** no grant is created;
>   - **while a `REVOCATION_REQUEST_WITHDRAWAL` is under challenge,** the underlying protective request stays open, and any associated suspension stays in effect.
> - **Invalidating a withdrawal does not itself decide** the underlying proposal or revocation (§10.4).
> - **A `REVOCATION_REQUEST`:**
>   - **made by a holder of the grant authority:** withdrawn only by that requester, by decision, while they still hold the grant authority;
>   - **made by a governing role:** withdrawn by **the same recorded actor who created the request,** by decision, **while that actor still holds the governing authority.** Never by another holder of the same role. **Otherwise only by two independent grant-authority holders, under §4.7, including for an `ORDINARY` grant** (A13).
>
> **§4.9 Evidence an approver cannot see** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - An approver who cannot lawfully access enough of the supporting evidence to decide **records a `DEFER` with the reason `EVIDENCE_REQUIRED`.** The proposal is then `EVIDENCE_REQUIRED` until a decider with lawful access decides, or the evidence becomes lawfully accessible.
> - An `APPROVE` by a decider without that access is refused (`EVIDENCE_ACCESS_INSUFFICIENT`).
> - **Restricted evidence is never presumed satisfactory,** and administering grants never widens access to evidence (P8).
>
> ## 5. Holding authority
>
> **§5.1** **Fresh check.** Authority is checked again at the time of every protected act. *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* The act is refused unless the actor holds a grant, resolved on the server from protected records (I1), that meets all of these:
> - **in force:** derived `ACTIVE` (§5.4);
> - **its approvals are valid:** every approval the grant needs is `VALID`, and so is every reinstatement it relies on (§5.5);
> - **the right role:** a role-definition version in force for the operation, with the operation registered for it (section 2);
> - **the right scope:** it covers the act's country and subject (§3.4);
> - **its dependencies hold:** every qualification, mandate and membership it depends on is valid at that moment.
>
> Nothing in the request confers or extends authority (I2). Any failure refuses the act, and writes nothing (I5).
>
> **§5.2** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* The resolved grant is recorded in the act's `ActorReference` (section 1a) and named in any human decision (section 1c).
>
> **§5.3 Term.**
> - **The absolute maximum is 12 months.** It is a ceiling, not a default.
> - **Every grant expires at the earliest applicable limit:**
>   - the expiry of a qualification it depends on;
>   - a shorter period set by country or capability policy;
>   - the end of a mandate or institutional membership it depends on;
>   - a shorter limit for privileged, temporary, deployment-related or emergency authority.
> - **Emergency authority** is measured in hours or days, not months. *Its rules: §8.2 and P3 (PROPOSED).*
> - **Temporary AAB deployment access** is limited to the approved deployment window.
> - **Service grants** have bounded terms, and separate credential-rotation requirements. *Their terms and credentials: §9 and P4 (PROPOSED).*
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* The grant records `expiresAt`, computed at creation as the earliest fixed limit. Limits that depend on another record's validity are checked again at every act (§5.1).
>
> **§5.4 Status, derived when read, never stored** (as P08:191) *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*.
>
> **Every condition that applies is derived and shown, with its reason.** Precedence selects only the **primary displayed status.** The derivation returns `{ primaryStatus, blockers[] }`, where each blocker is `{ condition, reason, sourceIds[] }`. Every blocker is machine-verifiable from the records it cites, and none is hidden because another takes precedence.
>
> **The conditions, in display precedence:**
> 1. `REVOKED`: a revocation completed on valid decisions (§6.3, §6.4);
> 2. `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION`: a revocation completed, and a decision it rests on was later invalidated (§10.4). The grant is **never restored and never usable,** and it is **not** classified as validly `REVOKED` on the invalidated decision's authority. New authority needs a new proposal, approvals and `grantId`;
> 3. `EXPIRED`: the time is at or after `expiresAt`, or a dependency has ended;
> 4. `APPROVAL_INVALIDATED`: an approval the grant needs has been invalidated (§10.4). Permanent;
> 5. `SUSPENDED`: at least one suspension is unresolved (§6.1, §6.2);
> 6. `EVIDENCE_REQUIRED`: a decision the grant's standing relies on is `UNDER_CHALLENGE` (§5.5), which covers an approval, a reinstatement, or a revocation. **Or** a reconstitution blocker applies: `RECONSTITUTION_IN_PROGRESS` or `PENDING_GOVERNED_DISPOSITION` (§10.5);
> 7. `ACTIVE`: no condition above applies.
>
> Any condition other than `ACTIVE` refuses new acts. Expiry immediately removes authority, and fails closed.
>
> **§5.5 Approvals under challenge, or invalidated** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - **`UNDER_CHALLENGE`:** every grant whose required approval, relied-on reinstatement, or completed revocation decision is under challenge is `EVIDENCE_REQUIRED` and refuses new acts (`GRANT_EVIDENCE_REQUIRED`) until the challenge is resolved. This applies to every grant class, with no exception.
> - **`INVALIDATED`:** see §10.4.
> - **Vexatious challenges are controlled at the challenge itself** (§10.3): only authorised challenger roles may challenge; grounds are required; an admissibility check comes first; resolution is prompt and time-limited.

> **§5.6 No backdating** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - A grant is never effective before the transaction that creates it. `effectiveFrom` is the system-set creation time, or a later time the proposal states.
> - Events are never backdated. Each takes effect at its own transaction's system-set time.
> - Reconstruction (§10.2) distinguishes **recorded time** (`recordedAt`, set by the system) from **effective time** (`effectiveFrom`, `expiresAt`). An effective time is never earlier than its record's recorded time.
> - A request for a retroactive grant, event or effective time is refused (`GRANT_RETROACTIVE_REFUSED`).
> - **No later grant legitimises an earlier act.** An act is judged by the authority resolved at its own time.
>
> ## 6. Suspension, reinstatement and revocation
>
> **§6.1** **Suspension** takes effect immediately. A grant may be suspended for cause by the country's **grant authority**, or by the **governing role of the capability** whose protected operation is affected. Protective suspension does not wait for any challenge to be resolved. **Nobody may suspend or reinstate their own grant.**
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*
> - **Each suspension is its own human decision,** with its own `suspensionId` and a stated cause. The cause is one of `MISCONDUCT_ALLEGED`, `QUALIFICATION_IN_DOUBT`, `SECURITY`, `APPROVAL_UNDER_CHALLENGE`, `REVOCATION_REQUESTED` or `OTHER`, with a reason. It writes a `GRANT_EVENT` of the kind `GRANT_SUSPENDED`.
> - **A governing role may suspend at once, and request revocation** by suspending with the cause `REVOCATION_REQUESTED` and creating a `REVOCATION_REQUEST` (§6.3).
> - **An act in progress** whose fresh check began before the suspension's transaction is serialised against it, and completes only if it commits first (precedent: `scs-pilot/packages/api/src/capabilities/shared/representation.ts:31-34`).
>
> **§6.2** **Reinstatement** of a suspended grant only by a new, independent human decision, on current evidence, made by **the same approval class required to issue that grant**: a governor or grant-authority grant therefore needs two new independent approvals (D5). **Reinstatement never refreshes or extends the original expiry.** (Here: §4.4 and §4.7.)
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*
> - **A reinstatement decision binds to one named `suspensionId`,** and to that suspension's event record and digest.
> - A grant stays `SUSPENDED` while any suspension is unresolved.
> - A reinstatement that is later invalidated leaves its suspension unresolved again (§10.4).
>
> **§6.3** **Revocation** is permanent. A revoked grant is never reinstated; restoring authority needs a new proposal and a new grant.
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*
> - **Every revocation starts with a `REVOCATION_REQUEST`:** a written-once record naming the grant, the reason and the evidence. It is created by a holder of the grant authority, or by a governing role that has suspended the grant (§6.1).
> - **Every revocation decision binds to that request's record and digest.** Two decisions on one revocation therefore address the same immutable object.
> - **Who decides:**
>   - **`GOVERNOR`, `GRANT_AUTHORITY` and `AAB_ACCESS` grants:** two independent decisions by holders of the grant authority (§4.7).
>   - **Every other grant:** one decision by a holder of the grant authority.
>   - **A governing role never revokes;** it suspends and requests.
>
> **§6.4 Combining two-person reinstatement and revocation decisions** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. The rule is the same as §4.6:
> - two valid decisions to `REINSTATE` (on one `suspensionId`), or to `REVOKE` (on one `REVOCATION_REQUEST`), take effect;
> - one alone has no effect;
> - any valid `REFUSE` leaves the state unchanged. The suspension stays unresolved, or the request is `REFUSED`;
> - a `DEFER` leaves the matter open;
> - dissent is preserved (P08:204);
> - a second decision never supersedes the first (P08:195).
>
> For the single class, one valid decision takes effect, and one valid `REFUSE` refuses.
>
> **§6.5** Past acts are unchanged. Revoking or suspending a grant never changes an `ActorReference` already recorded (P03:58).
>
> ## 7. Delegation
>
> **§7.1** Acting for another person happens only through a **governed mandate under an existing contract**. No new delegation mechanism is created. (P03, section 3; SCS-CAP-02.)
>
> **§7.2** **Onward delegation is prohibited:** neither a grant nor a mandate may be passed on. *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* A request to propose or approve a grant on the basis of a grant or mandate held for someone else is refused (`ONWARD_DELEGATION_PROHIBITED`).
>
> **§7.3** Human decisions are never delegated (AAB-PLATFORM-08:92).
>
> ## 8. Emergency authority, and AAB access inside a country
>
> **§8.1** **Emergency authority** can only reduce reliance, suspend, quarantine, hold or deny. It can never approve, disclose, export, commission or increase authority.
>
> **§8.2 Where protective authority comes from** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - Protective authority comes first from **existing, bounded grants.** A governing role invokes protective acts under its own authority: suspending (§6.1), and the holds and quarantines its capability defines.
> - **A new `EMERGENCY` grant is issued only where that is unavoidable,** and only by the grant authority. It is protective-only (§8.1) and lasts at most **72 hours**. It is not renewable.
> - An act under an `EMERGENCY` grant that is not protective is refused (`EMERGENCY_ACT_NOT_PROTECTIVE`).
> - **Review:** every emergency grant, and every act under it, is reviewed by a second, independent person. The review starts promptly, within 24 hours of the grant, and completes within 7 days.
>
> **§8.3 AAB access inside a country** (I6) *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - Any access granted to canonical AAB, the Platform Owner, AAB personnel or AAB-operated services is a grant of the class `AAB_ACCESS`.
> - It is temporary, explicitly country-authorised by **two independent approvals of the country's grant authority** (§4.4; review item 14), scoped, auditable and revocable.
> - It is limited to the approved deployment window (D8).
> - It never makes AAB a grantor (§3.2).
>
> ## 9. Services
>
> **§9.1** **Services** are registered separately, each with a named human sponsor who is accountable for the registration. A service never inherits its sponsor's authority (I4).
>
> **§9.2** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* A service acts only on its own service grant, bounded by P05's controls (P05:102-112). A service may never make a human decision, approve, or disguise itself as a human (P05:116-123). Where a person initiated its act, both are recorded (P05:114), and the initiator's authority is never transferred to the service.
>
> **§9.3 No secret in any record** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. A `SERVICE_REGISTRATION` and its events hold only:
> - a credential identifier, or a secret-manager reference;
> - a public-key identifier, and its fingerprint (a `DigestReference`, PLAT10:133-145);
> - the credential's issuer;
> - its creation and expiry times;
> - the rotation reference (the credential it replaces);
> - the execution-identity binding.
>
> **A request that carries secret material is refused, and nothing is written** (`SECRET_MATERIAL_REFUSED`).
>
> **§9.4 Credentials** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. Two kinds are distinguished:
> - **short-lived service tokens,** valid for minutes or hours, issued from the underlying key and never stored;
> - **underlying keys,** rotated within the 90-day ceiling (P4).
>
> *A sponsor who can no longer act: P9 (PROPOSED).*
>
> **§9.5 AAB-operated services** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. A service operated by AAB, acting inside a country environment, needs both:
> - **an active `SERVICE_REGISTRATION` and service grant;**
> - **a separately approved, two-person `AAB_ACCESS` grant naming that registration** (§8.3).
>
> **The `SERVICE` class never bypasses I6.**
>
> ## 10. History, receipts, reconstruction and challenge
>
> **§10.1** **History.** Every lifecycle event is receipted in append-only storage, and supports reconstructing who held what authority at any past time.
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* **There are three event records, each with exactly one subject, always present, of its own type:**
> - **`GRANT_EVENT`** (subject `grantId`): `GRANT_CREATED`, `GRANT_SUSPENDED`, `GRANT_REINSTATED`, `GRANT_REVOKED`;
> - **`SERVICE_REGISTRATION_EVENT`** (subject `serviceRegistrationId`): `SERVICE_REGISTERED`, `SERVICE_SPONSOR_CHANGED`, `SERVICE_CREDENTIAL_ROTATED`, `SERVICE_REGISTRATION_ENDED`;
> - **`FOUNDING_EVENT`** (subject `foundingCeremonyRecordId`): `FOUNDING_RECORDED`, `FOUNDING_VALID`, `FOUNDING_CLOSED`, `FOUNDING_FAILED`, `RECONSTITUTION_COMPLETED`.
>
> No event carries an empty or meaningless identifier. Expiry is derived, not an event.
>
> **§10.2** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* "Who held what authority at time T" is resolved from the records and events **recorded** at or before T, by §5.4's derivation, using **effective** times (§5.6). Validity is taken as derived at T. Validity derived later is also shown, but never rewrites what was relied on.
>
> **§10.3 Challenge** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
> - **What is challengeable:** the human decisions, as AAB-PLATFORM-08 decisions (P08:208-215). These are approvals, refusals, suspensions, reinstatements, revocations, withdrawals and founding attestations. Records and events are not challengeable.
> - **Lodgement.** An unauthorised, malformed or groundless submission is a **platform refusal:** nothing is written, and no challenge is open. The codes are `CHALLENGER_NOT_AUTHORISED`, `CHALLENGE_MALFORMED` and `CHALLENGE_GROUNDS_MISSING`.
>   - Unauthorised: not by a challenger role of P11.
>   - Malformed: the challenged decision or its digest is not resolved.
>   - Groundless: no written grounds addressing that decision.
>
>   **The platform never judges a challenge's merit.**
> - **A correctly lodged challenge is open at once** (P08:212). The challenged decision is `UNDER_CHALLENGE`, and fails closed (§5.4, §5.5), pending:
>   - **admissibility,** a `CHALLENGE_ADMISSIBILITY` decision by an eligible internal resolver (P12) within 2 working days. An inadmissible challenge is dismissed, with reasons, and recorded;
>   - **resolution,** by P12's eligible internal resolvers, within the maximum period.
> - **Internal resolution only.** Challenges are resolved inside the country, by eligible grant-authority holders, as AAB-PLATFORM-08 decisions. When that cannot happen, §10.5 applies.
>
> **§10.4 What an upheld challenge does,** by decision kind *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*:
>
> | Decision invalidated | Effect |
> |---|---|
> | An approval (`APPROVE`) | The grant is `APPROVAL_INVALIDATED`: unusable for new acts, permanently. Restoring authority needs a new proposal |
> | A refusal (`REFUSE`) | The proposal is no longer treated as refused. A new decision is required; nothing is approved by the invalidation itself |
> | A suspension | That suspension ceases. Any other unresolved suspension still governs |
> | A reinstatement | Its suspension is unresolved again |
> | A revocation | The revocation decision and its event stay **visibly invalidated, and are never relied on again** (P08:214). The grant is **never restored and never usable,** and is not classified as validly `REVOKED` on that authority: its condition is `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION` (§5.4). New authority needs a new proposal, approvals and `grantId` |
> | A withdrawal | The withdrawal is invalidated, and **decides nothing.** The proposal or revocation request returns to the state it had before the withdrawal. Its existing decisions keep their own validity, and it still needs the decisions it lacked. No grant is created, and no revocation completes, by the invalidation itself. **The lapse deadline is extended by exactly the system-recorded period during which the withdrawal stood,** from the withdrawal's recorded time to the invalidation's. That extension is reconstructable as of any time. The proposal is never reset to a new 30-day term |
> | A founding attestation | The founding basis fails, and everything depending on it fails closed: founding grants, and grants approved by their holders, become `APPROVAL_INVALIDATED` (as for an approval). The country must found again |
>
> Past acts are unchanged in every case (§6.5).
>
> **§10.5 External reconstitution and refounding** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. This applies when a challenge cannot be resolved internally: no eligible resolver exists, the maximum period passes, or founding fails.
> - **Authority stays fail-closed** for everything the unresolved matter affects, until reconstitution succeeds.
> - **The country's own governance acts outside AAB.** A competent body outside AAB makes **no AAB-PLATFORM-08 decision** unless its member holds the required registered authority under this contract. **AAB never decides** (I6).
> - **Its signed determination is governed evidence.** It is stored as an evidence object under AAB-PLATFORM-01, with external attestation as in P2. It is the input to a defined procedure, not an AAB decision.
> - **The procedure is refounding.** It is P1's two-stage procedure, with `ceremonyKind: REFOUNDING`:
>   1. the system writes a `FOUNDING_CEREMONY_RECORD` citing the determination;
>   2. two persons the determination names, independent under §4.7, each make a `FOUNDING_ATTESTATION` on it;
>   3. the record is valid once both attestations and the external attestation are valid;
>   4. it creates `GRANT_AUTHORITY` grants only for the persons the determination nominates.
>
>   **Independence** (review item 3): the refounding attesters and the nominated grant authorities must be independent, under §4.7, of each other, and of the unresolved matter's challenger, original deciders and affected holder. A determination that does not establish this fails closed (`REFOUNDING_NOT_PERMITTED`).
>
>   A refounding is accepted only while a matter is unresolvable internally, or founding has failed.
> - **Existing grant authority** (review item 2). The country's signed determination states the treatment of **every** existing `GRANT_AUTHORITY` grant, one of:
>   - **retained;**
>   - **suspended pending internal decision.** It is suspended by the new grant authorities' first decisions, cause `OTHER`, citing the determination;
>   - **proposed for governed revocation after reconstitution.** A `REVOCATION_REQUEST` is decided by the new grant authorities under §6.3.
>
>   **AAB makes no choice.** No existing authority silently survives, or is silently revoked. A grant the determination does not treat, or treats ambiguously, stays fail-closed (`EVIDENCE_REQUIRED`, with the determination as a blocker) until a further determination treats it.
> - **Reconstitution in two stages, with no usable-authority interval.** Both stages work through **derived blocker conditions under §5.4.** They are not stored grant fields, grant mutations or new record kinds. Nothing is recorded on any grant.
>   - **Stage 1, protective.**
>     - **`RECONSTITUTION_IN_PROGRESS`.** From the recorded time of the refounding `FOUNDING_CEREMONY_RECORD` until `RECONSTITUTION_COMPLETED`, every existing and every replacement `GRANT_AUTHORITY` grant in the country derives this blocker. Its `sourceIds[]` cite that `FOUNDING_CEREMONY_RECORD` and its country determination.
>     - **Completion.** The system writes the `FOUNDING_EVENT` `RECONSTITUTION_COMPLETED` when two things hold: the refounding ceremony record is valid (both attestations and the external attestation are valid), **and** every replacement `GRANT_AUTHORITY` grant it nominates exists.
>     - **Atomicity.** Where possible, the last replacement grant and the `RECONSTITUTION_COMPLETED` event are written in one transaction. Where they cannot be, `RECONSTITUTION_IN_PROGRESS` continues to apply to every existing and replacement grant until the event is written. No step leaves authority usable.
>   - **Stage 2, governed disposition.**
>     - **At `RECONSTITUTION_COMPLETED`,** retained grants and the replacement grant authorities lose the `RECONSTITUTION_IN_PROGRESS` blocker. They remain subject to every ordinary validity check (§5.1).
>     - **`PENDING_GOVERNED_DISPOSITION`.** From `RECONSTITUTION_COMPLETED`, each existing grant the determination marks for suspension or governed revocation derives this blocker, citing the determination in its `sourceIds[]`. It lasts until the required internal decision completes: a suspension (§6.1), or a revocation (§6.3, §6.4).
>     - The new grant authorities make those decisions, as AAB-PLATFORM-08 decisions. A grant so marked never regains authority during the transition.
>   - **The guarantee:**
>     - no affected existing grant is usable until its governed disposition completes, or, if retained, until `RECONSTITUTION_COMPLETED`;
>     - no new grant is usable before `RECONSTITUTION_COMPLETED`.
> - **The new grant authorities then decide internally,** as AAB-PLATFORM-08 decisions: resolving the challenge, and any suspension or revocation the matter needs.
> - **Until reconstitution succeeds,** the affected authority stays fail-closed, and the matter stays unresolved.
>
> ## 11. Pilot grants
>
> **§11.1** **Pilot grants** are never relabelled or migrated as compliant. They are replaced by newly evidenced and approved grants **before any operational reliance on protected country information**. Until then they remain disclosed as legacy operator configuration.
>
> **§11.2** *How decisions already made on pilot grants are read: P7 (PROPOSED).*
>
> ## 12. Who may see grant records
>
> *P8 (PROPOSED).*
> - Grant records are country data in the country's environment (§2.7).
> - An accountable name never leaves the country's boundary (P03:114; P08:91).
> - **The grant envelope and status are separate from supporting evidence.** Administering grants confers no access to that evidence.
>
> ## 13. Records, fields, statuses, events and refusal codes
>
> **Every name and field in this section is [PROPOSED — PLATFORM OWNER DECISION REQUIRED].**
>
> **§13.1 Every record kind this contract defines** conforms to AAB-PLATFORM-05 and AAB-PLATFORM-10. This covers `GRANT_PROPOSAL`, `GRANT`, `REVOCATION_REQUEST`, `GRANT_EVENT`, `SERVICE_REGISTRATION`, `SERVICE_REGISTRATION_EVENT`, `FOUNDING_CEREMONY_RECORD` and `FOUNDING_EVENT`. Each has:
> - **a record kind, identifier and version:** `recordKind`, `recordId` and `recordVersion`;
> - **a schema:** `schemaVersion`, a schema identifier in the `urn:aab:schema:` namespace (P05:428). The schema declares, field by field, what is in the digest envelope (P05:50);
> - **its country and domain:** `countryCode`, and `domain: "AAB_PLATFORM"`;
> - **governed provenance:** an AAB-PLATFORM-05 `Provenance`, with `submission.submittedBy` and `submittedAt` set by the system (P05:71-127);
> - **a digest:** `recordDigest`, a `DigestReference` of type `recordDigest`, `aab-canonical-json-1`, `sha-256`, set by the system over the AAB-PLATFORM-05 envelope (P05:31; PLAT10:133-145 and 171);
> - **system-set times** in AAB-PLATFORM-10's form, `YYYY-MM-DDTHH:MM:SS.sssZ` (PLAT10:125). A request that supplies one is refused (P05:397);
> - **immutability:** written once, never changed or deleted. Derived status is never stored, and is outside the envelope (P05:45);
> - **resolved citations:** every reference to another record is a lineage entry, `{ relation, recordKind, citedId, citedVersion?, resolved }`, resolved by the system through the cited kind's registered resolver (P05:160-174). `resolved.recordDigest` is a `DigestReference`.
>
> Each record kind registers its resolver, its version rules, its digest field, its country boundary and its disclosure rules (P05:160-167).
>
> **§13.2 Records:**
>
> | Record | Holds (beyond §13.1) | Written by |
> |---|---|---|
> | `ROLE_DEFINITION` (in each owning contract; indexed) | role reference (§2.8), `roleVersion`, `owningContract`, `operations[]`, `approvalClass`, `scopeTypes[]`, `maxTerm?`, `kind`, `status`, `crossCapabilityUses[]` | Contract amendment only |
> | `GRANT_PROPOSAL` | P5 | A holder of the grant authority, or of the governing role for the role proposed |
> | `GRANT` | `grantId` (= `recordId`), `proposalId` (resolved), `recipient` (`actorId`, `issuer`), role reference and `roleVersion`, `grantClass` (`ORDINARY`, `GOVERNOR`, `GRANT_AUTHORITY`, `EMERGENCY`, `AAB_ACCESS`, `SERVICE`), `scope`, `dependsOn[]` (resolved), `effectiveFrom`, `expiresAt`, `approvalDecisionIds[]` (resolved) | The system, in the transaction of the completing approval (§4.6) |
> | `REVOCATION_REQUEST` | `revocationRequestId` (= `recordId`), `grantId` (resolved), `reason`, `evidence[]` (resolved), `requestedBy` | A holder of the grant authority, or a governing role that has suspended the grant (§6.3) |
> | `GRANT_EVENT` | `eventKind`, `grantId` (resolved, required), `decisionIds[]` (resolved), `suspensionId` (suspensions and reinstatements), `cause` (suspensions), `revocationRequestId` (revocations), `effectiveAt` | The system, with the deciding decision |
> | `SERVICE_REGISTRATION` | `serviceRegistrationId`, `sponsor` (`actorId`, `issuer`), `recordKinds[]`, `executionIdentityBinding`, `credential` (§9.3 only), `grantIds[]` (resolved), `aabAccessGrantId?` (resolved; required for an AAB-operated service, §9.5) | The system, on the grant authority's decision |
> | `SERVICE_REGISTRATION_EVENT` | `eventKind`, `serviceRegistrationId` (resolved, required), `decisionIds[]`, `credentialReference?` (§9.3 only), `effectiveAt` | The system |
> | `FOUNDING_CEREMONY_RECORD` | `ceremonyKind` (`FOUNDING` or `REFOUNDING`, §10.5); P1 and P2: the evidence references, the nominations, the external attestation's reference; for refounding, the determination's reference and the matter it resolves | The system, from the submitted evidence (P1, stage 1; §10.5) |
> | `FOUNDING_EVENT` | `eventKind`, `foundingCeremonyRecordId` (resolved, required), `decisionIds[]`, `effectiveAt` | The system |
>
> **§13.3 Derived statuses:**
> - grant: `ACTIVE`, `SUSPENDED`, `REVOKED`, `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION`, `EXPIRED`, `APPROVAL_INVALIDATED`, `EVIDENCE_REQUIRED`. The primary status is shown with every blocker (§5.4);
> - proposal: `OPEN`, `EVIDENCE_REQUIRED`, `APPROVED`, `REFUSED`, `WITHDRAWN`, `LAPSED`;
> - service registration: `IN_FORCE`, `SPONSOR_UNRESOLVED`, `SUSPENDED`, `ENDED`;
> - founding: `RECORDED`, `VALID`, `CLOSED`, `FAILED`;
> - revocation request: `OPEN`, `REVOKED`, `REFUSED`, `WITHDRAWN`.
>
> **§13.4 Events:** as §10.1.
>
> **§13.5 AAB-PLATFORM-08 decision kinds:**
>
> | Decision kind | Decided on | Outcomes |
> |---|---|---|
> | `GRANT_PROPOSAL_DECISION` | a `GRANT_PROPOSAL` | `APPROVE` (`AFFIRMATIVE`), `REFUSE` (`NEGATIVE`), `DEFER` (`DEFERRED`; reason, including `EVIDENCE_REQUIRED`, §4.9) |
> | `CHALLENGE_ADMISSIBILITY` | a challenge (P08:208) | `ADMISSIBLE` (`AFFIRMATIVE`), `INADMISSIBLE` (`NEGATIVE`) |
> | `GRANT_SUSPENSION` | a `GRANT` | `SUSPEND` (`AFFIRMATIVE`), with `suspensionId` and cause |
> | `GRANT_REINSTATEMENT` | one suspension (`suspensionId`, its event record and digest) | `REINSTATE` (`AFFIRMATIVE`), `REFUSE` (`NEGATIVE`), `DEFER` (`DEFERRED`) |
> | `GRANT_REVOCATION` | a `REVOCATION_REQUEST` | `REVOKE` (`AFFIRMATIVE`), `REFUSE` (`NEGATIVE`), `DEFER` (`DEFERRED`) |
> | `FOUNDING_ATTESTATION` | the `FOUNDING_CEREMONY_RECORD` and its digest | `ATTEST` (`AFFIRMATIVE`), `REFUSE_TO_ATTEST` (`NEGATIVE`) |
> | `PROPOSAL_WITHDRAWAL` | a `GRANT_PROPOSAL` | `WITHDRAW` (`AFFIRMATIVE`), with reason |
> | `REVOCATION_REQUEST_WITHDRAWAL` | a `REVOCATION_REQUEST` | `WITHDRAW` (`AFFIRMATIVE`), with reason |
>
> **§13.6 Platform refusal codes.** Each is a fail-closed envelope that writes nothing (§4.5):
>
> | Code | When |
> |---|---|
> | `AUTHORITY_NOT_RESOLVED` | No grant meeting §5.1 could be resolved |
> | `GRANT_NOT_ACTIVE` | Any condition other than `ACTIVE` applies (§5.4), with every blocker listed |
> | `GRANT_EVIDENCE_REQUIRED` | The grant is `EVIDENCE_REQUIRED` because an approval, relied-on reinstatement or completed revocation decision affecting its standing is under challenge (§5.5) |
> | `PROPOSAL_NOT_OPEN` | A decision or withdrawal on a proposal or revocation request that is not open (§4.8) |
> | `EVIDENCE_ACCESS_INSUFFICIENT` | An `APPROVE` by a decider without lawful access to the evidence needed (§4.9) |
> | `AAB_SERVICE_ACCESS_MISSING` | An AAB-operated service without its two-person `AAB_ACCESS` grant (§9.5) |
> | `FOUNDING_EVIDENCE_REQUIRED` | Founding attempted before the production country-key bootstrap is resolved and evidenced, or before the external attestation is valid (P1) |
> | `GRANT_REVOKED` | The grant is `REVOKED`, including on any attempt to reinstate it |
> | `GRANT_SCOPE_MISMATCH` | The grant's scope does not cover the act's country or subject |
> | `GRANT_SCOPE_NOT_HONOURED` | An `INSTITUTION`, `DOMAIN`, `PLATFORM` or `DEPLOYMENT` scope inside a country environment |
> | `CROSS_COUNTRY_AUTHORITY_REFUSED` | A grant, or control-plane authority, from outside the country environment |
> | `ROLE_NOT_DEFINED` | The role reference or version is not in the canonical index |
> | `ROLE_REFERENCE_AMBIGUOUS` | A bare role name that matches more than one in-force definition in scope (§2.8; P6) |
> | `ROLE_DEFINITION_DEPRECATED` | A new grant under a deprecated version |
> | `GRANTOR_NOT_AUTHORISED` | The decider does not hold the grant authority, or the governing role where that applies |
> | `GRANT_SELF_APPROVAL` | A decider is the recipient, or would approve their own authority |
> | `GRANT_SELF_SUSPENSION` | A person suspends or reinstates their own grant |
> | `GRANT_DECIDERS_NOT_INDEPENDENT` | A two-person decision fails §4.7 |
> | `GRANT_CONFLICT_NOT_DECLARED` | A decision is made without its conflict declaration and assessment |
> | `GRANT_TERM_EXCEEDS_LIMIT` | `expiresAt` would exceed 12 months, or a shorter applicable limit |
> | `GRANT_RETROACTIVE_REFUSED` | §5.6 |
> | `SUSPENSION_NOT_NAMED` | A reinstatement that names no unresolved `suspensionId` of the grant |
> | `REVOCATION_REQUEST_REQUIRED` | A revocation decision that names no open `REVOCATION_REQUEST` |
> | `PROPOSER_CANNOT_APPROVE` | The proposer approving a `GOVERNOR`, `GRANT_AUTHORITY` or `AAB_ACCESS` grant (§4.4) |
> | `WITHDRAWAL_NOT_PERMITTED` | A withdrawal by anyone §4.8 does not permit |
> | `CHALLENGER_NOT_AUTHORISED` | §10.3 |
> | `CHALLENGE_MALFORMED` | §10.3 |
> | `CHALLENGE_GROUNDS_MISSING` | §10.3 |
> | `REFOUNDING_NOT_PERMITTED` | A refounding when no matter is unresolvable internally and founding has not failed (§10.5) |
> | `ONWARD_DELEGATION_PROHIBITED` | §7.2 |
> | `EMERGENCY_ACT_NOT_PROTECTIVE` | §8.2 |
> | `AAB_ACCESS_NOT_COUNTRY_AUTHORISED` | §8.3 |
> | `SERVICE_NOT_REGISTERED` | A service without a registration in force |
> | `SERVICE_SPONSOR_UNRESOLVED` | P9 |
> | `SERVICE_CREDENTIAL_EXPIRED` | §9.4; P4 |
> | `SECRET_MATERIAL_REFUSED` | §9.3 |
> | `LEGACY_AUTHORITY_NOT_VERIFIED` | P7 |
> | `FOUNDING_NOT_PERMITTED` | P1 |
>
> ## 14. Boundaries with other findings
>
> - **RD-03:** `INSTITUTION` grants stay fail-closed until RD-03 defines institutional authority.
> - **RD-04:** this contract defines no purpose rules. Purpose authority is RD-04's.
> - **RD-08:** the `SAFETY_GOVERNOR` appointment uses this contract's grant lifecycle. "Emergency delegation" is met by §8 and §5.3: a protective act, or an expedited normal grant, never a bypass.
> - **CAP-24:** §3.3 applies until CAP-24 has a contract.
> - **CAP-30:** the missing audit role is unchanged.
> - **AAB-PLATFORM-01:** who may upload an evidence object stays that contract's question.
>
> ## 15. Adopting this contract
>
> *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* A domain adopts it by amendment to each contract that names roles. The amendment states:
> - each role's definition (§2.5), in the form the canonical index reads (P6);
> - each cross-capability use, in both contracts (§2.4);
> - its governing roles;
> - any shorter maximum terms;
> - who may challenge each decision kind, within P11;
> - how its existing decisions made on pilot grants are read (P7).
>
> ## What this contract does not establish
>
> - It makes no appointment, and grants no authority to anyone.
> - It defines no domain's roles or the operations they permit.
> - It defines no institutional authority (RD-03) and no purpose authority (RD-04).
> - It does not implement anything, change any stored record, or authorise extraction.

### 1a. Consequential text: AAB-PLATFORM-03

> ## Amendment of [date]: grants under AAB-PLATFORM-11, and two corrections
>
> **Consequential to AAB-PLATFORM-11** (finding RD-02), approved with it. Nothing else in this contract changes.
>
> **1. Grants** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]*. `authorityBasis` entries resolved under AAB-PLATFORM-11 carry their `grantId`, which is required for every grant so resolved. P03:111 ("Once protected membership records exist, grants come from them, and carry their `grantId`") now reads: *grants come from AAB-PLATFORM-11's grant records, and carry their `grantId`.*
>
> **2. Role references** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* (AAB-PLATFORM-11, §2.8; P6):
> - `authorityBasis` entries gain `roleDomain`, `roleOwner` and `roleVersion`, alongside `role`, which keeps its name, syntax and validator.
> - This is `referenceVersion: "3"`. Stored version 1 and version 2 references are never rewritten, and stay readable, as P6 sets out.
>
> **3. Scope types** *[PROPOSED — PLATFORM OWNER DECISION REQUIRED]* (P03:81 and 108):
> - `COUNTRY` and `SUBJECT` are granted under AAB-PLATFORM-11.
> - `INSTITUTION` is not honoured until RD-03 defines institutional authority.
> - `DOMAIN` and `PLATFORM` never confer authority inside a country environment (AAB-PLATFORM-11, I3 and I6).
> - `DEPLOYMENT` is legacy pilot configuration only.
>
> **4. The open items** "Protected membership records for the SCS pilot" (P03:234) and "`PARTY_REPRESENTATIVE` added to the role registry" (P03:238) are governed by AAB-PLATFORM-11: its grant records, and its canonical index. Implementing them stays open.
>
> **5. Correction (C3): version 2 is implemented.**
> - The Authority line (P03:5) says "version 2, defined here, is not implemented".
> - The field rules (P03:121) say "New records use version 2 once it is implemented".
> - "What this contract does not establish" (P03:212) says "It does not implement version 2".
> - The open items (P03:237) list "Implementing version 2 in the pilot".
>
> Each is out of date: version 2 is issued for every new record since PR #39, and version 1 records stay readable (RM:195; ST:314). **They now read:** *version 2 is implemented in the SCS pilot, and issued for every new record; version 1 records stay readable.* The open item at P03:237 is closed for the pilot. What remains open is grants with `grantId`, under AAB-PLATFORM-11.
>
> **6. Correction (C4): pilot scopes.** P03:110 says pilot grants "come from the actors file with `scopeType: DEPLOYMENT`". The pilot also issues `SUBJECT` grants from the same file, as SCS-CAP-02 requires for `PARTY_REPRESENTATIVE` (SCS-CAP-02:1172; `scs-pilot/packages/api/src/foundation/auth.ts:253`). **It now reads:** *in the pilot, grants come from the actors file, with `scopeType: DEPLOYMENT` or `SUBJECT`, and have no `grantId`. They are legacy operator configuration (AAB-PLATFORM-11, section 11).*
>
> **7. Unchanged:** stored references are never rewritten (P03:205). Revoking a grant never changes a reference already recorded (P03:58).

### 1b. Consequential text: AAB-PLATFORM-05

> ## Amendment of [date]: service registration under AAB-PLATFORM-11, and its record kinds
>
> **Consequential to AAB-PLATFORM-11** (finding RD-02), approved with it. Nothing else in this contract changes. **Every point is [PROPOSED — PLATFORM OWNER DECISION REQUIRED].**
> - **Section C, "a registered identity"** (P05:103) means a `SERVICE_REGISTRATION` under AAB-PLATFORM-11, section 9, with a named human sponsor accountable for it. `serviceRegistrationId` (P05:81) is that registration's identifier.
> - **"capability-specific authority, granted by the contract that owns the record kind"** (P05:106) is a service grant under AAB-PLATFORM-11, in the class `SERVICE`.
> - **`initiatedBy`** (P05:114) records the person who initiated the act. Their authority is never transferred to the service, and the service never inherits its sponsor's authority (AAB-PLATFORM-11, I4).
> - **A service whose registration is not in force,** or whose sponsorship is unresolved, may not submit (`SERVICE_NOT_REGISTERED`, `SERVICE_SPONSOR_UNRESOLVED`).
> - **AAB-PLATFORM-11's eight record kinds adopt this contract** (AAB-PLATFORM-11, §13.1): governed provenance, the record-digest envelope, system-set fields and registered resolvers (sections A, C and E).
> - **The open item "the service registry (section C)"** (P05:428) is governed by AAB-PLATFORM-11, section 9. Its implementation stays open.

### 1c. Consequential text: AAB-PLATFORM-08

> ## Amendment of [date]: authority grants under AAB-PLATFORM-11
>
> **Consequential to AAB-PLATFORM-11** (finding RD-02), approved with it. Nothing else in this contract changes. **Every point is [PROPOSED — PLATFORM OWNER DECISION REQUIRED].**
> - **Section 2, "Authority is verified, never declared"** (P08:93): the grant named in a decision is an AAB-PLATFORM-11 grant, resolved by AAB-PLATFORM-11, §5.1 at the time of the decision. `authority.grantId` (P08:135) is its `grantId`. **Founding attestations alone** name the founding ceremony record instead: `authority: { role; foundingCeremonyRecordId }` (AAB-PLATFORM-11, P1).
> - **`decidedOn.kind`** (P08:118) gains `GRANT_PROPOSAL`, `GRANT`, `GRANT_EVENT` (a suspension, for reinstatement), `REVOCATION_REQUEST` and `FOUNDING_CEREMONY_RECORD`, for AAB-PLATFORM-11's decision kinds (AAB-PLATFORM-11, §13.5). `objectDigest` is the decided record's `recordDigest`.
> - **More than one decider** (P08:200-204): AAB-PLATFORM-11's two-person decisions are several decisions under section 7, each on the same object. They are not supersession under section 6, and the second never supersedes the first. AAB-PLATFORM-11, §4.6 and §6.4 are the combining rules.
> - **Independence** (P08:97-106): AAB-PLATFORM-11, §4.4 and §4.7 add the grant-specific rules.
> - **Challenge** (P08:208-215): AAB-PLATFORM-11's decisions are challengeable by the roles AAB-PLATFORM-11, P11 names, after an admissibility check (AAB-PLATFORM-11, §10.3). A submission that is unauthorised, malformed or groundless is a platform refusal, and opens nothing. A correctly lodged challenge is open at once. Challenges are resolved internally by the resolvers AAB-PLATFORM-11, P12 names, within their periods. What an upheld challenge does is AAB-PLATFORM-11, §10.4. A body outside AAB makes no decision under this contract unless it holds registered authority; its determination is evidence for AAB-PLATFORM-11, §10.5.
> - **The open item "How authority grants are issued, scoped and revoked"** (P08:326) is closed at contract level by AAB-PLATFORM-11. "It grants no authority, and does not define how authority grants are issued" (P08:297) now reads: *it grants no authority. AAB-PLATFORM-11 defines how authority grants are issued.*
> - **Existing decisions without a `grantId`** are read under AAB-PLATFORM-11, P7. They are never rewritten, and an authority recorded only as declared stays disclosed as unverified (P08:286).

---

## 2. Proposals for decision

Every item in this section is **PROPOSED — PLATFORM OWNER DECISION REQUIRED.**
- **P1 to P9** answer the decision record's section 3.
- **P10 and P11** were added in revision 2, from its review items 2 and 12.
- **P12** is added in revision 3, from its review item 3.

### P1. The founding sequence — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**The problem.** D5 requires two independent, authorised approvers for every grant-authority grant. Before the first grants, the only authority in a country is the founding representative under D3, who cannot appoint themselves. Something must be trusted first (P09:151-163).

**Recommendation: founding in two stages, on the country's own appointments.**

1. **The country nominates.** The country's competent body appoints, in the founding evidence (P2):
   - the authorised representative (R);
   - a second, independent official (C);
   - **the two people who will be the first grant authorities, X and Y.**

   **X and Y have no disqualifying reporting or control relationship with R** (§4.7), which the evidence shows. **R and C never select X and Y:** they attest the country's appointment evidence, and nothing more.
2. **Stage 1: the ceremony record.** The founders submit the evidence references. The system writes an immutable **`FOUNDING_CEREMONY_RECORD`** holding them, with its `recordDigest`, and a `FOUNDING_EVENT` `FOUNDING_RECORDED`. It is accepted only while the country's grant store is empty, as P09 accepts a bootstrap only while its registry is empty (P09:26).
3. **Stage 2: two attestations.** R and C each make a **`FOUNDING_ATTESTATION`**, a signed AAB-PLATFORM-08 decision on that existing record and its digest. Neither can attest anything not already in the record.
4. **When founding is valid.** Founding is valid only once **both attestations, and the external attestation (P2), are valid.** The system then writes `FOUNDING_VALID`.
5. **What founding authorises.** Founding authorises one thing: the creation of the two `GRANT_AUTHORITY` grants **for the nominated X and Y.**
   - Each is a grant proposal, approved by R's and C's decisions under §4.4 and §4.7, unaltered.
   - **Neither founder is ever a recipient,** and neither chooses the recipients.
   - Founding authority approves nothing else.
6. **Closure.** When both grants are `ACTIVE`, the system writes `FOUNDING_CLOSED`. **Founding authority ends permanently** in that country (`FOUNDING_NOT_PERMITTED`).
7. **D3 inside the grant model.** After closure, X and Y may approve **a normal two-person `GRANT_AUTHORITY` grant for R**, under §4.7 **unaltered.** Because the country appointed X and Y, and R did not, no exception is needed. R then holds the grant authority through a grant, as D3's founding rule requires until CAP-24.
8. **Failing closed.** If the evidence cannot establish two independent first grant authorities, X and Y, free of any disqualifying relationship with R, **founding fails** (`FOUNDING_FAILED`). No grant is issued, and the pilot's legacy configuration stays disclosed (D7).

**The key prerequisite** (review item 10). Founders sign AAB-PLATFORM-08 decisions, and the pilot key bootstrap is "not a production solution" (P09:160-163). **Operational founding is `EVIDENCE_REQUIRED` until the production country-key bootstrap is separately contract-resolved and evidenced** under AAB-PLATFORM-09. **AAB-PLATFORM-11 does not solve or infer it.** An attempt before then is refused (`FOUNDING_EVIDENCE_REQUIRED`).

**Options considered:**
- **R and C choose X and Y.** Rejected: it creates the appointment relationship that revision 2 had to except from §4.7.
- **One founder, with the Platform Owner witnessing.** Rejected: witnessing is not approval authority (P09:12), and it breaks I6 and D3.
- **Grants provisional until ratified.** Rejected: the ratifier's authority must come from somewhere.

**Consequence.** A country that cannot nominate two independent first grant authorities issues no grant. The Platform Owner has no role in founding, other than as an observer if the country invites one.

### P2. The founding evidence — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**Recommendation:**
- **The instruments:** those by which the country's competent body appointed or empowered R and C, and **nominated X and Y as the first grant authorities.**
  - Examples are a statute or regulation, a ministerial or cabinet appointment, or an institutional board resolution.
  - Each names the person, their office, the scope (the country environment) and its validity period.
  - The evidence shows that X and Y have no disqualifying reporting or control relationship with R.
- **Storage:** each is stored as an evidence object under AAB-PLATFORM-01, and the `FOUNDING_CEREMONY_RECORD` cites each by a resolved `objectDigest` reference (§13.1).
- **Attestation within the country:** R and C attest the evidence, by their `FOUNDING_ATTESTATION` decisions (P1, stage 2).
- **External attestation, required for founding to be valid.** It is an attestation by an authority outside AAB and outside the founders' institution, for example the issuing ministry's signed confirmation, referenced by the ceremony record. **Without it, founding is not valid** (P1, step 4), so no grant can rest on it.
- **AAB's part:** the platform checks only structure (completeness, digests, signatures). It records that **AAB makes no determination of legal sufficiency** (I6).
- **Currency:** a founder's authority is checked afresh at each act against their instrument's validity (D7), and lapses when it lapses.

**Rejected:** AAB verifying the evidence (I6).

**Consequence:** "disclosure alone is not sufficient" (D3) is met.

### P3. The emergency maximum — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**Recommendation:**
- **72 hours, not renewable,** for a new `EMERGENCY` grant (§8.2).
- Such a grant is issued only where existing bounded grants cannot provide the protection, and only by the grant authority.
- **Review starts within 24 hours, and completes within 7 days,** by a second, independent person.
- Protection needed beyond 72 hours is an ordinary suspension, hold or quarantine by the competent role, which already takes effect immediately and persists until decided (D7).

**Options:** 24 hours; 72 hours; 7 days.

**Reasoning.** 72 hours covers a weekend without becoming a standing power. Most protection needs no new grant, because governing roles already hold bounded protective authority.

**Consequence.** RD-08's "emergency delegation" is met without a bypass.

### P4. Service credentials — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**Recommendation:**
- **Service grant term:** at most 6 months, within D8's 12-month ceiling.
- **Underlying keys:** rotated at most every 90 days, and at once on any of:
  - a sponsor change;
  - a suspected compromise;
  - a change of execution identity.
- **Short-lived tokens:** at most 1 hour, issued from the underlying key, never stored.
- **Records:** only the references §9.3 lists.
- **No long-lived static tokens before operational reliance on protected country information.** The pilot's static tokens stay disclosed as legacy (`TODO(oidc)`).

**Options:**
- service term: 90 days, 6 months, or 12 months;
- key rotation: 30, 90 or 180 days;
- token lifetime: 15 minutes, 1 hour, or 8 hours.

### P5. The proposal record — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**`GRANT_PROPOSAL`**, in addition to §13.1's fields:
- `proposalId` (= `recordId`);
- `recipient` (`actorId`, `issuer`; `HUMAN`, or `SERVICE` with its `serviceRegistrationId`);
- the role reference and `roleVersion`, and `grantClass`;
- `scope` (`scopeType`, `scopeId`);
- `requestedEffectiveFrom?`, never earlier than the decision that completes approval (§5.6);
- `requestedExpiresAt`;
- `dependsOn[]` (qualifications, mandates, memberships), each a resolved citation;
- `justification`;
- `evidence[]`, each a resolved citation, held separately from the envelope's visibility (P8);
- `approvalClass`, set by the system from the role definition.

**Rules:**
- The proposal is written once.
- Its status is derived: `OPEN`, `EVIDENCE_REQUIRED` (§4.9), `APPROVED`, `REFUSED`, `WITHDRAWN` (§4.8), or `LAPSED` after 30 days undecided.
- **The lapse deadline:** 30 days from the proposal's recorded time. If a withdrawal is invalidated, the deadline is extended by exactly the system-recorded period during which the withdrawal stood (§10.4). It is reconstructable as of any time, and never reset to a new 30-day term.
- **The proposer** holds the grant authority, or the governing role for the role proposed, and is never the recipient.

**Options:**
- whether a recipient may request their own grant (a request, never an approval);
- the lapse period;
- **the proposer as an approver:** never for `GOVERNOR`, `GRANT_AUTHORITY` and `AAB_ACCESS` grants (§4.4); permitted for `ORDINARY` grants.

### P6. The index check, and role references — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**The index:**
- **Source tables:** each owning contract carries a fixed-format "Role definitions (AAB-PLATFORM-11)" table, with §2.5's columns, and a "Cross-capability uses" table.
- **Generation:** a generator builds a committed canonical index from them.
- **The checker fails on any of:**
  - a role reference defined twice;
  - a version reused or altered;
  - a cross-capability use registered on one side only (D2);
  - a role named in a decision kind or refusal that is not indexed;
  - a deprecated version granted;
  - two in-force definitions sharing a bare `roleName` inside one domain.
- **Precedent:** the provenance adoption matrix's generator and byte-for-byte checker (`governance/tools/provenance-matrix/check_matrix.py`:1-15).

**Role references, reconciled with today's validator** (review item 7):
1. **Stored identifiers do not change.** The `role` field keeps its value, its syntax and its validator, `^[A-Z][A-Z0-9_]{1,63}$` (`scs-pilot/packages/api/src/foundation/auth.ts:147`; `scs-pilot/packages/api/src/schemas/shared/actor-reference-v2.schema.json:63`; `actor-reference-v1.schema.json:25`). **No role is renamed.**
2. **The new syntax is additional fields, not a new string:**
   - `roleDomain`, which matches the existing domain pattern `^[A-Z][A-Z0-9_]{0,31}$` (`actor-reference-v2.schema.json:90`);
   - `roleOwner`, for example `CAP-10`, pattern `^[A-Z][A-Z0-9]{0,15}(-[0-9]{2})?$`;
   - `roleVersion`, a positive integer.

   The display form `AGR:CAP-10:SAFETY_GOVERNOR` is derived for reading, and never stored as the `role` value.
3. **The schema and validator amendments:**
   - `ActorReference` `referenceVersion: "3"` adds the three fields to `authorityBasis` entries, required where `grantId` is present (section 1a, point 2);
   - the authenticator and readers accept versions 1, 2 and 3;
   - the index checker enforces the bare-name uniqueness rule inside a domain.
4. **Mapping bare names.** A version 1 or 2 reference's bare `role` is mapped when read, to the definition its record's own domain and capability indexes. It is shown with the mapping, and never rewritten.
5. **No ambiguous alias.** A bare name that would map to more than one in-force definition refuses resolution (`ROLE_REFERENCE_AMBIGUOUS`). Bare names are never accepted as aliases for new grants: a new grant always carries all three fields.
6. **Historical records stay readable** under their own `referenceVersion` (P03:205).

**Options:** qualified fields (recommended); a single qualified string in a new field (rejected: a second spelling of the same identity); renaming stored roles (rejected: silent renaming).

**Consequence.** Every role-naming contract needs an adoption amendment, as RD-01 needed for CAP-01 to CAP-12.

### P7. Legacy decisions — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**Recommendation:** mapped when read, failing closed, as RD-01's point 13 does (P07:189).
- A human decision whose authority carries no AAB-PLATFORM-11 `grantId` is read as authority `LEGACY_OPERATOR_CONFIGURATION`, unverified, and disclosed (P08:286).
- It stays on the record, unchanged, and is shown for history.
- **It can never be relied on** where verified authority is required (`LEGACY_AUTHORITY_NOT_VERIFIED`).
- To rely on its subject again, a new decision is made under a grant, superseding it (P08:197).

**Rejected:** reliance with disclosure. It would relabel pilot authority as compliant, which D7 forbids.

### P8. Who may see grant records — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**The envelope and the evidence are separate** (review item 13):
- **The grant envelope and status:** `grantId`, role reference, scope, class, term, derived status and decision references. It is visible on a need-to-know basis inside the country:
  - the recipient, for their own grants;
  - the grant authority;
  - a capability's governing role, for that capability's roles;
  - the deciders, for the proposal they decide.
- **The supporting evidence:** qualifications, justification, personal details, founding instruments, and any protected scientific or institutional information. It stays governed by its own record's access rules.
- **Administering grants confers no access to supporting evidence,** and never widens access. A decider sees only what the evidence's own rules allow, and the minimum necessary to decide.
- **If a decider cannot lawfully access enough evidence to decide,** the proposal is `EVIDENCE_REQUIRED` (§4.9). **Restricted evidence is never presumed satisfactory.**

**Further restrictions:**
- Relying operations resolve grants on the server, and never expose the record.
- An accountable name never leaves the country (P03:114; P08:91).
- Canonical AAB has no access except under an `AAB_ACCESS` grant (I6).
- There is no audit-role access until CAP-30 defines one, and no institution-level visibility until RD-03.

**Options:** need-to-know (recommended); all country users see who holds which role; a public register (rejected).

### P9. A service sponsor who can no longer act — PROPOSED — PLATFORM OWNER DECISION REQUIRED

**Recommendation:** the decision record's safe default, made specific.
- The registration becomes `SPONSOR_UNRESOLVED` at once when its sponsor:
  - is suspended, revoked or expired;
  - leaves the institution;
  - cannot be verified at a fresh check.
- Its new protected acts are refused (`SERVICE_SPONSOR_UNRESOLVED`). Committed acts are unchanged.
- The sponsor's human authority never becomes service authority (I4).
- **A replacement sponsor** is approved by a decision of the class required for the registration (`SERVICE_SPONSOR_CHANGED`), with keys rotated at once (P4).
- **Unresolved for 30 days:** the registration ends.

**Rejected:** a grace period, which would let a service act without an accountable sponsor.

### P10. Approvals under challenge — PROPOSED — PLATFORM OWNER DECISION REQUIRED

*(Revision 2's review item 2, settled by revision 3's review item 2.)*

- **`UNDER_CHALLENGE`:** every grant whose required approval, relied-on reinstatement, or completed revocation decision is under challenge is `EVIDENCE_REQUIRED` and refuses new acts (`GRANT_EVIDENCE_REQUIRED`) until the challenge is resolved. This applies to every grant class, with no exception.
- **`INVALIDATED`:** §10.4.
- **Controlling vexatious challenges:**
  - **authorised challenger roles only** (P11);
  - **written grounds required;**
  - **an admissibility check first,** within 2 working days (§10.3);
  - **prompt, time-limited resolution** (P12).

  A dismissed challenge is recorded with its reasons. A pattern of inadmissible challenges by one person is itself a ground for the grant authority to suspend that person's challenging role (§6.1).

**Option rejected:** revision 2's class-based split (refusal for some grants, protective suspension for others). It was inconsistent with §5.1.

### P11. Who may challenge — PROPOSED — PLATFORM OWNER DECISION REQUIRED

Every challenge is made with written grounds, under AAB-PLATFORM-08, sections 2 and 4, and passes the admissibility check (§10.3).

| Decision kind | Who may challenge |
|---|---|
| `GRANT_PROPOSAL_DECISION` (approve or refuse) | A grant-authority holder other than its deciders; the governing role for the role concerned; the proposed recipient, for a refusal |
| `GRANT_SUSPENSION` | The holder of the suspended grant; a grant-authority holder other than the suspender |
| `GRANT_REINSTATEMENT` | The person who made the suspension it resolves; a grant-authority holder other than its deciders |
| `GRANT_REVOCATION` | The former holder; a grant-authority holder other than its deciders |
| `FOUNDING_ATTESTATION` | A grant-authority holder appointed after founding. An objection from the external attesting authority or the competent body, who hold no registered authority, is **governed evidence for reconstitution** (§10.5), not an AAB-PLATFORM-08 challenge |
| `PROPOSAL_WITHDRAWAL`, `REVOCATION_REQUEST_WITHDRAWAL` | A grant-authority holder other than the withdrawer; the proposed recipient; for a revocation request, the requesting governing role |

### P12. Who resolves a challenge — PROPOSED — PLATFORM OWNER DECISION REQUIRED

*(Revision 3's review item 3.)* Every resolver holds the grant authority in the same country. Every resolver is independent of the challenger, of every decider of the challenged decision, and of every affected holder (the recipient, or the holder of the grant concerned), under §4.7.

| Decision kind | Eligible resolver(s) | Number | Maximum period | While unresolved |
|---|---|---|---|---|
| `GRANT_PROPOSAL_DECISION` on an `ORDINARY` grant | A grant-authority holder | 1 | 14 days | The grant, or the refusal, is `UNDER_CHALLENGE`; the grant is `EVIDENCE_REQUIRED` |
| `GRANT_PROPOSAL_DECISION` on a two-person grant (`GOVERNOR`, `GRANT_AUTHORITY`, `AAB_ACCESS`) | Two grant-authority holders, independent of each other (§4.7) | 2 | 30 days | As above |
| `GRANT_SUSPENSION` | A grant-authority holder; two where the grant is two-person | 1 or 2 | 14 days | **The suspension stands** (protection never waits, D7) |
| `GRANT_REINSTATEMENT` | As for the grant's approval class | 1 or 2 | 14 or 30 days | The grant is `EVIDENCE_REQUIRED` |
| `GRANT_REVOCATION` | As for the grant's approval class | 1 or 2 | 30 days | The grant stays unusable (`EVIDENCE_REQUIRED`, with the revocation shown as a blocker) |
| `PROPOSAL_WITHDRAWAL`, `REVOCATION_REQUEST_WITHDRAWAL` | As for the decision class of the matter withdrawn | 1 or 2 | 14 or 30 days | The withdrawal is `UNDER_CHALLENGE`. No grant is created. A revocation request stays open, and its suspension stays in effect |
| `FOUNDING_ATTESTATION` | Two grant-authority holders other than X and Y. Where none exist: §10.5 | 2 | 30 days | Founding is not valid. Grants depending on it are `EVIDENCE_REQUIRED` |
| `CHALLENGE_ADMISSIBILITY` | Any eligible resolver above for the challenged kind | 1 | 2 working days | The challenge counts as open |

Two resolvers' decisions combine under §4.6's rule: two valid `UPHELD` or `DISMISSED` decide; any disagreement leaves the challenge unresolved.

**Internal resolution and external reconstitution are distinct.**
- **Internal resolution:** by eligible grant-authority holders, as AAB-PLATFORM-08 decisions, as in the table.
- **When no eligible resolver exists** (for example, a country with three grant-authority holders, all of them challenger, decider or affected holder), or the maximum period passes:
  - the challenge **stays unresolved, and fails closed;**
  - **external reconstitution** follows (§10.5). The country's competent body, outside AAB, issues a signed determination. **That determination is governed evidence, not an AAB-PLATFORM-08 decision.** Under §10.5's refounding, it establishes new grant authorities, who then resolve the challenge internally;
  - **AAB never decides** (I6).

**Disclosed plainly: a challenge can freeze a small country's grant authority** until its own governance reconstitutes it. That is the price of never letting AAB decide inside a country.

---

## 3. Conflicts and ambiguities

- **A1. Two approvals and P08's supersession rule.** Resolved in drafting: several decisions under P08's section 7 (P08:200-204), combined by §4.6. They are never supersession (P08:195).
- **A2. An invalidated approval.** Completed in §5.5 and P10.
- **A3. P08 requires a `grantId`; founders have none.** Resolved by the `foundingCeremonyRecordId` form for founding attestations only (section 1c; P1). PROPOSED.
- **A4. P03's `PLATFORM` scope against I6.** Stated in §3.4 and section 1a, point 3.
- **A5. Domain policy and country appointments.** SEP:63 puts "Which actors exist, and which roles they hold" on the domain's policy side. D2 gives role meaning to the domain and appointments to each country. This draft reads them as consistent: both sit on SEP's policy side (SEP:59). **Noted, not changed.**
- **A6. "The governing role of the capability."** Only some AGR capabilities define a governing role, for example `INTEGRITY_GOVERNOR` (CAP-03:399), `SAFETY_GOVERNOR` (CAP-10) and `TRANSFER_GOVERNOR` (CAP-12). Elsewhere only the grant authority suspends. Each adoption names its governing role, if any. **Noted.**
- **A7. CAP-07's composition access grant.** *PROPOSED — PLATFORM OWNER DECISION REQUIRED (review item 8):*
  - **It is classified as a distinct object-access authorisation, not a role grant.** It authorises one named person to read one formulation version, for one purpose and one request (CAP-07:15-18). It does not hold a role, and does not enter AAB-PLATFORM-11's grant records.
  - **It adopts these AAB-PLATFORM-11 invariants:** I1 to I6; the fresh check at each read; expiry failing closed; no onward delegation (§7.2), which CAP-07's "No onward disclosure" already matches (CAP-07:21); no backdating (§5.6); and append-only history.
  - **Its cross-capability revokers** are registered under D2.
  - **Any rename,** for example to "composition access authorisation", is left to a consequential CAP-07 note.
- **A8. The 12-month ceiling against 24-month qualifications** (CAP-10:655; CAP-11:738; CAP-12:494). There is no conflict: a grant expires at the earliest limit.
- **A9. The decided file names its revision but not its own hash.** A committed approval record should carry `4303ceee…8314`, as RD-01's did.
- **A10. Revision 2's exception to §4.7 is removed.** The country, not R, now nominates X and Y (P1). §4.7 applies without exception. **Resolved.**
- **A11. An invalidated revocation.** AAB-PLATFORM-08 says an invalidated decision is "never relied on again" (P08:214). D7 says revocation is permanent. Revision 4 keeps both, without relying on the invalidated decision:
  - the decision and its event stay visibly invalidated;
  - the grant is never restored and never usable;
  - its condition is `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION`, not `REVOKED`.

  **PROPOSED.**
- **A12. A small country's grant authority can be frozen by a challenge** (P12). This is disclosed, and remedied only by the country's own reconstitution (§10.5), because I6 forbids AAB resolving it.
- **A13. Withdrawing a governing role's revocation request** (§4.8). Revision 4's review said "only by the decision class required to refuse that revocation, never by one grant-authority holder alone". For an `ORDINARY` grant, the refusal class is one grant-authority decision. **Settled in revision 5:** "the governing role itself" means the same recorded actor who created the request, while they still hold the governing authority, never another holder of the same role. Otherwise, two independent grant-authority holders under §4.7 are required, including for an `ORDINARY` grant. **PROPOSED.**
- **A14. "Groundless" at lodgement** (§10.3) means no written grounds addressing the challenged decision. The platform never judges merit; merit is for admissibility and resolution.

---

## 4. Traceability: every decision and invariant, mapped to the text that implements it

| Decided item | Implemented in |
|---|---|
| I1 Authority resolved on the server | §1.1; §5.1 |
| I2 A request claim confers nothing | §1.1; §5.1; §5.6 |
| I3 Country-scoped, never global | §1.1; §3.4; refusal `CROSS_COUNTRY_AUTHORITY_REFUSED`; 1a point 3 |
| I4 A service never inherits human authority | §1.1; §9.1-9.2; 1b; P9 |
| I5 Unresolved authority fails closed | §1.1; §5.1; §5.4; §5.5; §13.6 |
| I6 No AAB or other-country authority; AAB access temporary and country-authorised | §1.1-1.2; §3.2; §8.3; §9.5; §10.5 (AAB never decides; external determinations are evidence); 1a point 3; P1, P2, P8, P12 |
| D1 New contract; 03, 05 and 08 amended; C3 and C4 corrected | Section 1; 1a, 1b, 1c; 1a points 5 and 6 |
| D2 Federated registry | §2.1; §2.2; §2.3 with P6; §2.4; §2.7 |
| D3 Grant authority; no AAB grantor; founding rule | §3.1; §3.2; §3.3; P1 (two stages; country-nominated first grant authorities; R's grant inside the model); P2 |
| D4 Proposal; P08 decision; `grantId` only on approval | §4.1 with P5; §4.2; §4.3; §4.6; 1c |
| D5 Two-person control, all seven conditions | §4.4; §4.6; §4.7; 1c |
| D6 Mandates only; no onward delegation; decisions never delegated | §7.1; §7.2; §7.3 |
| D7 Identity and versioning | §2.6; §4.6 |
| D7 Fresh check | §5.1 |
| D7 Expiry | §5.3; §5.4 |
| D7 Suspension | §6.1 |
| D7 Reinstatement | §6.2; §6.4 |
| D7 Revocation | §6.3; §6.4; §10.4; §5.4 (`REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION` never restores) |
| D7 Emergency authority | §8.1; §8.2; P3 |
| D7 Services | §9; 1b; P4; P9 |
| D7 History | §10.1; §10.2 |
| D7 Pilot grants | §11.1; P7; 1a point 6 |
| D8 Term | §5.3; §8.2; §8.3; §9.4; P3; P4 |
| Record section 3, items 1-9 | Section 2, P1-P9 |
| Record section 4 | §14 |
| Record section 5 | Header: RD-02 stays open |

---

## 5. Future implementation and verification obligations (none authorised)

**Implementation:**
- the grant store and its five record kinds, conforming to AAB-PLATFORM-05 and 10;
- resolution at every protected act, including approval validity;
- serialisation against suspension;
- `ActorReference` version 3;
- the P08 decision kinds and combining rule;
- the service registry, with credentials held only by reference;
- the founding procedure, after a production country key ceremony;
- the canonical index generator and checker;
- adoption amendments in every role-naming contract;
- replacement of the pilot's actors-file grants before operational reliance on protected country information.

**Verification:** each of the following, by a test passing in CI on the merge commit:
- one approval creates no grant;
- a `REFUSE` refuses, a `DEFER` leaves the proposal open, and dissent is kept;
- a platform refusal writes nothing;
- self-approval and self-suspension are refused;
- §4.7's independence test is enforced;
- expiry fails closed at the boundary instant;
- an invalidated approval stops new reliance;
- every grant whose approval is under challenge is `EVIDENCE_REQUIRED`;
- an unauthorised, malformed or groundless challenge writes nothing and opens nothing;
- a correctly lodged challenge is open at once and fails closed;
- an inadmissible challenge is dismissed;
- every concurrent blocker is returned with the primary status;
- an invalidated revocation leaves the grant unusable, as `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION`;
- the proposer cannot approve a two-person grant;
- a withdrawal is a signed decision, only by the proposer, and never hides an approval;
- refounding is accepted only for an internally unresolvable matter, with independent attesters and nominees;
- a determination that leaves any existing grant-authority grant untreated keeps it fail-closed;
- a withdrawal under challenge creates no grant, and keeps a revocation request open and its suspension in effect;
- invalidating a withdrawal decides nothing, and extends the lapse deadline by exactly the period the withdrawal stood, never resetting it;
- **no usable-authority interval exists during reconstitution,** across both stages. **Required before RD-02 closes:**
  - `RECONSTITUTION_COMPLETED` is written only when the refounding ceremony record is valid (both attestations and the external attestation), and every replacement grant-authority grant it nominates exists;
  - **`RECONSTITUTION_IN_PROGRESS`:** every existing and replacement grant-authority grant derives it at every recorded instant from the ceremony record until `RECONSTITUTION_COMPLETED`, including between non-atomic steps. Its `sourceIds[]` cite exactly that `FOUNDING_CEREMONY_RECORD` and its country determination;
  - **`PENDING_GOVERNED_DISPOSITION`:** each existing grant marked for suspension or revocation derives it from `RECONSTITUTION_COMPLETED` until its required decision completes. Its `sourceIds[]` cite the determination;
  - consequently, no new grant-authority grant is `ACTIVE` before `RECONSTITUTION_COMPLETED`. No affected existing grant is `ACTIVE` before its governed disposition completes, or, if retained, before `RECONSTITUTION_COMPLETED`;
  - neither blocker writes a stored grant field, mutates a grant, or creates a record of a new kind;
- only the requesting actor, while still holding the governing authority, may withdraw a governing role's revocation request;
- a challenge with no eligible resolver fails closed, and is never resolved by AAB;
- each row of §10.4 behaves as stated;
- several suspensions each need their own reinstatement;
- reinstatement never extends expiry;
- revocation is two-person where §6.3 requires, binds to one `REVOCATION_REQUEST`, and one decision alone has no effect;
- a withdrawn proposal never creates a grant;
- an approver without lawful evidence access cannot approve;
- an AAB-operated service without `AAB_ACCESS` is refused;
- a revoked grant is never reinstated;
- a retroactive request is refused;
- reconstruction distinguishes recorded time from effective time;
- onward delegation is refused;
- an emergency grant cannot approve;
- a service never acts on its sponsor's authority;
- a request carrying a secret is refused;
- an unresolved sponsor refuses new acts;
- non-country scopes confer nothing in a country;
- unknown, deprecated and ambiguous roles are refused;
- version 1 and version 2 references stay readable and mapped;
- the index check refuses a one-sided cross-capability use;
- a legacy decision cannot be relied on;
- founding is refused before the production key bootstrap is evidenced;
- founding is valid only with both attestations and the external attestation;
- founding creates only the nominated X and Y grants, and closes for good;
- every record's `recordDigest` rebuilds from its envelope;
- every event names exactly one subject, of its own type.

**None of this is authorised.**

---

## 6. Sources read for revision 2 (at `8eb12c0`), in addition to revision 1's

- **P05:** section A (lines 29-50), section D (129-157), section E (158-174), section 10 (394-400), and the provenance record (242-300).
- **PLAT10:** section 4 (109-126), section 5 (128-145), section 6 (164-180), section 7 (182-189) and section 11 (261-269).
- **The role validator:** `scs-pilot/packages/api/src/foundation/auth.ts:147-148`, and `scs-pilot/packages/api/src/schemas/shared/actor-reference-v1.schema.json:25` and `actor-reference-v2.schema.json:63`, `:81` and `:90-99`.
- **P08:** lines 204, 209 and 211-213.
- **P09:** lines 160-163.
- **Revision 3 added:** P05:129-157 (supersession, for withdrawal) and P08:212-214 (an open challenge; an invalidated decision "never relied on again").

---

## 7. Pin and source comparison

- **Current `main`:** `8eb12c0ff06df2abc95a2d7e7cd40efff5582088`, unchanged since revisions 1 and 2 and the evidence pin. There are no commits and no changed files since, so nothing was adapted.
- **The decided basis** was re-confirmed by `sha256sum` for revision 3: `4303ceee…8314`, `dcf08444…3dce` and `42e2a21a…f008`.

---

## 8. Change log: revision 1 → revision 2, by review item (revision 2's review)

| # | Review item | Change in revision 2 |
|---|---|---|
| 1 | Human `REFUSE` against platform refusal; combining | §4.5 (two kinds of refusal); §4.6 (two approvals create, any valid `REFUSE` refuses, `DEFER` keeps open, dissent kept); §13.5 outcomes; section 5 tests |
| 2 | Fresh check covers approval validity; under challenge; invalidated; what is challengeable | §5.1 (approvals valid); §5.4 (`APPROVAL_INVALID`); §5.5; P10 (options and recommendation); A2 completed; §10.3 corrected (decisions are challengeable, records and events are not) |
| 3 | Suspension identifiers and causes | §6.1 (`suspensionId`, cause enumeration); §6.2 (reinstatement names its suspension; suspended while any is unresolved); §5.4; §13.2; `SUSPENSION_NOT_NAMED` |
| 4 | Founding narrowly bounded; R inside the grant model; key prerequisite | P1 rewritten (steps 1-6); `FOUNDING_ATTESTATION`; 1c; A10 (the disclosed exception) |
| 5 | Records conform to AAB-PLATFORM-05 and 10 | Header "Depends on"; §13.1 (kind, identifier, version, schema, provenance, `DigestReference`, envelope, system-set times, immutability, resolved citations, registered resolvers); 1b |
| 6 | No secret in any record; tokens against keys | §9.3; §9.4; P4; `SECRET_MATERIAL_REFUSED` |
| 7 | Qualified identifiers against today's validator | §2.8; P6 (six-point reconciliation); 1a point 2 (`referenceVersion: "3"`); `ROLE_REFERENCE_AMBIGUOUS` |
| 8 | CAP-07's composition access grant | A7 rewritten: an object-access authorisation; invariants adopted; rename left to a CAP-07 note |
| 9 | Who revokes | §6.3 (two-person for `GOVERNOR`, `GRANT_AUTHORITY` and `AAB_ACCESS`; one decision otherwise); §6.1 (a governing role suspends and requests revocation) |
| 10 | No backdating | §5.6; §10.2; `GRANT_RETROACTIVE_REFUSED`; P5 (`requestedEffectiveFrom`) |
| 11 | Emergency | §8.2 rewritten (existing bounded grants first; grant authority only; protective-only; 72 hours; not renewable; review within 24 hours, completed in 7 days); P3 |
| 12 | Who may challenge; minimum independence test | P11; §4.7; 1c |
| 13 | Envelope separate from evidence | P8 rewritten; section 12 |
| 14 | Two-person `AAB_ACCESS` | §4.4 (addition); §8.3 |
| 15 | External attestation before operational reliance | P2 |
| — | Labelling | Every rule not taken from the decided record is now marked `[PROPOSED — PLATFORM OWNER DECISION REQUIRED]`, including revision 1's §2.5, §3.4, §5.4, §13 and the 1a to 1c points |

**Nothing decided in the record was changed.** Section 0 is byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 9. Change log: revision 2 → revision 3, by review item (revision 3's review)

| # | Review item | Change in revision 3 |
|---|---|---|
| 1 | The country nominates X and Y; no exception to §4.7 | P1 steps 1, 5, 7 and 8; P2 (nominations in the evidence); §4.7 ("There is no exception to this rule"); A10 resolved; "R appointed X and Y" removed |
| 2 | `EVIDENCE_REQUIRED` while under challenge; controlling vexatious challenges | §5.4 (`EVIDENCE_REQUIRED`); §5.5; §10.3 (authorised roles, grounds, admissibility in 2 working days, prompt resolution); P10 rewritten; `GRANT_EVIDENCE_REQUIRED` |
| 3 | Challenge resolution, per decision kind | New P12 (resolver, number, period, effect while unresolved; no eligible resolver: unresolved, fails closed, escalated to country governance, never AAB; small-country freeze disclosed); `CHALLENGE_ADMISSIBILITY`; A12 |
| 4 | What an upheld challenge does | §10.4 matrix (approval, refusal, suspension, reinstatement, revocation, founding attestation); A11 |
| 5 | Founding in two stages | P1 steps 2-4; `FOUNDING_CEREMONY_RECORD`; `FOUNDING_ATTESTATION` on the record and its digest; validity needs both attestations and the external attestation; 1c |
| 6 | Events with one typed subject | §10.1 (`GRANT_EVENT`, `SERVICE_REGISTRATION_EVENT`, `FOUNDING_EVENT`); §13.1-13.2 |
| 7 | Combination rules for reinstatement and revocation; `REVOCATION_REQUEST` | §6.2 (binds to one `suspensionId`); §6.3 (`REVOCATION_REQUEST`); §6.4 (combining rule); §13.2, §13.5; `REVOCATION_REQUEST_REQUIRED` |
| 8 | AAB-operated services | §9.5; `aabAccessGrantId`; `AAB_SERVICE_ACCESS_MISSING` |
| 9 | Evidence an approver cannot see | §4.9; P8; `EVIDENCE_ACCESS_INSUFFICIENT` |
| 10 | Founding waits on the production key bootstrap | P1, "The key prerequisite"; `FOUNDING_EVIDENCE_REQUIRED` |
| 11 | Withdrawal | §4.8 (who; AAB-PLATFORM-05 supersession with `WITHDRAWAL`; allowed after one approval; not after approval or refusal; never creates a grant); P5; `PROPOSAL_NOT_OPEN` |
| 12 | Decision sheet | Separate file, `RD-02-AAB-PLATFORM-11-DECISION-SHEET-r3.md` |

**Nothing decided in the record was changed.** Section 0 remains byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 10. Change log: revision 3 → revision 4, by review item (revision 4's review)

| # | Review item | Change in revision 4 |
|---|---|---|
| 1 | No approval by silence | Decision sheet r4: the approval statement replaces "Default"; the header states "No item is approved by silence or omission" |
| 2 | An invalidated revocation is not `REVOKED` | §5.4 condition 2, `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION`; §10.4 revocation row; §13.3; A11; P12 revocation row; decision sheet items 19 and 37 |
| 3 | Internal resolution distinct from external reconstitution | §10.3 ("internal resolution only"); new §10.5 (determination as governed evidence; refounding; AAB never decides; fail-closed until reconstitution); P11 founding row; P12 rewritten; `ceremonyKind`; `REFOUNDING_NOT_PERMITTED`; 1c; decision sheet items 39, 40 and 58 |
| 4 | Lodgement | §10.3 (platform refusal for an unauthorised, malformed or groundless submission; a lodged challenge is open at once and fails closed); `CHALLENGER_NOT_AUTHORISED`, `CHALLENGE_MALFORMED`, `CHALLENGE_GROUNDS_MISSING`; A14; decision sheet item 36 |
| 5 | Withdrawal as a signed, challengeable decision | §4.8 rewritten (`PROPOSAL_WITHDRAWAL` and `REVOCATION_REQUEST_WITHDRAWAL`; proposer only; reason and authority; never hides an approval; a governing role's request withdrawn only by the refusal class, never by one holder alone); §10.4 withdrawal row; P11 and P12 rows; `WITHDRAWAL_NOT_PERMITTED`; A13; decision sheet item 14 |
| 6 | The proposer never counts as a two-person approver | §4.4; P5; `PROPOSER_CANNOT_APPROVE`; decision sheet item 46 |
| 7 | Precedence is display only | §5.4 (`{ primaryStatus, blockers[] }`; every blocker visible and machine-verifiable); `GRANT_NOT_ACTIVE`; decision sheet item 19 |

**Nothing decided in the record was changed.** Section 0 remains byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 11. Change log: revision 4 → revision 5, by review item (revision 5's review)

| # | Review item | Change in revision 5 |
|---|---|---|
| 1 | Who is "the governing role itself" | §4.8: the same recorded actor who created the request, while still holding the governing authority, never another holder of the role; otherwise two independent grant-authority holders under §4.7, including for `ORDINARY` grants; A13 settled; decision sheet item 59 |
| 2 | Existing authority in reconstitution | §10.5: the determination treats every existing grant-authority grant (retained; suspended pending internal decision; proposed for governed revocation); AAB makes no choice; nothing silently survives or is revoked; untreated or ambiguous grants fail closed; decision sheet item 60 |
| 3 | Refounding independence | §10.5: attesters and nominees independent under §4.7 of each other, and of the challenger, original deciders and affected holder; decision sheet item 61 |
| 4 | Withdrawal under challenge | §4.8 (no grant created; the protective request stays open and its suspension in effect; invalidation decides nothing); §10.4 withdrawal row rewritten; P12 withdrawal row; decision sheet item 14 |

**Nothing decided in the record was changed.** Section 0 remains byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 12. Change log: revision 5 → revision 6, by review item (revision 6's review)

| # | Review item | Change in revision 6 |
|---|---|---|
| 1 | Completion of reconstitution | §10.5: not complete until every existing grant-authority grant has its required disposition; `RECONSTITUTION_COMPLETED` (§10.1); decision sheet item 60 |
| 2 | Retained grants | §10.5: resume only after completion, and only if every ordinary validity check passes; decision sheet item 60 |
| 3 | Grants marked for suspension or revocation | §10.5: `EVIDENCE_REQUIRED` and unusable until the internal decisions complete; never regain authority in the transition; decision sheet item 60 |
| 4 | Atomicity | §10.5: replacement authorities and protective dispositions in one transaction; otherwise all affected authority fail-closed between steps; decision sheet item 60 |
| 5 | Verification | Section 5: the no-usable-authority-interval tests, required before RD-02 closes |
| 6 | Lapse after an invalidated withdrawal | §10.4 withdrawal row; P5 (deadline extended by exactly the recorded period; reconstructable; never reset) |
| 7 | The lapse rule on the sheet | Decision sheet items 14 and 46 |

**Nothing decided in the record was changed.** Section 0 remains byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 13. Change log: revision 6 → revision 7, by review item (revision 7's review)

| # | Review item | Change in revision 7 |
|---|---|---|
| 1 | Consistency of the under-challenge rule | §5.5 and P10 now carry one rule, covering a challenged approval, relied-on reinstatement, or completed revocation decision; `GRANT_EVIDENCE_REQUIRED` redefined; decision sheet item 20 |
| 2 | Reconstitution stages | §10.5: stage 1, protective disposition (`RECONSTITUTION_COMPLETED`; new grant authorities usable); stage 2, governed disposition; the guarantee restated; verification obligation aligned; decision sheet item 60 |

**Nothing else changed.** Nothing decided in the record was changed. Section 0 remains byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 14. Change log: revision 7 → revision 8 (revision 8's review)

| # | Review item | Change in revision 8 |
|---|---|---|
| 1 | Blockers are derived, never recorded | §10.5 rewritten: `RECONSTITUTION_IN_PROGRESS` and `PENDING_GOVERNED_DISPOSITION` as derived blocker conditions under §5.4, with `sourceIds[]`; no stored field, mutation or new record kind; completion stated in governed records (a valid refounding ceremony record, and every nominated replacement grant existing); atomicity reworded (the last replacement grant and the completion event in one transaction where possible); §5.4 condition 6 names the two blockers, so that each has a primary status; verification tests aligned, including `sourceIds[]`; decision sheet item 60 |

**No decision changed.** Nothing decided in the record was changed. Section 0 remains byte-identical to the decided file, and every decided clause appears word for word in section 1.

---

## 15. Confirmation

- **No tracked file was modified.** No branch was created or changed. Nothing was committed or pushed, and no pull request was opened.
- **No code or test was written.** No extraction was begun. No database, environment or deployment was changed.
- **RD-02 is not marked `CONTRACT-RESOLVED` or `CLOSED`.**
- This draft is held outside the repository.
