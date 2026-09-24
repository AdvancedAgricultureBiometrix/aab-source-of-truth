-- ============================================================================
-- Migration 007 — SCS-CAP-02 relationship registration rules
--
-- The CAP-02 canonical contract gained its relationship registration rules
-- (commit 9a3e978):
--   * otherRelationshipTypeDescription — required exactly when
--     relationshipType is OTHER; a description without OTHER is refused.
--   * frameworkAssociationIds has at least one framework; commodityScope and
--     geographicScope are not empty.
-- Plus an index for the conflict lookup (same from, to and type).
--
-- Applied history. Committed migrations are immutable; 002 is not amended.
-- The statements below are identical to packages/db/schema/cap-02.sql at the
-- time this migration was written. Requires migrations 001–006.
--
-- Fails closed: if any existing relationship is OTHER (necessarily with no
-- description) or has an empty framework or scope list, ADD CONSTRAINT fails
-- and the whole migration rolls back. Such rows must be corrected first, not
-- bypassed. (No relationship could be written before this migration: the
-- API had no relationship endpoint.)
-- ============================================================================

BEGIN;

ALTER TABLE scs.supply_chain_relationship
  ADD COLUMN other_relationship_type_description text;

ALTER TABLE scs.supply_chain_relationship
  -- Contract rule (commit 9a3e978): OTHER requires a description naming the
  -- relationship; a description without OTHER is refused.
  ADD CONSTRAINT supply_chain_relationship_other_type_description_ck
    CHECK (CASE WHEN relationship_type = 'OTHER'
                THEN other_relationship_type_description IS NOT NULL
                     AND btrim(other_relationship_type_description) <> ''
                ELSE other_relationship_type_description IS NULL
           END);

ALTER TABLE scs.supply_chain_relationship
  -- Contract rule (commit 9a3e978): at least one framework, and scope that
  -- is not empty.
  ADD CONSTRAINT supply_chain_relationship_scope_not_empty_ck
    CHECK (cardinality(framework_association_ids) >= 1
       AND cardinality(commodity_scope) >= 1
       AND cardinality(geographic_scope) >= 1);

CREATE INDEX supply_chain_relationship_pair_type_idx
  ON scs.supply_chain_relationship (from_party_id, to_party_id, relationship_type);

COMMENT ON COLUMN scs.supply_chain_relationship.other_relationship_type_description IS
  'otherRelationshipTypeDescription — names the relationship; required exactly when relationship_type is OTHER.';

COMMIT;
