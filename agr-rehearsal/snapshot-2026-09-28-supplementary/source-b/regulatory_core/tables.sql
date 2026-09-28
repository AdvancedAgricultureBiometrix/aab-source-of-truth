-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: regulatory_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for regulatory_core: functions 4, tables 9, views 1, sequences 0, rls_enabled_tables 0, constraints 40, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE regulatory_core.dossier_evidence_link (
  dossier_evidence_link_id uuid DEFAULT gen_random_uuid() NOT NULL,
  dossier_passport_id uuid NOT NULL,
  evidence_entity_type text NOT NULL,
  evidence_entity_id uuid NOT NULL,
  evidence_role text DEFAULT 'SUPPORTING'::text NOT NULL,
  provenance_summary text NOT NULL,
  sharing_classification_code text NOT NULL,
  added_by uuid,
  added_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT dossier_evidence_link_evidence_role_check CHECK (evidence_role = ANY (ARRAY['PRIMARY'::text, 'SUPPORTING'::text, 'CONTRADICTORY'::text, 'CONTEXT'::text])),
  CONSTRAINT dossier_evidence_link_added_by_fkey FOREIGN KEY (added_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT dossier_evidence_link_dossier_passport_id_fkey FOREIGN KEY (dossier_passport_id) REFERENCES regulatory_core.dossier_passport(dossier_passport_id) ON DELETE CASCADE,
  CONSTRAINT dossier_evidence_link_sharing_classification_code_fkey FOREIGN KEY (sharing_classification_code) REFERENCES country_core.data_sharing_classification(classification_code),
  CONSTRAINT dossier_evidence_link_pkey PRIMARY KEY (dossier_evidence_link_id)
);

-- owner: postgres
CREATE TABLE regulatory_core.dossier_passport (
  dossier_passport_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  passport_code text NOT NULL,
  passport_name text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  product_category text NOT NULL,
  passport_status text DEFAULT 'DRAFT'::text NOT NULL,
  ownership_summary text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT dossier_passport_passport_status_check CHECK (passport_status = ANY (ARRAY['DRAFT'::text, 'ASSEMBLING'::text, 'READY_FOR_ASSESSMENT'::text, 'ACTIVE'::text, 'ARCHIVED'::text])),
  CONSTRAINT dossier_passport_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT dossier_passport_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT dossier_passport_pkey PRIMARY KEY (dossier_passport_id),
  CONSTRAINT dossier_passport_passport_code_key UNIQUE (passport_code)
);

-- owner: postgres
CREATE TABLE regulatory_core.jurisdiction (
  jurisdiction_code text NOT NULL,
  jurisdiction_name text NOT NULL,
  country_code character(2),
  region_code text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT jurisdiction_pkey PRIMARY KEY (jurisdiction_code)
);

-- owner: postgres
CREATE TABLE regulatory_core.regulatory_authority (
  regulatory_authority_id uuid DEFAULT gen_random_uuid() NOT NULL,
  jurisdiction_code text NOT NULL,
  authority_name text NOT NULL,
  authority_type text NOT NULL,
  official_source_url text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT regulatory_authority_jurisdiction_code_fkey FOREIGN KEY (jurisdiction_code) REFERENCES regulatory_core.jurisdiction(jurisdiction_code),
  CONSTRAINT regulatory_authority_pkey PRIMARY KEY (regulatory_authority_id)
);

-- owner: postgres
CREATE TABLE regulatory_core.regulatory_change_event (
  regulatory_change_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  jurisdiction_code text NOT NULL,
  regulatory_source_id uuid,
  change_type text NOT NULL,
  change_summary text NOT NULL,
  detected_at timestamp with time zone DEFAULT now() NOT NULL,
  verified_by uuid,
  verified_at timestamp with time zone,
  CONSTRAINT regulatory_change_event_change_type_check CHECK (change_type = ANY (ARRAY['NEW_REQUIREMENT'::text, 'AMENDED_REQUIREMENT'::text, 'REMOVED_REQUIREMENT'::text, 'SOURCE_SUPERSEDED'::text, 'INTERPRETATION_REVIEW'::text])),
  CONSTRAINT regulatory_change_event_jurisdiction_code_fkey FOREIGN KEY (jurisdiction_code) REFERENCES regulatory_core.jurisdiction(jurisdiction_code),
  CONSTRAINT regulatory_change_event_regulatory_source_id_fkey FOREIGN KEY (regulatory_source_id) REFERENCES regulatory_core.regulatory_source(regulatory_source_id),
  CONSTRAINT regulatory_change_event_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT regulatory_change_event_pkey PRIMARY KEY (regulatory_change_event_id)
);

-- owner: postgres
CREATE TABLE regulatory_core.regulatory_requirement (
  regulatory_requirement_id uuid DEFAULT gen_random_uuid() NOT NULL,
  jurisdiction_code text NOT NULL,
  regulatory_source_id uuid NOT NULL,
  requirement_code text NOT NULL,
  product_category text NOT NULL,
  requirement_category text NOT NULL,
  requirement_title text NOT NULL,
  requirement_description text NOT NULL,
  local_study_required boolean DEFAULT false NOT NULL,
  local_language_required boolean DEFAULT false NOT NULL,
  evidence_type_required text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  effective_from date,
  effective_to date,
  CONSTRAINT regulatory_requirement_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUPERSEDED'::text, 'WITHDRAWN'::text])),
  CONSTRAINT regulatory_requirement_jurisdiction_code_fkey FOREIGN KEY (jurisdiction_code) REFERENCES regulatory_core.jurisdiction(jurisdiction_code),
  CONSTRAINT regulatory_requirement_regulatory_source_id_fkey FOREIGN KEY (regulatory_source_id) REFERENCES regulatory_core.regulatory_source(regulatory_source_id),
  CONSTRAINT regulatory_requirement_pkey PRIMARY KEY (regulatory_requirement_id),
  CONSTRAINT regulatory_requirement_jurisdiction_code_requirement_code_key UNIQUE (jurisdiction_code, requirement_code)
);

-- owner: postgres
CREATE TABLE regulatory_core.regulatory_source (
  regulatory_source_id uuid DEFAULT gen_random_uuid() NOT NULL,
  jurisdiction_code text NOT NULL,
  regulatory_authority_id uuid,
  source_title text NOT NULL,
  source_type text NOT NULL,
  source_reference text NOT NULL,
  effective_from date,
  effective_to date,
  source_version text,
  language_code text,
  verification_status text DEFAULT 'UNVERIFIED'::text NOT NULL,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT regulatory_source_source_type_check CHECK (source_type = ANY (ARRAY['LAW'::text, 'REGULATION'::text, 'GUIDELINE'::text, 'FORM'::text, 'STANDARD'::text, 'MINISTRY_NOTICE'::text, 'OFFICIAL_WEB_SOURCE'::text, 'OTHER'::text])),
  CONSTRAINT regulatory_source_verification_status_check CHECK (verification_status = ANY (ARRAY['UNVERIFIED'::text, 'VERIFIED_CURRENT'::text, 'SUPERSEDED'::text, 'WITHDRAWN'::text])),
  CONSTRAINT regulatory_source_jurisdiction_code_fkey FOREIGN KEY (jurisdiction_code) REFERENCES regulatory_core.jurisdiction(jurisdiction_code),
  CONSTRAINT regulatory_source_regulatory_authority_id_fkey FOREIGN KEY (regulatory_authority_id) REFERENCES regulatory_core.regulatory_authority(regulatory_authority_id),
  CONSTRAINT regulatory_source_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT regulatory_source_pkey PRIMARY KEY (regulatory_source_id)
);

-- owner: postgres
CREATE TABLE regulatory_core.requirement_assessment (
  requirement_assessment_id uuid DEFAULT gen_random_uuid() NOT NULL,
  translation_run_id uuid NOT NULL,
  regulatory_requirement_id uuid NOT NULL,
  assessment_status text NOT NULL,
  matched_evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
  gap_summary text,
  assessment_rationale text NOT NULL,
  assessed_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT requirement_assessment_assessment_status_check CHECK (assessment_status = ANY (ARRAY['COMPLETE'::text, 'PARTIAL'::text, 'MISSING'::text, 'NOT_APPLICABLE'::text, 'CONFLICTED'::text, 'REQUIRES_LOCAL_STUDY'::text, 'REQUIRES_REGULATOR_CONFIRMATION'::text])),
  CONSTRAINT requirement_assessment_regulatory_requirement_id_fkey FOREIGN KEY (regulatory_requirement_id) REFERENCES regulatory_core.regulatory_requirement(regulatory_requirement_id),
  CONSTRAINT requirement_assessment_translation_run_id_fkey FOREIGN KEY (translation_run_id) REFERENCES regulatory_core.translation_run(translation_run_id) ON DELETE CASCADE,
  CONSTRAINT requirement_assessment_pkey PRIMARY KEY (requirement_assessment_id),
  CONSTRAINT requirement_assessment_translation_run_id_regulatory_requir_key UNIQUE (translation_run_id, regulatory_requirement_id)
);

-- owner: postgres
CREATE TABLE regulatory_core.translation_run (
  translation_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  dossier_passport_id uuid NOT NULL,
  destination_jurisdiction_code text NOT NULL,
  run_status text DEFAULT 'RUNNING'::text NOT NULL,
  rules_effective_at timestamp with time zone DEFAULT now() NOT NULL,
  readiness_percent numeric,
  reusable_requirements integer DEFAULT 0 NOT NULL,
  partial_requirements integer DEFAULT 0 NOT NULL,
  missing_requirements integer DEFAULT 0 NOT NULL,
  local_study_requirements integer DEFAULT 0 NOT NULL,
  regulator_confirmation_requirements integer DEFAULT 0 NOT NULL,
  assessment_summary text,
  initiated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT translation_run_readiness_percent_check CHECK (readiness_percent >= 0::numeric AND readiness_percent <= 100::numeric),
  CONSTRAINT translation_run_run_status_check CHECK (run_status = ANY (ARRAY['RUNNING'::text, 'COMPLETE'::text, 'BLOCKED'::text, 'FAILED'::text])),
  CONSTRAINT translation_run_destination_jurisdiction_code_fkey FOREIGN KEY (destination_jurisdiction_code) REFERENCES regulatory_core.jurisdiction(jurisdiction_code),
  CONSTRAINT translation_run_dossier_passport_id_fkey FOREIGN KEY (dossier_passport_id) REFERENCES regulatory_core.dossier_passport(dossier_passport_id),
  CONSTRAINT translation_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT translation_run_pkey PRIMARY KEY (translation_run_id)
);
