-- ============================================================================
-- Migration 009 — SCS-CAP-02 role claim registration rules
--
-- The CAP-02 canonical contract gained its role claim registration rules
-- (commit 9a3e978):
--   * a framework association is a CAP-01 frameworkId: foreign key from
--     party_role_claim.framework_association_id to scs.regulatory_framework
--     (resolves TODO(framework-association) for role claims);
--   * otherRoleDescription — required exactly when claimedRole is OTHER; a
--     description without OTHER is refused;
--   * commodityScope and geographicScope are not empty.
-- Plus an index for the conflict lookup (same party, role and framework).
--
-- Applied history. Committed migrations are immutable; 002 is not amended.
-- The statements below are identical to packages/db/schema/cap-02.sql at the
-- time this migration was written. Requires migrations 001–008.
--
-- Fails closed: if any existing role claim names an unregistered framework,
-- is OTHER (necessarily with no description) or has empty scope, the
-- migration fails and rolls back. Such rows must be corrected first, not
-- bypassed. (No role claim could be written before this migration: the API
-- had no role claim endpoint.)
-- ============================================================================

BEGIN;

ALTER TABLE scs.party_role_claim
  ADD COLUMN other_role_description text;

ALTER TABLE scs.party_role_claim
  ADD CONSTRAINT party_role_claim_framework_fk
    FOREIGN KEY (framework_association_id) REFERENCES scs.regulatory_framework (framework_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE scs.party_role_claim
  ADD CONSTRAINT party_role_claim_other_role_description_ck
    CHECK (CASE WHEN claimed_role = 'OTHER'
                THEN other_role_description IS NOT NULL
                     AND btrim(other_role_description) <> ''
                ELSE other_role_description IS NULL
           END);

ALTER TABLE scs.party_role_claim
  ADD CONSTRAINT party_role_claim_scope_not_empty_ck
    CHECK (cardinality(commodity_scope) >= 1 AND cardinality(geographic_scope) >= 1);

CREATE INDEX party_role_claim_conflict_idx
  ON scs.party_role_claim (party_id, claimed_role, framework_association_id);

COMMENT ON COLUMN scs.party_role_claim.other_role_description IS
  'otherRoleDescription — names the role; required exactly when claimed_role is OTHER.';

COMMIT;
