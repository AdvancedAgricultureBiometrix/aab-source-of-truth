-- ============================================================================
-- Migration 013 — SCS-CAP-04 deforestation evidence records
--
-- Creates scs.deforestation_evidence_record, _known_gap, _excluded_area and
-- _lineage for the pilot's submitEvidence (contract commit 5c6a263), all
-- append-only for every role, with scs_api SELECT + INSERT grants and RLS
-- policies (rule from migration 004). See packages/db/schema/cap-04.sql for
-- the mapping.
--
-- Also adds UNIQUE (association_id, plot_id, evidence_requirement_spec_id) to
-- scs.plot_framework_association: the target of the record's foreign key, so
-- evidence can only name an association of its own plot, with that
-- association's specification. It cannot fail: association_id is already
-- unique on its own.
--
-- Applied history. Committed migrations are immutable. The CAP-04 statements
-- below are identical to packages/db/schema/cap-04.sql (everything from the
-- first statement onward); the association constraint is identical to
-- schema/cap-03.sql. Requires migrations 001–012.
-- ============================================================================

BEGIN;

-- the target of scs.deforestation_evidence_record's (association, plot,
-- specification) foreign key: evidence names an association together with its
-- plot and the specification recorded on it. Added by migration 013.
ALTER TABLE scs.plot_framework_association
  ADD CONSTRAINT plot_framework_association_plot_spec_uq
    UNIQUE (association_id, plot_id, evidence_requirement_spec_id);

