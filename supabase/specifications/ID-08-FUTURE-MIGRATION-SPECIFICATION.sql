/*
  AAB ID-08 FUTURE MIGRATION SPECIFICATION — NOT APPLIED

  Design record only. It creates nothing and authorises no migration, query,
  authentication, session, token, RLS change, authority grant, data access,
  mutation, or operational activation.
*/

-- Future design candidates:
-- 1. Server-owned protected dashboard read-policy registry.
-- 2. Exact read-model, resource, role, scope and projection compatibility rules.
-- 3. A protected server-side policy evaluator that accepts only a server-rebuilt
--    trusted request context and returns a non-executable allow/deny decision.
-- 4. Independently enforced RLS policies; a compatibility decision must never
--    bypass or replace database-side protection.
-- 5. Immutable decision evidence, subject to explicit Scientist/Admin approval.

-- Prohibited assumptions:
-- - Never trust browser-supplied actor, role, scope, resource, read model,
--   projection, policy, query, table, endpoint, effect or decision claims.
-- - Never treat an ID-07 envelope or ID-08 compatibility decision as authority,
--   a database query, a record-fetch instruction, or permission to execute.
-- - Never apply this specification without a separately approved migration,
--   threat review, RLS design, validation plan and rollback.

