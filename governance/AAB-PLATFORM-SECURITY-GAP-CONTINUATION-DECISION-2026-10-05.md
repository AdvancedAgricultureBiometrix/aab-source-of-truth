# Security-gap continuation principle: decision record — 2026-10-05

**Status:** GOVERNANCE DECISION RECORD

**Decides:** how AAB proceeds when a safeguard for confidentiality, isolation, authority or recoverability cannot yet be demonstrated. **Production authority is withheld, and the work continues.**

**Decided by:** the Platform Owner, on 2026-10-05.

**Roadmap decision:** 72.

**Base:** `main` at `a612b875dc7558110752e2647648d8c1748ba357`.

**Authority:** records a governing principle and its boundaries. **It authorises no implementation, deployment, production access, live-data use, or weakening of any existing gate.** It admits, qualifies and commissions nothing, and changes no control's status.

## 1. The principle

> If confidentiality, isolation, authority or recoverability cannot yet be demonstrated, the capability must not be admitted, commissioned or exposed to real information.
>
> That does not end the work.
>
> The gap must be documented, contained and investigated. Alternative architectures and controls should be designed and tested in isolated, disposable environments. Work continues until the safeguard is demonstrated or every reasonable technical, operational and governance option has been exhausted.
>
> If no adequately secure solution can then be established, the Platform Owner and the appropriate scientific, security, legal and national authorities must review the evidence before deciding whether the capability should be redesigned, restricted, deferred or excluded.
>
> Difficulty is not a reason to abandon a capability. Unresolved risk is a reason to prevent premature production authority while the solution is pursued.