-- ── ScsDeforestationEvidenceRecord ──────────────────────────────────────────
CREATE TABLE scs.deforestation_evidence_record (
  evidence_id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  evidence_version                  integer     NOT NULL,
  schema_version                    text        NOT NULL,

  -- what plot and framework this evidence relates to
  plot_id                           uuid        NOT NULL,
  plot_version                      integer     NOT NULL,
  framework_association_id          uuid        NOT NULL,
  evidence_requirement_spec_id      text        NOT NULL,   -- from the association, never the client

  evidence_type                     text        NOT NULL,

  -- source
  source_id                         text        NOT NULL,
  source_organization_id            text        NOT NULL,   -- issued outside SCS
  source_title                      text,
  source_provider_name              text,
  source_product_name               text,
  source_product_version            text,
  source_reference                  text        NOT NULL,
  source_issuing_authority          text,

  -- provenance and integrity
  submitted_by                      jsonb       NOT NULL,   -- ActorReference
  submitted_at                      timestamptz NOT NULL,
  evidence_object_sha256            text,                   -- the cited SCS-PLATFORM-01 object, if any
  original_object_reference         text        NOT NULL,
  content_digest                    text        NOT NULL,   -- declared by the submitter
  integrity_status                  text        NOT NULL,
  chain_of_custody_complete         boolean     NOT NULL,   -- as declared

  -- spatial coverage (GeoJSON, EPSG:4326)
  coverage_geometry_type            text        NOT NULL,
  coverage_geometry_coordinates     jsonb       NOT NULL,
  coverage_crs                      text        NOT NULL,
  intersection_with_plot            text        NOT NULL,
  plot_coverage_percent             numeric,                -- declared
  spatial_resolution_metres         numeric,
  positional_accuracy_metres        numeric,

  -- temporal coverage — layers 1–3, never merged
  acquisition_instant               timestamptz,
  acquisition_start                 timestamptz,
  acquisition_end                   timestamptz,
  analysis_period_start             timestamptz,
  analysis_period_end               timestamptz,
  attested_period_start             timestamptz,
  attested_period_end               timestamptz,
  coverage_mode                     text        NOT NULL,

  -- analytical method (optional group)
  analysis_method_name              text,
  analysis_method_version           text,
  analysis_analyst_party_id         uuid,                   -- analystOrganizationId: a CAP-02 party
  analysis_detection_target         text,
  analysis_minimum_detectable_change text,
  analysis_cloud_cover_percent      numeric,
  analysis_quality_status           text,

  -- the claim, as stated by the source
  claim_type                        text        NOT NULL,
  claim_summary                     text        NOT NULL,
  claim_period_start                timestamptz,
  claim_period_end                  timestamptz,
  claim_confidence                  text        NOT NULL,
  claim_limitations                 text[]      NOT NULL,   -- the source's own, verbatim

  -- coverage attestation (layer 3), separate from the claim
  attestation_provided              boolean     NOT NULL,
  attestation_attesting_party_id    uuid,                   -- a CAP-02 party
  attestation_attesting_role        text,
  attestation_authority_basis       text,
  attestation_attested_at           timestamptz,
  attestation_declared_start        timestamptz,
  attestation_declared_end          timestamptz,
  attestation_declaration_reference text,

  -- admission (set by the system)
  admission_status                  text        NOT NULL,
  admission_temporal_complete       boolean     NOT NULL,
  admission_spatial_complete        boolean     NOT NULL,
  admission_limitations             text[]      NOT NULL,
  admission_limitation_codes        text[]      NOT NULL,
  admitted_by                       jsonb       NOT NULL,   -- ActorReference
  admitted_at                       timestamptz NOT NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deforestation_evidence_record_pk PRIMARY KEY (evidence_id),
  -- the target of the lineage foreign keys: a link stays within one plot
  CONSTRAINT deforestation_evidence_record_plot_uq UNIQUE (evidence_id, plot_id),

  CONSTRAINT deforestation_evidence_record_plot_fk
    FOREIGN KEY (plot_id) REFERENCES scs.plot (plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the association belongs to this plot, and the specification is the one
  -- recorded on that association
  CONSTRAINT deforestation_evidence_record_association_fk
    FOREIGN KEY (framework_association_id, plot_id, evidence_requirement_spec_id)
    REFERENCES scs.plot_framework_association (association_id, plot_id, evidence_requirement_spec_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT deforestation_evidence_record_object_fk
    FOREIGN KEY (evidence_object_sha256) REFERENCES scs.evidence_object (content_sha256)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT deforestation_evidence_record_analyst_fk
    FOREIGN KEY (analysis_analyst_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT deforestation_evidence_record_attesting_party_fk
    FOREIGN KEY (attestation_attesting_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- enumerations
  CONSTRAINT deforestation_evidence_record_evidence_type_ck
    CHECK (evidence_type IN ('SATELLITE_IMAGE', 'REMOTE_SENSING_ANALYSIS', 'LAND_COVER_DATA_PRODUCT',
                             'FORESTRY_AUTHORITY_CERTIFICATE', 'GOVERNMENT_RECORD', 'FIELD_VERIFICATION',
                             'EXPERT_ASSESSMENT', 'OTHER')),
  CONSTRAINT deforestation_evidence_record_intersection_ck
    CHECK (intersection_with_plot IN ('FULL', 'PARTIAL', 'NONE', 'NOT_VERIFIED')),
  CONSTRAINT deforestation_evidence_record_coverage_mode_ck
    CHECK (coverage_mode IN ('POINT_IN_TIME', 'MULTIPLE_OBSERVATIONS', 'CONTINUOUS_MONITORING',
                             'CHANGE_ANALYSIS', 'AUTHORITY_ATTESTATION')),
  CONSTRAINT deforestation_evidence_record_detection_target_ck
    CHECK (analysis_detection_target IS NULL
        OR analysis_detection_target IN ('DEFORESTATION', 'FOREST_DEGRADATION', 'LAND_COVER_CHANGE',
                                         'TREE_COVER_CHANGE', 'OTHER')),
  CONSTRAINT deforestation_evidence_record_quality_ck
    CHECK (analysis_quality_status IS NULL OR analysis_quality_status IN ('ACCEPTABLE', 'LIMITED', 'UNASSESSED')),
  CONSTRAINT deforestation_evidence_record_claim_type_ck
    CHECK (claim_type IN ('NO_DEFORESTATION_DETECTED', 'POSSIBLE_DEFORESTATION_DETECTED', 'DEFORESTATION_DETECTED',
                          'NO_FOREST_DEGRADATION_DETECTED', 'POSSIBLE_FOREST_DEGRADATION_DETECTED',
                          'FOREST_DEGRADATION_DETECTED', 'INCONCLUSIVE')),
  CONSTRAINT deforestation_evidence_record_confidence_ck
    CHECK (claim_confidence IN ('HIGH', 'MEDIUM', 'LOW', 'NOT_STATED')),

  -- Contract rules for the pilot (commit 5c6a263)
  -- integrity: VERIFIED exactly when a stored object is cited and its digest
  -- is the declared one; FAILED is never recorded (a failed check writes nothing)
  CONSTRAINT deforestation_evidence_record_integrity_ck
    CHECK (integrity_status IN ('VERIFIED', 'UNVERIFIED')
       AND (integrity_status = 'VERIFIED')
         = (evidence_object_sha256 IS NOT NULL AND evidence_object_sha256 = content_digest)),
  CONSTRAINT deforestation_evidence_record_digest_ck
    CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT deforestation_evidence_record_crs_ck
    CHECK (coverage_crs = 'EPSG:4326'),
  CONSTRAINT deforestation_evidence_record_coverage_shape_ck
    CHECK (coverage_geometry_type IN ('POINT', 'POLYGON', 'MULTIPOLYGON')
       AND jsonb_typeof(coverage_geometry_coordinates) = 'array'),
  -- dates: a start is never after its end; a point in time has an instant,
  -- and an instant is not given together with an acquisition start or end
  CONSTRAINT deforestation_evidence_record_periods_ck
    CHECK ((acquisition_start IS NULL OR acquisition_end IS NULL OR acquisition_start <= acquisition_end)
       AND (analysis_period_start IS NULL OR analysis_period_end IS NULL OR analysis_period_start <= analysis_period_end)
       AND (attested_period_start IS NULL OR attested_period_end IS NULL OR attested_period_start <= attested_period_end)
       AND (claim_period_start IS NULL OR claim_period_end IS NULL OR claim_period_start <= claim_period_end)
       AND (attestation_declared_start IS NULL OR attestation_declared_end IS NULL
            OR attestation_declared_start <= attestation_declared_end)),
  CONSTRAINT deforestation_evidence_record_instant_ck
    CHECK ((coverage_mode <> 'POINT_IN_TIME' OR acquisition_instant IS NOT NULL)
       AND (acquisition_instant IS NULL OR (acquisition_start IS NULL AND acquisition_end IS NULL))),
  -- the analytical method is recorded whole or not at all
  CONSTRAINT deforestation_evidence_record_method_group_ck
    CHECK ((analysis_method_name IS NULL) = (analysis_detection_target IS NULL)
       AND (analysis_method_name IS NULL) = (analysis_quality_status IS NULL)
       AND (analysis_method_name IS NOT NULL
            OR (analysis_method_version IS NULL AND analysis_analyst_party_id IS NULL
                AND analysis_minimum_detectable_change IS NULL AND analysis_cloud_cover_percent IS NULL))),
  -- no attestation, no attestation details
  CONSTRAINT deforestation_evidence_record_attestation_group_ck
    CHECK (attestation_provided
        OR (attestation_attesting_party_id IS NULL AND attestation_attesting_role IS NULL
            AND attestation_authority_basis IS NULL AND attestation_attested_at IS NULL
            AND attestation_declared_start IS NULL AND attestation_declared_end IS NULL
            AND attestation_declaration_reference IS NULL)),
  -- outcomes: QUARANTINED only by a later event, REJECTED reserved; with
  -- limitations exactly when a limitation code is recorded
  CONSTRAINT deforestation_evidence_record_status_ck
    CHECK (admission_status IN ('ADMITTED', 'ADMITTED_WITH_LIMITATIONS')
       AND (admission_status = 'ADMITTED_WITH_LIMITATIONS') = (cardinality(admission_limitation_codes) > 0)),
  CONSTRAINT deforestation_evidence_record_limitation_codes_ck
    CHECK (admission_limitation_codes <@ ARRAY['SPATIAL_COVERAGE_NOT_VERIFIED', 'TEMPORAL_COVERAGE_NOT_EVALUATED',
             'INTEGRITY_UNVERIFIED', 'ATTESTATION_EXCEEDS_ANALYSIS', 'PROVENANCE_INCOMPLETE',
             'CHAIN_OF_CUSTODY_INCOMPLETE', 'RESOLUTION_BELOW_REQUIREMENT', 'RECENCY_BELOW_REQUIREMENT',
             'RECENCY_NOT_EVALUATED', 'AUTHORITY_CONFIRMATION_MISSING', 'SOURCE_TYPE_VOCABULARY_UNKNOWN']::text[]
       AND scs.text_array_is_distinct(admission_limitation_codes)),
  -- temporal completeness is never known at admission (the due diligence date
  -- is not known); spatial completeness needs a verified FULL intersection
  CONSTRAINT deforestation_evidence_record_completeness_ck
    CHECK (NOT admission_temporal_complete
       AND (NOT admission_spatial_complete OR intersection_with_plot = 'FULL')),

  -- deliberate — beyond the contract
  CONSTRAINT deforestation_evidence_record_versions_ck
    CHECK (evidence_version >= 1 AND plot_version >= 1),
  CONSTRAINT deforestation_evidence_record_numbers_ck
    CHECK ((plot_coverage_percent IS NULL OR plot_coverage_percent BETWEEN 0 AND 100)
       AND (analysis_cloud_cover_percent IS NULL OR analysis_cloud_cover_percent BETWEEN 0 AND 100)
       AND (spatial_resolution_metres IS NULL OR spatial_resolution_metres > 0)
       AND (positional_accuracy_metres IS NULL OR positional_accuracy_metres >= 0)),
  CONSTRAINT deforestation_evidence_record_actor_refs_ck
    CHECK (jsonb_typeof(submitted_by) = 'object' AND jsonb_typeof(admitted_by) = 'object'),
  CONSTRAINT deforestation_evidence_record_arrays_ck
    CHECK (array_position(claim_limitations, NULL) IS NULL
       AND array_position(admission_limitations, NULL) IS NULL
       AND array_position(admission_limitation_codes, NULL) IS NULL),
  CONSTRAINT deforestation_evidence_record_required_text_ck
    CHECK (btrim(schema_version) <> '' AND btrim(source_id) <> '' AND btrim(source_organization_id) <> ''
       AND btrim(source_reference) <> '' AND btrim(original_object_reference) <> ''
       AND btrim(claim_summary) <> '')
);


-- ── knownGapPeriods — one row per known gap ─────────────────────────────────
CREATE TABLE scs.deforestation_evidence_known_gap (
  known_gap_id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  evidence_id                       uuid        NOT NULL,
  gap_start                         timestamptz NOT NULL,
  gap_end                           timestamptz NOT NULL,
  reason                            text        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deforestation_evidence_known_gap_pk PRIMARY KEY (known_gap_id),
  CONSTRAINT deforestation_evidence_known_gap_evidence_fk
    FOREIGN KEY (evidence_id) REFERENCES scs.deforestation_evidence_record (evidence_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT deforestation_evidence_known_gap_reason_ck
    CHECK (reason IN ('CLOUD_COVER', 'NO_ACQUISITION', 'SENSOR_LIMITATION', 'DATA_UNAVAILABLE',
                      'ANALYSIS_EXCLUDED', 'OTHER')),
  CONSTRAINT deforestation_evidence_known_gap_period_ck
    CHECK (gap_start <= gap_end)
);


-- ── excludedAreas — one row per excluded area, with its GeoJSON geometry ────
CREATE TABLE scs.deforestation_evidence_excluded_area (
  excluded_area_id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  evidence_id                       uuid        NOT NULL,
  geometry_type                     text        NOT NULL,
  geometry_coordinates              jsonb       NOT NULL,
  coordinate_reference_system       text        NOT NULL,
  reason                            text        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deforestation_evidence_excluded_area_pk PRIMARY KEY (excluded_area_id),
  CONSTRAINT deforestation_evidence_excluded_area_evidence_fk
    FOREIGN KEY (evidence_id) REFERENCES scs.deforestation_evidence_record (evidence_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT deforestation_evidence_excluded_area_geometry_ck
    CHECK (geometry_type IN ('POINT', 'POLYGON', 'MULTIPOLYGON')
       AND jsonb_typeof(geometry_coordinates) = 'array'
       AND coordinate_reference_system = 'EPSG:4326'),
  CONSTRAINT deforestation_evidence_excluded_area_reason_ck
    CHECK (btrim(reason) <> '')
);


-- ── lineage — derived from, baseline, comparison ────────────────────────────
-- cited_evidence_id is kept exactly as submitted. linked_evidence_id is set,
-- with a foreign key, only when the cited id is an admitted record for the
-- same plot; otherwise it is NULL and the citing record carries the
-- limitation PROVENANCE_INCOMPLETE (contract 5c6a263: lineage is often
-- established after the fact, so an unresolved citation does not refuse
-- admission).
CREATE TABLE scs.deforestation_evidence_lineage (
  lineage_id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  evidence_id                       uuid        NOT NULL,   -- the citing record
  plot_id                           uuid        NOT NULL,
  lineage_type                      text        NOT NULL,
  cited_evidence_id                 uuid        NOT NULL,   -- as submitted
  linked_evidence_id                uuid,                   -- the cited record, when it exists for this plot
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deforestation_evidence_lineage_pk PRIMARY KEY (lineage_id),
  CONSTRAINT deforestation_evidence_lineage_citing_fk
    FOREIGN KEY (evidence_id, plot_id) REFERENCES scs.deforestation_evidence_record (evidence_id, plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- a resolved link names a record of the same plot
  CONSTRAINT deforestation_evidence_lineage_linked_fk
    FOREIGN KEY (linked_evidence_id, plot_id) REFERENCES scs.deforestation_evidence_record (evidence_id, plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT deforestation_evidence_lineage_type_ck
    CHECK (lineage_type IN ('DERIVED_FROM', 'BASELINE', 'COMPARISON')),
  CONSTRAINT deforestation_evidence_lineage_resolution_ck
    CHECK (linked_evidence_id IS NULL OR linked_evidence_id = cited_evidence_id),
  CONSTRAINT deforestation_evidence_lineage_not_self_ck
    CHECK (cited_evidence_id <> evidence_id),
  CONSTRAINT deforestation_evidence_lineage_uq
    UNIQUE (evidence_id, lineage_type, cited_evidence_id)
);


-- ── Indexes on foreign keys ─────────────────────────────────────────────────
CREATE INDEX deforestation_evidence_record_plot_idx ON scs.deforestation_evidence_record (plot_id);
CREATE INDEX deforestation_evidence_record_association_idx
  ON scs.deforestation_evidence_record (framework_association_id, plot_id, evidence_requirement_spec_id);
CREATE INDEX deforestation_evidence_record_object_idx ON scs.deforestation_evidence_record (evidence_object_sha256);
CREATE INDEX deforestation_evidence_known_gap_evidence_idx ON scs.deforestation_evidence_known_gap (evidence_id);
CREATE INDEX deforestation_evidence_excluded_area_evidence_idx ON scs.deforestation_evidence_excluded_area (evidence_id);
CREATE INDEX deforestation_evidence_lineage_evidence_idx ON scs.deforestation_evidence_lineage (evidence_id, plot_id);
CREATE INDEX deforestation_evidence_lineage_linked_idx ON scs.deforestation_evidence_lineage (linked_evidence_id, plot_id);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER deforestation_evidence_record_append_only
  BEFORE UPDATE OR DELETE ON scs.deforestation_evidence_record
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_record_no_truncate
  BEFORE TRUNCATE ON scs.deforestation_evidence_record
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_known_gap_append_only
  BEFORE UPDATE OR DELETE ON scs.deforestation_evidence_known_gap
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_known_gap_no_truncate
  BEFORE TRUNCATE ON scs.deforestation_evidence_known_gap
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_excluded_area_append_only
  BEFORE UPDATE OR DELETE ON scs.deforestation_evidence_excluded_area
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_excluded_area_no_truncate
  BEFORE TRUNCATE ON scs.deforestation_evidence_excluded_area
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_lineage_append_only
  BEFORE UPDATE OR DELETE ON scs.deforestation_evidence_lineage
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER deforestation_evidence_lineage_no_truncate
  BEFORE TRUNCATE ON scs.deforestation_evidence_lineage
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.deforestation_evidence_record IS
  'SCS-CAP-04 ScsDeforestationEvidenceRecord. Records exactly what the evidence observed, analysed and attested. Admission means trustworthy as a record, not sufficient. Append-only.';
COMMENT ON TABLE scs.deforestation_evidence_known_gap IS
  'SCS-CAP-04 temporalCoverage.knownGapPeriods: one row per known gap. Append-only.';
COMMENT ON TABLE scs.deforestation_evidence_excluded_area IS
  'SCS-CAP-04 spatialCoverage.excludedAreas: one row per excluded area, with its GeoJSON geometry. Append-only.';
COMMENT ON TABLE scs.deforestation_evidence_lineage IS
  'SCS-CAP-04 lineage (derivedFrom, baseline, comparison). cited_evidence_id as submitted; linked_evidence_id only when it resolves to a record of the same plot. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.deforestation_evidence_record TO scs_api;
ALTER TABLE scs.deforestation_evidence_record ENABLE ROW LEVEL SECURITY;
CREATE POLICY deforestation_evidence_record_scs_api_select ON scs.deforestation_evidence_record
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY deforestation_evidence_record_scs_api_insert ON scs.deforestation_evidence_record
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.deforestation_evidence_known_gap TO scs_api;
ALTER TABLE scs.deforestation_evidence_known_gap ENABLE ROW LEVEL SECURITY;
CREATE POLICY deforestation_evidence_known_gap_scs_api_select ON scs.deforestation_evidence_known_gap
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY deforestation_evidence_known_gap_scs_api_insert ON scs.deforestation_evidence_known_gap
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.deforestation_evidence_excluded_area TO scs_api;
ALTER TABLE scs.deforestation_evidence_excluded_area ENABLE ROW LEVEL SECURITY;
CREATE POLICY deforestation_evidence_excluded_area_scs_api_select ON scs.deforestation_evidence_excluded_area
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY deforestation_evidence_excluded_area_scs_api_insert ON scs.deforestation_evidence_excluded_area
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.deforestation_evidence_lineage TO scs_api;
ALTER TABLE scs.deforestation_evidence_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY deforestation_evidence_lineage_scs_api_select ON scs.deforestation_evidence_lineage
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY deforestation_evidence_lineage_scs_api_insert ON scs.deforestation_evidence_lineage
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
