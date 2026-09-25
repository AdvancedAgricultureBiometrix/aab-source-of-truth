-- ============================================================================
-- SCS-CAP-03 — Plot and Land Unit Registration — table definitions
--
-- Implements the records from
--   governance/workstream-b/SCS-CAP-03-PLOT-AND-LAND-UNIT-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md
-- as settled for the pilot (commits 2151321 and 53197df):
--
--   ScsPlotRegistration               → scs.plot
--     .identityEvidence.supportingEvidenceIds → scs.plot.supporting_evidence_ids
--   ScsPlotTenureClaim                → scs.plot_tenure_claim
--   ScsPlotFrameworkAssociation       → scs.plot_framework_association
--
-- Current-state reference for the CAP-03 tables. Migration 011 is generated
-- from this file (everything from the first statement onward) and must
-- produce exactly this definition. Requires cap-01.sql (scs.regulatory_framework,
-- scs.set_updated_at), cap-02.sql (scs.party_identity), platform.sql and
-- roles-rls.sql (role scs_api).
--
-- Mapping rules are those of cap-02.sql (uuid keys; external identifiers text;
-- …At → timestamptz; string[] → text[]/uuid[] NOT NULL without NULL elements;
-- optional → nullable; unions → CHECK; ≤ 63-character names), plus:
--   * geometry → geometry_type + geometry_coordinates (jsonb: the GeoJSON
--     coordinates member, RFC 7946) + coordinate_reference_system
--     ('EPSG:4326' only). TODO(postgis): no spatial type yet. The application
--     validates the geometry; the database checks only its shape (a JSON
--     array) and the type/area rules. When PostGIS is adopted, a geometry
--     column replaces the jsonb and validity, area and overlap move here.
--   * optional string[] (administrativeAreas) → nullable text[].
--
-- Deletion: every foreign key is ON DELETE RESTRICT / ON UPDATE RESTRICT.
--
-- NOT YET IMPLEMENTED
--   TODO(postgis): see above. overlap_state is NOT_EVALUATED for every pilot
--                plot; no overlap or duplicate-geometry detection.
--   TODO(country-boundary-check): the geometry is not checked to lie inside
--                country_code.
--   TODO(evidence): evidence ids are stored as uuid without a foreign key.
--   TODO(actor-reference): ActorReference stored as a jsonb object.
-- ============================================================================


