-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: observation_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for observation_core: functions 22, tables 10, views 9, sequences 0, rls_enabled_tables 0, constraints 71, triggers 0, policies 0, indexes 28.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE observation_core.campaign (
  campaign_id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_code text NOT NULL,
  campaign_name text NOT NULL,
  country_code character(2),
  primary_domain_code text NOT NULL,
  supporting_domain_codes text[] DEFAULT '{}'::text[] NOT NULL,
  campaign_question text NOT NULL,
  purpose text NOT NULL,
  target_locations jsonb DEFAULT '[]'::jsonb NOT NULL,
  required_observations jsonb DEFAULT '[]'::jsonb NOT NULL,
  participant_source_modes text[] DEFAULT ARRAY['SCIENTIST'::text, 'FIELD_TECHNICIAN'::text] NOT NULL,
  photo_policy text DEFAULT 'REQUIRED'::text NOT NULL,
  start_date date,
  end_date date,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  created_by uuid,
  reviewed_by uuid,
  review_rationale text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT campaign_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT campaign_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'PAUSED'::text, 'COMPLETED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT campaign_photo_policy_check CHECK (photo_policy = ANY (ARRAY['REQUIRED'::text, 'RECOMMENDED'::text, 'OPTIONAL'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT campaign_purpose_required CHECK (length(btrim(purpose)) > 0),
  CONSTRAINT campaign_question_required CHECK (length(btrim(campaign_question)) > 0),
  CONSTRAINT campaign_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT campaign_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT campaign_primary_domain_code_fkey FOREIGN KEY (primary_domain_code) REFERENCES observation_core.domain_adapter(domain_code),
  CONSTRAINT campaign_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT campaign_pkey PRIMARY KEY (campaign_id),
  CONSTRAINT campaign_campaign_code_key UNIQUE (campaign_code)
);
CREATE INDEX ix_campaign_domain_country ON observation_core.campaign USING btree (primary_domain_code, country_code, lifecycle_status);

-- owner: postgres
CREATE TABLE observation_core.campaign_observation (
  campaign_observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  observation_id uuid NOT NULL,
  contribution_status text DEFAULT 'SUBMITTED'::text NOT NULL,
  linked_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT campaign_observation_contribution_status_check CHECK (contribution_status = ANY (ARRAY['SUBMITTED'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'DUPLICATE'::text])),
  CONSTRAINT campaign_observation_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES observation_core.campaign(campaign_id),
  CONSTRAINT campaign_observation_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES observation_core.observation(observation_id),
  CONSTRAINT campaign_observation_pkey PRIMARY KEY (campaign_observation_id),
  CONSTRAINT campaign_observation_campaign_id_observation_id_key UNIQUE (campaign_id, observation_id)
);

-- owner: postgres
CREATE TABLE observation_core.community_participant_profile (
  community_participant_profile_id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid NOT NULL,
  participant_type text NOT NULL,
  country_code character(2),
  organization_or_school text,
  preferred_language text,
  consent_scientific_use boolean DEFAULT false NOT NULL,
  consent_environmental_use boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT community_participant_profile_participant_type_check CHECK (participant_type = ANY (ARRAY['FARMER'::text, 'PUBLIC'::text, 'STUDENT'::text, 'TEACHER'::text])),
  CONSTRAINT community_participant_profile_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT community_participant_profile_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT community_participant_profile_pkey PRIMARY KEY (community_participant_profile_id),
  CONSTRAINT community_participant_profile_actor_id_key UNIQUE (actor_id)
);

-- owner: postgres
CREATE TABLE observation_core.community_submission (
  community_submission_id uuid DEFAULT gen_random_uuid() NOT NULL,
  submission_code text NOT NULL,
  observation_id uuid NOT NULL,
  participant_profile_id uuid NOT NULL,
  campaign_id uuid,
  user_category_hint text,
  user_identification_text text,
  photo_required boolean DEFAULT true NOT NULL,
  location_required boolean DEFAULT true NOT NULL,
  consent_confirmed boolean NOT NULL,
  offline_capture_id text,
  client_captured_at timestamp with time zone,
  client_app_version text,
  low_bandwidth_mode boolean DEFAULT false NOT NULL,
  submission_status text DEFAULT 'AWAITING_PHOTO'::text NOT NULL,
  submitted_at timestamp with time zone,
  reviewed_by uuid,
  review_summary text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT community_submission_submission_status_check CHECK (submission_status = ANY (ARRAY['AWAITING_PHOTO'::text, 'READY_TO_SUBMIT'::text, 'SUBMITTED'::text, 'VALIDATING'::text, 'QUARANTINED'::text, 'UNDER_REVIEW'::text, 'ACCEPTED'::text, 'REJECTED'::text])),
  CONSTRAINT community_submission_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES observation_core.campaign(campaign_id),
  CONSTRAINT community_submission_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES observation_core.observation(observation_id),
  CONSTRAINT community_submission_participant_profile_id_fkey FOREIGN KEY (participant_profile_id) REFERENCES observation_core.community_participant_profile(community_participant_profile_id),
  CONSTRAINT community_submission_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT community_submission_pkey PRIMARY KEY (community_submission_id),
  CONSTRAINT community_submission_observation_id_key UNIQUE (observation_id),
  CONSTRAINT community_submission_submission_code_key UNIQUE (submission_code)
);
CREATE INDEX ix_community_submission_status ON observation_core.community_submission USING btree (submission_status, created_at);
CREATE UNIQUE INDEX ux_community_offline_capture_id ON observation_core.community_submission USING btree (offline_capture_id) WHERE (offline_capture_id IS NOT NULL);

