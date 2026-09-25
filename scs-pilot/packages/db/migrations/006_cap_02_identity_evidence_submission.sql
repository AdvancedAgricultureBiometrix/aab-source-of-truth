-- ============================================================================
-- Migration 006 — SCS-CAP-02 identity evidence submission
--
-- The CAP-02 canonical contract gained "Identity evidence submission"
-- (commit 3e508ed): an ScsPartyIdentityEvidenceSubmission record for evidence
-- submitted after registration. Evidence is admitted, not verified; a
-- submission never changes the party record.
--
--   * scs.party_identity_evidence_submission — one row per submission, holding
--     its limitations and provenance. Append-only for every role (trigger,
--     scs.reject_modification() from migration 005).
--   * scs.party_identity_evidence.submission_id — nullable: NULL for evidence
--     given at registration; otherwise the submission that linked it. The
--     foreign key covers (submission_id, party_id, party_version), so a link
--     can only name a submission for its own party and version.
--   * scs_api: SELECT + INSERT and RLS on the new table (rule from 004).
--
-- Applied history. Committed migrations are immutable; 002 is not amended.
-- The statements below are identical to packages/db/schema/cap-02.sql at the
-- time this migration was written. Requires migrations 001–005.
--
-- Existing rows: every current party_identity_evidence row was written at
-- registration, so submission_id is NULL for all of them, which is correct.
-- ============================================================================

BEGIN;

-- ── ScsPartyIdentityEvidenceSubmission — evidence submitted after registration
-- Append-only for every role (trigger, function from platform.sql). Evidence
-- is admitted, not verified: a submission never changes the party record.
CREATE TABLE scs.party_identity_evidence_submission (
  submission_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,   -- the party's version when submitted
  evidence_limitations              text[]      NOT NULL,
  submitted_by                      jsonb       NOT NULL,   -- ActorReference
  submitting_organization_id        text,                   -- optional; issued outside SCS
  submitted_at                      timestamptz NOT NULL DEFAULT now(),

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_identity_evidence_submission_pk PRIMARY KEY (submission_id),
  CONSTRAINT party_identity_evidence_submission_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- deliberate — beyond the contract: the target of the evidence links'
  -- foreign key, so a link can only name a submission for its own party and
  -- party version
  CONSTRAINT party_identity_evidence_submission_party_version_uq
    UNIQUE (submission_id, party_id, party_version),
  CONSTRAINT party_identity_evidence_submission_version_ck
    CHECK (party_version >= 1),
  CONSTRAINT party_identity_evidence_submission_actor_object_ck
    CHECK (jsonb_typeof(submitted_by) = 'object'),
  CONSTRAINT party_identity_evidence_submission_no_null_elements_ck
    CHECK (array_position(evidence_limitations, NULL) IS NULL),
  CONSTRAINT party_identity_evidence_submission_org_not_blank_ck
    CHECK (submitting_organization_id IS NULL OR btrim(submitting_organization_id) <> '')
);

CREATE TRIGGER party_identity_evidence_submission_append_only
  BEFORE UPDATE OR DELETE ON scs.party_identity_evidence_submission
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER party_identity_evidence_submission_no_truncate
  BEFORE TRUNCATE ON scs.party_identity_evidence_submission
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

ALTER TABLE scs.party_identity_evidence
  ADD COLUMN submission_id uuid;

ALTER TABLE scs.party_identity_evidence
  ADD CONSTRAINT party_identity_evidence_submission_fk
    FOREIGN KEY (submission_id, party_id, party_version)
    REFERENCES scs.party_identity_evidence_submission (submission_id, party_id, party_version)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX party_identity_evidence_submission_party_idx
  ON scs.party_identity_evidence_submission (party_id);
CREATE INDEX party_identity_evidence_submission_link_idx
  ON scs.party_identity_evidence (submission_id);

COMMENT ON TABLE scs.party_identity_evidence_submission IS
  'SCS-CAP-02 ScsPartyIdentityEvidenceSubmission. Evidence admitted after registration, not verified; never changes the party record. Append-only for every role.';
COMMENT ON COLUMN scs.party_identity_evidence.submission_id IS
  'The ScsPartyIdentityEvidenceSubmission that linked this evidence id; NULL for evidence given at registration.';

GRANT SELECT, INSERT ON scs.party_identity_evidence_submission TO scs_api;
ALTER TABLE scs.party_identity_evidence_submission ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_identity_evidence_submission_scs_api_select ON scs.party_identity_evidence_submission
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY party_identity_evidence_submission_scs_api_insert ON scs.party_identity_evidence_submission
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