-- ── ScsPlotRegistration ─────────────────────────────────────────────────────
CREATE TABLE scs.plot (
  plot_id                           uuid        NOT NULL DEFAULT gen_random_uuid(),
  plot_version                      integer     NOT NULL,
  schema_version                    text        NOT NULL,
  registered_at                     timestamptz NOT NULL,
  registered_by                     jsonb       NOT NULL,   -- ActorReference
  registration_status               text        NOT NULL,

  plot_name                         text,                   -- optional
  country_code                      text        NOT NULL,   -- ISO 3166-1 alpha-2
  administrative_areas              text[],                 -- optional

  -- geometry — GeoJSON (RFC 7946), EPSG:4326
  geometry_type                     text        NOT NULL,
  geometry_coordinates              jsonb       NOT NULL,   -- the GeoJSON coordinates member
  coordinate_reference_system       text        NOT NULL,
  area_hectares                     numeric,                -- declared, not computed
  capture_method                    text        NOT NULL,
  positional_accuracy_metres        numeric,                -- optional
  boundary_uncertainty_description  text,                   -- optional
  captured_at                       timestamptz,            -- optional

  -- identityEvidence
  registry_reference                text,                   -- optional
  registry_authority                text,                   -- optional
  registry_verification_status      text        NOT NULL,   -- declared by the registrant
  supporting_evidence_ids           uuid[]      NOT NULL,   -- no FK: TODO(evidence)
  evidence_limitations              text[]      NOT NULL,

  overlap_state                     text        NOT NULL,

  -- provenance
  provenance_submitted_by           jsonb       NOT NULL,   -- ActorReference
  provenance_submitting_organization_id text,               -- optional; issued outside SCS
  provenance_source_type            text        NOT NULL,
  provenance_recorded_at            timestamptz NOT NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT plot_pk PRIMARY KEY (plot_id),

  CONSTRAINT plot_registration_status_ck
    CHECK (registration_status IN ('REGISTERED', 'REGISTERED_WITH_GAPS', 'REQUIRES_HUMAN_REVIEW',
                                   'DISPUTED', 'RETIRED')),
  CONSTRAINT plot_geometry_type_ck
    CHECK (geometry_type IN ('POINT', 'POLYGON', 'MULTIPOLYGON')),
  CONSTRAINT plot_capture_method_ck
    CHECK (capture_method IN ('FORMAL_CADASTRAL_SURVEY', 'GOVERNMENT_REGISTRY_GEOMETRY',
                              'PROFESSIONAL_SURVEY', 'PHONE_GPS', 'COMMUNITY_MAPPING',
                              'COOPERATIVE_MAPPING', 'REMOTE_SENSING_DERIVATION', 'OTHER')),
  CONSTRAINT plot_registry_verification_status_ck
    CHECK (registry_verification_status IN ('VERIFIED', 'UNVERIFIED', 'CONFLICTING',
                                            'REGISTRY_UNAVAILABLE', 'NOT_APPLICABLE')),
  CONSTRAINT plot_overlap_state_ck
    CHECK (overlap_state IN ('NO_KNOWN_OVERLAP', 'POSSIBLE_OVERLAP', 'CONFIRMED_OVERLAP',
                             'NOT_EVALUATED')),
  CONSTRAINT plot_actor_refs_object_ck
    CHECK (jsonb_typeof(registered_by) = 'object' AND jsonb_typeof(provenance_submitted_by) = 'object'),
  CONSTRAINT plot_arrays_no_null_elements_ck
    CHECK (array_position(supporting_evidence_ids, NULL) IS NULL
       AND array_position(evidence_limitations, NULL) IS NULL
       AND (administrative_areas IS NULL OR array_position(administrative_areas, NULL) IS NULL)),

  -- Contract rules for the pilot (commit 2151321)
  CONSTRAINT plot_crs_ck
    CHECK (coordinate_reference_system = 'EPSG:4326'),
  CONSTRAINT plot_coordinates_array_ck
    CHECK (jsonb_typeof(geometry_coordinates) = 'array'),
  -- polygons declare their area; a point, if it declares one, is at most
  -- 4 hectares (EUDR Article 2(28))
  CONSTRAINT plot_area_rule_ck
    CHECK ((geometry_type = 'POINT' AND (area_hectares IS NULL OR area_hectares <= 4))
        OR (geometry_type <> 'POINT' AND area_hectares IS NOT NULL)),
  CONSTRAINT plot_registry_reference_ck
    CHECK (registry_verification_status = 'NOT_APPLICABLE' OR registry_reference IS NOT NULL),

  -- deliberate — beyond the contract
  CONSTRAINT plot_version_positive_ck
    CHECK (plot_version >= 1),
  CONSTRAINT plot_country_code_format_ck
    CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT plot_numbers_positive_ck
    CHECK ((area_hectares IS NULL OR area_hectares > 0)
       AND (positional_accuracy_metres IS NULL OR positional_accuracy_metres >= 0)),
  CONSTRAINT plot_required_text_not_blank_ck
    CHECK (btrim(schema_version) <> '' AND btrim(provenance_source_type) <> ''),
  CONSTRAINT plot_optional_text_not_blank_ck
    CHECK ((plot_name IS NULL OR btrim(plot_name) <> '')
       AND (boundary_uncertainty_description IS NULL OR btrim(boundary_uncertainty_description) <> '')
       AND (registry_reference IS NULL OR btrim(registry_reference) <> '')
       AND (registry_authority IS NULL OR btrim(registry_authority) <> '')
       AND (provenance_submitting_organization_id IS NULL
            OR btrim(provenance_submitting_organization_id) <> '')),
  CONSTRAINT plot_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── ScsPlotTenureClaim — separate from plot registration ────────────────────
CREATE TABLE scs.plot_tenure_claim (
  tenure_claim_id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  plot_id                           uuid        NOT NULL,
  plot_version                      integer     NOT NULL,

  claimant_type                     text        NOT NULL,   -- declared, not derived from the party
  claimant_party_id                 uuid        NOT NULL,   -- claimantId: a CAP-02 partyId
  tenure_basis                      text        NOT NULL,
  evidence_ids                      uuid[]      NOT NULL,   -- no FK: TODO(evidence)
  verification_status               text        NOT NULL,

  valid_from                        timestamptz,            -- optional
  valid_until                       timestamptz,            -- optional
  limitations                       text[]      NOT NULL,

  recorded_at                       timestamptz NOT NULL,
  recorded_by                       jsonb       NOT NULL,   -- ActorReference

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT plot_tenure_claim_pk PRIMARY KEY (tenure_claim_id),
  CONSTRAINT plot_tenure_claim_plot_fk
    FOREIGN KEY (plot_id) REFERENCES scs.plot (plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT plot_tenure_claim_claimant_fk
    FOREIGN KEY (claimant_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  CONSTRAINT plot_tenure_claim_claimant_type_ck
    CHECK (claimant_type IN ('INDIVIDUAL', 'ORGANIZATION', 'COOPERATIVE', 'COMMUNITY',
                             'GOVERNMENT', 'OTHER')),
  CONSTRAINT plot_tenure_claim_tenure_basis_ck
    CHECK (tenure_basis IN ('FORMAL_TITLE', 'LEASE', 'PERMIT', 'CUSTOMARY_COLLECTIVE_RIGHT',
                            'CUSTOMARY_INDIVIDUAL_RIGHT', 'COMMUNITY_ATTESTATION',
                            'OCCUPANCY_OR_USE_CLAIM', 'UNKNOWN')),
  CONSTRAINT plot_tenure_claim_verification_status_ck
    CHECK (verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING',
                                   'AUTHORITY_UNAVAILABLE')),
  CONSTRAINT plot_tenure_claim_actor_ref_object_ck
    CHECK (jsonb_typeof(recorded_by) = 'object'),
  CONSTRAINT plot_tenure_claim_arrays_no_null_elements_ck
    CHECK (array_position(evidence_ids, NULL) IS NULL AND array_position(limitations, NULL) IS NULL),

  -- deliberate — beyond the contract
  CONSTRAINT plot_tenure_claim_version_positive_ck
    CHECK (plot_version >= 1),
  CONSTRAINT plot_tenure_claim_validity_range_ck
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT plot_tenure_claim_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── ScsPlotFrameworkAssociation — many-to-many, versioned ───────────────────
CREATE TABLE scs.plot_framework_association (
  association_id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  plot_id                           uuid        NOT NULL,
  framework_id                      uuid        NOT NULL,   -- a CAP-01 frameworkId
  framework_version                 text        NOT NULL,   -- the framework's regulationVersion
  commodity_code                    text        NOT NULL,   -- required; the framework's commodityCode
  producer_or_operator_party_id     uuid,                   -- producerOrOperatorId: optional CAP-02 partyId

  applicability_status              text        NOT NULL,
  associated_at                     timestamptz NOT NULL,
  associated_by                     jsonb       NOT NULL,   -- ActorReference
  association_reason                text        NOT NULL,

  effective_from                    timestamptz,            -- optional
  effective_until                   timestamptz,            -- optional

  -- the exact evidence requirement specification in force at association
  evidence_requirement_spec_id      text        NOT NULL,

  lifecycle_status                  text        NOT NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT plot_framework_association_pk PRIMARY KEY (association_id),
  -- the target of scs.deforestation_evidence_record's (association, plot,
  -- specification) foreign key: evidence names an association together with
  -- its plot and the specification recorded on it. Added by migration 013.
  CONSTRAINT plot_framework_association_plot_spec_uq
    UNIQUE (association_id, plot_id, evidence_requirement_spec_id),
  CONSTRAINT plot_framework_association_plot_fk
    FOREIGN KEY (plot_id) REFERENCES scs.plot (plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the specification must be the one registered with this framework
  CONSTRAINT plot_framework_association_framework_spec_fk
    FOREIGN KEY (framework_id, evidence_requirement_spec_id)
    REFERENCES scs.regulatory_framework (framework_id, evidence_spec_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT plot_framework_association_producer_fk
    FOREIGN KEY (producer_or_operator_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  CONSTRAINT plot_framework_association_applicability_ck
    CHECK (applicability_status IN ('POTENTIALLY_APPLICABLE', 'APPLICABLE', 'NOT_APPLICABLE',
                                    'REQUIRES_HUMAN_DECISION')),
  CONSTRAINT plot_framework_association_lifecycle_ck
    CHECK (lifecycle_status IN ('ACTIVE', 'SUPERSEDED', 'WITHDRAWN')),
  CONSTRAINT plot_framework_association_actor_ref_object_ck
    CHECK (jsonb_typeof(associated_by) = 'object'),

  -- deliberate — beyond the contract
  CONSTRAINT plot_framework_association_required_text_not_blank_ck
    CHECK (btrim(framework_version) <> '' AND btrim(commodity_code) <> ''
       AND btrim(association_reason) <> ''),
  CONSTRAINT plot_framework_association_effective_range_ck
    CHECK (effective_from IS NULL OR effective_until IS NULL OR effective_until > effective_from),
  CONSTRAINT plot_framework_association_updated_after_created_ck
    CHECK (updated_at >= created_at)
);

-- a plot has at most one ACTIVE association with a framework (a framework has
-- one commodity; the contract lets each framework appear once per request)
CREATE UNIQUE INDEX plot_framework_association_active_uq
  ON scs.plot_framework_association (plot_id, framework_id)
  WHERE lifecycle_status = 'ACTIVE';


-- ── Indexes on foreign keys ─────────────────────────────────────────────────
CREATE INDEX plot_tenure_claim_plot_idx               ON scs.plot_tenure_claim (plot_id);
CREATE INDEX plot_tenure_claim_claimant_idx           ON scs.plot_tenure_claim (claimant_party_id);
CREATE INDEX plot_framework_association_framework_idx ON scs.plot_framework_association (framework_id, evidence_requirement_spec_id);
CREATE INDEX plot_framework_association_producer_idx  ON scs.plot_framework_association (producer_or_operator_party_id);


-- ── updated_at maintained by the database (function from cap-01.sql) ───────
CREATE TRIGGER plot_set_updated_at
  BEFORE UPDATE ON scs.plot
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER plot_tenure_claim_set_updated_at
  BEFORE UPDATE ON scs.plot_tenure_claim
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER plot_framework_association_set_updated_at
  BEFORE UPDATE ON scs.plot_framework_association
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();


COMMENT ON TABLE scs.plot IS
  'SCS-CAP-03 ScsPlotRegistration. A plot is a place. REGISTERED verifies no title, tenure, boundary, compliance or eligibility. Overlap NOT_EVALUATED in the pilot (no PostGIS).';
COMMENT ON TABLE scs.plot_tenure_claim IS
  'SCS-CAP-03 ScsPlotTenureClaim. Several claims per plot; SCS records them without deciding which is legally correct. Claimant is a CAP-02 party.';
COMMENT ON TABLE scs.plot_framework_association IS
  'SCS-CAP-03 ScsPlotFrameworkAssociation. Why a plot is assessed, under which exact framework version and evidence requirement specification.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.plot TO scs_api;
ALTER TABLE scs.plot ENABLE ROW LEVEL SECURITY;
CREATE POLICY plot_scs_api_select ON scs.plot
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY plot_scs_api_insert ON scs.plot
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.plot_tenure_claim TO scs_api;
ALTER TABLE scs.plot_tenure_claim ENABLE ROW LEVEL SECURITY;
CREATE POLICY plot_tenure_claim_scs_api_select ON scs.plot_tenure_claim
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY plot_tenure_claim_scs_api_insert ON scs.plot_tenure_claim
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.plot_framework_association TO scs_api;
ALTER TABLE scs.plot_framework_association ENABLE ROW LEVEL SECURITY;
CREATE POLICY plot_framework_association_scs_api_select ON scs.plot_framework_association
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY plot_framework_association_scs_api_insert ON scs.plot_framework_association
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
