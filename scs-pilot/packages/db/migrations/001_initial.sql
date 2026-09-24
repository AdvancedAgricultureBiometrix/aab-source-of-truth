-- ============================================================================
-- Migration 001 — initial schema: SCS-CAP-01 regulatory framework table only
--
-- Applied history. Never edit after it has been applied anywhere; add a new
-- numbered migration instead. The DDL below is identical to
-- packages/db/schema/cap-01.sql at the time this migration was written.
--
-- TODO(migration-runner): no migration runner or migrations-applied table yet.
--   In local development docker-compose mounts this directory into the
--   postgres image's /docker-entrypoint-initdb.d, which runs it once on an
--   empty data volume only.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS scs;

CREATE TABLE scs.regulatory_framework (

  -- ── Canonical identity ────────────────────────────────────────────────────
  framework_id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                text        NOT NULL,
  registered_at                 timestamptz NOT NULL,
  registered_by                 jsonb       NOT NULL,   -- ActorReference
  status                        text        NOT NULL,

  -- ── regulation: what this framework governs ───────────────────────────────
  regulation_id                 text        NOT NULL,
  regulation_name               text        NOT NULL,
  regulation_version            text        NOT NULL,
  regulation_date               date        NOT NULL,
  regulatory_authority          text        NOT NULL,
  regulation_source_reference   text        NOT NULL,

  -- ── scope: specific scope ─────────────────────────────────────────────────
  commodity_code                text        NOT NULL,
  commodity_name                text        NOT NULL,
  country_of_origin             text        NOT NULL,
  destination_market            text        NOT NULL,
  applicable_national_laws      text[]      NOT NULL,
  effective_from                date        NOT NULL,
  effective_to                  date,                   -- optional in contract

  -- ── evidenceRequirements: ScsEvidenceRequirementSpec ──────────────────────
  -- generated at registration, immutable thereafter (see TODO(immutability))
  evidence_spec_id                          text        NOT NULL,
  evidence_spec_generated_at                timestamptz NOT NULL,
  evidence_spec_generated_from_version      text        NOT NULL,

  --   deforestationEvidence
  deforestation_reference_cutoff_date       date        NOT NULL,
  deforestation_required_coverage_type      text        NOT NULL,
  deforestation_accepted_source_types       text[]      NOT NULL,
  deforestation_minimum_resolution_metres   numeric,                -- optional
  deforestation_minimum_recency_days        integer,                -- optional
  deforestation_integrity_requirement       text        NOT NULL,
  deforestation_authority_confirmation_required boolean NOT NULL,

  --   custodyEvidence
  custody_required_document_types           text[]      NOT NULL,
  custody_chain_of_custody_standards        text[]      NOT NULL,
  custody_traceability_depth                text        NOT NULL,

  --   plotRequirements
  plot_geolocation_required                 boolean     NOT NULL,
  plot_land_registry_required               boolean     NOT NULL,
  plot_minimum_identifier_type              text        NOT NULL,
  plot_ownership_verification_required      boolean     NOT NULL,

  --   sufficiencyThreshold
  sufficiency_all_plots_registered                      boolean NOT NULL,
  sufficiency_all_plots_have_deforestation_evidence     boolean NOT NULL,
  sufficiency_custody_chain_complete                    boolean NOT NULL,
  sufficiency_no_unresolved_gaps                        boolean NOT NULL,
  sufficiency_human_review_completed                    boolean NOT NULL,

  --   specLimitations — honest disclosure of what this spec cannot determine
  evidence_spec_limitations                 text[]      NOT NULL,

  -- ── versionHistory: ScsFrameworkVersion[] ─────────────────────────────────
  -- append-only, never deleted (see TODO(append-only))
  version_history               jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- ── Row bookkeeping (not part of the contract record) ─────────────────────
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),

  -- ── Keys ──────────────────────────────────────────────────────────────────
  CONSTRAINT regulatory_framework_pk
    PRIMARY KEY (framework_id),
  CONSTRAINT regulatory_framework_evidence_spec_id_uq
    UNIQUE (evidence_spec_id),

  -- ── Contract enumerations ─────────────────────────────────────────────────
  CONSTRAINT regulatory_framework_status_ck
    CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'WITHDRAWN')),
  CONSTRAINT regulatory_framework_coverage_type_ck
    CHECK (deforestation_required_coverage_type IN
           ('FULL_PLOT_COVERAGE', 'REPRESENTATIVE_SAMPLE', 'RISK_BASED')),
  CONSTRAINT regulatory_framework_integrity_requirement_ck
    CHECK (deforestation_integrity_requirement IN ('VERIFIED', 'VERIFIABLE')),
  CONSTRAINT regulatory_framework_traceability_depth_ck
    CHECK (custody_traceability_depth IN
           ('FIRST_SUPPLIER', 'FULL_CHAIN', 'RISK_PROPORTIONATE')),

  -- ── Required text is not blank ────────────────────────────────────────────
  CONSTRAINT regulatory_framework_required_text_not_blank_ck
    CHECK (
          btrim(schema_version)                        <> ''
      AND btrim(regulation_id)                         <> ''
      AND btrim(regulation_name)                       <> ''
      AND btrim(regulation_version)                    <> ''
      AND btrim(regulatory_authority)                  <> ''
      AND btrim(regulation_source_reference)           <> ''
      AND btrim(commodity_code)                        <> ''
      AND btrim(commodity_name)                        <> ''
      AND btrim(country_of_origin)                     <> ''
      AND btrim(destination_market)                    <> ''
      AND btrim(evidence_spec_id)                      <> ''
      AND btrim(evidence_spec_generated_from_version)  <> ''
      AND btrim(plot_minimum_identifier_type)          <> ''
    ),

  -- ── Arrays: present, and no NULL elements ─────────────────────────────────
  CONSTRAINT regulatory_framework_arrays_no_null_elements_ck
    CHECK (
          array_position(applicable_national_laws, NULL)            IS NULL
      AND array_position(deforestation_accepted_source_types, NULL) IS NULL
      AND array_position(custody_required_document_types, NULL)     IS NULL
      AND array_position(custody_chain_of_custody_standards, NULL)  IS NULL
      AND array_position(evidence_spec_limitations, NULL)           IS NULL
    ),

  -- ── JSON shape ────────────────────────────────────────────────────────────
  CONSTRAINT regulatory_framework_registered_by_object_ck
    CHECK (jsonb_typeof(registered_by) = 'object'),
  CONSTRAINT regulatory_framework_version_history_array_ck
    CHECK (jsonb_typeof(version_history) = 'array'),

  -- ── Value sanity — not stated in the contract, kept deliberately: database
  --    constraints are the last line of defence against real data errors ───
  CONSTRAINT regulatory_framework_effective_range_ck
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT regulatory_framework_min_resolution_positive_ck
    CHECK (deforestation_minimum_resolution_metres IS NULL
           OR deforestation_minimum_resolution_metres > 0),
  CONSTRAINT regulatory_framework_min_recency_non_negative_ck
    CHECK (deforestation_minimum_recency_days IS NULL
           OR deforestation_minimum_recency_days >= 0),
  CONSTRAINT regulatory_framework_updated_after_created_ck
    CHECK (updated_at >= created_at)
);

COMMENT ON TABLE scs.regulatory_framework IS
  'SCS-CAP-01 ScsRegulatoryFramework. Contract: governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md. PROPOSED_NOT_ADMITTED — scaffold only; no roles, RLS, immutability or append-only enforcement yet.';
COMMENT ON COLUMN scs.regulatory_framework.registered_by IS
  'ActorReference as a JSON object. Referenced but not defined in the CAP-01 contract; shared type recurring in CAP-02, CAP-05 and CAP-06 — needs a proper shared definition.';
COMMENT ON COLUMN scs.regulatory_framework.version_history IS
  'ScsFrameworkVersion[] as a JSON array. Contract: append-only, never deleted — not yet enforced.';

-- updated_at is maintained by the database, not by callers.
CREATE OR REPLACE FUNCTION scs.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER regulatory_framework_set_updated_at
  BEFORE UPDATE ON scs.regulatory_framework
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();

COMMIT;
