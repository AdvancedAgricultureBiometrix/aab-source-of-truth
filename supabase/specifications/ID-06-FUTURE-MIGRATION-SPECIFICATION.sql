-- AAB ID-06 FUTURE INTEGRATION SPECIFICATION
-- STATUS: DESIGN ARTIFACT ONLY. UNAPPLIED. DO NOT RUN AGAINST PRODUCTION.
-- PURPOSE: Define the later protected server-side dashboard context projection boundary.

begin;

-- ID-06 creates no live database objects and performs no migration.
--
-- Future controlled implementation requirements:
--   1. Input must originate from one trusted, allowed ID-05 access decision.
--   2. Actor, dashboard, route, role, country, institution and domain scope are copied exactly.
--   3. Browser-supplied context, route, identity, role or scope overrides fail closed.
--   4. Denied, malformed, ambiguous, mutated or operational access results produce no context.
--   5. The projected context is immutable and render-only; it grants no authority.
--   6. Navigation, data queries, sessions, tokens, cookies and writes remain separate actions.
--   7. RLS and trusted server enforcement must be proven on a development branch before activation.
--   8. No production application is authorised by this specification.

rollback;
