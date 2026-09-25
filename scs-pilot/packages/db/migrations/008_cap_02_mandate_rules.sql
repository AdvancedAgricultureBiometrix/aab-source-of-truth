-- ============================================================================
-- Migration 008 — SCS-CAP-02 mandate registration rules
--
-- The CAP-02 canonical contract gained its mandate registration rules
-- (commit 9a3e978):
--   * validUntil is required: a mandate always expires; one without an
--     expiry would be a permanent grant of authority.
--   * mandateEvidenceIds has at least one element: evidence that the
--     granting party agreed.
--   * frameworkAssociationIds has at least one framework; commodityScope and
--     geographicScope are not empty.
-- Plus an index for the conflict lookup (same granting and representative
-- parties).
--
-- Applied history. Committed migrations are immutable; 002 and 003 are not
-- amended. The statements below are identical to
-- packages/db/schema/cap-02.sql at the time this migration was written.
-- Requires migrations 001–007.
--
-- Fails closed: if any existing mandate has no expiry, no consent evidence
-- or an empty framework or scope list, the migration fails and rolls back.
-- Such rows must be corrected first, not bypassed. (No mandate could be
-- written before this migration: the API had no mandate endpoint.)
-- ============================================================================

BEGIN;

ALTER TABLE scs.representation_mandate
  ALTER COLUMN valid_until SET NOT NULL;

ALTER TABLE scs.representation_mandate
  ADD CONSTRAINT representation_mandate_scope_not_empty_ck
    CHECK (cardinality(framework_association_ids) >= 1
       AND cardinality(commodity_scope) >= 1
       AND cardinality(geographic_scope) >= 1);

ALTER TABLE scs.representation_mandate
  ADD CONSTRAINT representation_mandate_consent_evidence_ck
    CHECK (cardinality(mandate_evidence_ids) >= 1);

CREATE INDEX representation_mandate_pair_idx
  ON scs.representation_mandate (granting_party_id, representative_party_id);

COMMIT;
