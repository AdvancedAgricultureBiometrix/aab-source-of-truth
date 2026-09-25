-- ============================================================================
-- SCS-CAP-06 — Due Diligence Sufficiency Evaluation — table definitions
--
-- Implements the records from
--   governance/workstream-b/SCS-CAP-06-DUE-DILIGENCE-SUFFICIENCY-EVALUATION-CANONICAL-CONTRACT-2026-09-22.md
-- as settled for the pilot (commits 0fd8c25, 876fc80, e0b7634):
--
--   ScsSufficiencyEvaluationResult        → scs.sufficiency_evaluation
--     .plotIds[] (with plot versions)      → scs.sufficiency_evaluation_plot
--     .evaluatedEvidence                   → scs.sufficiency_evaluation_evidence
--     .evaluatedEvidence.appliedResolutionIds → scs.sufficiency_evaluation_resolution
--   ScsConflictResolutionRecord           → scs.conflict_resolution
--
-- Current-state reference for the CAP-06 tables. Migration 015 is generated
-- from this file (everything from the first statement up to the "Conflict
-- resolutions" section); migration 016 from that section. Requires
-- cap-01.sql (regulatory_framework, with its (framework, spec) and
-- (framework, commodity) keys), cap-02.sql (party_identity), cap-03.sql
-- (plot), cap-04.sql (deforestation_evidence_record), cap-05.sql
-- (custody_event), platform.sql (reject_modification) and roles-rls.sql
-- (scs_api).
--
-- All three tables are APPEND-ONLY for every role: an evaluation is never
-- changed. A re-evaluation is a new row citing previous_evaluation_id, which
-- must concern the same subject.
--
-- The full ScsSufficiencyEvaluationResult is kept as one canonical jsonb
-- document (result), exactly as returned and receipted. The columns beside
-- it are the keys that are queried or constrained (subject, framework,
-- period, state, flags); sufficiency_evaluation_result_ck ties each of them to
-- the document, so the two can never disagree. Gaps and conflicts stay inside
-- the document for now.
--
-- subject_key identifies the subject (contract "Subject identity": the set of
-- plots, the commodity, the framework and the set of batches) for SCS-CAP-09's
-- "most recent evaluation of this subject". The application computes it as
-- the SHA-256 of the canonical subject; the database requires every
-- evaluation to cover at least one plot (deferred constraint trigger, checked
-- at commit, since the plot rows are inserted after the evaluation).
--
-- FAIL_CLOSED is never recorded (a failure produces no evaluation), so
-- overall_state has four values and the document's hasFailClosedConditions
-- is always false. SUFFICIENT is allowed by the database even though no
-- pilot evaluation can reach it: that is a limit of the pilot (no spatial
-- database), not a rule.
--
-- NOT YET IMPLEMENTED
--   TODO(actor-reference): ActorReference stored as a jsonb object.
-- ============================================================================


-- ── ScsSufficiencyEvaluationResult ──────────────────────────────────────────
CREATE TABLE scs.sufficiency_evaluation (
  evaluation_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  evaluator_version                 text        NOT NULL,

  -- the request, all set by the system
  request_id                        uuid        NOT NULL,
  requested_by                      jsonb       NOT NULL,   -- ActorReference
  requested_at                      timestamptz NOT NULL,
  evaluated_at                      timestamptz NOT NULL,

  -- subject (plots in sufficiency_evaluation_plot)
  subject_key                       text        NOT NULL,   -- SHA-256 of the canonical subject
  commodity_code                    text        NOT NULL,
  batch_identifiers                 text[]      NOT NULL,   -- sorted; empty when no custody subject
  operator_party_id                 uuid,

  -- framework
  framework_id                      uuid        NOT NULL,
  framework_version                 text        NOT NULL,   -- the framework's regulationVersion
  evidence_requirement_spec_id      text        NOT NULL,

  -- period: reference_date is the spec's referenceCutoffDate
  reference_date                    date        NOT NULL,
  evaluation_end_date               date        NOT NULL,
  assessment_type                   text        NOT NULL,

  requested_analysis                text[]      NOT NULL,   -- recorded as asked; never narrows the evaluation

  -- outcome
  overall_state                     text        NOT NULL,
  has_evidence_gaps                 boolean     NOT NULL,
  has_material_unresolved_conflicts boolean     NOT NULL,

  previous_evaluation_id            uuid,                   -- a re-evaluation: same subject

  result                            jsonb       NOT NULL,   -- the full ScsSufficiencyEvaluationResult

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sufficiency_evaluation_pk PRIMARY KEY (evaluation_id),
  CONSTRAINT sufficiency_evaluation_request_uq UNIQUE (request_id),
  -- the target of the previous-evaluation foreign key: same subject
  CONSTRAINT sufficiency_evaluation_subject_uq UNIQUE (evaluation_id, subject_key),

  -- ── Foreign keys ──────────────────────────────────────────────────────────
  CONSTRAINT sufficiency_evaluation_framework_spec_fk
    FOREIGN KEY (framework_id, evidence_requirement_spec_id)
    REFERENCES scs.regulatory_framework (framework_id, evidence_spec_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_framework_commodity_fk
    FOREIGN KEY (framework_id, commodity_code)
    REFERENCES scs.regulatory_framework (framework_id, commodity_code)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_operator_fk
    FOREIGN KEY (operator_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_previous_fk
    FOREIGN KEY (previous_evaluation_id, subject_key)
    REFERENCES scs.sufficiency_evaluation (evaluation_id, subject_key)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- ── Contract enumerations ─────────────────────────────────────────────────
  CONSTRAINT sufficiency_evaluation_assessment_type_ck
    CHECK (assessment_type IN ('DEFORESTATION', 'FOREST_DEGRADATION', 'BOTH')),
  -- FAIL_CLOSED is never recorded
  CONSTRAINT sufficiency_evaluation_overall_state_ck
    CHECK (overall_state IN ('SUFFICIENT', 'GAPS_REQUIRE_HUMAN_DECISION', 'INSUFFICIENT', 'CONFLICTING_EVIDENCE')),
  CONSTRAINT sufficiency_evaluation_requested_analysis_ck
    CHECK (requested_analysis <@ ARRAY['TEMPORAL_COVERAGE', 'SPATIAL_COVERAGE', 'REQUIREMENT_BY_REQUIREMENT',
             'CONFLICT_DETECTION', 'GAP_IDENTIFICATION', 'PROVENANCE_AND_AUTHORITY', 'CUSTODY_CHAIN']::text[]
       AND scs.text_array_is_distinct(requested_analysis)),

  -- ── Rules ─────────────────────────────────────────────────────────────────
  CONSTRAINT sufficiency_evaluation_period_ck
    CHECK (evaluation_end_date > reference_date),
  -- a custody subject names batches and the operator together, or neither
  CONSTRAINT sufficiency_evaluation_custody_subject_ck
    CHECK ((operator_party_id IS NULL) = (cardinality(batch_identifiers) = 0)
       AND scs.text_array_is_distinct(batch_identifiers)
       AND array_position(batch_identifiers, NULL) IS NULL),
  -- the overall state follows the precedence rules
  CONSTRAINT sufficiency_evaluation_state_ck
    CHECK ((overall_state = 'CONFLICTING_EVIDENCE') = has_material_unresolved_conflicts
       AND (overall_state <> 'SUFFICIENT' OR NOT has_evidence_gaps)
       AND (overall_state <> 'GAPS_REQUIRE_HUMAN_DECISION' OR has_evidence_gaps)),
  CONSTRAINT sufficiency_evaluation_not_self_ck
    CHECK (previous_evaluation_id IS NULL OR previous_evaluation_id <> evaluation_id),
  CONSTRAINT sufficiency_evaluation_subject_key_ck
    CHECK (subject_key ~ '^[0-9a-f]{64}$'),
  -- the key columns are the document's own values
  CONSTRAINT sufficiency_evaluation_result_ck
    CHECK (jsonb_typeof(result) = 'object'
       AND (result ->> 'evaluationId') IS NOT DISTINCT FROM evaluation_id::text
       AND (result ->> 'requestId') IS NOT DISTINCT FROM request_id::text
       AND (result ->> 'evaluatorVersion') IS NOT DISTINCT FROM evaluator_version
       AND (result ->> 'frameworkId') IS NOT DISTINCT FROM framework_id::text
       AND (result ->> 'frameworkVersion') IS NOT DISTINCT FROM framework_version
       AND (result ->> 'evidenceRequirementSpecId') IS NOT DISTINCT FROM evidence_requirement_spec_id
       AND (result ->> 'commodityCode') IS NOT DISTINCT FROM commodity_code
       AND (result ->> 'overallState') IS NOT DISTINCT FROM overall_state
       AND (result -> 'hasEvidenceGaps') IS NOT DISTINCT FROM to_jsonb(has_evidence_gaps)
       AND (result -> 'hasMaterialUnresolvedConflicts') IS NOT DISTINCT FROM to_jsonb(has_material_unresolved_conflicts)
       AND (result -> 'hasFailClosedConditions') IS NOT DISTINCT FROM 'false'::jsonb
       AND (result -> 'evaluationPeriod' ->> 'referenceDate') IS NOT DISTINCT FROM reference_date::text
       AND (result -> 'evaluationPeriod' ->> 'evaluationEndDate') IS NOT DISTINCT FROM evaluation_end_date::text
       AND (result -> 'evaluationPeriod' ->> 'assessmentType') IS NOT DISTINCT FROM assessment_type
       AND (result ->> 'previousEvaluationId') IS NOT DISTINCT FROM previous_evaluation_id::text),

  -- ── Defensive ─────────────────────────────────────────────────────────────
  CONSTRAINT sufficiency_evaluation_actor_ref_ck
    CHECK (jsonb_typeof(requested_by) = 'object'),
  CONSTRAINT sufficiency_evaluation_required_text_ck
    CHECK (btrim(evaluator_version) <> '' AND btrim(framework_version) <> ''
       AND btrim(evidence_requirement_spec_id) <> '' AND btrim(commodity_code) <> ''),
  CONSTRAINT sufficiency_evaluation_times_ck
    CHECK (evaluated_at >= requested_at)
);


-- ── plotIds ─────────────────────────────────────────────────────────────────
CREATE TABLE scs.sufficiency_evaluation_plot (
  evaluation_id                     uuid        NOT NULL,
  plot_id                           uuid        NOT NULL,
  plot_version                      integer     NOT NULL,   -- the plot's version when evaluated
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sufficiency_evaluation_plot_pk PRIMARY KEY (evaluation_id, plot_id),
  CONSTRAINT sufficiency_evaluation_plot_evaluation_fk
    FOREIGN KEY (evaluation_id) REFERENCES scs.sufficiency_evaluation (evaluation_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_plot_plot_fk
    FOREIGN KEY (plot_id) REFERENCES scs.plot (plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_plot_version_ck
    CHECK (plot_version >= 1)
);


-- ── evaluatedEvidence: the frozen input ─────────────────────────────────────
CREATE TABLE scs.sufficiency_evaluation_evidence (
  evaluation_evidence_id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  evaluation_id                     uuid        NOT NULL,
  evidence_kind                     text        NOT NULL,
  deforestation_evidence_id         uuid,                   -- an SCS-CAP-04 record
  custody_event_id                  uuid,                   -- an SCS-CAP-05 event
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sufficiency_evaluation_evidence_pk PRIMARY KEY (evaluation_evidence_id),
  CONSTRAINT sufficiency_evaluation_evidence_evaluation_fk
    FOREIGN KEY (evaluation_id) REFERENCES scs.sufficiency_evaluation (evaluation_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_evidence_deforestation_fk
    FOREIGN KEY (deforestation_evidence_id) REFERENCES scs.deforestation_evidence_record (evidence_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_evidence_custody_fk
    FOREIGN KEY (custody_event_id) REFERENCES scs.custody_event (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- exactly one reference, of the stated kind
  CONSTRAINT sufficiency_evaluation_evidence_kind_ck
    CHECK ((evidence_kind = 'DEFORESTATION' AND deforestation_evidence_id IS NOT NULL AND custody_event_id IS NULL)
        OR (evidence_kind = 'CUSTODY' AND custody_event_id IS NOT NULL AND deforestation_evidence_id IS NULL))
);

-- each record at most once per evaluation
CREATE UNIQUE INDEX sufficiency_evaluation_evidence_deforestation_uq
  ON scs.sufficiency_evaluation_evidence (evaluation_id, deforestation_evidence_id) WHERE deforestation_evidence_id IS NOT NULL;
CREATE UNIQUE INDEX sufficiency_evaluation_evidence_custody_uq
  ON scs.sufficiency_evaluation_evidence (evaluation_id, custody_event_id) WHERE custody_event_id IS NOT NULL;


-- ── Every evaluation covers at least one plot (checked at commit) ───────────
CREATE FUNCTION scs.sufficiency_evaluation_has_plots() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM scs.sufficiency_evaluation_plot WHERE evaluation_id = NEW.evaluation_id) THEN
    RAISE EXCEPTION 'sufficiency_evaluation_plots_ck: evaluation % covers no plot', NEW.evaluation_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER sufficiency_evaluation_has_plots
  AFTER INSERT ON scs.sufficiency_evaluation
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION scs.sufficiency_evaluation_has_plots();


-- ── Indexes on foreign keys and lookups ─────────────────────────────────────
-- SCS-CAP-09: the most recent evaluation of a subject
CREATE INDEX sufficiency_evaluation_subject_idx ON scs.sufficiency_evaluation (subject_key, evaluated_at DESC);
CREATE INDEX sufficiency_evaluation_framework_idx ON scs.sufficiency_evaluation (framework_id, evidence_requirement_spec_id);
CREATE INDEX sufficiency_evaluation_operator_idx ON scs.sufficiency_evaluation (operator_party_id);
CREATE INDEX sufficiency_evaluation_previous_idx ON scs.sufficiency_evaluation (previous_evaluation_id);
-- listEvaluationsForPlot
CREATE INDEX sufficiency_evaluation_plot_plot_idx ON scs.sufficiency_evaluation_plot (plot_id);
CREATE INDEX sufficiency_evaluation_evidence_evaluation_idx ON scs.sufficiency_evaluation_evidence (evaluation_id);
CREATE INDEX sufficiency_evaluation_evidence_deforestation_idx ON scs.sufficiency_evaluation_evidence (deforestation_evidence_id);
CREATE INDEX sufficiency_evaluation_evidence_custody_idx ON scs.sufficiency_evaluation_evidence (custody_event_id);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER sufficiency_evaluation_append_only
  BEFORE UPDATE OR DELETE ON scs.sufficiency_evaluation
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_no_truncate
  BEFORE TRUNCATE ON scs.sufficiency_evaluation
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_plot_append_only
  BEFORE UPDATE OR DELETE ON scs.sufficiency_evaluation_plot
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_plot_no_truncate
  BEFORE TRUNCATE ON scs.sufficiency_evaluation_plot
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_evidence_append_only
  BEFORE UPDATE OR DELETE ON scs.sufficiency_evaluation_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_evidence_no_truncate
  BEFORE TRUNCATE ON scs.sufficiency_evaluation_evidence
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.sufficiency_evaluation IS
  'SCS-CAP-06 ScsSufficiencyEvaluationResult. Advisory only: SUFFICIENT means sufficient under the evaluated specification, never legally compliant. The full result is the result document; the key columns must agree with it. Append-only.';
COMMENT ON TABLE scs.sufficiency_evaluation_plot IS
  'SCS-CAP-06 the plots an evaluation covers, with each plot''s version when evaluated. Append-only.';
COMMENT ON TABLE scs.sufficiency_evaluation_evidence IS
  'SCS-CAP-06 the frozen input: exactly the admitted SCS-CAP-04 records and SCS-CAP-05 events an evaluation evaluated. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.sufficiency_evaluation TO scs_api;
ALTER TABLE scs.sufficiency_evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY sufficiency_evaluation_scs_api_select ON scs.sufficiency_evaluation
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY sufficiency_evaluation_scs_api_insert ON scs.sufficiency_evaluation
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.sufficiency_evaluation_plot TO scs_api;
ALTER TABLE scs.sufficiency_evaluation_plot ENABLE ROW LEVEL SECURITY;
CREATE POLICY sufficiency_evaluation_plot_scs_api_select ON scs.sufficiency_evaluation_plot
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY sufficiency_evaluation_plot_scs_api_insert ON scs.sufficiency_evaluation_plot
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.sufficiency_evaluation_evidence TO scs_api;
ALTER TABLE scs.sufficiency_evaluation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY sufficiency_evaluation_evidence_scs_api_select ON scs.sufficiency_evaluation_evidence
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY sufficiency_evaluation_evidence_scs_api_insert ON scs.sufficiency_evaluation_evidence
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);


-- ============================================================================
-- Conflict resolutions (migration 016; contract e0b7634, "Conflict resolution
-- records"):
--
--   ScsConflictResolutionRecord               → scs.conflict_resolution
--   evaluatedEvidence.appliedResolutionIds    → scs.sufficiency_evaluation_resolution
--
-- A resolution is a human act, recorded once per conflict key and never
-- changed. The key is the requirement code and the two evidence identifiers
-- in sorted order; for a declared custody contradiction the two are the same
-- event. The database requires the key to be consistent with its parts, the
-- compared items to be exactly the conflict's items, an inapplicable item to
-- be one of them, and the conflict to have been reported under that key in
-- the named evaluation (trigger). The evidence identifiers have no foreign
-- key: an item is an SCS-CAP-04 record or an SCS-CAP-05 event; the
-- application checks that additional evidence is admitted, and that the
-- resolver is not the submitter of either item (independence).
-- ============================================================================

CREATE TABLE scs.conflict_resolution (
  resolution_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  conflict_key                      text        NOT NULL,
  requirement_code                  text        NOT NULL,
  evidence_a_id                     uuid        NOT NULL,   -- the lower of the two, as in the key
  evidence_b_id                     uuid        NOT NULL,   -- equal to evidence_a_id for a self-conflict
  evaluation_id                     uuid        NOT NULL,   -- the evaluation in which the conflict was found

  compared_evidence_ids             uuid[]      NOT NULL,
  provenance_and_methods_considered text        NOT NULL,
  resolution_reason                 text        NOT NULL,
  inapplicable_evidence_id          uuid,
  additional_evidence_obtained      boolean     NOT NULL,
  additional_evidence_ids           uuid[]      NOT NULL,
  remaining_limitations             text[]      NOT NULL,
  reviewer                          jsonb       NOT NULL,   -- ActorReference: the resolver
  authority_basis                   text        NOT NULL,
  resolved_at                       timestamptz NOT NULL,
  re_evaluation_required            boolean     NOT NULL,   -- recorded as given; never triggers an evaluation

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT conflict_resolution_pk PRIMARY KEY (resolution_id),
  -- a conflict is resolved once; revising a resolution is a contract gap
  CONSTRAINT conflict_resolution_key_uq UNIQUE (conflict_key),
  CONSTRAINT conflict_resolution_evaluation_fk
    FOREIGN KEY (evaluation_id) REFERENCES scs.sufficiency_evaluation (evaluation_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  CONSTRAINT conflict_resolution_requirement_code_ck
    CHECK (requirement_code IN ('DEF-TEMPORAL-COVERAGE', 'DEF-SPATIAL-COVERAGE', 'DEF-SOURCE-TYPE', 'DEF-RESOLUTION',
             'DEF-RECENCY', 'DEF-INTEGRITY', 'DEF-AUTHORITY-CONFIRMATION', 'PLOT-REGISTERED', 'PLOT-GEOLOCATION',
             'PLOT-LAND-REGISTRY', 'PLOT-OWNERSHIP-VERIFIED', 'PLOT-IDENTIFIER-TYPE', 'CUSTODY-CHAIN-CONTINUITY',
             'CUSTODY-DOCUMENT-TYPES', 'CUSTODY-TRACEABILITY-DEPTH')),
  -- the key is its parts: requirement code, then the two ids in sorted order
  CONSTRAINT conflict_resolution_key_ck
    CHECK (evidence_a_id::text <= evidence_b_id::text
       AND conflict_key = requirement_code || ':' || evidence_a_id::text || ':' || evidence_b_id::text),
  -- the compared items are exactly the conflict's items (one for a self-conflict)
  CONSTRAINT conflict_resolution_compared_ck
    CHECK (compared_evidence_ids <@ ARRAY[evidence_a_id, evidence_b_id]
       AND ARRAY[evidence_a_id, evidence_b_id] <@ compared_evidence_ids
       AND cardinality(compared_evidence_ids) = CASE WHEN evidence_a_id = evidence_b_id THEN 1 ELSE 2 END),
  CONSTRAINT conflict_resolution_inapplicable_ck
    CHECK (inapplicable_evidence_id IS NULL OR inapplicable_evidence_id IN (evidence_a_id, evidence_b_id)),
  CONSTRAINT conflict_resolution_additional_ck
    CHECK (additional_evidence_obtained = (cardinality(additional_evidence_ids) > 0)
       AND array_position(additional_evidence_ids, NULL) IS NULL),
  CONSTRAINT conflict_resolution_text_ck
    CHECK (btrim(provenance_and_methods_considered) <> '' AND btrim(resolution_reason) <> ''
       AND btrim(authority_basis) <> '' AND array_position(remaining_limitations, NULL) IS NULL),
  CONSTRAINT conflict_resolution_reviewer_ck
    CHECK (jsonb_typeof(reviewer) = 'object')
);


-- ── The conflict must have been reported under that key in that evaluation ─
CREATE FUNCTION scs.conflict_resolution_conflict_reported() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM scs.sufficiency_evaluation e, jsonb_array_elements(e.result -> 'allConflicts') AS c
     WHERE e.evaluation_id = NEW.evaluation_id AND c ->> 'conflictKey' = NEW.conflict_key
  ) THEN
    RAISE EXCEPTION 'conflict_resolution_conflict_ck: evaluation % reported no conflict under key %', NEW.evaluation_id, NEW.conflict_key
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER conflict_resolution_conflict_reported
  BEFORE INSERT ON scs.conflict_resolution
  FOR EACH ROW EXECUTE FUNCTION scs.conflict_resolution_conflict_reported();


-- ── appliedResolutionIds: the resolutions an evaluation applied ─────────────
CREATE TABLE scs.sufficiency_evaluation_resolution (
  evaluation_id                     uuid        NOT NULL,
  resolution_id                     uuid        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sufficiency_evaluation_resolution_pk PRIMARY KEY (evaluation_id, resolution_id),
  CONSTRAINT sufficiency_evaluation_resolution_evaluation_fk
    FOREIGN KEY (evaluation_id) REFERENCES scs.sufficiency_evaluation (evaluation_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT sufficiency_evaluation_resolution_resolution_fk
    FOREIGN KEY (resolution_id) REFERENCES scs.conflict_resolution (resolution_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
);


CREATE INDEX conflict_resolution_evaluation_idx ON scs.conflict_resolution (evaluation_id);
CREATE INDEX sufficiency_evaluation_resolution_resolution_idx ON scs.sufficiency_evaluation_resolution (resolution_id);


CREATE TRIGGER conflict_resolution_append_only
  BEFORE UPDATE OR DELETE ON scs.conflict_resolution
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER conflict_resolution_no_truncate
  BEFORE TRUNCATE ON scs.conflict_resolution
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_resolution_append_only
  BEFORE UPDATE OR DELETE ON scs.sufficiency_evaluation_resolution
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER sufficiency_evaluation_resolution_no_truncate
  BEFORE TRUNCATE ON scs.sufficiency_evaluation_resolution
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.conflict_resolution IS
  'SCS-CAP-06 ScsConflictResolutionRecord. A human resolution of one conflict key, recorded once and never changed. CAP-06 never creates one. Append-only.';
COMMENT ON TABLE scs.sufficiency_evaluation_resolution IS
  'SCS-CAP-06 evaluatedEvidence.appliedResolutionIds: the conflict resolutions an evaluation applied, part of its frozen input. Append-only.';


GRANT SELECT, INSERT ON scs.conflict_resolution TO scs_api;
ALTER TABLE scs.conflict_resolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY conflict_resolution_scs_api_select ON scs.conflict_resolution
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY conflict_resolution_scs_api_insert ON scs.conflict_resolution
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.sufficiency_evaluation_resolution TO scs_api;
ALTER TABLE scs.sufficiency_evaluation_resolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY sufficiency_evaluation_resolution_scs_api_select ON scs.sufficiency_evaluation_resolution
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY sufficiency_evaluation_resolution_scs_api_insert ON scs.sufficiency_evaluation_resolution
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
