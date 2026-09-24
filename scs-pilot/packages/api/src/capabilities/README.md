# Capabilities: the pattern every capability follows

SCS-CAP-01 (`cap-01/`) is the reference implementation. Every later capability follows the same structure and rules.

## Files

| File | Holds |
|---|---|
| `errors.ts` | `CAPABILITY_ID` and the capability's failure codes. These are **exactly** the error union of its contract's failure interface, each with an HTTP status. A code not in the contract is never added here; the contract changes first. |
| `store.ts` | Every SQL statement the capability runs, and nothing else. Functions take the request's `Tx` and never open their own transaction. Queries run through `withDatabaseErrors` (`foundation/db-errors.ts`). |
| `<operation>.ts` | The capability logic for one contract operation (e.g. `register.ts`). The header comment gives its steps in order. |
| `routes.ts` | The route definitions. |
| `../index.ts` | The route is added to `CAPABILITY_ROUTES` only once it is built, reviewed and tested. |

Request, decision, receipt and response shapes are JSON Schemas in `src/schemas/<cap>/`. They are registered in `src/schemas/registry.ts`, and their TypeScript types are **generated** into `src/types/` (`npm run generate:types`), never hand-written.

## Rules

1. **Write routes** (POST) are authenticated, transactional and require an `Idempotency-Key`. The server refuses to start with a route table that says otherwise.
2. **The server layer does authentication, schema validation and idempotency** before the handler runs. The handler gets a validated, typed body, the actor and the open transaction.
3. **Authority comes from the contract.** Only the roles the contract names may act, and a TODO is never a substitute for following it.
4. **Handlers return only 2xx.** Every failure is thrown (`cap0NFailure(code, reasons)` or a platform failure), so the transaction always rolls back and nothing is written. A failed request leaves no framework, receipt or idempotency record behind.
5. **Request-level rules are checked in code before the insert** (e.g. `effectiveTo` not before `effectiveFrom`). Database constraints remain the last line of defence.
6. **Every decision produces a receipt**, via `writeReceipt(tx, …)`, in the same transaction as the decision. The receipt is validated against the capability's receipt schema, and if it can't be written the whole decision rolls back.
7. **No false certainty.** A check is recorded as passed only if it was actually performed. Checks the contract names but gives no evaluation rule for are recorded as not passed, with an explicit "NOT EVALUATED" reason, and are flagged as contract gaps.
8. **No invented rules.** Where the contract is silent, the gap is recorded in the contract markdown (as its own commit) and in the code, and the most conservative behaviour is used until the contract says otherwise.
9. **Tests** (`src/integration/<cap>-*.test.ts`) run real HTTP against real PostgreSQL as a restricted `scs_api` member. They cover every success path and every failure path, check that nothing was written after each failure, and check that replays are byte-identical.
