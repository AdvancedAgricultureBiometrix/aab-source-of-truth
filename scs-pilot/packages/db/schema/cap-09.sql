-- ============================================================================
-- SCS-CAP-09 — Regulatory Review and Promotion — table definitions
--
-- Implements the records from
--   governance/workstream-b/SCS-CAP-09-REGULATORY-REVIEW-AND-PROMOTION-CANONICAL-CONTRACT-2026-09-22.md
-- as settled for the pilot (commit ff6d3b8, "Review rules for the pilot"):
--
--   ScsRegulatoryReviewDecision            → scs.regulatory_review_decision
--     .reviewReasoning.gapsConsidered[],
--     .reviewReasoning.conflictsConsidered[] → scs.review_reasoning_item
--   ScsDecisionCurrencyAssessment          → scs.decision_currency_assessment
--
-- Current-state reference for the CAP-09 tables. Migration 017 is generated
-- from this file (everything from the first statement onward). Requires
-- cap-01.sql (regulatory_framework), cap-02.sql (party_identity), cap-06.sql
-- (sufficiency_evaluation, with its context key), platform.sql
-- (reject_modification) and roles-rls.sql (scs_api).
--
-- All three tables are APPEND-ONLY for every role. A decision is never
-- changed: there is no currency column. Currency is derived when a decision
-- is read or assessed; an assessment is recorded as its own row.
--
-- A decision's frozen context — subject, framework, version, specification,
-- commodity and the evaluation's overall state — is a foreign key onto the
-- evaluation it reviewed, so it cannot differ from what was reviewed. The
-- database also enforces: one decision per evaluation; the permitted outcomes
-- (PROCEED only on GAPS_REQUIRE_HUMAN_DECISION or SUFFICIENT); supersession of
-- a decision of the same subject, at most once; every reasoning item naming a
-- gap or conflict the evaluation reported; and, at commit, every gap and every
-- unresolved conflict addressed (deferred constraint trigger).
--
-- Checked by the application only: the reviewer's role and independence (the
-- evaluation's requester and its conflict resolvers are in other rows), the
-- digest the reviewer supplied, the evaluation's integrity against its
-- receipt, that the superseded decision is the subject's current one, and the
-- text of decisionReasons.
--
-- ActorReference is stored as a jsonb object, in the shape AAB-PLATFORM-03
-- defines: version 2 for new records; version 1 records stay readable.
-- ============================================================================


