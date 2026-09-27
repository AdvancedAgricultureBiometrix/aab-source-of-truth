-- ============================================================================
-- Migration 022 — mandate verification assessments (SCS-CAP-02)
--
-- Creates scs.mandate_verification_assessment, for the SCS-CAP-02 operation
-- addMandateVerificationAssessment (amendment of 2026-09-27). Without it no
-- mandate can reach VERIFIED_FOR_DECLARED_SCOPE, so none can be acted under
-- (AAB-PLATFORM-03, section 3). Mirrors scs.party_verification_assessment:
-- recordable statuses only, at least one evidence id, supersession within the
-- same mandate at most once, append-only for every role, scs_api SELECT +
-- INSERT and RLS policies (rule from migration 004).
--
-- In the database, beyond party verification: the assessment's evidence ids
-- must be among the mandate's mandate_evidence_ids, and its expiry may not be
-- after the mandate's valid_until. Verifier independence (not the mandate's
-- registrant, not linked to either party, did not create a link to the
-- representative) is enforced by the API.
--
-- Applied history. Committed migrations are immutable. The statements below
-- are identical to packages/db/schema/cap-02.sql. Requires migrations 001–021.
-- ============================================================================

BEGIN;

-- ── ScsMandateVerificationAssessment (migration 022) ────────────────────────
-- Mirrors scs.party_verification_assessment (migrations 002 and 010). A
-- mandate's current verification status is derived when read from its
-- assessments; scs.representation_mandate.verification_status keeps its
-- starting value and is never updated.
CREATE TABLE scs.mandate_verification_assessment (
  assessment_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  mandate_id                        uuid        NOT NULL,
  schema_version                    text        NOT NULL,

  verification_status               text        NOT NULL,

  -- verificationScope
  scope_description                 text        NOT NULL,
  scope_verified_attributes         text[]      NOT NULL,
  scope_excluded_from_verification  text[]      NOT NULL,

  -- verifyingAuthority
  verifying_authority_id            text        NOT NULL,
  verifying_authority_name          text        NOT NULL,
  verifying_authority_basis         text        NOT NULL,
  verifying_authority_jurisdiction_code text    NOT NULL,

  verified_at                       timestamptz NOT NULL,
  expires_at                        timestamptz,            -- optional; never after the mandate's validUntil
  evidence_ids                      uuid[]      NOT NULL,   -- each among the mandate's mandate_evidence_ids
  limitations                       text[]      NOT NULL,

  recorded_by                       jsonb       NOT NULL,   -- ActorReference
  recorded_at                       timestamptz NOT NULL DEFAULT now(),
  supersedes_assessment_id          uuid,                   -- optional

  -- authorityBoundary — verifying a mandate verifies the mandate only
  boundary_does_not_extend_the_mandates_scope        boolean NOT NULL DEFAULT true,
  boundary_does_not_verify_either_partys_identity    boolean NOT NULL DEFAULT true,
  boundary_does_not_grant_regulatory_eligibility     boolean NOT NULL DEFAULT true,

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mandate_verification_assessment_pk PRIMARY KEY (assessment_id),
  CONSTRAINT mandate_verification_assessment_mandate_fk
    FOREIGN KEY (mandate_id) REFERENCES scs.representation_mandate (mandate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the target of the supersession foreign key
  CONSTRAINT mandate_verification_assessment_mandate_uq
    UNIQUE (assessment_id, mandate_id),
  -- a superseded assessment belongs to the same mandate, superseded at most once
  CONSTRAINT mandate_verification_assessment_supersedes_fk
    FOREIGN KEY (supersedes_assessment_id, mandate_id)
    REFERENCES scs.mandate_verification_assessment (assessment_id, mandate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT mandate_verification_assessment_supersedes_once_uq
    UNIQUE (supersedes_assessment_id),
  CONSTRAINT mandate_verification_assessment_not_self_superseding_ck
    CHECK (supersedes_assessment_id IS NULL OR supersedes_assessment_id <> assessment_id),

  -- only these are recorded; CLAIMED_UNVERIFIED and VERIFICATION_EXPIRED are derived when read
  CONSTRAINT mandate_verification_assessment_recordable_status_ck
    CHECK (verification_status IN ('PARTIALLY_VERIFIED', 'VERIFIED_FOR_DECLARED_SCOPE',
                                   'DISPUTED', 'FAIL_CLOSED')),
  CONSTRAINT mandate_verification_assessment_boundary_ck
    CHECK (boundary_does_not_extend_the_mandates_scope
       AND boundary_does_not_verify_either_partys_identity
       AND boundary_does_not_grant_regulatory_eligibility),
  CONSTRAINT mandate_verification_assessment_required_text_not_blank_ck
    CHECK (btrim(scope_description) <> '' AND btrim(verifying_authority_id) <> ''
       AND btrim(verifying_authority_name) <> '' AND btrim(verifying_authority_basis) <> ''),
  CONSTRAINT mandate_verification_assessment_jurisdiction_ck
    CHECK (verifying_authority_jurisdiction_code ~ '^[A-Z]{2}$'),
  CONSTRAINT mandate_verification_assessment_arrays_no_null_elements_ck
    CHECK (array_position(scope_verified_attributes, NULL) IS NULL
       AND array_position(scope_excluded_from_verification, NULL) IS NULL
       AND array_position(evidence_ids, NULL) IS NULL
       AND array_position(limitations, NULL) IS NULL),
  -- verification always names its evidence
  CONSTRAINT mandate_verification_assessment_evidence_not_empty_ck
    CHECK (cardinality(evidence_ids) >= 1),
  CONSTRAINT mandate_verification_assessment_expiry_after_verification_ck
    CHECK (expires_at IS NULL OR expires_at > verified_at),
  CONSTRAINT mandate_verification_assessment_verified_not_after_recorded_ck
    CHECK (verified_at <= recorded_at),
  CONSTRAINT mandate_verification_assessment_recorded_by_object_ck
    CHECK (jsonb_typeof(recorded_by) = 'object')
);


-- ── An assessment stays within its mandate: its evidence and its expiry ─────
CREATE FUNCTION scs.mandate_verification_assessment_within_mandate() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  m scs.representation_mandate%ROWTYPE;
BEGIN
  SELECT * INTO m FROM scs.representation_mandate WHERE mandate_id = NEW.mandate_id;
  IF NOT FOUND OR array_position(NEW.evidence_ids, NULL) IS NOT NULL THEN
    RETURN NEW;  -- no such mandate, or a null evidence id: the foreign key or the array check refuses it
  END IF;
  IF NOT (NEW.evidence_ids <@ m.mandate_evidence_ids) THEN
    RAISE EXCEPTION 'mandate_verification_assessment_evidence_in_mandate_ck: evidence % is not among mandate %''s evidence',
      (SELECT array_agg(e) FROM unnest(NEW.evidence_ids) e WHERE NOT (e = ANY (m.mandate_evidence_ids))), NEW.mandate_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at > m.valid_until THEN
    RAISE EXCEPTION 'mandate_verification_assessment_within_validity_ck: expiry % is after mandate %''s validUntil %',
      NEW.expires_at, NEW.mandate_id, m.valid_until
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER mandate_verification_assessment_within_mandate
  BEFORE INSERT ON scs.mandate_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.mandate_verification_assessment_within_mandate();


CREATE INDEX mandate_verification_assessment_mandate_idx
  ON scs.mandate_verification_assessment (mandate_id, recorded_at DESC);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER mandate_verification_assessment_append_only
  BEFORE UPDATE OR DELETE ON scs.mandate_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER mandate_verification_assessment_no_truncate
  BEFORE TRUNCATE ON scs.mandate_verification_assessment
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.mandate_verification_assessment IS
  'SCS-CAP-02 ScsMandateVerificationAssessment. Verifies a representation mandate only, never either party''s identity. The mandate''s current verification status is derived when read. Append-only; supersession is recorded on the newer assessment.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.mandate_verification_assessment TO scs_api;
ALTER TABLE scs.mandate_verification_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY mandate_verification_assessment_scs_api_select ON scs.mandate_verification_assessment
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY mandate_verification_assessment_scs_api_insert ON scs.mandate_verification_assessment
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
