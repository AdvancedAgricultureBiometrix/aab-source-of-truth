-- AAB ID-03 FUTURE MIGRATION SPECIFICATION
-- STATUS: DESIGN ARTIFACT ONLY. UNAPPLIED. DO NOT RUN AGAINST PRODUCTION.
-- PURPOSE: Document the later read model needed to resolve existing protected
-- membership authority after ID-02 maps auth.users.id to a canonical actor.

begin;

-- No new authority table is created by ID-03.
-- During the future Pro-branch integration stage, map these logical fields to
-- the EXISTING canonical membership tables after schema reconciliation:
--   membership_id, actor_id, role_code, membership_state,
--   scope_type, scope_id, country_id, institution_id.
--
-- Required invariants for the future server-side resolver:
--   1. auth.uid() resolves through the ID-02 identity link to exactly one actor.
--   2. only ACTIVE protected memberships are returned.
--   3. role and scope are read from protected server records, never browser input.
--   4. missing, malformed, duplicated, suspended, revoked or expired records fail closed.
--   5. the resolver grants nothing and mutates nothing.
--   6. dashboard routing remains a later build.
--
-- Security notes for later implementation:
--   * keep canonical membership storage outside direct browser mutation paths;
--   * do not use raw_user_meta_data/user_metadata for authorization;
--   * do not expose a SECURITY DEFINER function in an exposed schema;
--   * test RLS and the authenticated server gateway together on a branch;
--   * do not enable blanket RLS on existing AAB tables without gateway testing.

rollback;
