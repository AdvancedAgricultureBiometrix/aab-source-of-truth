-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: public. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for public: functions 35, tables 3, views 0, rls_enabled_tables 3, constraints 23, triggers 1, policies 0, indexes 10.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE public.aab_country_participation_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reference text NOT NULL,
  applicant_user_id uuid NOT NULL,
  country_name text NOT NULL,
  jurisdiction_level text NOT NULL,
  jurisdiction_name text,
  organisation_name text NOT NULL,
  applicant_name text NOT NULL,
  official_position text NOT NULL,
  official_email text NOT NULL,
  official_website text,
  applicant_capacity text NOT NULL,
  domains text[] NOT NULL,
  proposed_purpose text NOT NULL,
  supporting_information text,
  authority_declared boolean NOT NULL,
  email_verified boolean DEFAULT false NOT NULL,
  review_status text DEFAULT 'PENDING_REVIEW'::text NOT NULL,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  review_notes text,
  organisation_type text,
  position_category text,
  CONSTRAINT aab_country_request_authority_check CHECK (authority_declared IS TRUE),
  CONSTRAINT aab_country_request_domains_check CHECK (cardinality(domains) >= 1 AND cardinality(domains) <= 7),
  CONSTRAINT aab_country_request_level_check CHECK (jurisdiction_level = ANY (ARRAY['National'::text, 'State'::text, 'Province'::text, 'Territory'::text, 'Other government jurisdiction'::text])),
  CONSTRAINT aab_country_request_status_check CHECK (review_status = ANY (ARRAY['PENDING_REVIEW'::text, 'MORE_INFORMATION_REQUIRED'::text, 'APPROVED'::text, 'DECLINED'::text, 'WITHDRAWN'::text])),
  CONSTRAINT aab_country_participation_requests_applicant_user_id_fkey FOREIGN KEY (applicant_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT aab_country_participation_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT aab_country_participation_requests_pkey PRIMARY KEY (id),
  CONSTRAINT aab_country_participation_requests_reference_key UNIQUE (reference)
);
CREATE INDEX aab_country_participation_requests_status_idx ON public.aab_country_participation_requests USING btree (review_status, submitted_at DESC);
CREATE INDEX aab_country_participation_requests_user_idx ON public.aab_country_participation_requests USING btree (applicant_user_id, submitted_at DESC);
COMMENT ON TABLE public.aab_country_participation_requests IS 'Verified applications only. Records requests for AAB administrative review; creates no role, country, jurisdiction or provisioning authority.';

-- owner: postgres
CREATE TABLE public.aab_spatial_investigation_area (
  spatial_investigation_area_id uuid DEFAULT gen_random_uuid() NOT NULL,
  area_code text NOT NULL,
  owner_key_hash text NOT NULL,
  country_workspace_id uuid NOT NULL,
  jurisdiction_code text NOT NULL,
  area_name text NOT NULL,
  area_mode text NOT NULL,
  geometry_geojson jsonb NOT NULL,
  map_geometry jsonb NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  created_by_label text DEFAULT 'Head user'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_at timestamp with time zone,
  CONSTRAINT aab_spatial_investigation_area_area_mode_check CHECK (area_mode = ANY (ARRAY['STATE'::text, 'REGION'::text, 'CUSTOM'::text])),
  CONSTRAINT aab_spatial_investigation_area_area_name_check CHECK (length(btrim(area_name)) >= 3 AND length(btrim(area_name)) <= 120),
  CONSTRAINT aab_spatial_investigation_area_geometry_geojson_check CHECK (jsonb_typeof(geometry_geojson) = 'object'::text),
  CONSTRAINT aab_spatial_investigation_area_jurisdiction_code_check CHECK (jurisdiction_code = 'AU-WA'::text),
  CONSTRAINT aab_spatial_investigation_area_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'ARCHIVED'::text])),
  CONSTRAINT aab_spatial_investigation_area_map_geometry_check CHECK (jsonb_typeof(map_geometry) = 'array'::text),
  CONSTRAINT aab_spatial_investigation_area_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT aab_spatial_investigation_area_pkey PRIMARY KEY (spatial_investigation_area_id),
  CONSTRAINT aab_spatial_investigation_area_area_code_key UNIQUE (area_code)
);
CREATE INDEX aab_spatial_investigation_area_owner_idx ON public.aab_spatial_investigation_area USING btree (owner_key_hash, jurisdiction_code, created_at DESC);

-- owner: postgres
CREATE TABLE public.aab_spatial_investigation_run (
  spatial_investigation_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  spatial_investigation_area_id uuid NOT NULL,
  run_number integer NOT NULL,
  run_status text DEFAULT 'QUEUED'::text NOT NULL,
  source_name text,
  scene_id text,
  acquired_at timestamp with time zone,
  observation jsonb DEFAULT '{}'::jsonb NOT NULL,
  change_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  evidence_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
  knowledge_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
  candidate_links jsonb DEFAULT '[]'::jsonb NOT NULL,
  formulation_eligible boolean DEFAULT false NOT NULL,
  method_version text,
  error_message text,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT aab_spatial_investigation_run_formulation_eligible_check CHECK (formulation_eligible IS FALSE),
  CONSTRAINT aab_spatial_investigation_run_run_number_check CHECK (run_number >= 1),
  CONSTRAINT aab_spatial_investigation_run_run_status_check CHECK (run_status = ANY (ARRAY['QUEUED'::text, 'PROCESSING'::text, 'COMPUTED_UNVALIDATED'::text, 'FAILED'::text, 'REVIEWED'::text, 'REJECTED'::text])),
  CONSTRAINT aab_spatial_investigation_run_spatial_investigation_area_i_fkey FOREIGN KEY (spatial_investigation_area_id) REFERENCES aab_spatial_investigation_area(spatial_investigation_area_id) ON DELETE CASCADE,
  CONSTRAINT aab_spatial_investigation_run_pkey PRIMARY KEY (spatial_investigation_run_id),
  CONSTRAINT aab_spatial_investigation_run_spatial_investigation_area_id_key UNIQUE (spatial_investigation_area_id, run_number)
);
CREATE INDEX aab_spatial_investigation_run_area_idx ON public.aab_spatial_investigation_run USING btree (spatial_investigation_area_id, run_number DESC);
