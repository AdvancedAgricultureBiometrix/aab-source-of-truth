# CLAUDE.md — start here

This file is a pointer for AI coding sessions. **The repository's canonical records are the authority; this file is not, and neither is chat memory or any earlier summary.** If this file and a canonical record disagree, the record wins: report the disagreement, do not resolve it yourself.

## Read before proposing or changing anything

1. `README.md`, and its mandatory continuity reading.
2. `handovers/AAB-CANONICAL-SYSTEM-DEFINITION.md`.
3. `governance/AAB-PLATFORM-CAPABILITY-TRUTH-AND-DELIVERY-POLICY-2026-10-11.md` (AAB-GOV-DEC-CAPABILITY-TRUTH-01).
4. `governance/development/PARALLEL-DEVELOPMENT-PROTOCOL-2026-10-02.md`, including the pull request rule.
5. `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md` and the latest `governance/AAB-STOCK-TAKE-*.md`, for current state and open decisions.
6. Every canonical record for the task in hand.

## In every session

- **Establish the facts:** state the commit you are on, and check the actual code, tests and records before relying on any summary.
- **Separate intent from fact:** what records intend is one thing; what is executable and has been shown is another.
- **Evidence before claims:** never say a capability or aspect works without the evidence the policy requires. Say who verified it (AI, CI or a named human) and on what data.
- **Never pretend completion:**
  - do not invent functionality;
  - do not assume an unverified capability works;
  - do not redefine acceptance criteria to make a test pass;
  - do not present agreement between AI systems as independent verification.
- **Surface problems:** report contradictions, failures and unsupported claims at once. Preserve superseded and failed evidence; never replace it silently.
- **Stay in scope:** no scope expansion or speculative architecture without the Platform Owner's approval.
- **Keep the boundaries:** read-only, advisory-only, fail-closed and human authority.
- **Merge authority:** no merge, push to `main`, deployment, production access or change to branch protection without the Platform Owner's explicit instruction under the pull request rule.
