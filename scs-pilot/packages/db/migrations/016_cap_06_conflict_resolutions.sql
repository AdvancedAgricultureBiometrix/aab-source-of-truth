-- ============================================================================
-- Migration 016 — SCS-CAP-06 conflict resolutions
--
-- Creates scs.conflict_resolution (a human resolution of one conflict key,
-- recorded once) and scs.sufficiency_evaluation_resolution (the resolutions
-- an evaluation applied: part of its frozen input) for the pilot's
-- submitConflictResolution (contract commit e0b7634), both append-only for
-- every role, with scs_api SELECT + INSERT grants and RLS policies (rule from
-- migration 004), and the trigger that requires the conflict to have been
-- reported under its key in the named evaluation. See
-- packages/db/schema/cap-06.sql ("Conflict resolutions") for the mapping.
--
-- Applied history. Committed migrations are immutable. The statements below
-- are identical to the "Conflict resolutions" section of
-- packages/db/schema/cap-06.sql (from its first statement onward). Requires
-- migrations 001–015.
-- ============================================================================

BEGIN;

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

COMMIT;
