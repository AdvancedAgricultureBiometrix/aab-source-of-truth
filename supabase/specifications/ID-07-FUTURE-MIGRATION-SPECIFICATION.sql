/*
  AAB ID-07 FUTURE MIGRATION SPECIFICATION — NOT APPLIED

  This document records a possible future Supabase/PostgreSQL representation.
  It creates nothing and authorises no migration, query execution, RLS policy,
  authentication, membership change, or operational activation.
*/

-- Future design candidate only:
-- 1. Server-owned dashboard_resource_registry
-- 2. Resource-to-role and resource-to-scope compatibility rules
-- 3. A protected backend function that accepts an authenticated server context,
--    resolves scope server-side, and returns only an evaluated read decision
-- 4. RLS policies that independently enforce the same actor and scope boundary
-- 5. Immutable audit evidence for evaluated requests, subject to later approval

-- Prohibited migration assumptions:
-- - Never trust actor, role, scope, route, table, filter, field or endpoint claims
--   supplied by the browser.
-- - Never treat the ID-07 client envelope as authority or as an executable query.
-- - Never copy Airtable permissions into Supabase without controlled mapping,
--   validation and explicit Scientist/Admin approval.
