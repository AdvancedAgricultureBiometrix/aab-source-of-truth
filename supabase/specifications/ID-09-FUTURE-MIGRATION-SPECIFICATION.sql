/*
  AAB ID-09 FUTURE MIGRATION SPECIFICATION — NOT APPLIED
  Design record only. It authorises no migration, query, authentication,
  session, token, RLS change, authority grant, data access or mutation.
*/

-- Future design candidates:
-- 1. A server-owned protected read-adapter registry keyed by approved policy ID.
-- 2. Server reconstruction and validation of actor, role, scope, resource,
--    read model and projection; never trust the browser handoff directly.
-- 3. Independently enforced authentication, membership and RLS boundaries.
-- 4. A separately approved operational adapter may translate a validated,
--    server-rebuilt request into a parameterised read-only query.
-- 5. Immutable evidence for adapter selection and read outcome.

-- Prohibited assumptions:
-- - ID-09 is not a query plan, credential, permission, authority or execution instruction.
-- - Never accept client-supplied adapter, SQL, table, endpoint, filters or credentials.
-- - Never apply this specification without explicit approval, threat review,
--   RLS design, migration validation and rollback.
