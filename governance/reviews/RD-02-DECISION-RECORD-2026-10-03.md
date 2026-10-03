# RD-02 — Authority grants and the role registry — Decision record

**Status:** DECISION RECORD. Revision 3, DECIDED. Not normative contract text. Not committed. Nothing in the repository is changed by it.
**Decision authority:** the Platform Owner. **`DECIDED`, 2026-10-03.** The SHA-256 of the approved artifact is recorded in the accompanying approval record, manifest or immutable PR trail.
**Finding:** RD-02 of the retrospective decision cross-review: authority grants are consumed by contracts whose issuance governance is not defined (stock-take, open decision 12).
**Pinned at:** `main` `8eb12c0ff06df2abc95a2d7e7cd40efff5582088`.
**Evidence:** the RD-02 evidence and gap report, revision 4 (`RD-02-EVIDENCE-AND-GAP-REPORT-2026-10-03.md`), SHA-256 `42e2a21a0993023d5ee2ffcfc313c16df188400fe6a689d680c4c9c3713ef008` (LF line endings; read-only, not committed). Its sections 2 and 3 are the evidence for every decision below.

**What this record authorises:** once it has been explicitly approved by the Platform Owner, drafting revision 1 of the contract and its consequential amendments, for review. Nothing else.
**What it does not authorise:** committing any contract text; implementation; extraction; any change to a database, environment or deployment; closing RD-02.

---

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

---

## 3. What the draft must propose, for decision

These are not decided by this record. Revision 1 proposes each, for review.

1. **The founding sequence.** D5's two-person rule cannot apply to the first grant-authority grants, because no grant authority yet exists to approve them. The draft proposes how a country's first grant authorities are established under D3's founding rule, following the precedent of AAB-PLATFORM-09's key bootstrap ceremony.
2. **The founding evidence.** What counts as recorded country-governance evidence (D3), who records it, and how it is verified without giving canonical AAB authority in the country (I6).
3. **The emergency maximum.** A specific limit, in hours or days (D8).
4. **Service credentials.** The credential-rotation requirement (D8).
5. **The proposal record.** What a grant proposal holds, and how the `grantId` is created on approval (D4).
6. **The index check.** How the canonical index is derived from the contracts and checked, including the two-contract registration of cross-capability uses (D2).
7. **Legacy decisions.** How human decisions already made on pilot grants, which carry no `grantId`, are mapped when read, failing closed, as RD-01's point 13 does for legacy admissions.
8. **Who may see grant records,** consistent with confidentiality and RD-03.
9. **A service sponsor who can no longer act.** What happens when a service's named sponsor loses authority, leaves the institution, is suspended or revoked, can no longer be verified, or must be replaced. **Proposed safe default:** unresolved sponsorship suspends the service's new protected acts, and the sponsor's human authority never becomes service authority (I4).

---

## 4. Boundaries with other findings

- **RD-03 (institutional access).** `INSTITUTION` grants stay fail-closed until RD-03 defines institutional authority.
- **RD-04 (declared purposes).** The contract defines no purpose rules. Purpose authority is RD-04's.
- **RD-08 (`SAFETY_GOVERNOR` appointment).** Its appointment rules use this contract's grant lifecycle. RD-08's "emergency delegation" is met by D7 and D8: a protective act, or an expedited normal grant, never a bypass.
- **CAP-24 (participation).** D3's founding rule applies until CAP-24 has a contract.
- **CAP-30 (audit).** The missing audit role is unchanged by this record.
- **AAB-PLATFORM-01.** Who may upload an evidence object stays that contract's question (report, Q11).

---

## 5. Status after this record

RD-02 stays **open**. It becomes `CONTRACT-RESOLVED` only when AAB-PLATFORM-11 and its consequential amendments are drafted, reviewed, approved and merged, as RD-01 was. It closes only after implementation, and the tests that prove it, pass.
