-- AAB ID-04 FUTURE INTEGRATION SPECIFICATION
-- STATUS: DESIGN ARTIFACT ONLY. UNAPPLIED. DO NOT RUN AGAINST PRODUCTION.
-- PURPOSE: Define the later server-side dashboard-route read model after ID-03
-- resolves an authenticated actor's existing protected memberships.

begin;

-- No route, role, membership, or authority table is created by ID-04.
-- During the future Pro-branch integration stage, implement a private,
-- server-owned route registry and map each approved canonical role to a known
-- dashboard identifier/path. The browser must never submit or register routes.
--
-- Required invariants:
--   1. Input authority context must originate from the validated ID-03 resolver.
--   2. Role, active state, actor and scope must match protected memberships.
--   3. Country, institution and domain scope remain explicit in every route plan.
--   4. Unknown, duplicated, malformed or conflicting mappings fail closed.
--   5. Return URLs, metadata routes and browser-supplied paths are ignored/blocked.
--   6. Resolution returns a route plan only; navigation remains an application action.
--   7. Route resolution grants no authority and performs no database write.
--
-- Reconcile route paths against the final application inventory before creating
-- a timestamped migration. Test Auth, RLS and the trusted gateway together on a
-- Supabase Pro development branch. Do not apply this specification directly.

rollback;
