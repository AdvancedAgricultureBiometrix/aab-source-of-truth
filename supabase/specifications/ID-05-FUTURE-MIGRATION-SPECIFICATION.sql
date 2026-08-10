-- AAB ID-05 FUTURE INTEGRATION SPECIFICATION
-- STATUS: DESIGN ARTIFACT ONLY. UNAPPLIED. DO NOT RUN AGAINST PRODUCTION.
-- PURPOSE: Define the later trusted server-side dashboard access decision boundary.

begin;

-- ID-05 creates no live database objects and performs no migration.
--
-- Future controlled implementation requirements:
--   1. Input must originate from the protected ID-04 server-defined route plan.
--   2. Exactly one actor, role, dashboard route and explicit scope must match.
--   3. Browser-supplied paths, roles, scopes, return URLs and access claims fail closed.
--   4. Unknown, duplicate, ambiguous or malformed routes fail closed.
--   5. An access decision grants no new authority and changes no membership.
--   6. Session creation, token issuance, cookies and navigation remain separate actions.
--   7. RLS and trusted server enforcement must be proven on a development branch before activation.
--   8. No production application is authorised by this specification.

rollback;
