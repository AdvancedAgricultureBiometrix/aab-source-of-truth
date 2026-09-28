-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: manufacturing_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for manufacturing_core: functions 1, tables 4, views 1, sequences 0, rls_enabled_tables 0, constraints 29, triggers 0, policies 0, indexes 9.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE manufacturing_core.manufacturer_access_grant (
  manufacturer_access_grant_id uuid DEFAULT gen_random_uuid() NOT NULL,
  transfer_package_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  destination_manufacturer_id uuid NOT NULL,
  can_view_formula boolean DEFAULT true NOT NULL,
  can_view_process boolean DEFAULT true NOT NULL,
  can_view_quality_requirements boolean DEFAULT true NOT NULL,
  can_view_trial_summary boolean DEFAULT false NOT NULL,
  can_view_mechanism_research boolean DEFAULT false NOT NULL,
  can_download_package boolean DEFAULT true NOT NULL,
  expires_at timestamp with time zone,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone,
  CONSTRAINT manufacturer_access_grant_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT manufacturer_access_grant_destination_manufacturer_id_fkey FOREIGN KEY (destination_manufacturer_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT manufacturer_access_grant_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT manufacturer_access_grant_transfer_package_id_fkey FOREIGN KEY (transfer_package_id) REFERENCES manufacturing_core.transfer_package(transfer_package_id) ON DELETE CASCADE,
  CONSTRAINT manufacturer_access_grant_pkey PRIMARY KEY (manufacturer_access_grant_id),
  CONSTRAINT manufacturer_access_grant_transfer_package_id_actor_id_key UNIQUE (transfer_package_id, actor_id)
);

-- owner: postgres
CREATE TABLE manufacturing_core.manufacturing_batch (
  manufacturing_batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
  transfer_package_id uuid NOT NULL,
  destination_manufacturer_id uuid NOT NULL,
  batch_code text NOT NULL,
  batch_status text DEFAULT 'PLANNED'::text NOT NULL,
  raw_material_lot_trace jsonb DEFAULT '[]'::jsonb NOT NULL,
  process_record jsonb DEFAULT '{}'::jsonb NOT NULL,
  qc_results jsonb DEFAULT '{}'::jsonb NOT NULL,
  deviations jsonb DEFAULT '[]'::jsonb NOT NULL,
  produced_at timestamp with time zone,
  recorded_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT manufacturing_batch_batch_status_check CHECK (batch_status = ANY (ARRAY['PLANNED'::text, 'IN_PRODUCTION'::text, 'QC_HOLD'::text, 'QC_PASSED'::text, 'QC_FAILED'::text, 'RELEASED'::text, 'REJECTED'::text])),
  CONSTRAINT manufacturing_batch_destination_manufacturer_id_fkey FOREIGN KEY (destination_manufacturer_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT manufacturing_batch_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT manufacturing_batch_transfer_package_id_fkey FOREIGN KEY (transfer_package_id) REFERENCES manufacturing_core.transfer_package(transfer_package_id),
  CONSTRAINT manufacturing_batch_pkey PRIMARY KEY (manufacturing_batch_id),
  CONSTRAINT manufacturing_batch_destination_manufacturer_id_batch_code_key UNIQUE (destination_manufacturer_id, batch_code)
);

-- owner: postgres
CREATE TABLE manufacturing_core.transfer_package (
  transfer_package_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  source_organization_id uuid NOT NULL,
  destination_manufacturer_id uuid NOT NULL,
  formulation_version_id uuid NOT NULL,
  transfer_code text NOT NULL,
  package_status text DEFAULT 'DRAFT'::text NOT NULL,
  confidentiality_classification text DEFAULT 'NAMED_ORGANIZATIONS'::text NOT NULL,
  permitted_use text DEFAULT 'MANUFACTURING_EVALUATION'::text NOT NULL,
  access_expires_at timestamp with time zone,
  generated_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  released_by uuid,
  released_at timestamp with time zone,
  CONSTRAINT transfer_package_package_status_check CHECK (package_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'APPROVED_FOR_RELEASE'::text, 'RELEASED'::text, 'ACCEPTED_BY_MANUFACTURER'::text, 'SUPERSEDED'::text, 'CANCELLED'::text])),
  CONSTRAINT transfer_package_permitted_use_check CHECK (permitted_use = ANY (ARRAY['MANUFACTURING_EVALUATION'::text, 'PILOT_MANUFACTURE'::text, 'COMMERCIAL_MANUFACTURE'::text, 'TECH_TRANSFER_ONLY'::text])),
  CONSTRAINT transfer_package_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT transfer_package_confidentiality_classification_fkey FOREIGN KEY (confidentiality_classification) REFERENCES country_core.sharing_classification(sharing_classification_code),
  CONSTRAINT transfer_package_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT transfer_package_destination_manufacturer_id_fkey FOREIGN KEY (destination_manufacturer_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT transfer_package_formulation_version_id_fkey FOREIGN KEY (formulation_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT transfer_package_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT transfer_package_released_by_fkey FOREIGN KEY (released_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT transfer_package_source_organization_id_fkey FOREIGN KEY (source_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT transfer_package_pkey PRIMARY KEY (transfer_package_id),
  CONSTRAINT transfer_package_transfer_code_key UNIQUE (transfer_code)
);
CREATE INDEX ix_transfer_source_dest ON manufacturing_core.transfer_package USING btree (country_workspace_id, source_organization_id, destination_manufacturer_id);

-- owner: postgres
CREATE TABLE manufacturing_core.transfer_section (
  transfer_section_id uuid DEFAULT gen_random_uuid() NOT NULL,
  transfer_package_id uuid NOT NULL,
  section_code text NOT NULL,
  section_name text NOT NULL,
  section_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  visibility text DEFAULT 'MANUFACTURER'::text NOT NULL,
  section_status text DEFAULT 'GENERATED'::text NOT NULL,
  CONSTRAINT transfer_section_section_status_check CHECK (section_status = ANY (ARRAY['GENERATED'::text, 'REVIEW_REQUIRED'::text, 'APPROVED'::text, 'WITHHELD'::text])),
  CONSTRAINT transfer_section_visibility_check CHECK (visibility = ANY (ARRAY['MANUFACTURER'::text, 'SOURCE_ONLY'::text, 'REGULATORY_ONLY'::text])),
  CONSTRAINT transfer_section_transfer_package_id_fkey FOREIGN KEY (transfer_package_id) REFERENCES manufacturing_core.transfer_package(transfer_package_id) ON DELETE CASCADE,
  CONSTRAINT transfer_section_pkey PRIMARY KEY (transfer_section_id),
  CONSTRAINT transfer_section_transfer_package_id_section_code_key UNIQUE (transfer_package_id, section_code)
);
