-- ============================================================================
-- Migration 010 — SCS-CAP-02 verification assessment recording
--
-- The CAP-02 canonical contract gained its verification assessment recording
-- rules (commits 9a3e978 and e85c58a):
--   * provenance: recorded_by (the actor who recorded the assessment in SCS)
--     and recorded_at;
--   * explicit supersession: supersedes_assessment_id names an earlier
--     assessment of the same party (composite foreign key), superseded at
--     most once (unique), never itself;
--   * only PARTIALLY_VERIFIED, VERIFIED_FOR_DECLARED_SCOPE, DISPUTED and
--     FAIL_CLOSED are recorded; REGISTERED_UNVERIFIED and
--     VERIFICATION_EXPIRED are derived when read;
--   * at least one evidence id; verified_at not after recorded_at;
--   * append-only for every role (scs.reject_modification() from migration
--     005): an assessment is a historical fact. updated_at and its trigger
--     are dropped.
--
-- Applied history. Committed migrations are immutable; 002 is not amended.
-- The statements below are identical to packages/db/schema/cap-02.sql at the
-- time this migration was written. Requires migrations 001–009.
--
-- Fails closed: recorded_by is NOT NULL with no default, so the migration
-- fails if any assessment already exists; so do the new checks. Existing rows
-- must be dealt with first, not bypassed. (No assessment could be written
-- before this migration: the API had no verification endpoint.)
-- ============================================================================

BEGIN;

DROP TRIGGER party_verification_assessment_set_updated_at ON scs.party_verification_assessment;
ALTER TABLE scs.party_verification_assessment
  DROP CONSTRAINT party_verification_assessment_updated_after_created_ck;
ALTER TABLE scs.party_verification_assessment
  DROP COLUMN updated_at;

ALTER TABLE scs.party_verification_assessment
  ADD COLUMN recorded_by jsonb NOT NULL,
  ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN supersedes_assessment_id uuid;

ALTER TABLE scs.party_verification_assessment
  ADD CONSTRAINT party_verification_assessment_recordable_status_ck
    CHECK (verification_status IN ('PARTIALLY_VERIFIED', 'VERIFIED_FOR_DECLARED_SCOPE',
                                   'DISPUTED', 'FAIL_CLOSED')),
  ADD CONSTRAINT party_verification_assessment_evidence_not_empty_ck
    CHECK (cardinality(evidence_ids) >= 1),
  ADD CONSTRAINT party_verification_assessment_verified_not_after_recorded_ck
    CHECK (verified_at <= recorded_at),
  ADD CONSTRAINT party_verification_assessment_recorded_by_object_ck
    CHECK (jsonb_typeof(recorded_by) = 'object'),
  ADD CONSTRAINT party_verification_assessment_party_uq
    UNIQUE (assessment_id, party_id),
  ADD CONSTRAINT party_verification_assessment_supersedes_once_uq
    UNIQUE (supersedes_assessment_id),
  ADD CONSTRAINT party_verification_assessment_not_self_superseding_ck
    CHECK (supersedes_assessment_id IS NULL OR supersedes_assessment_id <> assessment_id);

ALTER TABLE scs.party_verification_assessment
  ADD CONSTRAINT party_verification_assessment_supersedes_fk
    FOREIGN KEY (supersedes_assessment_id, party_id)
    REFERENCES scs.party_verification_assessment (assessment_id, party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TRIGGER party_verification_assessment_append_only
  BEFORE UPDATE OR DELETE ON scs.party_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER party_verification_assessment_no_truncate
  BEFORE TRUNCATE ON scs.party_verification_assessment
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

COMMENT ON TABLE scs.party_verification_assessment IS
  'SCS-CAP-02 ScsPartyVerificationAssessment. Always scoped; never implies sanctions clearance, beneficial ownership, regulatory eligibility or other-framework compliance. Append-only; supersession is recorded on the newer assessment.';

COMMIT;