-- owner: postgres
CREATE TABLE observation_core.domain_adapter (
  domain_code text NOT NULL,
  adapter_name text NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  photo_policy text NOT NULL,
  location_policy text NOT NULL,
  allowed_source_modes text[] NOT NULL,
  required_context_fields text[] DEFAULT '{}'::text[] NOT NULL,
  suggested_metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT domain_adapter_location_policy_check CHECK (location_policy = ANY (ARRAY['REQUIRED'::text, 'RECOMMENDED'::text, 'OPTIONAL'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT domain_adapter_photo_policy_check CHECK (photo_policy = ANY (ARRAY['REQUIRED'::text, 'RECOMMENDED'::text, 'OPTIONAL'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT domain_adapter_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES agriculture.aab_domain_classification(domain_code),
  CONSTRAINT domain_adapter_pkey PRIMARY KEY (domain_code)
);

-- owner: postgres
CREATE TABLE observation_core.evidence_link (
  evidence_link_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_id uuid NOT NULL,
  evidence_type text NOT NULL,
  photo_evidence_id uuid,
  external_reference text,
  evidence_summary text,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT evidence_link_evidence_type_check CHECK (evidence_type = ANY (ARRAY['PHOTO'::text, 'VIDEO'::text, 'DOCUMENT'::text, 'LAB_RESULT'::text, 'SENSOR_READING'::text, 'EXTERNAL_SOURCE'::text, 'OTHER'::text])),
  CONSTRAINT evidence_link_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'APPROVED_WITH_WARNINGS'::text, 'REJECTED'::text])),
  CONSTRAINT evidence_link_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES observation_core.observation(observation_id),
  CONSTRAINT evidence_link_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT evidence_link_pkey PRIMARY KEY (evidence_link_id),
  CONSTRAINT ux_observation_evidence_photo UNIQUE (observation_id, photo_evidence_id)
);
CREATE INDEX ix_universal_evidence_link_observation ON observation_core.evidence_link USING btree (observation_id);

-- owner: postgres
CREATE TABLE observation_core.measurement (
  measurement_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_id uuid NOT NULL,
  metric_code text NOT NULL,
  numeric_value numeric,
  text_value text,
  boolean_value boolean,
  unit text,
  method_code text,
  instrument_reference text,
  quality_flag text DEFAULT 'UNASSESSED'::text NOT NULL,
  raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT measurement_quality_flag_check CHECK (quality_flag = ANY (ARRAY['UNASSESSED'::text, 'PASS'::text, 'WARNING'::text, 'FAIL'::text])),
  CONSTRAINT universal_measurement_one_value CHECK (((numeric_value IS NOT NULL)::integer + (text_value IS NOT NULL)::integer + (boolean_value IS NOT NULL)::integer) = 1),
  CONSTRAINT measurement_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES observation_core.observation(observation_id),
  CONSTRAINT measurement_pkey PRIMARY KEY (measurement_id)
);
CREATE INDEX ix_universal_measurement_observation ON observation_core.measurement USING btree (observation_id);

-- owner: postgres
CREATE TABLE observation_core.observation (
  observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_code text NOT NULL,
  domain_code text NOT NULL,
  country_code character(2),
  observation_type text NOT NULL,
  subject_type text NOT NULL,
  subject_reference text,
  source_mode text NOT NULL,
  observer_actor_id uuid,
  observed_at timestamp with time zone NOT NULL,
  latitude numeric,
  longitude numeric,
  location_accuracy_metres numeric,
  location_description text,
  brief_description text NOT NULL,
  context_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  lifecycle_status text DEFAULT 'CAPTURED'::text NOT NULL,
  trust_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  evidence_status text DEFAULT 'NOT_ELIGIBLE'::text NOT NULL,
  input_submission_id uuid,
  agriculture_observation_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_at timestamp with time zone,
  archived_by uuid,
  archive_reason text,
  CONSTRAINT observation_evidence_status_check CHECK (evidence_status = ANY (ARRAY['NOT_ELIGIBLE'::text, 'PENDING_REVIEW'::text, 'ELIGIBLE_WITH_WARNINGS'::text, 'ELIGIBLE'::text])),
  CONSTRAINT observation_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['CAPTURED'::text, 'VALIDATING'::text, 'QUARANTINED'::text, 'UNDER_REVIEW'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT observation_source_mode_check CHECK (source_mode = ANY (ARRAY['SCIENTIST'::text, 'FIELD_TECHNICIAN'::text, 'FARMER'::text, 'PUBLIC'::text, 'STUDENT'::text, 'TEACHER'::text, 'INSTRUMENT'::text, 'LABORATORY'::text, 'EXTERNAL_SOURCE'::text, 'SYSTEM'::text])),
  CONSTRAINT observation_trust_status_check CHECK (trust_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERIFIED'::text])),
  CONSTRAINT universal_observation_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT universal_observation_description_required CHECK (length(btrim(brief_description)) > 0),
  CONSTRAINT universal_observation_location_pair CHECK (latitude IS NULL AND longitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric AND longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  CONSTRAINT observation_agriculture_observation_id_fkey FOREIGN KEY (agriculture_observation_id) REFERENCES agriculture.observation(observation_id),
  CONSTRAINT observation_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT observation_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT observation_observer_actor_id_fkey FOREIGN KEY (observer_actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_pkey PRIMARY KEY (observation_id),
  CONSTRAINT observation_observation_code_key UNIQUE (observation_code)
);
CREATE INDEX ix_universal_observation_domain_time ON observation_core.observation USING btree (domain_code, observed_at DESC);
CREATE INDEX ix_universal_observation_location ON observation_core.observation USING btree (country_code, latitude, longitude);
CREATE INDEX ix_universal_observation_status ON observation_core.observation USING btree (lifecycle_status, evidence_status);

-- owner: postgres
CREATE TABLE observation_core.route (
  observation_route_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_id uuid NOT NULL,
  target_domain_code text NOT NULL,
  route_type text NOT NULL,
  route_reason text NOT NULL,
  proposed_by_type text NOT NULL,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  route_status text DEFAULT 'PROPOSED'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT route_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text])),
  CONSTRAINT route_proposed_by_type_check CHECK (proposed_by_type = ANY (ARRAY['USER_HINT'::text, 'RULE_ENGINE'::text, 'AI_ADVISORY'::text, 'SCIENTIST'::text])),
  CONSTRAINT route_route_status_check CHECK (route_status = ANY (ARRAY['PROPOSED'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'COMPLETED'::text])),
  CONSTRAINT route_route_type_check CHECK (route_type = ANY (ARRAY['PRIMARY'::text, 'SUPPORTING'::text, 'INTELLIGENCE_REVIEW'::text])),
  CONSTRAINT route_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES observation_core.observation(observation_id),
  CONSTRAINT route_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT route_target_domain_code_fkey FOREIGN KEY (target_domain_code) REFERENCES agriculture.aab_domain_classification(domain_code),
  CONSTRAINT route_pkey PRIMARY KEY (observation_route_id),
  CONSTRAINT route_observation_id_target_domain_code_route_type_key UNIQUE (observation_id, target_domain_code, route_type)
);
CREATE INDEX ix_observation_route_target ON observation_core.route USING btree (target_domain_code, route_status, created_at);

-- owner: postgres
CREATE TABLE observation_core.validation_event (
  validation_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_id uuid NOT NULL,
  validation_dimension text NOT NULL,
  validation_result text NOT NULL,
  rule_code text NOT NULL,
  summary text NOT NULL,
  detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  validated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT validation_event_validation_dimension_check CHECK (validation_dimension = ANY (ARRAY['PHOTO'::text, 'LOCATION'::text, 'DESCRIPTION'::text, 'DUPLICATE'::text, 'CONTEXT'::text, 'CONSENT'::text, 'SOURCE_TRUST'::text, 'SPAM_ABUSE'::text, 'METHOD'::text, 'OTHER'::text])),
  CONSTRAINT validation_event_validation_result_check CHECK (validation_result = ANY (ARRAY['PASS'::text, 'WARNING'::text, 'FAIL'::text, 'UNASSESSED'::text])),
  CONSTRAINT validation_event_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES observation_core.observation(observation_id),
  CONSTRAINT validation_event_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT validation_event_pkey PRIMARY KEY (validation_event_id)
);
CREATE INDEX ix_observation_validation ON observation_core.validation_event USING btree (observation_id, validation_dimension, created_at);
