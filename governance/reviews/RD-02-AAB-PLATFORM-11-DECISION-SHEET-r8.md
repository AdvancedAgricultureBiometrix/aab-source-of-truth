# RD-02 / AAB-PLATFORM-11 — Decision sheet for draft revision 8

**For:** the Platform Owner.
**Draft:** `RD-02-AAB-PLATFORM-11-DRAFT-2026-10-03-r8.md`, pinned at `main` `8eb12c0`.
**Status:** every item below is **PROPOSED — PLATFORM OWNER DECISION REQUIRED.** None is decided. Not committed.
**Decided basis:** nothing in the RD-02 decision record (revision 3, DECIDED 2026-10-03) is listed here, because it is not open.

**No item is approved by silence or omission. Approval requires the Platform Owner explicitly to approve this complete decision sheet by filename and SHA-256, with any exceptions identified by item number.**

In the table, "Rec." is the recommendation, and "Alternatives" are the other options considered.

| # | Section | Item | Rec. | Alternatives |
|---|---|---|---|---|
| 1 | Header | Declared dependencies | AAB-PLATFORM-03, 05, 08, 09 and 10 | Fewer, if implied |
| 2 | §2.5 | Role-definition fields | Reference, version, owner, operations, approval class, scope types, max term, kind, status | Other field sets |
| 3 | §2.6 | Deprecated role versions | Never granted again | Granted until a cut-off date |
| 4 | §2.8, P6 | Role references | Three added fields (`roleDomain`, `roleOwner`, `roleVersion`); `role` unchanged; nothing renamed | A single qualified string (rejected); renaming (rejected) |
| 5 | P6 | Mapping legacy bare names | Mapped when read via own domain; ambiguous names refused; never aliases for new grants | Accept bare names as aliases |
| 6 | P6, 1a | `ActorReference` version | `referenceVersion: "3"` | Add optional fields to version 2 |
| 7 | P6 | Canonical index | Committed, generated and checked byte for byte | Generated at build time only |
| 8 | §3.2 | Control-plane authority | Never approves a country grant | — |
| 9 | §3.4 | Scopes | `COUNTRY`, `SUBJECT`; `INSTITUTION` refused until RD-03; `DOMAIN`, `PLATFORM` never inside a country; `DEPLOYMENT` legacy | Keep `DEPLOYMENT` for pilots |
| 10 | §4.4, §8.3 | `AAB_ACCESS` approval | Two-person | One grant-authority decision |
| 11 | §4.5 | Human `REFUSE` against platform refusal | Kept distinct: a decision is written; a refusal writes nothing | — |
| 12 | §4.6 | Combining proposal decisions | Two `APPROVE` create; any `REFUSE` refuses; `DEFER` keeps open; dissent kept | Majority rule; last decision wins (rejected) |
| 13 | §4.7 | Minimum independence test | Six conditions; no exception | Fewer conditions |
| 14 | §4.8, §10.4 | Withdrawal | A signed, challengeable AAB-PLATFORM-08 decision with reason and authority, plus the AAB-PLATFORM-05 `WITHDRAWAL` record; proposer only (others decide `REFUSE`); allowed after one approval, never hiding it; not after decided. While under challenge, no grant is created, and a revocation request stays open with its suspension in effect. Invalidation decides nothing: the matter returns to its prior state, and the proposal's lapse deadline is extended by exactly the system-recorded period the withdrawal stood, reconstructable as of any time, never reset to a new 30-day term | Not after any approval |
| 15 | §4.9, P8 | Evidence an approver cannot see | `DEFER` with `EVIDENCE_REQUIRED`; an approval without access is refused; never presumed satisfactory | Allow approval on a summary |
| 16 | §5.1 | Fresh-check conditions | In force; approvals valid; role; scope; dependencies | — |
| 17 | §5.2 | Recording the grant | In `ActorReference` and in human decisions | — |
| 18 | §5.3 | `expiresAt` | Earliest fixed limit at creation; dependent limits checked at each act | Fixed at creation only |
| 19 | §5.4 | Status and blockers | `{ primaryStatus, blockers[] }`; display precedence `REVOKED` > `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION` > `EXPIRED` > `APPROVAL_INVALIDATED` > `SUSPENDED` > `EVIDENCE_REQUIRED` > `ACTIVE`; every blocker visible and machine-verifiable | Another display order |
| 20 | §5.5, P10 | Grant-standing decision under challenge | A challenged approval, relied-on reinstatement or completed revocation decision makes the grant `EVIDENCE_REQUIRED` (`GRANT_EVIDENCE_REQUIRED`) until resolved, for every grant class | Class-based split (rejected) |
| 21 | §5.6 | No backdating | Effective never before creation; events never backdated; recorded time distinct from effective time; retroactive refused | — |
| 22 | §6.1 | Suspension details | Own `suspensionId` and cause; a governing role suspends and requests revocation; serialised against acts in progress | — |
| 23 | §6.2 | Reinstatement binding | To one named `suspensionId` and its event digest | Reinstate all suspensions at once |
| 24 | §6.3 | `REVOCATION_REQUEST` | Required before any revocation; decisions bind to it | Revocation decided directly on the grant |
| 25 | §6.3 | Who revokes | Two-person for `GOVERNOR`, `GRANT_AUTHORITY`, `AAB_ACCESS`; one grant-authority decision otherwise; governing roles never revoke | Governing roles revoke their capability's grants |
| 26 | §6.4 | Combining reinstatement and revocation | As item 12 | — |
| 27 | §7.2 | Onward delegation refusal | `ONWARD_DELEGATION_PROHIBITED` | — |
| 28 | §8.2, P3 | Emergency | Existing bounded grants first; new grant only by the grant authority; protective only; 72 hours; not renewable | 24 hours; 7 days |
| 29 | §8.2, P3 | Emergency review | Starts within 24 hours; completes within 7 days; a second, independent person | Other periods |
| 30 | §9.2 | Service authority | Its own grant only; initiator recorded, never transferred | — |
| 31 | §9.3 | No secrets in records | References, fingerprints, issuer and times only; `SECRET_MATERIAL_REFUSED` | — |
| 32 | §9.4, P4 | Credentials | Tokens at most 1 hour; keys rotated at most every 90 days and on change; service term at most 6 months | Tokens 15 minutes or 8 hours; keys 30 or 180 days; term 90 days or 12 months |
| 33 | §9.5 | AAB-operated services | Registration and grant, plus a two-person `AAB_ACCESS` grant | — |
| 34 | §10.1 | Event records | Three typed: `GRANT_EVENT`, `SERVICE_REGISTRATION_EVENT`, `FOUNDING_EVENT` | One `AUTHORITY_LIFECYCLE_EVENT` with exactly one subject |
| 35 | §10.2 | Reconstruction | From records recorded by T, using effective times | — |
| 36 | §10.3 | Challenge lodgement and process | An unauthorised, malformed or groundless submission is a platform refusal (nothing written); a lodged challenge is open at once and fails closed; admissibility within 2 working days; merit never judged by the platform | Admissibility not blocking |
| 37 | §10.4, A11 | Upheld-challenge effects | The seven-row matrix; an invalidated revocation stays visibly invalidated, never relied on; the grant is never restored or usable, as `REISSUANCE_REQUIRED_AFTER_INVALIDATED_REVOCATION`, not `REVOKED`; new proposal, approvals and `grantId` | Restore the grant (contradicts D7) |
| 38 | P11 | Who may challenge | The table in P11 | Narrower or wider lists |
| 39 | P12 | Internal resolution | Eligible grant-authority holders only, as AAB-PLATFORM-08 decisions, independent of challenger, deciders and holder; 1 or 2 resolvers; 14 or 30 days | Other numbers or periods |
| 40 | P12, §10.5 | No eligible resolver, or the period passes | Unresolved and fail-closed; external reconstitution under §10.5; AAB never decides; small-country freeze disclosed | — |
| 41 | P1 | Founding | Two stages; the country nominates X and Y; R and C attest only; founding creates only X's and Y's grants; then closes | Founders choose X and Y (rejected); Platform Owner witness (rejected) |
| 42 | P1 | D3 inside the model | X and Y approve R's grant-authority grant under §4.7, unaltered | R holds the founding authority until CAP-24 |
| 43 | P1 | Key prerequisite | Founding `EVIDENCE_REQUIRED` until the production country-key bootstrap is resolved and evidenced | — |
| 44 | P1, P2 | Founding validity | Both attestations and the external attestation required | Without the external attestation |
| 45 | P2 | Founding evidence | The competent body's instruments, with nominations and independence shown; AAB checks structure only | AAB verifies (rejected) |
| 46 | P5, §4.4 | Proposal record and proposer | The fields listed; lapse 30 days from the recorded time, extended only by exactly the recorded period an invalidated withdrawal stood, never reset; proposer never the recipient; proposer never counts as an approver for `GOVERNOR`, `GRANT_AUTHORITY` and `AAB_ACCESS` grants; may approve an `ORDINARY` grant | Proposer never approves any grant |
| 47 | P7 | Legacy decisions | Read as `LEGACY_OPERATOR_CONFIGURATION`; never relied on | Reliance with disclosure (rejected) |
| 48 | P8 | Visibility | Envelope on need-to-know; evidence under its own rules; no widening | Country-wide role visibility; public register (rejected) |
| 49 | P9 | Unresolved sponsor | Immediate refusal of new acts; replacement by decision; ends after 30 days | Grace period (rejected) |
| 50 | A3, 1c | Founding authority field | `authority: { role; foundingCeremonyRecordId }` | — |
| 51 | A7 | CAP-07 composition access grant | An object-access authorisation, not a role grant; adopts the listed invariants; any rename left to a CAP-07 note | Bring into the grant records |
| 52 | §13 | Names | All record, field, status, event, decision-kind and refusal-code names | Other names |
| 53 | §13.1 | Record conformance | All eight kinds conform to AAB-PLATFORM-05 and 10 | — |
| 54 | §15 | Adoption contents | Roles, uses, governing roles, terms, challengers, legacy reading | — |
| 55 | 1a | AAB-PLATFORM-03 points 1-3 | `grantId` required; version 3 fields; scope rules | — |
| 56 | 1b | AAB-PLATFORM-05 points | Service registration; record kinds adopt it | — |
| 57 | 1c | AAB-PLATFORM-08 points | Grant authority; decision kinds; several deciders; challenge; legacy | — |
| 58 | §10.5 | External reconstitution | A competent body's signed determination is governed evidence, not an AAB-PLATFORM-08 decision (unless its member holds registered authority); refounding by P1's two-stage procedure (`ceremonyKind: REFOUNDING`); the new grant authorities then decide internally; fail-closed until done | Another reconstitution procedure |
| 59 | §4.8, A13 | Withdrawing a governing role's revocation request | By the same recorded actor who created it, while still holding the governing authority, never another holder of the role; otherwise two independent grant-authority holders under §4.7, including for an `ORDINARY` grant | One grant-authority decision for an `ORDINARY` grant |
| 60 | §10.5 | Existing authority in reconstitution | The determination treats every existing grant-authority grant: retained, suspended pending internal decision, or proposed for governed revocation; AAB makes no choice; untreated or ambiguous grants fail closed. Two stages, by **derived** blockers under §5.4: no stored field, mutation or new record kind. **Stage 1:** every existing and replacement grant-authority grant derives `RECONSTITUTION_IN_PROGRESS`, with `sourceIds[]` citing the refounding ceremony record and its determination. `RECONSTITUTION_COMPLETED` is written when that record is valid (both attestations and the external attestation) and every nominated replacement grant exists. The last grant and the event are in one transaction where possible; otherwise the blocker persists. **Stage 2:** retained and replacement grants lose the blocker, subject to every ordinary check; grants marked for suspension or revocation derive `PENDING_GOVERNED_DISPOSITION`, citing the determination, until decided. No affected grant usable before its disposition; no new grant usable before completion | — |
| 61 | §10.5 | Refounding independence | Attesters and nominees independent under §4.7 of each other, and of the challenger, original deciders and affected holder | — |
