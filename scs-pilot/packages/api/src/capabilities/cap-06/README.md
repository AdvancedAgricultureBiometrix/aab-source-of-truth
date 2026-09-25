# SCS-CAP-06 — Due Diligence Sufficiency Evaluation

**Status: `evaluateSufficiency` (`POST /scs/v1/sufficiency-evaluations`) and `getEvaluationResult` (`GET /scs/v1/sufficiency-evaluations/:evaluationId`) are implemented for the pilot (contract 0fd8c25 and 876fc80, "Evaluation rules for the pilot" and "The frozen input"). They cover the deforestation, plot, provenance and custody-chain dimensions. `submitConflictResolution` is not built yet, so every material conflict stays `UNRESOLVED`. `listEvaluationsForPlot` is deferred. `MINIMUM_VERTICAL_SLICE_PROVEN` (see below).**

- **The frozen input.** The route runs in one REPEATABLE READ transaction, so every read, including the idempotency lookup, sees one snapshot taken at `evidenceCutoffAt`. Nothing admitted after it can affect the result.
  - The manifest records every evaluated item's kind, identifier, version, content digest and admission time. It is the authoritative input.
  - `evaluate.ts` is a pure function of that input, with no further reads. Gap and conflict identifiers are derived from their content, so the same input gives the same requirement results, gaps, conflicts and next steps.
- **Failure checks,** each FAIL_CLOSED, producing no evaluation:
  1. Authority: only `COMPLIANCE_OFFICER`, for evaluating and for reading.
  2. Framework: `ACTIVE`, `regulationVersion`, commodity, own specification.
  3. Period: after the specification's cut-off, and not in the future.
  4. Plots: registered, not `RETIRED`, current versions, and an `ACTIVE` association with the framework.
  5. The custody subject: batches and operator together, each batch admitted, and the operator a registered party that is not retired.
  6. The evidence scope: decided by the system; a requester's list must match it exactly.
  7. The previous evaluation, if cited: it must exist and concern the same subject.
- **Evaluation.** Each of the 15 catalogue requirements applies only when its specification field demands it.
  - Missing evidence makes a requirement `UNSATISFIED` (`INSUFFICIENT`). Verification gaps leave it for human decision.
  - Opposing claims are a material unresolved conflict (`CONFLICTING_EVIDENCE`). An uncontradicted adverse finding is `UNSATISFIED`, never `SUFFICIENT`.
  - Temporal coverage is analysis periods minus known gaps, matching the detection target; never a union of declared dates.
  - An adverse finding or conflict makes `DEF-TEMPORAL-COVERAGE` apply even when the specification does not require deforestation evidence: such evidence is never set aside.
- **What is written,** in one transaction:
  - the evaluation, with the full result document;
  - its plots;
  - its frozen evidence rows;
  - the receipt (`SUFFICIENCY_EVALUATION`, recording `overallState`).

  A repeated evaluation of the same subject and period is recorded and disclosed, never blocked. A re-evaluation cites `previousEvaluationId` and never changes the earlier one.

## The vertical proof chain works end to end

This is what the `implementation/scs-vertical-proof` branch was built to prove. The test "end to end over real admitted CAP-04 and CAP-05 records" (`integration/cap-06-evaluate-sufficiency.test.ts`) runs the whole chain through the real endpoints, over real HTTP and real PostgreSQL:

1. a framework registered in SCS-CAP-01;
2. parties registered and verified in SCS-CAP-02;
3. a plot registered and associated with the framework in SCS-CAP-03;
4. deforestation evidence admitted in SCS-CAP-04, with a stored and verified file (SCS-PLATFORM-01);
5. a custody event admitted in SCS-CAP-05;
6. a sufficiency evaluation in SCS-CAP-06 that produces a deterministic, frozen, reproducible result: `GAPS_REQUIRE_HUMAN_DECISION`, the honest pilot outcome, whose only gaps are the pilot's own limits (spatial coverage and plot overlap not evaluated).

**`MINIMUM_VERTICAL_SLICE_PROVEN` for SCS-CAP-06.** The adopted standard is that an evaluation runs end to end, honestly, over real admitted evidence, not that it reaches a best-case outcome (`SUFFICIENT` needs PostGIS). Each criterion is met by a test in `cap-06-evaluate-sufficiency.test.ts`:

- **A complete evaluation runs against real admitted CAP-04 and CAP-05 records:** "end to end over real admitted CAP-04 and CAP-05 records".
- **The result is deterministic and reproducible from the frozen input:** "the same frozen input gives the same evaluation", together with "the evaluation transaction is REPEATABLE READ".
- **Every gap is disclosed honestly in the result:** the end-to-end, adverse-finding, conflict and missing-coverage tests.
- **The receipt is written atomically:** "receipt write fails → 500; the evaluation, its plots and its evidence rows are all absent".
- **`getEvaluationResult` returns the result correctly:** "getEvaluationResult returns the recorded result exactly".

SCS-CAP-03, SCS-CAP-04 and SCS-CAP-05 are re-assessed on the same standard, since their admitted records now feed an honest evaluation. That re-assessment is recorded in their READMEs when SCS-CAP-06 is complete (after `submitConflictResolution`).

## Honest outcome and open items

- **No pilot evaluation can be `SUFFICIENT`** (`TODO(postgis)`). Spatial coverage and plot overlap are not evaluated, so a fully evidenced subject is at best `GAPS_REQUIRE_HUMAN_DECISION`. Pilot partners must be told this clearly.
- **Not returned by the pilot:**
  - `EVIDENCE_INTEGRITY_FAILED`: stored files are not re-hashed;
  - `QUARANTINED_EVIDENCE_IN_SCOPE`: no quarantine operation exists;
  - `ACCESS_SCOPE_INVALID`: no tenants (`TODO(tenant-scope)`);
  - the conflict-resolution codes, until `submitConflictResolution` is built.
- **Test infrastructure gap.** No lifecycle endpoints exist yet. Tests set a SUPERSEDED framework by SQL as the owner.
- **Contract gaps** (contract "Open gaps"):
  - undetected change between observations is not quantified;
  - sampled and risk-based coverage are undefined;
  - what `noUnresolvedGaps: false` means is undefined;
  - custody standards have no field to match against;
  - integrity is not re-verified at evaluation;
  - a commodity mismatch reuses `FRAMEWORK_VERSION_NOT_RESOLVED`.

Canonical contract: [`governance/workstream-b/SCS-CAP-06-DUE-DILIGENCE-SUFFICIENCY-EVALUATION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-06-DUE-DILIGENCE-SUFFICIENCY-EVALUATION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-06 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
