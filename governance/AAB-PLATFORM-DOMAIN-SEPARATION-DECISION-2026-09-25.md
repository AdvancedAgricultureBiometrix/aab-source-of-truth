# AAB Platform–Domain Separation — Architecture Decision Record — 2026-09-25

**Status:** ARCHITECTURE DECISION RECORD — ACCEPTED
**Authority:** RECORDS THE SEPARATION BETWEEN AAB PLATFORM PRIMITIVES AND DOMAIN
MODULES, AND THE RULES FOR ANY FUTURE EXTRACTION. Grants no refactor authority now.
Admits no capability, and does not alter commissioning status, Gate D, WP05, or any
production or regulatory authority.
**Evidence base:** the SCS vertical proof on `implementation/scs-vertical-proof`
(PRs #22, #23 and #24; SCS-CAP-01 to SCS-CAP-06 `MINIMUM_VERTICAL_SLICE_PROVEN`).

## Context

The Supply Chain Sovereignty (SCS) vertical proof is the first implementation to run end to
end on AAB. Building it exercised general-purpose mechanisms that no SCS capability owns:
identity, receipts, immutable evidence, frozen snapshots, attributable human decisions. They
were built inside the SCS pilot because SCS was the only implementation pathway at the time.

AAB is not an SCS platform. AGR (Agricultural Science) and future domains are expected to use
the same mechanisms. This record fixes, before more is built, which parts are platform
primitives and which are SCS domain modules, the direction dependencies may run in, and the
conditions under which the primitives may one day be extracted.

## Decision

### Platform primitives

Eleven platform primitives are exercised through SCS. The pilot does not prove all eleven to
the same degree. Each one's status is stated honestly, as of this record:

| # | Primitive | Where it is exercised | Status |
|---|---|---|---|
| 1 | Canonical runtime schemas | JSON Schema 2020-12 (Ajv strict), generated types, the whole registry compiled up front | Exercised by every endpoint |
| 2 | Governed identity and authority | authenticated actors, role checks, separation of duties (verifier, resolver) | Exercised; the actor-to-party link is a known gap |
| 3 | Immutable evidence objects | SCS-PLATFORM-01: content-addressed by SHA-256, conditional write, never overwritten | Exercised |
| 4 | Provenance | submitter, submission time, cited and linked lineage, recorded at admission | Exercised |
| 5 | Admission decisions | admit, or admit with limitations, fail closed, every limitation disclosed | Exercised (SCS-CAP-02 to SCS-CAP-05) |
| 6 | Frozen evaluation snapshots | one REPEATABLE READ snapshot, a manifest, a pure evaluation, content-derived identifiers | Exercised (SCS-CAP-06) |
| 7 | Attributable human review | conflict resolution by an independent `CONFLICT_RESOLVER` | Partly exercised; the regulatory review gate (SCS-CAP-09) is in progress |
| 8 | Governed package compilation | — | Designed only (SCS-CAP-08) |
| 9 | Receipts and auditability | receipt in the same transaction, canonical digest, correlation ids, append-only records | Exercised by every write |
| 10 | Country isolation | — | Architecture recorded; the access isolation proof remains |
| 11 | Backup and reconstruction | — | The backup-restore proof remains |

### SCS domain modules

These modules are specific to supply chain sovereignty and belong to the SCS domain:
- regulatory frameworks (SCS-CAP-01);
- operators and suppliers (SCS-CAP-02);
- plots (SCS-CAP-03);
- deforestation evidence (SCS-CAP-04);
- custody events (SCS-CAP-05);
- sufficiency requirements (SCS-CAP-06's requirement catalogue and rules);
- regulatory review (SCS-CAP-09);
- evidence packages (SCS-CAP-08).

### Mechanism and policy

The platform provides the mechanism. The domain provides the policy.

| Concern | Platform — mechanism | SCS — policy |
|---|---|---|
| Identity | Authenticating an actor and presenting an `ActorReference` | Which actors exist, and which roles they hold |
| Authority | Checking a role; recording who acted; enforcing independence between actors | Which role may perform which operation; which duties must be separated (verifier, resolver, reviewer) |
| Idempotency | A mandatory key on every write, and byte-identical replay | None: every governed write uses it |
| Receipts | An immutable receipt, written in the same transaction, with a canonical digest | The decision types, and what each decision records |
| Transactions | One transaction per request, and a declared isolation level | Which operations need a single snapshot (REPEATABLE READ) |
| Snapshots | Reading in one snapshot; a manifest of versions and digests; a pure evaluation over it | What is in scope for an evaluation |
| Currency | Deriving status at read time, never storing it; append-only assessments | What makes a decision stale |
| Errors | The fail-closed envelope, HTTP mapping, and platform failure codes | Each capability's failure codes and their order |
| Audit | Append-only tables, correlation ids, structured logs | What each capability records, and what it discloses |
| Human decision | An attributable, permanent decision record, bound to exactly what was decided on | The outcome vocabularies, the reasoning required, and which outcomes are permitted |

### Dependency direction

The permitted direction is **SCS domain → AAB platform primitives. Never the reverse.**

A domain module may use a platform primitive. A platform primitive must never depend on a domain
module, a domain's capability identifiers, or a domain's vocabulary. The same rule applies to
AGR and to every future domain.

## Rules for extraction

1. **No immediate refactor authority.** This record authorises no reorganisation of code or
   database now. Primitives are extracted into a platform layer only after the SCS vertical
   proof is complete: SCS-CAP-09, SCS-CAP-08, the access isolation proof and the
   backup-restore proof.
2. **Behavioural evidence remains valid.** Every existing behavioural test and proof must pass
   unchanged after any extraction. An extraction that changes proven behaviour is not an
   extraction. It is a redesign, and needs its own decision and its own evidence.
3. **An independent dependency audit comes first.** Before any reorganisation, an independent
   audit must establish the actual dependency graph: every place a primitive depends on the
   domain, and every place a domain depends on a primitive in an undeclared way. The
   extraction plan is based on that audit, not on this record.

## Coupling: the honest position

The architecture is expected to support extraction without changing proven behaviour. The
eventual scale of that work will be determined by the dependency audit, not asserted here.

What is known today, from the code on `implementation/scs-vertical-proof`:

- **The import direction already holds.** No foundation module
  (`scs-pilot/packages/api/src/foundation/`) imports a capability module.
- **The platform code still carries SCS names.**
  - The failure type is `ScsFailure`.
  - The platform tables (receipts, idempotency records, evidence objects) live in the database
    schema `scs`, beside the SCS domain tables.
  - `foundation/errors.ts` lists the SCS capability identifiers.
  - The receipt mechanism knows SCS-CAP-06's `overallState` as an outcome field.

  These are couplings of naming and placement, not of logic. They are expected to be part of
  any extraction, and the audit must confirm there are no others.

## Consequences

- New work on the SCS vertical proof continues in place, without refactoring. Every new
  mechanism is placed and named as a platform primitive where it can be, and every new SCS
  rule stays in the SCS domain.
- A new platform-side dependency on an SCS module, identifier or vocabulary is a violation of
  this record, and must be raised before it is merged.
- AGR and future domains are designed against the primitives listed here, not against SCS's
  domain modules.

## What this record does not establish

- It does not authorise any refactor, code move or database change now.
- It does not claim that primitives 7, 8, 10 and 11 are proven. Their status is stated above.
- It does not size the extraction. The dependency audit does.
- It does not admit any capability, or alter commissioning status, Gate D, WP05, or any
  production, regulatory or scientific authority.