-- ── ScsRegulatoryReviewDecision ─────────────────────────────────────────────
CREATE TABLE scs.regulatory_review_decision (
  decision_id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                    text        NOT NULL,

  -- the evaluation reviewed, and the digest of the result the reviewer saw
  evaluation_id                     uuid        NOT NULL,
  evaluation_snapshot_digest        text        NOT NULL,

  -- frozen context: must be the evaluation's own (context foreign key)
  subject_key                       text        NOT NULL,
  framework_id                      uuid        NOT NULL,
  framework_version                 text        NOT NULL,
  evidence_requirement_spec_id      text        NOT NULL,
  commodity_code                    text        NOT NULL,
  evaluation_overall_state          text        NOT NULL,
  operator_party_id                 uuid        NOT NULL,
  plot_ids                          uuid[]      NOT NULL,

  decision_outcome                  text        NOT NULL,

  -- reviewReasoning (gaps and conflicts in scs.review_reasoning_item)
  evaluation_summary_assessed       text        NOT NULL,
  limitations_acknowledged          text[]      NOT NULL,
  basis_for_outcome                 text        NOT NULL,
  remaining_concerns                text[]      NOT NULL,
  conditions                        text[]      NOT NULL,

  -- reviewer: the actor, and what was declared
  reviewer                          jsonb       NOT NULL,   -- ActorReference: reviewerId is its actorId
  reviewer_name                     text        NOT NULL,   -- declared
  reviewer_organization_id          uuid        NOT NULL,   -- a registered party
  reviewer_role_reference           text        NOT NULL,   -- declared
  authority_basis                   text        NOT NULL,   -- declared, not verified
  authority_verified_at             timestamptz NOT NULL,   -- when the role was checked

  decided_at                        timestamptz NOT NULL,
  record_validity                   text        NOT NULL,
  decision_reasons                  text[]      NOT NULL,

  -- supersession: the subject's decision this one supersedes
  supersedes_decision_id            uuid,
  supersession_reason               text,

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT regulatory_review_decision_pk PRIMARY KEY (decision_id),
  -- an evaluation is decided at most once
  CONSTRAINT regulatory_review_decision_evaluation_uq UNIQUE (evaluation_id),
  -- a decision is superseded at most once
  CONSTRAINT regulatory_review_decision_supersedes_uq UNIQUE (supersedes_decision_id),
  -- targets of the supersession and currency-assessment foreign keys
  CONSTRAINT regulatory_review_decision_subject_uq UNIQUE (decision_id, subject_key),
  CONSTRAINT regulatory_review_decision_successor_uq UNIQUE (decision_id, supersedes_decision_id),
  -- the target of scs.due_diligence_package's decision foreign key: a
  -- package's scope is the decision's own, and only a PROCEED decision can be
  -- packaged. Added by migration 018.
  CONSTRAINT regulatory_review_decision_package_context_uq
    UNIQUE (decision_id, evaluation_id, operator_party_id, framework_id, framework_version, commodity_code,
            decision_outcome),

  -- ── Foreign keys ──────────────────────────────────────────────────────────
  CONSTRAINT regulatory_review_decision_context_fk
    FOREIGN KEY (evaluation_id, subject_key, framework_id, framework_version, evidence_requirement_spec_id,
                 commodity_code, evaluation_overall_state)
    REFERENCES scs.sufficiency_evaluation (evaluation_id, subject_key, framework_id, framework_version,
                 evidence_requirement_spec_id, commodity_code, overall_state)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT regulatory_review_decision_operator_fk
    FOREIGN KEY (operator_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT regulatory_review_decision_organization_fk
    FOREIGN KEY (reviewer_organization_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- supersession stays within the subject
  CONSTRAINT regulatory_review_decision_supersedes_fk
    FOREIGN KEY (supersedes_decision_id, subject_key) REFERENCES scs.regulatory_review_decision (decision_id, subject_key)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- ── Contract enumerations ─────────────────────────────────────────────────
  -- REVIEW_ABORTED_FAIL_CLOSED is never recorded
  CONSTRAINT regulatory_review_decision_outcome_ck
    CHECK (decision_outcome IN ('PROCEED_TO_PACKAGE_COMPILATION', 'DO_NOT_PROCEED', 'REQUIRES_FURTHER_EVIDENCE',
                                'REQUIRES_SPECIALIST_REVIEW')),
  -- a recorded decision is procedurally valid; nothing records another validity
  CONSTRAINT regulatory_review_decision_validity_ck
    CHECK (record_validity = 'VALID'),

  -- ── Rules ─────────────────────────────────────────────────────────────────
  -- PROCEED only on an evaluation a human may decide on
  CONSTRAINT regulatory_review_decision_permitted_outcome_ck
    CHECK (decision_outcome <> 'PROCEED_TO_PACKAGE_COMPILATION'
        OR evaluation_overall_state IN ('GAPS_REQUIRE_HUMAN_DECISION', 'SUFFICIENT')),
  CONSTRAINT regulatory_review_decision_supersession_ck
    CHECK ((supersedes_decision_id IS NULL) = (supersession_reason IS NULL)
       AND (supersedes_decision_id IS NULL OR supersedes_decision_id <> decision_id)),
  CONSTRAINT regulatory_review_decision_digest_ck
    CHECK (evaluation_snapshot_digest ~ '^[0-9a-f]{64}$'),

  -- ── Defensive ─────────────────────────────────────────────────────────────
  CONSTRAINT regulatory_review_decision_reviewer_ck
    CHECK (jsonb_typeof(reviewer) = 'object' AND (reviewer ->> 'actorId') IS NOT NULL),
  CONSTRAINT regulatory_review_decision_text_ck
    CHECK (btrim(schema_version) <> '' AND btrim(evaluation_summary_assessed) <> '' AND btrim(basis_for_outcome) <> ''
       AND btrim(reviewer_name) <> '' AND btrim(reviewer_role_reference) <> '' AND btrim(authority_basis) <> ''
       AND (supersession_reason IS NULL OR btrim(supersession_reason) <> '')),
  CONSTRAINT regulatory_review_decision_arrays_ck
    CHECK (cardinality(plot_ids) > 0 AND array_position(plot_ids, NULL) IS NULL
       AND array_position(limitations_acknowledged, NULL) IS NULL
       AND array_position(remaining_concerns, NULL) IS NULL
       AND array_position(conditions, NULL) IS NULL
       AND array_position(decision_reasons, NULL) IS NULL),
  CONSTRAINT regulatory_review_decision_times_ck
    CHECK (authority_verified_at <= decided_at)
);


-- ── reviewReasoning.gapsConsidered / conflictsConsidered ────────────────────
CREATE TABLE scs.review_reasoning_item (
  reasoning_item_id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  decision_id                       uuid        NOT NULL,
  item_kind                         text        NOT NULL,
  gap_id                            uuid,                   -- a gap the evaluation reported
  conflict_key                      text,                   -- a conflict the evaluation reported
  assessment                        text        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT review_reasoning_item_pk PRIMARY KEY (reasoning_item_id),
  CONSTRAINT review_reasoning_item_decision_fk
    FOREIGN KEY (decision_id) REFERENCES scs.regulatory_review_decision (decision_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT review_reasoning_item_kind_ck
    CHECK ((item_kind = 'GAP' AND gap_id IS NOT NULL AND conflict_key IS NULL)
        OR (item_kind = 'CONFLICT' AND conflict_key IS NOT NULL AND gap_id IS NULL)),
  CONSTRAINT review_reasoning_item_assessment_ck
    CHECK (btrim(assessment) <> '')
);

-- each gap and each conflict addressed once per decision
CREATE UNIQUE INDEX review_reasoning_item_gap_uq ON scs.review_reasoning_item (decision_id, gap_id) WHERE gap_id IS NOT NULL;
CREATE UNIQUE INDEX review_reasoning_item_conflict_uq ON scs.review_reasoning_item (decision_id, conflict_key) WHERE conflict_key IS NOT NULL;


-- ── A reasoning item names a gap or conflict its evaluation reported ────────
CREATE FUNCTION scs.review_reasoning_item_reported() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM scs.regulatory_review_decision d
      JOIN scs.sufficiency_evaluation e ON e.evaluation_id = d.evaluation_id
     WHERE d.decision_id = NEW.decision_id
       AND CASE NEW.item_kind
             WHEN 'GAP' THEN EXISTS (SELECT 1 FROM jsonb_array_elements(e.result -> 'allGaps') g WHERE g ->> 'gapId' = NEW.gap_id::text)
             ELSE EXISTS (SELECT 1 FROM jsonb_array_elements(e.result -> 'allConflicts') c WHERE c ->> 'conflictKey' = NEW.conflict_key)
           END
  ) THEN
    RAISE EXCEPTION 'review_reasoning_item_reported_ck: the evaluation reviewed by decision % reported no % %',
      NEW.decision_id, lower(NEW.item_kind), coalesce(NEW.gap_id::text, NEW.conflict_key)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER review_reasoning_item_reported
  BEFORE INSERT ON scs.review_reasoning_item
  FOR EACH ROW EXECUTE FUNCTION scs.review_reasoning_item_reported();


-- ── Every gap and unresolved conflict is addressed (checked at commit) ──────
CREATE FUNCTION scs.regulatory_review_decision_reasoning_complete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(x, ', ' ORDER BY x) INTO missing FROM (
    SELECT 'gap ' || (g ->> 'gapId') AS x
      FROM scs.sufficiency_evaluation e, jsonb_array_elements(e.result -> 'allGaps') g
     WHERE e.evaluation_id = NEW.evaluation_id
       AND NOT EXISTS (SELECT 1 FROM scs.review_reasoning_item i WHERE i.decision_id = NEW.decision_id AND i.gap_id::text = g ->> 'gapId')
    UNION ALL
    SELECT 'conflict ' || (c ->> 'conflictKey')
      FROM scs.sufficiency_evaluation e, jsonb_array_elements(e.result -> 'allConflicts') c
     WHERE e.evaluation_id = NEW.evaluation_id AND c ->> 'resolutionStatus' = 'UNRESOLVED'
       AND NOT EXISTS (SELECT 1 FROM scs.review_reasoning_item i WHERE i.decision_id = NEW.decision_id AND i.conflict_key = c ->> 'conflictKey')
  ) unaddressed;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'regulatory_review_decision_reasoning_ck: decision % does not address %', NEW.decision_id, missing
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER regulatory_review_decision_reasoning_complete
  AFTER INSERT ON scs.regulatory_review_decision
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION scs.regulatory_review_decision_reasoning_complete();


-- ── ScsDecisionCurrencyAssessment ───────────────────────────────────────────
CREATE TABLE scs.decision_currency_assessment (
  assessment_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  decision_id                       uuid        NOT NULL,
  assessed_at                       timestamptz NOT NULL,
  assessed_by                       jsonb       NOT NULL,   -- ActorReference: who requested the assessment
  currency_status                   text        NOT NULL,
  superseded_by_decision_id         uuid,                   -- when SUPERSEDED: the decision that supersedes it
  checks_performed                  jsonb       NOT NULL,   -- [{ checkType, checkResult, detail? }]
  material_changes                  jsonb       NOT NULL,   -- [{ changeType, changedAt, changedEntityId, explanation }]
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT decision_currency_assessment_pk PRIMARY KEY (assessment_id),
  CONSTRAINT decision_currency_assessment_decision_fk
    FOREIGN KEY (decision_id) REFERENCES scs.regulatory_review_decision (decision_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- SUPERSEDED names the decision that actually supersedes this one
  CONSTRAINT decision_currency_assessment_superseded_by_fk
    FOREIGN KEY (superseded_by_decision_id, decision_id)
    REFERENCES scs.regulatory_review_decision (decision_id, supersedes_decision_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  CONSTRAINT decision_currency_assessment_status_ck
    CHECK (currency_status IN ('CURRENT', 'POTENTIALLY_STALE', 'SUPERSEDED', 'FAIL_CLOSED')),
  CONSTRAINT decision_currency_assessment_shape_ck
    CHECK (jsonb_typeof(checks_performed) = 'array' AND jsonb_array_length(checks_performed) > 0
       AND jsonb_typeof(material_changes) = 'array' AND jsonb_typeof(assessed_by) = 'object'),
  -- the status follows its precedence: SUPERSEDED, POTENTIALLY_STALE, FAIL_CLOSED, CURRENT
  CONSTRAINT decision_currency_assessment_precedence_ck
    CHECK ((currency_status = 'SUPERSEDED') = (superseded_by_decision_id IS NOT NULL)
       AND (currency_status <> 'POTENTIALLY_STALE'
            OR (jsonb_path_exists(checks_performed, '$[*] ? (@.checkResult == "CHANGED")') AND jsonb_array_length(material_changes) > 0))
       AND (currency_status <> 'FAIL_CLOSED'
            OR (jsonb_path_exists(checks_performed, '$[*] ? (@.checkResult == "UNAVAILABLE")')
                AND NOT jsonb_path_exists(checks_performed, '$[*] ? (@.checkResult == "CHANGED")')))
       AND (currency_status <> 'CURRENT'
            OR (NOT jsonb_path_exists(checks_performed, '$[*] ? (@.checkResult == "CHANGED" || @.checkResult == "UNAVAILABLE")')
                AND jsonb_array_length(material_changes) = 0)))
);


-- ── Indexes on foreign keys and lookups ─────────────────────────────────────
-- a subject's decisions, most recent first
CREATE INDEX regulatory_review_decision_subject_idx ON scs.regulatory_review_decision (subject_key, decided_at DESC);
CREATE INDEX regulatory_review_decision_operator_idx ON scs.regulatory_review_decision (operator_party_id);
CREATE INDEX regulatory_review_decision_organization_idx ON scs.regulatory_review_decision (reviewer_organization_id);
CREATE INDEX review_reasoning_item_decision_idx ON scs.review_reasoning_item (decision_id);
CREATE INDEX decision_currency_assessment_decision_idx ON scs.decision_currency_assessment (decision_id, assessed_at DESC);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER regulatory_review_decision_append_only
  BEFORE UPDATE OR DELETE ON scs.regulatory_review_decision
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER regulatory_review_decision_no_truncate
  BEFORE TRUNCATE ON scs.regulatory_review_decision
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER review_reasoning_item_append_only
  BEFORE UPDATE OR DELETE ON scs.review_reasoning_item
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER review_reasoning_item_no_truncate
  BEFORE TRUNCATE ON scs.review_reasoning_item
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER decision_currency_assessment_append_only
  BEFORE UPDATE OR DELETE ON scs.decision_currency_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER decision_currency_assessment_no_truncate
  BEFORE TRUNCATE ON scs.decision_currency_assessment
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.regulatory_review_decision IS
  'SCS-CAP-09 ScsRegulatoryReviewDecision. A permanent, attributable human decision bound to the exact evaluation reviewed. It authorises a workflow step only: never a compliance determination. Currency is derived, never stored. Append-only.';
COMMENT ON TABLE scs.review_reasoning_item IS
  'SCS-CAP-09 reviewReasoning gapsConsidered and conflictsConsidered: one row per gap or conflict addressed, each naming one the evaluation reported. Append-only.';
COMMENT ON TABLE scs.decision_currency_assessment IS
  'SCS-CAP-09 ScsDecisionCurrencyAssessment: a recorded assessment of a decision''s currency. The decision itself is never changed. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.regulatory_review_decision TO scs_api;
ALTER TABLE scs.regulatory_review_decision ENABLE ROW LEVEL SECURITY;
CREATE POLICY regulatory_review_decision_scs_api_select ON scs.regulatory_review_decision
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY regulatory_review_decision_scs_api_insert ON scs.regulatory_review_decision
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.review_reasoning_item TO scs_api;
ALTER TABLE scs.review_reasoning_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_reasoning_item_scs_api_select ON scs.review_reasoning_item
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY review_reasoning_item_scs_api_insert ON scs.review_reasoning_item
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.decision_currency_assessment TO scs_api;
ALTER TABLE scs.decision_currency_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_currency_assessment_scs_api_select ON scs.decision_currency_assessment
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY decision_currency_assessment_scs_api_insert ON scs.decision_currency_assessment
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