**Defined terms:**
- **"Real information"** means real, personal, confidential, production or country information. That includes country scientific information (the egress specification's category 2), and any real country data.
- **"Demonstrated"** means shown by the evidence the governing contract, admission authority or Gate D requires. A statement, an intention or a disclosed limitation does not count.

## 2. Boundaries

1. **No compensation.** No unresolved mandatory safeguard may be treated as compensated by unrelated controls. AAB's controls stay non-compensating (Phase 1 register, line 11; Gate D, lines 35 and 126).
2. **No admission or commissioning while a mandatory condition is unproven.**
   - No capability may be admitted or commissioned while a mandatory security or sovereignty condition remains unproven.
   - For admission, the four safeguards in section 1 are mandatory for the operations being admitted, at the admitted scope. A gap in one of them is not a "disclosed limitation" that admission may carry (see section 4, T1).
3. **No real information to test a gap.** No real, personal, confidential, production or country information may be introduced merely to test an unresolved safeguard.
4. **Where work continues.** Work on an unresolved safeguard is limited to governed planning, research, design, simulation, isolated implementation and testing, with synthetic material or expressly authorised non-production material that contains no real information as defined in section 1.
   - The environment is isolated and disposable, and it never shares a database, object store, Supabase project, hosted site or key with a live service (parallel development protocol, rule 11).
5. **Not indefinite.** "Every reasonable option" does not permit indefinite avoidance of a decision. Each gap carries a record of:
   - the safeguard and the capability it affects, and what is contained;
   - each option attempted, with its result and evidence;
   - the remaining risk;
   - **a next decision point,** a date or a milestone. At it, the Platform Owner records either "continue", with the next attempt and a new decision point, or "escalate" to the review in section 1.

   The records review open gaps at each roadmap and stock-take update.
6. **No silent restriction.** Any eventual redesign, restriction, deferral or exclusion requires an explicit recorded authority decision that:
   - names the authorities consulted;
   - cites the evidence;
   - states the remaining risk.

   It never occurs silently. Consistent with the platform's values, a gap is never papered over, and nothing is silently excluded.
7. **No new authority.** This decision authorises no implementation, deployment, production access, live-data use, or weakening of an existing gate.

## 3. How it sits with the existing rules

| Existing rule | Effect of this decision |
|---|---|
| **Non-compensating controls** (Phase 1 register, lines 11 and 39; Gate D, lines 35 and 126) | Unchanged. Restated as boundary 1 |
| **Gate D:** "There is no third outcome"; missing evidence refuses; "An advisory is not a waiver" (lines 83, 103, 150, 230) | Unchanged. An unresolved safeguard refuses Gate D |
| **Admission's fail-closed rule** (admission authority, section 4); either party must refuse on `NOT SATISFIED` or `EVIDENCE REQUIRED` (line 170) | Unchanged. Boundary 2 adds that the four safeguards are mandatory for the admitted scope (section 4, T1) |
| **"A limitation does not refuse admission by itself"** (admission authority, line 153) | **Narrowed for these safeguards only.** A gap in confidentiality, isolation, authority or recoverability for an admitted operation is not a limitation admission may carry. Every other limitation rule is unchanged |
| **Admission at a smaller scope** ("admitted for what it does, at the scope proven", line 90) | A restriction under section 1 may use it **only if** the restricted scope does not depend on the undemonstrated safeguard |
| **No protected information to AI systems; synthetic test data** (protocol, rule 12) | Unchanged. Boundaries 3 and 4 apply it to safeguard work generally |
| **"Test data must never be introduced merely to demonstrate that a schema or function works"** (canonical template rule, line 65) | Unchanged. Investigation happens in disposable environments, never in the canonical template |
| **Egress defaults:** deny by default; "sovereignty purity wins by default" | Unchanged |
| **Isolated synthetic testing** (WP04 line 25; proposed WP05 lines 45-52) | Consistent. WP05 is the model for an isolated, disposable environment. It still needs its own authority |
| **"Never silently excluded"** (purpose and values, revision lines 161-166) | Consistent with boundary 6 |
| **Every capability's failure contract** (fail closed; 29 of the 33 canonical contracts state it expressly) | Unchanged |

## 4. Points for the Platform Owner's confirmation

- **T1: admission is tightened.** Today the records file `TODO(tenant-scope)`, `TODO(tenant-network-policy)` and `TODO(backup-encryption)` under "before live operation" (stock-take, section 5), not under admission. Section 1's wording makes isolation and recoverability gaps block **admission** as well.
  - **Recommended:** adopt it as written. It strengthens a gate; it weakens none.
  - Until the downstream records are aligned (section 6), this decision governs where they read less strictly.
- **T2: "appropriate authorities" are named when a review is convened.** Where a country is involved, the national authority is the founding country institution's authorised representative (admission authority, section 3), or another named authority. The record of the review names them.

## 5. What this does not change

- **No status, gate or decision changes:** no control status; no admission, Gate D or commissioning requirement except T1's tightening; no RD-01, RD-02, RD-03 or RD-04 position; no extraction gate.
- **No contract, failure contract or check changes.**
- **No implementation, environment, deployment, live-data use or production access is authorised.** Each needs its own authority.

## 6. Downstream alignment (not edited by this decision; separate reviewed changes)

| Document | Alignment |
|---|---|
| `governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md` (sections 2 and 4) | T1: a gap in the four safeguards for an admitted operation is not a disclosed limitation |
| `governance/AAB-STOCK-TAKE-2026-09-28.md`, sections 5 and 7 | Reclassify the isolation and recoverability TODOs as blocking admission of the affected scope; record the gap register (boundary 5) |
| `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, sections 5.5 and 6.1 | The same reclassification, and admission prerequisites |
| `governance/AAB-GATE-D-DEPLOYMENT-QUALIFICATION-DEFINITION-2026-09-27.md` | A cross-reference only; no change to its rules |
| `governance/development/PARALLEL-DEVELOPMENT-PROTOCOL-2026-10-02.md` | A cross-reference: safeguard investigation uses rule 11 environments and rule 12 material |
| `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md` | An optional citation, beside "never silently excluded" |
| `governance/phase-2/wp04/` (proposed WP05) | None now. WP05, when authorised, is a vehicle for boundary 4 |
| The capability contracts' "Open gaps" for safeguards (for example strong authentication, CAP-11; audit tamper evidence, CAP-03; the sovereign data boundary) | Each may cite this decision when next amended; no edit now |
| `governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md` | Optional, at its next revision |

## 7. Wording that must stay unchanged

- The Phase 1 register's non-compensating statement (lines 11 and 39).
- Gate D's "There is no third outcome" (line 83), "An advisory is not a waiver" (line 150), and "Missing evidence is never read as satisfied" (line 230).
- The admission authority's fail-closed rule (section 4).
- The canonical template rule: "The default is preservation of the clean template, not convenience of testing" (line 101).
- The protocol's rules 11 and 12.
- The egress specification's deny-by-default and "sovereignty purity wins by default".
- Every capability failure contract.
