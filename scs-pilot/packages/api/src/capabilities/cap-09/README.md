# SCS-CAP-09 — Regulatory Review and Promotion

**Status: `submitDecision` (`POST /scs/v1/review-decisions`), `getDecision` (`GET /scs/v1/review-decisions/:decisionId`) and `assessCurrency` (`POST /scs/v1/review-decisions/:decisionId/currency-assessments`) are implemented for the pilot (contract ff6d3b8 and a816101), with `validateForPackageCompilation` (contract 9a7e2f8), which SCS-CAP-08 calls in its own transaction. `listDecisionsForSubject` and `requestReview` are not built yet.**

Canonical contract: [`governance/workstream-b/SCS-CAP-09-REGULATORY-REVIEW-AND-PROMOTION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-09-REGULATORY-REVIEW-AND-PROMOTION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-09 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.

## Vertical proof

**`MINIMUM_VERTICAL_SLICE_PROVEN` for SCS-CAP-09**, on the same standard as SCS-CAP-06: the capability runs end to end, honestly, over real admitted evidence, not that it reaches a best-case outcome. The proof was merged to `main` in PR #25 (`9f17cc2`; CI run 36228700962). It covers `submitDecision`, `getDecision`, `assessCurrency` and `validateForPackageCompilation`; `listDecisionsForSubject` and `requestReview` are not built. Each criterion is met by a named test in `cap-09-review-decision.test.ts`, unless another file is named:

- **A decision is recorded on a real evaluation and its currency is derived honestly:** "full staleness cycle: CURRENT → new evidence admitted → POTENTIALLY_STALE → re-evaluation and superseding decision → SUPERSEDED; the first decision never changes", through the real endpoints and real PostgreSQL, as `scs_api`.
- **Staleness is disclosed, never hidden:** "a conflict resolution recorded after the decision makes it POTENTIALLY_STALE (CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN)", and "a decision on an evaluation whose scope has already changed is recorded, and is POTENTIALLY_STALE from the start".
- **The decision is bound to exactly what was reviewed:** "EVALUATION_DIGEST_MISMATCH: the reviewer reviewed a different version" and the "EVALUATION_INTEGRITY_FAILED" test.
- **The human decision is attributable and independent:** the two "independence:" tests, and "OUTCOME_NOT_PERMITTED" and "REASONING_INCOMPLETE" for what a decision may say.
- **The receipt is written atomically:** "receipt write fails → 500; no decision or reasoning is recorded, and the evaluation can still be decided".
- **The gate SCS-CAP-08 relies on works:** `validateForPackageCompilation` is exercised end to end by SCS-CAP-08's staleness and "gate:" tests (`cap-08-packages.test.ts`).

This is a record of implementation proof only. SCS-CAP-09 remains PROPOSED_NOT_ADMITTED.
