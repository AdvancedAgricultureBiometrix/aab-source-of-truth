-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: country_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for country_core: functions 41, tables 72, views 9, sequences 0, rls_enabled_tables 71, constraints 427, triggers 0, policies 0, indexes 147.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE country_core.action_item (
  action_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid,
  assigned_actor_id uuid NOT NULL,
  action_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  source_entity_type text,
  source_entity_id uuid,
  priority text DEFAULT 'NORMAL'::text NOT NULL,
  action_status text DEFAULT 'OPEN'::text NOT NULL,
  due_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT action_item_action_status_check CHECK (action_status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'DONE'::text, 'DISMISSED'::text, 'EXPIRED'::text])),
  CONSTRAINT action_item_priority_check CHECK (priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text])),
  CONSTRAINT action_item_assigned_actor_id_fkey FOREIGN KEY (assigned_actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT action_item_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT action_item_pkey PRIMARY KEY (action_item_id)
);
CREATE INDEX ix_action_item_actor_open ON country_core.action_item USING btree (assigned_actor_id, action_status, created_at DESC);

-- owner: postgres
CREATE TABLE country_core.asset_ownership (
  asset_ownership_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  owning_organization_id uuid,
  ownership_type text NOT NULL,
  owner_name text NOT NULL,
  rights_summary text NOT NULL,
  sharing_classification_code text NOT NULL,
  effective_from date,
  effective_to date,
  evidence_reference text,
  recorded_by uuid,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT asset_ownership_ownership_type_check CHECK (ownership_type = ANY (ARRAY['MATERIAL'::text, 'DATA'::text, 'RESEARCH'::text, 'FORMULATION'::text, 'IP'::text, 'COMMERCIAL_RIGHTS'::text, 'PUBLIC_DOMAIN'::text, 'OTHER'::text])),
  CONSTRAINT asset_ownership_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT asset_ownership_owning_organization_id_fkey FOREIGN KEY (owning_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT asset_ownership_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT asset_ownership_sharing_classification_code_fkey FOREIGN KEY (sharing_classification_code) REFERENCES country_core.data_sharing_classification(classification_code),
  CONSTRAINT asset_ownership_pkey PRIMARY KEY (asset_ownership_id)
);

-- owner: postgres
CREATE TABLE country_core.bootstrap_scan_brain_event (
  brain_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  bootstrap_scan_run_id uuid NOT NULL,
  event_order integer NOT NULL,
  brain_code text NOT NULL,
  event_status text NOT NULL,
  event_summary text NOT NULL,
  handed_to_brain_code text,
  event_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT bootstrap_scan_brain_event_event_status_check CHECK (event_status = ANY (ARRAY['QUEUED'::text, 'THINKING'::text, 'HANDED_OFF'::text, 'COMPLETE'::text, 'BLOCKED'::text, 'KNOWLEDGE_GAP'::text])),
  CONSTRAINT bootstrap_scan_brain_event_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id) ON DELETE CASCADE,
  CONSTRAINT bootstrap_scan_brain_event_pkey PRIMARY KEY (brain_event_id),
  CONSTRAINT bootstrap_scan_brain_event_bootstrap_scan_run_id_event_orde_key UNIQUE (bootstrap_scan_run_id, event_order)
);

-- owner: postgres
CREATE TABLE country_core.bootstrap_scan_finding (
  bootstrap_scan_finding_id uuid DEFAULT gen_random_uuid() NOT NULL,
  bootstrap_scan_run_id uuid NOT NULL,
  country_workspace_id uuid NOT NULL,
  finding_type text NOT NULL,
  finding_title text NOT NULL,
  finding_summary text NOT NULL,
  source_type text NOT NULL,
  source_reference text,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  evidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  review_status text DEFAULT 'NOT_REVIEWED'::text NOT NULL,
  materialisation_status text DEFAULT 'NOT_MATERIALISED'::text NOT NULL,
  target_entity_type text,
  target_entity_id uuid,
  finding_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT bootstrap_scan_finding_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERIFIED'::text])),
  CONSTRAINT bootstrap_scan_finding_finding_type_check CHECK (finding_type = ANY (ARRAY['INGREDIENT_AVAILABILITY'::text, 'COUNTRY_RESOURCE'::text, 'WASTE_STREAM'::text, 'ENVIRONMENTAL_PRIORITY'::text, 'SOIL_CONTEXT'::text, 'WATER_CONTEXT'::text, 'CLIMATE_CONTEXT'::text, 'REGULATORY_REQUIREMENT'::text, 'KNOWLEDGE_GAP'::text, 'OPPORTUNITY'::text, 'OTHER'::text])),
  CONSTRAINT bootstrap_scan_finding_materialisation_status_check CHECK (materialisation_status = ANY (ARRAY['NOT_MATERIALISED'::text, 'CANDIDATE_CREATED'::text, 'LINKED_EXISTING'::text, 'BLOCKED'::text, 'FAILED'::text])),
  CONSTRAINT bootstrap_scan_finding_review_status_check CHECK (review_status = ANY (ARRAY['NOT_REVIEWED'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_AS_CANDIDATE'::text, 'REJECTED'::text, 'VERIFIED'::text])),
  CONSTRAINT bootstrap_scan_finding_source_type_check CHECK (source_type = ANY (ARRAY['GLOBAL_STARTER_LIBRARY'::text, 'COUNTRY_CONFIG'::text, 'EXTERNAL_AUTHORITATIVE_SOURCE'::text, 'RESEARCH_SOURCE'::text, 'COMMUNITY_EVIDENCE'::text, 'AAB_INFERENCE'::text, 'USER_SUPPLIED'::text])),
  CONSTRAINT bootstrap_scan_finding_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id) ON DELETE CASCADE,
  CONSTRAINT bootstrap_scan_finding_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT bootstrap_scan_finding_pkey PRIMARY KEY (bootstrap_scan_finding_id)
);
CREATE INDEX bootstrap_scan_finding_bootstrap_scan_run_id_idx ON country_core.bootstrap_scan_finding USING btree (bootstrap_scan_run_id);
CREATE INDEX bootstrap_scan_finding_country_workspace_id_idx ON country_core.bootstrap_scan_finding USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE country_core.bootstrap_scan_run (
  bootstrap_scan_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  run_code text NOT NULL,
  run_type text DEFAULT 'INITIAL_COUNTRY_BOOTSTRAP'::text NOT NULL,
  run_status text DEFAULT 'QUEUED'::text NOT NULL,
  initiated_by uuid,
  initiated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  summary text,
  CONSTRAINT bootstrap_scan_run_run_status_check CHECK (run_status = ANY (ARRAY['QUEUED'::text, 'RUNNING'::text, 'AWAITING_EXTERNAL_SOURCES'::text, 'AWAITING_REVIEW'::text, 'COMPLETE'::text, 'FAILED'::text])),
  CONSTRAINT bootstrap_scan_run_run_type_check CHECK (run_type = ANY (ARRAY['INITIAL_COUNTRY_BOOTSTRAP'::text, 'REFRESH'::text, 'TARGETED_RESCAN'::text])),
  CONSTRAINT bootstrap_scan_run_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT bootstrap_scan_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT bootstrap_scan_run_pkey PRIMARY KEY (bootstrap_scan_run_id),
  CONSTRAINT bootstrap_scan_run_run_code_key UNIQUE (run_code)
);
CREATE INDEX bootstrap_scan_run_country_workspace_id_idx ON country_core.bootstrap_scan_run USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE country_core.bootstrap_source_adapter (
  adapter_code text NOT NULL,
  adapter_name text NOT NULL,
  adapter_type text NOT NULL,
  configuration_status text NOT NULL,
  automatic_candidate_capture_allowed boolean DEFAULT false NOT NULL,
  description text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT bootstrap_source_adapter_adapter_type_check CHECK (adapter_type = ANY (ARRAY['INTERNAL_KNOWLEDGE'::text, 'AUTHORITATIVE_WEB'::text, 'GOVERNMENT_DATA'::text, 'REGULATORY_SOURCE'::text, 'COMMUNITY_EVIDENCE'::text, 'LAB_RESEARCH'::text, 'MANUAL_IMPORT'::text])),
  CONSTRAINT bootstrap_source_adapter_configuration_status_check CHECK (configuration_status = ANY (ARRAY['READY'::text, 'NOT_CONFIGURED'::text, 'DISABLED'::text])),
  CONSTRAINT bootstrap_source_adapter_pkey PRIMARY KEY (adapter_code)
);

-- owner: postgres
CREATE TABLE country_core.country_activation (
  country_activation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_code character(2) NOT NULL,
  country_name text NOT NULL,
  nominated_head_admin_email text NOT NULL,
  activation_code_hash text NOT NULL,
  activation_status text DEFAULT 'ISSUED'::text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  issued_by uuid,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  used_at timestamp with time zone,
  used_by uuid,
  claimed_by uuid,
  claimed_at timestamp with time zone,
  pending_workspace_name text,
  pending_default_language text,
  pending_timezone_name text,
  handoff_correlation_id uuid,
  source_participation_request_id uuid,
  source_control_plane_decision_id uuid,
  provisioning_classification text,
  government_authority_verified boolean DEFAULT false NOT NULL,
  production_authority boolean DEFAULT false NOT NULL,
  legal_effect text,
  external_invitations_locked boolean DEFAULT true NOT NULL,
  required_rehearsal_document_version_id uuid,
  source_internal_rehearsal_nomination_id uuid,
  CONSTRAINT country_activation_activation_status_check CHECK (activation_status = ANY (ARRAY['ISSUED'::text, 'USED'::text, 'EXPIRED'::text, 'REVOKED'::text])),
  CONSTRAINT country_activation_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_activation_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_activation_required_rehearsal_document_version_id_fkey FOREIGN KEY (required_rehearsal_document_version_id) REFERENCES country_core.legal_document_version(legal_document_version_id),
  CONSTRAINT country_activation_used_by_fkey FOREIGN KEY (used_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_activation_pkey PRIMARY KEY (country_activation_id)
);
CREATE UNIQUE INDEX uq_country_activation_one_issued ON country_core.country_activation USING btree (country_code) WHERE (activation_status = 'ISSUED'::text);

-- owner: postgres
CREATE TABLE country_core.country_brain_registry (
  country_brain_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  brain_name text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  doctrine text NOT NULL,
  scientist_authority_preserved boolean DEFAULT true NOT NULL,
  autonomous_approval_disabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_brain_registry_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'ARCHIVED'::text])),
  CONSTRAINT country_brain_registry_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_brain_registry_pkey PRIMARY KEY (country_brain_id),
  CONSTRAINT country_brain_registry_country_workspace_id_key UNIQUE (country_workspace_id)
);

-- owner: postgres
CREATE TABLE country_core.country_discovery_recipe (
  country_workspace_id uuid NOT NULL,
  recipe_code text NOT NULL,
  recipe_version text NOT NULL,
  recipe_name text NOT NULL,
  recipe_status text NOT NULL,
  recipe_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_discovery_recipe_recipe_status_check CHECK (recipe_status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'RETIRED'::text])),
  CONSTRAINT country_discovery_recipe_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_discovery_recipe_pkey PRIMARY KEY (country_workspace_id, recipe_code, recipe_version)
);

-- owner: postgres
CREATE TABLE country_core.country_economic_baseline (
  country_economic_baseline_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  bootstrap_scan_run_id uuid,
  metric_code text NOT NULL,
  metric_name text NOT NULL,
  numeric_value numeric,
  text_value text,
  unit text DEFAULT ''::text NOT NULL,
  currency_code text,
  baseline_status text NOT NULL,
  confidence_status text NOT NULL,
  freshness_status text DEFAULT 'UNKNOWN'::text NOT NULL,
  source_fact_id uuid,
  knowledge_gap_summary text,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_economic_baseline_baseline_status_check CHECK (baseline_status = ANY (ARRAY['VERIFIED'::text, 'AUTHORITATIVE_MODEL'::text, 'PARTIAL'::text, 'NOT_YET_ESTABLISHED'::text, 'CONFLICTED'::text])),
  CONSTRAINT country_economic_baseline_confidence_status_check CHECK (confidence_status = ANY (ARRAY['LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERIFIED'::text, 'UNASSESSED'::text])),
  CONSTRAINT country_economic_baseline_freshness_status_check CHECK (freshness_status = ANY (ARRAY['CURRENT'::text, 'AGING'::text, 'STALE'::text, 'UNKNOWN'::text])),
  CONSTRAINT country_economic_baseline_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT country_economic_baseline_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_economic_baseline_source_fact_id_fkey FOREIGN KEY (source_fact_id) REFERENCES country_core.country_economic_fact(country_economic_fact_id),
  CONSTRAINT country_economic_baseline_pkey PRIMARY KEY (country_economic_baseline_id),
  CONSTRAINT country_economic_baseline_country_workspace_id_bootstrap_sc_key UNIQUE (country_workspace_id, bootstrap_scan_run_id, metric_code)
);

-- owner: postgres
CREATE TABLE country_core.country_economic_fact (
  country_economic_fact_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  source_code text NOT NULL,
  metric_code text NOT NULL,
  metric_name text NOT NULL,
  numeric_value numeric,
  text_value text,
  unit text DEFAULT ''::text NOT NULL,
  currency_code text,
  period_label text NOT NULL,
  period_start date,
  period_end date,
  fact_status text NOT NULL,
  confidence_status text NOT NULL,
  freshness_status text DEFAULT 'CURRENT'::text NOT NULL,
  source_note text,
  raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
  effective_at timestamp with time zone,
  supersedes_fact_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_economic_fact_confidence_status_check CHECK (confidence_status = ANY (ARRAY['LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERIFIED'::text, 'UNASSESSED'::text])),
  CONSTRAINT country_economic_fact_fact_status_check CHECK (fact_status = ANY (ARRAY['VERIFIED_SOURCE'::text, 'AUTHORITATIVE_MODEL'::text, 'PARTIAL'::text, 'CONFLICTED'::text, 'STALE'::text, 'SUPERSEDED'::text, 'KNOWLEDGE_GAP'::text])),
  CONSTRAINT country_economic_fact_freshness_status_check CHECK (freshness_status = ANY (ARRAY['CURRENT'::text, 'AGING'::text, 'STALE'::text, 'UNKNOWN'::text])),
  CONSTRAINT country_economic_fact_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_economic_fact_source_code_fkey FOREIGN KEY (source_code) REFERENCES country_core.country_source_registry(source_code),
  CONSTRAINT country_economic_fact_supersedes_fact_id_fkey FOREIGN KEY (supersedes_fact_id) REFERENCES country_core.country_economic_fact(country_economic_fact_id),
  CONSTRAINT country_economic_fact_pkey PRIMARY KEY (country_economic_fact_id),
  CONSTRAINT country_economic_fact_country_workspace_id_source_code_metr_key UNIQUE (country_workspace_id, source_code, metric_code, period_label)
);

-- owner: postgres
CREATE TABLE country_core.country_ingredient_availability (
  country_ingredient_availability_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  global_ingredient_id uuid NOT NULL,
  availability_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  local_name text,
  local_source_summary text,
  regulatory_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  evidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  scientist_review_status text DEFAULT 'NOT_REVIEWED'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_ingredient_availability_availability_status_check CHECK (availability_status = ANY (ARRAY['UNASSESSED'::text, 'KNOWN_AVAILABLE'::text, 'LIKELY_AVAILABLE'::text, 'LIMITED'::text, 'NOT_IDENTIFIED'::text, 'NOT_PERMITTED'::text, 'REQUIRES_REVIEW'::text])),
  CONSTRAINT country_ingredient_availability_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_ingredient_availability_global_ingredient_id_fkey FOREIGN KEY (global_ingredient_id) REFERENCES country_core.global_ingredient_knowledge(global_ingredient_id),
  CONSTRAINT country_ingredient_availability_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_ingredient_availability_pkey PRIMARY KEY (country_ingredient_availability_id),
  CONSTRAINT country_ingredient_availabili_country_workspace_id_global_i_key UNIQUE (country_workspace_id, global_ingredient_id)
);

-- owner: postgres
CREATE TABLE country_core.country_intelligence_brief (
  country_intelligence_brief_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  bootstrap_scan_run_id uuid NOT NULL,
  brief_version integer DEFAULT 1 NOT NULL,
  brief_status text DEFAULT 'DRAFT'::text NOT NULL,
  executive_summary text NOT NULL,
  resources_summary text,
  waste_environment_summary text,
  agriculture_summary text,
  soil_water_climate_summary text,
  regulatory_summary text,
  knowledge_gap_summary text,
  how_aab_can_help jsonb DEFAULT '[]'::jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_intelligence_brief_brief_status_check CHECK (brief_status = ANY (ARRAY['DRAFT'::text, 'READY'::text, 'REVIEWED'::text, 'ARCHIVED'::text])),
  CONSTRAINT country_intelligence_brief_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT country_intelligence_brief_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_intelligence_brief_pkey PRIMARY KEY (country_intelligence_brief_id),
  CONSTRAINT country_intelligence_brief_country_workspace_id_brief_versi_key UNIQUE (country_workspace_id, brief_version)
);

-- owner: postgres
CREATE TABLE country_core.country_invitation (
  country_invitation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid,
  invite_email text NOT NULL,
  proposed_role text NOT NULL,
  invitation_token_hash text NOT NULL,
  invitation_status text DEFAULT 'ISSUED'::text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  invited_by uuid NOT NULL,
  invited_at timestamp with time zone DEFAULT now() NOT NULL,
  accepted_by uuid,
  accepted_at timestamp with time zone,
  invitee_name text,
  institution_name text,
  official_position text,
  claimed_by uuid,
  claimed_at timestamp with time zone,
  required_aab_terms_version_id uuid,
  required_country_terms_version_id uuid,
  CONSTRAINT country_invitation_invitation_status_check CHECK (invitation_status = ANY (ARRAY['ISSUED'::text, 'CLAIMED'::text, 'ACCEPTED'::text, 'EXPIRED'::text, 'REVOKED'::text])),
  CONSTRAINT country_invitation_proposed_role_check CHECK (proposed_role = ANY (ARRAY['COUNTRY_ADMIN'::text, 'REGULATORY_ADMIN'::text, 'SCIENTIST'::text, 'RESEARCHER'::text, 'FIELD_TECHNICIAN'::text, 'AUDITOR'::text, 'TEACHER'::text, 'STUDENT'::text, 'COMMUNITY'::text, 'VIEWER'::text])),
  CONSTRAINT country_invitation_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_invitation_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_invitation_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_invitation_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_invitation_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT country_invitation_required_aab_terms_version_id_fkey FOREIGN KEY (required_aab_terms_version_id) REFERENCES country_core.legal_document_version(legal_document_version_id),
  CONSTRAINT country_invitation_required_country_terms_version_id_fkey FOREIGN KEY (required_country_terms_version_id) REFERENCES country_core.legal_document_version(legal_document_version_id),
  CONSTRAINT country_invitation_pkey PRIMARY KEY (country_invitation_id)
);
CREATE UNIQUE INDEX uq_country_invite_active_email ON country_core.country_invitation USING btree (country_workspace_id, lower(invite_email)) WHERE (invitation_status = 'ISSUED'::text);

-- owner: postgres
CREATE TABLE country_core.country_recommendation (
  country_recommendation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  bootstrap_scan_run_id uuid,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  recommendation_summary text NOT NULL,
  why text NOT NULL,
  evidence_status text DEFAULT 'ADVISORY_UNVERIFIED'::text NOT NULL,
  recommendation_status text DEFAULT 'ADVISORY'::text NOT NULL,
  prefill_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_recommendation_recommendation_status_check CHECK (recommendation_status = ANY (ARRAY['ADVISORY'::text, 'CONSIDERED'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'COMPLETED'::text])),
  CONSTRAINT country_recommendation_recommendation_type_check CHECK (recommendation_type = ANY (ARRAY['OBSERVATION_CAMPAIGN'::text, 'LAB_CHARACTERISATION'::text, 'RESOURCE_INVESTIGATION'::text, 'FORMULATION_REQUEST'::text, 'REGULATORY_ACTION'::text, 'TEAM_ACTION'::text, 'OTHER'::text])),
  CONSTRAINT country_recommendation_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT country_recommendation_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_recommendation_pkey PRIMARY KEY (country_recommendation_id)
);

-- owner: postgres
CREATE TABLE country_core.country_recovery_contact (
  recovery_contact_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  actor_id uuid,
  contact_email text NOT NULL,
  contact_name text NOT NULL,
  priority_order integer NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_recovery_contact_priority_order_check CHECK (priority_order >= 1),
  CONSTRAINT country_recovery_contact_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_recovery_contact_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_recovery_contact_pkey PRIMARY KEY (recovery_contact_id),
  CONSTRAINT country_recovery_contact_country_workspace_id_priority_orde_key UNIQUE (country_workspace_id, priority_order)
);

-- owner: postgres
CREATE TABLE country_core.country_resource_investigation_execution_policy (
  operation_code text NOT NULL,
  allowed_owner_email text NOT NULL,
  secret_sha256 text NOT NULL,
  allowed_actions text[] DEFAULT ARRAY['GET'::text, 'OPEN'::text, 'ADD_EVIDENCE'::text, 'ADD_MEASUREMENT'::text] NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_resource_investigation_execut_allowed_owner_email_check CHECK (POSITION(('@'::text) IN (allowed_owner_email)) > 1),
  CONSTRAINT country_resource_investigation_execution_po_secret_sha256_check CHECK (secret_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT country_resource_investigation_owner_capture_only CHECK (allowed_actions <@ ARRAY['GET'::text, 'OPEN'::text, 'ADD_EVIDENCE'::text, 'ADD_MEASUREMENT'::text] AND NOT allowed_actions && ARRAY['DECIDE'::text, 'APPROVE_EXPERIMENTAL_INGREDIENT'::text, 'ACTIVATE_INGREDIENT'::text, 'ADMIT_TO_BRAIN'::text, 'FORMULATION_USE'::text]),
  CONSTRAINT country_resource_investigation_execution_policy_pkey PRIMARY KEY (operation_code)
);

-- owner: postgres
CREATE TABLE country_core.country_scan_execution_policy (
  country_workspace_id uuid NOT NULL,
  operation_code text NOT NULL,
  runner_secret_sha256 text NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_scan_execution_policy_runner_secret_sha256_check CHECK (runner_secret_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT country_scan_execution_policy_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_scan_execution_policy_pkey PRIMARY KEY (country_workspace_id)
);

-- owner: postgres
CREATE TABLE country_core.country_scan_knowledge_definition (
  definition_code text NOT NULL,
  definition_group text NOT NULL,
  display_name text NOT NULL,
  discovery_question text NOT NULL,
  expected_output text NOT NULL,
  preferred_source_tier text DEFAULT 'TIER_1_GOVERNMENT'::text NOT NULL,
  refresh_cadence text DEFAULT 'ANNUAL'::text NOT NULL,
  mandatory boolean DEFAULT true NOT NULL,
  creates_knowledge_gap_when_missing boolean DEFAULT true NOT NULL,
  governance_note text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_scan_knowledge_definition_pkey PRIMARY KEY (definition_code)
);

-- owner: postgres
CREATE TABLE country_core.country_scan_profile (
  country_scan_profile_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  profile_code text NOT NULL,
  country_code character(2) NOT NULL,
  focus_jurisdiction_code text,
  profile_status text NOT NULL,
  boundary_geojson jsonb DEFAULT '{}'::jsonb NOT NULL,
  administrative_levels jsonb DEFAULT '[]'::jsonb NOT NULL,
  scan_recipes jsonb DEFAULT '[]'::jsonb NOT NULL,
  imagery_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
  evidence_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
  sovereignty_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_scan_profile_profile_status_check CHECK (profile_status = ANY (ARRAY['DRAFT'::text, 'READY'::text, 'ACTIVE'::text, 'SUSPENDED'::text])),
  CONSTRAINT country_scan_profile_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id) ON DELETE CASCADE,
  CONSTRAINT country_scan_profile_pkey PRIMARY KEY (country_scan_profile_id),
  CONSTRAINT country_scan_profile_profile_code_key UNIQUE (profile_code)
);
CREATE INDEX country_scan_profile_workspace_idx ON country_core.country_scan_profile USING btree (country_workspace_id, profile_status);

-- owner: postgres
CREATE TABLE country_core.country_scan_source_requirement (
  requirement_code text NOT NULL,
  definition_code text NOT NULL,
  source_class text NOT NULL,
  authority_priority integer DEFAULT 1 NOT NULL,
  acceptable_scope text NOT NULL,
  freshness_rule text NOT NULL,
  verification_rule text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_scan_source_requirement_definition_code_fkey FOREIGN KEY (definition_code) REFERENCES country_core.country_scan_knowledge_definition(definition_code),
  CONSTRAINT country_scan_source_requirement_pkey PRIMARY KEY (requirement_code)
);

-- owner: postgres
CREATE TABLE country_core.country_security_policy (
  country_workspace_id uuid NOT NULL,
  regulatory_reauthentication_required boolean DEFAULT true NOT NULL,
  regulatory_mfa_required boolean DEFAULT true NOT NULL,
  minimum_recovery_contacts integer DEFAULT 2 NOT NULL,
  session_review_enabled boolean DEFAULT true NOT NULL,
  sensitive_change_reason_required boolean DEFAULT true NOT NULL,
  second_reviewer_for_regulatory_changes boolean DEFAULT true NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_security_policy_minimum_recovery_contacts_check CHECK (minimum_recovery_contacts >= 1),
  CONSTRAINT country_security_policy_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_security_policy_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_security_policy_pkey PRIMARY KEY (country_workspace_id)
);

-- owner: postgres
CREATE TABLE country_core.country_source_adapter_config (
  country_workspace_id uuid NOT NULL,
  source_code text NOT NULL,
  adapter_code text NOT NULL,
  adapter_version text NOT NULL,
  retrieval_method text NOT NULL,
  endpoint_url text NOT NULL,
  geographic_resolution text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_source_adapter_config_retrieval_method_check CHECK (retrieval_method = ANY (ARRAY['OFFICIAL_HTML'::text, 'OFFICIAL_API'::text, 'GOVERNED_FILE'::text, 'MANUAL_EVIDENCE'::text])),
  CONSTRAINT country_source_adapter_config_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_source_adapter_config_source_code_fkey FOREIGN KEY (source_code) REFERENCES country_core.country_source_registry(source_code),
  CONSTRAINT country_source_adapter_config_pkey PRIMARY KEY (country_workspace_id, source_code)
);
CREATE INDEX country_source_adapter_config_active_idx ON country_core.country_source_adapter_config USING btree (country_workspace_id, active);
CREATE INDEX country_source_adapter_config_source_idx ON country_core.country_source_adapter_config USING btree (source_code);

-- owner: postgres
CREATE TABLE country_core.country_source_evidence_snapshot (
  evidence_snapshot_id uuid NOT NULL,
  country_workspace_id uuid NOT NULL,
  bootstrap_scan_run_id uuid NOT NULL,
  source_code text NOT NULL,
  adapter_code text NOT NULL,
  adapter_version text NOT NULL,
  retrieved_at timestamp with time zone NOT NULL,
  source_published_at timestamp with time zone,
  source_last_modified text,
  http_status integer,
  content_type text,
  source_content_hash text,
  retrieval_status text NOT NULL,
  evidence_status text NOT NULL,
  coverage_state text NOT NULL,
  geographic_resolution text NOT NULL,
  extracted_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
  provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
  duplicate_of_snapshot_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_source_evidence_snapshot_retrieval_status_check CHECK (retrieval_status = ANY (ARRAY['RETRIEVED'::text, 'FAILED'::text])),
  CONSTRAINT country_source_evidence_snapshot_source_content_hash_check CHECK (source_content_hash IS NULL OR source_content_hash ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT country_source_evidence_snapshot_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT country_source_evidence_snapshot_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_source_evidence_snapshot_duplicate_of_snapshot_id_fkey FOREIGN KEY (duplicate_of_snapshot_id) REFERENCES country_core.country_source_evidence_snapshot(evidence_snapshot_id),
  CONSTRAINT country_source_evidence_snapshot_source_code_fkey FOREIGN KEY (source_code) REFERENCES country_core.country_source_registry(source_code),
  CONSTRAINT country_source_evidence_snapshot_pkey PRIMARY KEY (evidence_snapshot_id)
);
CREATE INDEX country_source_evidence_snapshot_dedupe_idx ON country_core.country_source_evidence_snapshot USING btree (country_workspace_id, source_code, source_content_hash, retrieved_at DESC);
CREATE INDEX country_source_evidence_snapshot_duplicate_idx ON country_core.country_source_evidence_snapshot USING btree (duplicate_of_snapshot_id) WHERE (duplicate_of_snapshot_id IS NOT NULL);
CREATE INDEX country_source_evidence_snapshot_run_idx ON country_core.country_source_evidence_snapshot USING btree (bootstrap_scan_run_id);
CREATE INDEX country_source_evidence_snapshot_source_idx ON country_core.country_source_evidence_snapshot USING btree (source_code);

-- owner: postgres
CREATE TABLE country_core.country_source_registry (
  source_code text NOT NULL,
  country_code character(2),
  source_name text NOT NULL,
  source_category text NOT NULL,
  authority_tier text NOT NULL,
  publisher text NOT NULL,
  source_url text NOT NULL,
  refresh_cadence text DEFAULT 'ANNUAL'::text NOT NULL,
  data_scope text NOT NULL,
  verification_status text DEFAULT 'REGISTERED'::text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_source_registry_authority_tier_check CHECK (authority_tier = ANY (ARRAY['TIER_1_GOVERNMENT'::text, 'TIER_2_INTERNATIONAL_AUTHORITY'::text, 'TIER_3_INSTITUTIONAL_RESEARCH'::text, 'TIER_4_INDUSTRY'::text, 'TIER_5_DISCOVERY_UNVERIFIED'::text])),
  CONSTRAINT country_source_registry_refresh_cadence_check CHECK (refresh_cadence = ANY (ARRAY['DAILY'::text, 'MONTHLY'::text, 'QUARTERLY'::text, 'ANNUAL'::text, 'EVENT_DRIVEN'::text, 'MANUAL'::text])),
  CONSTRAINT country_source_registry_source_category_check CHECK (source_category = ANY (ARRAY['WASTE'::text, 'ECONOMICS'::text, 'TRADE'::text, 'AGRICULTURE'::text, 'ENVIRONMENT'::text, 'REGULATORY'::text, 'RESEARCH'::text, 'MANUFACTURING'::text, 'GENERAL'::text])),
  CONSTRAINT country_source_registry_verification_status_check CHECK (verification_status = ANY (ARRAY['REGISTERED'::text, 'VERIFIED_SOURCE'::text, 'REVIEW_REQUIRED'::text, 'DISABLED'::text])),
  CONSTRAINT country_source_registry_pkey PRIMARY KEY (source_code)
);

-- owner: postgres
CREATE TABLE country_core.country_workspace (
  country_workspace_id uuid DEFAULT gen_random_uuid() NOT NULL,
  workspace_code text NOT NULL,
  country_code character(2) NOT NULL,
  country_name text NOT NULL,
  workspace_name text NOT NULL,
  lifecycle_status text DEFAULT 'PROVISIONED'::text NOT NULL,
  default_language text DEFAULT 'en'::text NOT NULL,
  timezone_name text DEFAULT 'UTC'::text NOT NULL,
  data_residency_note text,
  activated_at timestamp with time zone,
  activated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_workspace_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['PROVISIONED'::text, 'SETUP_PENDING'::text, 'BOOTSTRAP_PENDING'::text, 'BOOTSTRAP_RUNNING'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT country_workspace_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_workspace_pkey PRIMARY KEY (country_workspace_id),
  CONSTRAINT country_workspace_country_code_key UNIQUE (country_code),
  CONSTRAINT country_workspace_workspace_code_key UNIQUE (workspace_code)
);

-- owner: postgres
CREATE TABLE country_core.daily_impact_snapshot (
  daily_impact_snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  metric_code text NOT NULL,
  numeric_value numeric,
  text_value text,
  unit text DEFAULT ''::text NOT NULL,
  value_class text NOT NULL,
  evidence_summary text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT daily_impact_snapshot_value_class_check CHECK (value_class = ANY (ARRAY['MEASURED'::text, 'VERIFIED'::text, 'MODELLED'::text, 'ESTIMATED'::text, 'COUNT'::text, 'UNKNOWN'::text])),
  CONSTRAINT daily_impact_snapshot_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT daily_impact_snapshot_metric_code_fkey FOREIGN KEY (metric_code) REFERENCES country_core.impact_metric_definition(metric_code),
  CONSTRAINT daily_impact_snapshot_pkey PRIMARY KEY (daily_impact_snapshot_id),
  CONSTRAINT daily_impact_snapshot_country_workspace_id_snapshot_date_me_key UNIQUE (country_workspace_id, snapshot_date, metric_code, unit)
);

-- owner: postgres
CREATE TABLE country_core.data_sharing_classification (
  classification_code text NOT NULL,
  classification_name text NOT NULL,
  description text NOT NULL,
  allows_cross_country boolean DEFAULT false NOT NULL,
  allows_global_knowledge boolean DEFAULT false NOT NULL,
  allows_public_release boolean DEFAULT false NOT NULL,
  CONSTRAINT data_sharing_classification_pkey PRIMARY KEY (classification_code)
);

-- owner: postgres
CREATE TABLE country_core.demo_jurisdiction_execution_policy (
  operation_code text NOT NULL,
  runner_secret_sha256 text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT demo_jurisdiction_execution_policy_runner_secret_sha256_check CHECK (runner_secret_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT demo_jurisdiction_execution_policy_pkey PRIMARY KEY (operation_code)
);
COMMENT ON TABLE country_core.demo_jurisdiction_execution_policy IS 'Temporary owner-approved credential reuse for the private demonstration jurisdiction catalogue only.';

-- owner: postgres
CREATE TABLE country_core.demo_jurisdiction_profile (
  demo_jurisdiction_profile_id uuid DEFAULT gen_random_uuid() NOT NULL,
  jurisdiction_code text NOT NULL,
  country_code character(2) NOT NULL,
  country_name text NOT NULL,
  jurisdiction_name text NOT NULL,
  default_language text NOT NULL,
  timezone_name text NOT NULL,
  profile_status text DEFAULT 'DRAFT_UNSCANNED'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT demo_jurisdiction_profile_country_code_check CHECK (country_code ~ '^[A-Z]{2}$'::text),
  CONSTRAINT demo_jurisdiction_profile_country_name_check CHECK (length(btrim(country_name)) >= 2 AND length(btrim(country_name)) <= 120),
  CONSTRAINT demo_jurisdiction_profile_jurisdiction_code_check CHECK (jurisdiction_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text),
  CONSTRAINT demo_jurisdiction_profile_jurisdiction_name_check CHECK (length(btrim(jurisdiction_name)) >= 2 AND length(btrim(jurisdiction_name)) <= 120),
  CONSTRAINT demo_jurisdiction_profile_profile_status_check CHECK (profile_status = ANY (ARRAY['DRAFT_UNSCANNED'::text, 'READY'::text, 'ARCHIVED'::text])),
  CONSTRAINT demo_jurisdiction_profile_pkey PRIMARY KEY (demo_jurisdiction_profile_id),
  CONSTRAINT demo_jurisdiction_profile_jurisdiction_code_key UNIQUE (jurisdiction_code)
);
COMMENT ON TABLE country_core.demo_jurisdiction_profile IS 'Platform Owner-only multi-jurisdiction demonstration catalogue. Not an operational country tenancy.';

-- owner: postgres
CREATE TABLE country_core.demo_jurisdiction_scan_finding (
  demo_jurisdiction_scan_finding_id uuid DEFAULT gen_random_uuid() NOT NULL,
  demo_jurisdiction_scan_run_id uuid NOT NULL,
  jurisdiction_code text NOT NULL,
  result_group text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  investigation_rationale text NOT NULL,
  evidence_status text NOT NULL,
  coverage_state text NOT NULL,
  geographic_resolution text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  retrieved_at timestamp with time zone NOT NULL,
  quarantine_state text DEFAULT 'QUARANTINED_UNVERIFIED'::text NOT NULL,
  scientist_review_required boolean DEFAULT true NOT NULL,
  brain_access boolean DEFAULT false NOT NULL,
  formulation_eligible boolean DEFAULT false NOT NULL,
  trial_eligible boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT demo_jurisdiction_scan_finding_result_group_check CHECK (result_group = ANY (ARRAY['CANDIDATE_DETECTED'::text, 'CLASSIFICATION_REQUIRED'::text, 'KNOWN_TYPE_NOT_DETECTED'::text, 'EVIDENCE_COVERAGE_GAP'::text])),
  CONSTRAINT demo_jurisdiction_scan_findin_demo_jurisdiction_scan_run_i_fkey FOREIGN KEY (demo_jurisdiction_scan_run_id) REFERENCES country_core.demo_jurisdiction_scan_run(demo_jurisdiction_scan_run_id) ON DELETE CASCADE,
  CONSTRAINT demo_jurisdiction_scan_finding_jurisdiction_code_fkey FOREIGN KEY (jurisdiction_code) REFERENCES country_core.demo_jurisdiction_profile(jurisdiction_code) ON DELETE CASCADE,
  CONSTRAINT demo_jurisdiction_scan_finding_pkey PRIMARY KEY (demo_jurisdiction_scan_finding_id)
);
CREATE INDEX demo_jurisdiction_scan_finding_run_idx ON country_core.demo_jurisdiction_scan_finding USING btree (demo_jurisdiction_scan_run_id, result_group);

-- owner: postgres
CREATE TABLE country_core.demo_jurisdiction_scan_run (
  demo_jurisdiction_scan_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  jurisdiction_code text NOT NULL,
  run_status text NOT NULL,
  initiated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  retrieval_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  result_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT demo_jurisdiction_scan_run_run_status_check CHECK (run_status = ANY (ARRAY['RUNNING'::text, 'COMPLETE'::text, 'FAILED'::text])),
  CONSTRAINT demo_jurisdiction_scan_run_jurisdiction_code_fkey FOREIGN KEY (jurisdiction_code) REFERENCES country_core.demo_jurisdiction_profile(jurisdiction_code) ON DELETE CASCADE,
  CONSTRAINT demo_jurisdiction_scan_run_pkey PRIMARY KEY (demo_jurisdiction_scan_run_id)
);
CREATE INDEX demo_jurisdiction_scan_run_latest_idx ON country_core.demo_jurisdiction_scan_run USING btree (jurisdiction_code, initiated_at DESC);

-- owner: postgres
CREATE TABLE country_core.discovery_evidence_atom (
  discovery_evidence_atom_id uuid NOT NULL,
  country_workspace_id uuid NOT NULL,
  bootstrap_scan_run_id uuid NOT NULL,
  evidence_snapshot_id uuid,
  source_code text NOT NULL,
  atom_type text NOT NULL,
  subject text NOT NULL,
  property_code text,
  assertion text NOT NULL,
  evidence_state text NOT NULL,
  coverage_state text NOT NULL,
  geographic_resolution text NOT NULL,
  provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
  quarantined boolean DEFAULT true NOT NULL,
  brain_access boolean DEFAULT false NOT NULL,
  formulation_eligible boolean DEFAULT false NOT NULL,
  trial_eligible boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discovery_evidence_atom_atom_type_check CHECK (atom_type = ANY (ARRAY['COUNTRY_PROBLEM'::text, 'DISCOVERY_COVERAGE'::text, 'FUNCTIONAL_PROPERTY'::text, 'CANDIDATE_SIGNAL'::text, 'CONTRADICTION'::text])),
  CONSTRAINT discovery_evidence_atom_brain_access_check CHECK (brain_access = false),
  CONSTRAINT discovery_evidence_atom_formulation_eligible_check CHECK (formulation_eligible = false),
  CONSTRAINT discovery_evidence_atom_trial_eligible_check CHECK (trial_eligible = false),
  CONSTRAINT discovery_evidence_atom_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT discovery_evidence_atom_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT discovery_evidence_atom_evidence_snapshot_id_fkey FOREIGN KEY (evidence_snapshot_id) REFERENCES country_core.country_source_evidence_snapshot(evidence_snapshot_id),
  CONSTRAINT discovery_evidence_atom_source_code_fkey FOREIGN KEY (source_code) REFERENCES country_core.country_source_registry(source_code),
  CONSTRAINT discovery_evidence_atom_pkey PRIMARY KEY (discovery_evidence_atom_id)
);
CREATE INDEX discovery_evidence_atom_run_idx ON country_core.discovery_evidence_atom USING btree (bootstrap_scan_run_id, atom_type);

-- owner: postgres
CREATE TABLE country_core.discovery_synthesis_result (
  discovery_synthesis_result_id uuid NOT NULL,
  country_workspace_id uuid NOT NULL,
  bootstrap_scan_run_id uuid NOT NULL,
  recipe_code text NOT NULL,
  recipe_version text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  investigation_rationale text NOT NULL,
  novelty_state text NOT NULL,
  prior_art_state text NOT NULL,
  display_state text NOT NULL,
  evidence_status text NOT NULL,
  coverage_state text NOT NULL,
  geographic_resolution text NOT NULL,
  impact_dimensions jsonb DEFAULT '[]'::jsonb NOT NULL,
  mechanism_chain jsonb DEFAULT '[]'::jsonb NOT NULL,
  evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
  self_challenge jsonb DEFAULT '[]'::jsonb NOT NULL,
  investigation_package jsonb DEFAULT '{}'::jsonb NOT NULL,
  quarantined boolean DEFAULT true NOT NULL,
  scientist_review_required boolean DEFAULT true NOT NULL,
  safety_review_required boolean DEFAULT true NOT NULL,
  brain_access boolean DEFAULT false NOT NULL,
  automatic_taxonomy_change boolean DEFAULT false NOT NULL,
  formulation_eligible boolean DEFAULT false NOT NULL,
  trial_eligible boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discovery_synthesis_result_automatic_taxonomy_change_check CHECK (automatic_taxonomy_change = false),
  CONSTRAINT discovery_synthesis_result_brain_access_check CHECK (brain_access = false),
  CONSTRAINT discovery_synthesis_result_display_state_check CHECK (display_state = ANY (ARRAY['HIGHLIGHT'::text, 'INTERNAL_ONLY'::text, 'WITHHELD'::text])),
  CONSTRAINT discovery_synthesis_result_formulation_eligible_check CHECK (formulation_eligible = false),
  CONSTRAINT discovery_synthesis_result_safety_review_required_check CHECK (safety_review_required = true),
  CONSTRAINT discovery_synthesis_result_scientist_review_required_check CHECK (scientist_review_required = true),
  CONSTRAINT discovery_synthesis_result_trial_eligible_check CHECK (trial_eligible = false),
  CONSTRAINT discovery_synthesis_result_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT discovery_synthesis_result_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT discovery_synthesis_result_pkey PRIMARY KEY (discovery_synthesis_result_id)
);
CREATE INDEX discovery_synthesis_result_recipe_idx ON country_core.discovery_synthesis_result USING btree (country_workspace_id, recipe_code, created_at DESC);
CREATE INDEX discovery_synthesis_result_run_idx ON country_core.discovery_synthesis_result USING btree (bootstrap_scan_run_id, display_state);

-- owner: postgres
CREATE TABLE country_core.email_outbox (
  email_outbox_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid,
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  subject_line text NOT NULL,
  template_code text NOT NULL,
  template_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  delivery_status text DEFAULT 'QUEUED'::text NOT NULL,
  attempt_count integer DEFAULT 0 NOT NULL,
  last_error text,
  queued_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  CONSTRAINT email_outbox_delivery_status_check CHECK (delivery_status = ANY (ARRAY['QUEUED'::text, 'SENDING'::text, 'SENT'::text, 'FAILED'::text, 'CANCELLED'::text])),
  CONSTRAINT email_outbox_email_type_check CHECK (email_type = ANY (ARRAY['COUNTRY_ACTIVATION'::text, 'USER_INVITATION'::text, 'ACCOUNT_VERIFICATION'::text, 'PASSWORD_RESET'::text, 'SECURITY_ALERT'::text, 'ACTION_NOTIFICATION'::text, 'REGULATORY_ALERT'::text])),
  CONSTRAINT email_outbox_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT email_outbox_pkey PRIMARY KEY (email_outbox_id)
);

-- owner: postgres
CREATE TABLE country_core.entity_sharing_grant (
  entity_sharing_grant_id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_sharing_policy_id uuid NOT NULL,
  grantee_organization_id uuid,
  grantee_country_workspace_id uuid,
  permission_scope text DEFAULT 'READ'::text NOT NULL,
  expires_at timestamp with time zone,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT entity_sharing_grant_check CHECK (grantee_organization_id IS NOT NULL OR grantee_country_workspace_id IS NOT NULL),
  CONSTRAINT entity_sharing_grant_permission_scope_check CHECK (permission_scope = ANY (ARRAY['READ'::text, 'COLLABORATE'::text, 'MANUFACTURE'::text, 'REGULATORY_REVIEW'::text])),
  CONSTRAINT entity_sharing_grant_entity_sharing_policy_id_fkey FOREIGN KEY (entity_sharing_policy_id) REFERENCES country_core.entity_sharing_policy(entity_sharing_policy_id) ON DELETE CASCADE,
  CONSTRAINT entity_sharing_grant_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT entity_sharing_grant_grantee_country_workspace_id_fkey FOREIGN KEY (grantee_country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT entity_sharing_grant_grantee_organization_id_fkey FOREIGN KEY (grantee_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT entity_sharing_grant_pkey PRIMARY KEY (entity_sharing_grant_id)
);

-- owner: postgres
CREATE TABLE country_core.entity_sharing_policy (
  entity_sharing_policy_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  owner_organization_id uuid NOT NULL,
  owner_workspace_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  sharing_classification_code text NOT NULL,
  ip_owner_name text,
  confidentiality_note text,
  licence_summary text,
  set_by uuid NOT NULL,
  set_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT entity_sharing_policy_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT entity_sharing_policy_owner_organization_id_fkey FOREIGN KEY (owner_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT entity_sharing_policy_owner_workspace_id_fkey FOREIGN KEY (owner_workspace_id) REFERENCES country_core.organization_workspace(organization_workspace_id),
  CONSTRAINT entity_sharing_policy_set_by_fkey FOREIGN KEY (set_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT entity_sharing_policy_sharing_classification_code_fkey FOREIGN KEY (sharing_classification_code) REFERENCES country_core.sharing_classification(sharing_classification_code),
  CONSTRAINT entity_sharing_policy_pkey PRIMARY KEY (entity_sharing_policy_id),
  CONSTRAINT entity_sharing_policy_entity_type_entity_id_key UNIQUE (entity_type, entity_id)
);
CREATE INDEX ix_entity_sharing_owner ON country_core.entity_sharing_policy USING btree (country_workspace_id, owner_organization_id);

-- owner: postgres
CREATE TABLE country_core.global_ingredient_knowledge (
  global_ingredient_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingredient_code text NOT NULL,
  ingredient_name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (lower(regexp_replace(ingredient_name, '[^a-zA-Z0-9]+'::text, ''::text, 'g'::text))) STORED,
  knowledge_category text NOT NULL,
  material_class text NOT NULL,
  source_origin text NOT NULL,
  source_reference text,
  starter_status text DEFAULT 'REFERENCE_UNREVIEWED'::text NOT NULL,
  scientific_note text NOT NULL,
  universal_availability_claimed boolean DEFAULT false NOT NULL,
  universal_regulatory_approval_claimed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT global_ingredient_knowledge_source_origin_check CHECK (source_origin = ANY (ARRAY['USER_STARTER_FILE'::text, 'AAB_CURATED_STARTER'::text, 'LATER_SCIENTIFIC_IMPORT'::text])),
  CONSTRAINT global_ingredient_knowledge_starter_status_check CHECK (starter_status = ANY (ARRAY['REFERENCE_UNREVIEWED'::text, 'SCIENTIST_REVIEWED'::text, 'ARCHIVED'::text])),
  CONSTRAINT global_ingredient_knowledge_pkey PRIMARY KEY (global_ingredient_id),
  CONSTRAINT global_ingredient_knowledge_ingredient_code_key UNIQUE (ingredient_code),
  CONSTRAINT global_ingredient_knowledge_normalized_name_key UNIQUE (normalized_name)
);

-- owner: postgres
CREATE TABLE country_core.impact_metric_definition (
  metric_code text NOT NULL,
  metric_name text NOT NULL,
  metric_category text NOT NULL,
  unit text,
  evidence_rule text NOT NULL,
  value_class text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT impact_metric_definition_value_class_check CHECK (value_class = ANY (ARRAY['MEASURED'::text, 'VERIFIED'::text, 'MODELLED'::text, 'ESTIMATED'::text, 'COUNT'::text, 'UNKNOWN'::text])),
  CONSTRAINT impact_metric_definition_pkey PRIMARY KEY (metric_code)
);

-- owner: postgres
CREATE TABLE country_core.institution_metric_definition (
  institution_metric_definition_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  local_metric_code text NOT NULL,
  local_metric_name text NOT NULL,
  local_metric_description text,
  value_type text NOT NULL,
  source_unit_code text,
  global_metric_definition_id uuid,
  method_or_protocol_reference text,
  normalization_status text DEFAULT 'LOCAL_ONLY'::text NOT NULL,
  review_status text DEFAULT 'INSTITUTION_DEFINED'::text NOT NULL,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT institution_metric_definition_normalization_status_check CHECK (normalization_status = ANY (ARRAY['MAPPED_TO_GLOBAL'::text, 'LOCAL_ONLY'::text, 'REVIEW_REQUIRED'::text])),
  CONSTRAINT institution_metric_definition_review_status_check CHECK (review_status = ANY (ARRAY['INSTITUTION_DEFINED'::text, 'UNDER_REVIEW'::text, 'APPROVED_FOR_INSTITUTION'::text, 'REJECTED'::text, 'RETIRED'::text])),
  CONSTRAINT institution_metric_definition_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT institution_metric_definition_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT institution_metric_definition_global_metric_definition_id_fkey FOREIGN KEY (global_metric_definition_id) REFERENCES agriculture.metric_definition(metric_definition_id),
  CONSTRAINT institution_metric_definition_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT institution_metric_definition_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT institution_metric_definition_pkey PRIMARY KEY (institution_metric_definition_id),
  CONSTRAINT institution_metric_definition_organization_id_local_metric__key UNIQUE (organization_id, local_metric_code)
);

-- owner: postgres
CREATE TABLE country_core.institution_scientific_settings (
  institution_scientific_settings_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  default_language text DEFAULT 'en'::text NOT NULL,
  default_timezone text DEFAULT 'UTC'::text NOT NULL,
  canonical_units_enforced boolean DEFAULT true NOT NULL,
  preserve_source_measurements boolean DEFAULT true NOT NULL,
  custom_units_allowed boolean DEFAULT true NOT NULL,
  custom_metrics_allowed boolean DEFAULT true NOT NULL,
  custom_unit_review_required boolean DEFAULT true NOT NULL,
  custom_metric_review_required boolean DEFAULT true NOT NULL,
  setup_status text DEFAULT 'NOT_CONFIGURED'::text NOT NULL,
  notes text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT institution_scientific_settings_setup_status_check CHECK (setup_status = ANY (ARRAY['NOT_CONFIGURED'::text, 'IN_PROGRESS'::text, 'CONFIGURED'::text, 'UNDER_REVIEW'::text])),
  CONSTRAINT institution_scientific_settings_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT institution_scientific_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT institution_scientific_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT institution_scientific_settings_pkey PRIMARY KEY (institution_scientific_settings_id),
  CONSTRAINT institution_scientific_settings_organization_id_key UNIQUE (organization_id)
);

-- owner: postgres
CREATE TABLE country_core.institution_unit_definition (
  institution_unit_definition_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  unit_code text NOT NULL,
  unit_name text NOT NULL,
  unit_symbol text NOT NULL,
  quantity_kind text NOT NULL,
  canonical_unit text,
  conversion_multiplier numeric,
  conversion_offset numeric DEFAULT 0 NOT NULL,
  normalization_status text DEFAULT 'NOT_NORMALISED'::text NOT NULL,
  definition_summary text NOT NULL,
  evidence_or_standard_reference text,
  review_status text DEFAULT 'INSTITUTION_DEFINED'::text NOT NULL,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT institution_unit_definition_normalization_status_check CHECK (normalization_status = ANY (ARRAY['CANONICAL'::text, 'NORMALISED'::text, 'NOT_NORMALISED'::text, 'REVIEW_REQUIRED'::text])),
  CONSTRAINT institution_unit_definition_review_status_check CHECK (review_status = ANY (ARRAY['INSTITUTION_DEFINED'::text, 'UNDER_REVIEW'::text, 'APPROVED_FOR_INSTITUTION'::text, 'REJECTED'::text, 'RETIRED'::text])),
  CONSTRAINT institution_unit_definition_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT institution_unit_definition_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT institution_unit_definition_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT institution_unit_definition_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT institution_unit_definition_pkey PRIMARY KEY (institution_unit_definition_id),
  CONSTRAINT institution_unit_definition_organization_id_unit_code_key UNIQUE (organization_id, unit_code)
);

-- owner: postgres
CREATE TABLE country_core.ip_ownership_record (
  ip_ownership_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  owner_organization_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  ownership_type text NOT NULL,
  ownership_statement text NOT NULL,
  commercialisation_rights_summary text,
  jurisdiction_note text,
  effective_at timestamp with time zone DEFAULT now() NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ip_ownership_record_ownership_type_check CHECK (ownership_type = ANY (ARRAY['MATERIAL'::text, 'DATA'::text, 'FORMULATION'::text, 'METHOD'::text, 'DISCOVERY'::text, 'PATENT'::text, 'TRADE_SECRET'::text, 'COPYRIGHT'::text, 'KNOW_HOW'::text, 'OTHER'::text])),
  CONSTRAINT ip_ownership_record_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT ip_ownership_record_owner_organization_id_fkey FOREIGN KEY (owner_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT ip_ownership_record_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT ip_ownership_record_pkey PRIMARY KEY (ip_ownership_record_id)
);

-- owner: postgres
CREATE TABLE country_core.legal_acceptance_receipt (
  legal_acceptance_receipt_id uuid DEFAULT gen_random_uuid() NOT NULL,
  legal_document_version_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  country_workspace_id uuid,
  country_invitation_id uuid,
  role_at_acceptance text NOT NULL,
  acceptance_statement text NOT NULL,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  document_sha256 text NOT NULL,
  CONSTRAINT legal_acceptance_receipt_document_sha256_check CHECK (document_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT legal_acceptance_receipt_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT legal_acceptance_receipt_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT legal_acceptance_receipt_country_invitation_id_fkey FOREIGN KEY (country_invitation_id) REFERENCES country_core.country_invitation(country_invitation_id),
  CONSTRAINT legal_acceptance_receipt_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT legal_acceptance_receipt_legal_document_version_id_fkey FOREIGN KEY (legal_document_version_id) REFERENCES country_core.legal_document_version(legal_document_version_id),
  CONSTRAINT legal_acceptance_receipt_pkey PRIMARY KEY (legal_acceptance_receipt_id),
  CONSTRAINT legal_acceptance_receipt_auth_user_id_legal_document_versio_key UNIQUE (auth_user_id, legal_document_version_id)
);

-- owner: postgres
CREATE TABLE country_core.legal_document_version (
  legal_document_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
  document_scope text NOT NULL,
  country_workspace_id uuid,
  title text NOT NULL,
  version_label text NOT NULL,
  language_code text DEFAULT 'en'::text NOT NULL,
  document_status text DEFAULT 'DRAFT'::text NOT NULL,
  storage_bucket text,
  storage_path text,
  document_sha256 text,
  effective_at timestamp with time zone,
  published_at timestamp with time zone,
  retired_at timestamp with time zone,
  material_change boolean DEFAULT true NOT NULL,
  requires_reacceptance boolean DEFAULT true NOT NULL,
  uploaded_by uuid,
  certified_by uuid,
  certification_statement text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  document_id text,
  environment_classification text,
  legal_effect text,
  production_eligible boolean DEFAULT true NOT NULL,
  government_authority_verified boolean DEFAULT false NOT NULL,
  acknowledgement_type text,
  CONSTRAINT legal_document_version_check CHECK (document_scope = 'AAB_PLATFORM'::text AND country_workspace_id IS NULL OR document_scope = 'COUNTRY'::text AND country_workspace_id IS NOT NULL),
  CONSTRAINT legal_document_version_check1 CHECK (document_status = 'DRAFT'::text OR storage_bucket IS NOT NULL AND storage_path IS NOT NULL AND document_sha256 IS NOT NULL AND effective_at IS NOT NULL AND published_at IS NOT NULL),
  CONSTRAINT legal_document_version_document_scope_check CHECK (document_scope = ANY (ARRAY['AAB_PLATFORM'::text, 'COUNTRY'::text])),
  CONSTRAINT legal_document_version_document_sha256_check CHECK (document_sha256 IS NULL OR document_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT legal_document_version_document_status_check CHECK (document_status = ANY (ARRAY['DRAFT'::text, 'PUBLISHED'::text, 'RETIRED'::text])),
  CONSTRAINT legal_document_version_title_check CHECK (length(btrim(title)) >= 3 AND length(btrim(title)) <= 240),
  CONSTRAINT legal_document_version_version_label_check CHECK (length(btrim(version_label)) >= 1 AND length(btrim(version_label)) <= 80),
  CONSTRAINT legal_document_version_certified_by_fkey FOREIGN KEY (certified_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT legal_document_version_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT legal_document_version_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT legal_document_version_pkey PRIMARY KEY (legal_document_version_id)
);
CREATE UNIQUE INDEX legal_document_aab_version_uq ON country_core.legal_document_version USING btree (version_label) WHERE (document_scope = 'AAB_PLATFORM'::text);
CREATE UNIQUE INDEX legal_document_country_version_uq ON country_core.legal_document_version USING btree (country_workspace_id, version_label) WHERE (document_scope = 'COUNTRY'::text);
CREATE UNIQUE INDEX legal_document_one_published_aab_uq ON country_core.legal_document_version USING btree (document_scope) WHERE ((document_scope = 'AAB_PLATFORM'::text) AND (document_status = 'PUBLISHED'::text));
CREATE UNIQUE INDEX legal_document_one_published_country_uq ON country_core.legal_document_version USING btree (country_workspace_id) WHERE ((document_scope = 'COUNTRY'::text) AND (document_status = 'PUBLISHED'::text));

-- owner: postgres
CREATE TABLE country_core.national_objective (
  national_objective_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  objective_code text NOT NULL,
  objective_title text NOT NULL,
  objective_description text NOT NULL,
  priority text DEFAULT 'HIGH'::text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  target_summary text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT national_objective_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'PAUSED'::text, 'ACHIEVED'::text, 'ARCHIVED'::text])),
  CONSTRAINT national_objective_priority_check CHECK (priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT national_objective_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT national_objective_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT national_objective_pkey PRIMARY KEY (national_objective_id),
  CONSTRAINT national_objective_country_workspace_id_objective_code_key UNIQUE (country_workspace_id, objective_code)
);

-- owner: postgres
CREATE TABLE country_core.notification (
  notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid,
  actor_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text DEFAULT 'INFO'::text NOT NULL,
  source_entity_type text,
  source_entity_id uuid,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT notification_severity_check CHECK (severity = ANY (ARRAY['INFO'::text, 'SUCCESS'::text, 'WARNING'::text, 'CRITICAL'::text])),
  CONSTRAINT notification_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT notification_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT notification_pkey PRIMARY KEY (notification_id)
);
CREATE INDEX ix_notification_actor_unread ON country_core.notification USING btree (actor_id, read_at, created_at DESC);

-- owner: postgres
CREATE TABLE country_core.objective_impact_link (
  national_objective_id uuid NOT NULL,
  metric_code text NOT NULL,
  relationship_summary text NOT NULL,
  CONSTRAINT objective_impact_link_metric_code_fkey FOREIGN KEY (metric_code) REFERENCES country_core.impact_metric_definition(metric_code),
  CONSTRAINT objective_impact_link_national_objective_id_fkey FOREIGN KEY (national_objective_id) REFERENCES country_core.national_objective(national_objective_id) ON DELETE CASCADE,
  CONSTRAINT objective_impact_link_pkey PRIMARY KEY (national_objective_id, metric_code)
);

-- owner: postgres
CREATE TABLE country_core.onboarding_profile (
  actor_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  full_name text NOT NULL,
  official_position text NOT NULL,
  institution_name text,
  country_workspace_id uuid,
  profile_status text DEFAULT 'LEGAL_PENDING'::text NOT NULL,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT onboarding_profile_full_name_check CHECK (length(btrim(full_name)) >= 2 AND length(btrim(full_name)) <= 180),
  CONSTRAINT onboarding_profile_official_position_check CHECK (length(btrim(official_position)) >= 2 AND length(btrim(official_position)) <= 180),
  CONSTRAINT onboarding_profile_profile_status_check CHECK (profile_status = ANY (ARRAY['LEGAL_PENDING'::text, 'ACTIVE'::text, 'SUSPENDED'::text])),
  CONSTRAINT onboarding_profile_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT onboarding_profile_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT onboarding_profile_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT onboarding_profile_pkey PRIMARY KEY (actor_id),
  CONSTRAINT onboarding_profile_auth_user_id_key UNIQUE (auth_user_id)
);

-- owner: postgres
CREATE TABLE country_core.organization (
  organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_code text NOT NULL,
  organization_name text NOT NULL,
  organization_type text NOT NULL,
  parent_organization_id uuid,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT organization_organization_type_check CHECK (organization_type = ANY (ARRAY['GOVERNMENT'::text, 'UNIVERSITY'::text, 'RESEARCH_INSTITUTE'::text, 'LABORATORY'::text, 'SCHOOL'::text, 'COMMERCIAL_PARTNER'::text, 'MANUFACTURER'::text, 'NGO'::text, 'FARMER_ORGANIZATION'::text, 'OTHER'::text])),
  CONSTRAINT organization_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT organization_parent_organization_id_fkey FOREIGN KEY (parent_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT organization_pkey PRIMARY KEY (organization_id),
  CONSTRAINT organization_country_workspace_id_organization_code_key UNIQUE (country_workspace_id, organization_code)
);

-- owner: postgres
CREATE TABLE country_core.organization_membership (
  organization_membership_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  organization_role text NOT NULL,
  membership_status text DEFAULT 'ACTIVE'::text NOT NULL,
  can_manage_organization boolean DEFAULT false NOT NULL,
  can_share_records boolean DEFAULT false NOT NULL,
  can_receive_manufacturing_transfers boolean DEFAULT false NOT NULL,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone,
  CONSTRAINT organization_membership_membership_status_check CHECK (membership_status = ANY (ARRAY['INVITED'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text])),
  CONSTRAINT organization_membership_organization_role_check CHECK (organization_role = ANY (ARRAY['ORGANIZATION_HEAD'::text, 'ADMIN'::text, 'SCIENTIST'::text, 'RESEARCHER'::text, 'LAB_TECHNICIAN'::text, 'MANUFACTURING_MANAGER'::text, 'QUALITY_MANAGER'::text, 'REGULATORY'::text, 'AUDITOR'::text, 'TEACHER'::text, 'STUDENT'::text, 'VIEWER'::text])),
  CONSTRAINT organization_membership_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT organization_membership_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT organization_membership_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT organization_membership_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT organization_membership_pkey PRIMARY KEY (organization_membership_id),
  CONSTRAINT organization_membership_organization_id_actor_id_key UNIQUE (organization_id, actor_id)
);
CREATE INDEX ix_org_membership_actor ON country_core.organization_membership USING btree (actor_id, country_workspace_id);

-- owner: postgres
CREATE TABLE country_core.organization_workspace (
  organization_workspace_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  workspace_code text NOT NULL,
  workspace_name text NOT NULL,
  workspace_type text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  default_sharing_classification text DEFAULT 'PRIVATE_TO_ORGANIZATION'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT organization_workspace_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'ARCHIVED'::text])),
  CONSTRAINT organization_workspace_workspace_type_check CHECK (workspace_type = ANY (ARRAY['INSTITUTION'::text, 'DEPARTMENT'::text, 'LAB'::text, 'PROJECT'::text, 'RESEARCH_PROGRAM'::text, 'MANUFACTURING_SITE'::text, 'SCHOOL_PROGRAM'::text, 'OTHER'::text])),
  CONSTRAINT organization_workspace_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT organization_workspace_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT organization_workspace_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT organization_workspace_pkey PRIMARY KEY (organization_workspace_id),
  CONSTRAINT organization_workspace_country_workspace_id_workspace_code_key UNIQUE (country_workspace_id, workspace_code)
);
CREATE INDEX ix_org_workspace_country_org ON country_core.organization_workspace USING btree (country_workspace_id, organization_id);

-- owner: postgres
CREATE TABLE country_core.regulatory_access_event (
  regulatory_access_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  event_type text NOT NULL,
  event_summary text NOT NULL,
  source_ip_hash text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT regulatory_access_event_event_type_check CHECK (event_type = ANY (ARRAY['ACCESS_GRANTED'::text, 'ACCESS_DENIED'::text, 'REAUTHENTICATED'::text, 'CONFIG_CHANGED'::text, 'RULE_CHANGED'::text, 'DOSSIER_OPENED'::text, 'EXPORT_REQUESTED'::text])),
  CONSTRAINT regulatory_access_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT regulatory_access_event_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT regulatory_access_event_pkey PRIMARY KEY (regulatory_access_event_id)
);

-- owner: postgres
CREATE TABLE country_core.regulatory_security_gate (
  country_workspace_id uuid NOT NULL,
  gate_status text DEFAULT 'SETUP_REQUIRED'::text NOT NULL,
  reauthentication_required boolean DEFAULT true NOT NULL,
  mfa_required boolean DEFAULT true NOT NULL,
  second_reviewer_required boolean DEFAULT true NOT NULL,
  configured_by uuid,
  configured_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT regulatory_security_gate_gate_status_check CHECK (gate_status = ANY (ARRAY['SETUP_REQUIRED'::text, 'ACTIVE'::text, 'SUSPENDED'::text])),
  CONSTRAINT regulatory_security_gate_configured_by_fkey FOREIGN KEY (configured_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT regulatory_security_gate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT regulatory_security_gate_pkey PRIMARY KEY (country_workspace_id)
);

-- owner: postgres
CREATE TABLE country_core.rehearsal_acknowledgement_receipt (
  rehearsal_acknowledgement_receipt_id uuid DEFAULT gen_random_uuid() NOT NULL,
  acknowledgement_type text NOT NULL,
  legal_document_version_id uuid NOT NULL,
  country_activation_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  document_sha256 text NOT NULL,
  acknowledgement_statement text NOT NULL,
  environment_classification text NOT NULL,
  legal_effect text NOT NULL,
  production_eligible boolean DEFAULT false NOT NULL,
  government_authority_verified boolean DEFAULT false NOT NULL,
  external_invitation_authority boolean DEFAULT false NOT NULL,
  scientific_authority_granted boolean DEFAULT false NOT NULL,
  automatic_promotion_allowed boolean DEFAULT false NOT NULL,
  acknowledged_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rehearsal_acknowledgement_re_external_invitation_authorit_check CHECK (NOT external_invitation_authority),
  CONSTRAINT rehearsal_acknowledgement_re_government_authority_verifie_check CHECK (NOT government_authority_verified),
  CONSTRAINT rehearsal_acknowledgement_re_scientific_authority_granted_check CHECK (NOT scientific_authority_granted),
  CONSTRAINT rehearsal_acknowledgement_rec_automatic_promotion_allowed_check CHECK (NOT automatic_promotion_allowed),
  CONSTRAINT rehearsal_acknowledgement_rece_environment_classification_check CHECK (environment_classification = 'WA_CLEAN_ROOM_TEST'::text),
  CONSTRAINT rehearsal_acknowledgement_receipt_acknowledgement_type_check CHECK (acknowledgement_type = 'REHEARSAL_ACKNOWLEDGEMENT'::text),
  CONSTRAINT rehearsal_acknowledgement_receipt_document_sha256_check CHECK (document_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT rehearsal_acknowledgement_receipt_legal_effect_check CHECK (legal_effect = 'NONE_TEST_ONLY'::text),
  CONSTRAINT rehearsal_acknowledgement_receipt_production_eligible_check CHECK (NOT production_eligible),
  CONSTRAINT rehearsal_acknowledgement_receip_legal_document_version_id_fkey FOREIGN KEY (legal_document_version_id) REFERENCES country_core.legal_document_version(legal_document_version_id),
  CONSTRAINT rehearsal_acknowledgement_receipt_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT rehearsal_acknowledgement_receipt_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT rehearsal_acknowledgement_receipt_country_activation_id_fkey FOREIGN KEY (country_activation_id) REFERENCES country_core.country_activation(country_activation_id),
  CONSTRAINT rehearsal_acknowledgement_receipt_pkey PRIMARY KEY (rehearsal_acknowledgement_receipt_id),
  CONSTRAINT rehearsal_acknowledgement_rec_auth_user_id_legal_document_v_key UNIQUE (auth_user_id, legal_document_version_id, country_activation_id)
);

-- owner: postgres
CREATE TABLE country_core.rehearsal_activation_reissue (
  rehearsal_activation_reissue_id uuid DEFAULT gen_random_uuid() NOT NULL,
  rehearsal_provisioning_handoff_id uuid NOT NULL,
  original_activation_id uuid NOT NULL,
  replacement_activation_id uuid NOT NULL,
  reissue_reason text NOT NULL,
  classification text NOT NULL,
  government_authority_verified boolean DEFAULT false NOT NULL,
  production_authority boolean DEFAULT false NOT NULL,
  legal_effect text DEFAULT 'NONE_TEST_ONLY'::text NOT NULL,
  external_invitations_locked boolean DEFAULT true NOT NULL,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rehearsal_activation_reissue_classification_check CHECK (classification = 'PERSONAL_WA_REHEARSAL'::text),
  CONSTRAINT rehearsal_activation_reissue_external_invitations_locked_check CHECK (external_invitations_locked),
  CONSTRAINT rehearsal_activation_reissue_government_authority_verifie_check CHECK (NOT government_authority_verified),
  CONSTRAINT rehearsal_activation_reissue_legal_effect_check CHECK (legal_effect = 'NONE_TEST_ONLY'::text),
  CONSTRAINT rehearsal_activation_reissue_production_authority_check CHECK (NOT production_authority),
  CONSTRAINT rehearsal_activation_reissue_reissue_reason_check CHECK (reissue_reason = 'EXPIRED_UNCLAIMED'::text),
  CONSTRAINT rehearsal_activation_reissue_original_activation_id_fkey FOREIGN KEY (original_activation_id) REFERENCES country_core.country_activation(country_activation_id),
  CONSTRAINT rehearsal_activation_reissue_rehearsal_provisioning_handof_fkey FOREIGN KEY (rehearsal_provisioning_handoff_id) REFERENCES country_core.rehearsal_provisioning_handoff(rehearsal_provisioning_handoff_id),
  CONSTRAINT rehearsal_activation_reissue_replacement_activation_id_fkey FOREIGN KEY (replacement_activation_id) REFERENCES country_core.country_activation(country_activation_id),
  CONSTRAINT rehearsal_activation_reissue_pkey PRIMARY KEY (rehearsal_activation_reissue_id),
  CONSTRAINT rehearsal_activation_reissue_original_activation_id_key UNIQUE (original_activation_id),
  CONSTRAINT rehearsal_activation_reissue_replacement_activation_id_key UNIQUE (replacement_activation_id)
);

-- owner: postgres
CREATE TABLE country_core.rehearsal_otp_request_audit (
  rehearsal_otp_request_audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_activation_id uuid NOT NULL,
  request_correlation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  source_ip_sha256 text,
  outcome text NOT NULL,
  provider_status integer,
  failure_code text,
  CONSTRAINT rehearsal_otp_request_audit_outcome_check CHECK (outcome = ANY (ARRAY['REQUESTED'::text, 'SENT'::text, 'RATE_LIMITED'::text, 'REJECTED'::text, 'FAILED'::text])),
  CONSTRAINT rehearsal_otp_request_audit_country_activation_id_fkey FOREIGN KEY (country_activation_id) REFERENCES country_core.country_activation(country_activation_id),
  CONSTRAINT rehearsal_otp_request_audit_pkey PRIMARY KEY (rehearsal_otp_request_audit_id)
);
CREATE INDEX rehearsal_otp_request_audit_activation_time_idx ON country_core.rehearsal_otp_request_audit USING btree (country_activation_id, requested_at DESC);

-- owner: postgres
CREATE TABLE country_core.rehearsal_participant_acknowledgement (
  rehearsal_participant_acknowledgement_id uuid DEFAULT gen_random_uuid() NOT NULL,
  rehearsal_participant_invitation_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  acknowledgement_type text NOT NULL,
  acknowledgement_statement text NOT NULL,
  legal_effect text DEFAULT 'NONE_TEST_ONLY'::text NOT NULL,
  production_eligible boolean DEFAULT false NOT NULL,
  scientific_approval_authority boolean DEFAULT false NOT NULL,
  external_invitation_authority boolean DEFAULT false NOT NULL,
  acknowledged_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rehearsal_participant_acknow_external_invitation_authorit_check CHECK (NOT external_invitation_authority),
  CONSTRAINT rehearsal_participant_acknow_scientific_approval_authorit_check CHECK (NOT scientific_approval_authority),
  CONSTRAINT rehearsal_participant_acknowledgemen_acknowledgement_type_check CHECK (acknowledgement_type = 'INTERNAL_INSTITUTION_REHEARSAL_ACKNOWLEDGEMENT'::text),
  CONSTRAINT rehearsal_participant_acknowledgement_legal_effect_check CHECK (legal_effect = 'NONE_TEST_ONLY'::text),
  CONSTRAINT rehearsal_participant_acknowledgement_production_eligible_check CHECK (NOT production_eligible),
  CONSTRAINT rehearsal_participant_acknowl_rehearsal_participant_invita_fkey FOREIGN KEY (rehearsal_participant_invitation_id) REFERENCES country_core.rehearsal_participant_invitation(rehearsal_participant_invitation_id),
  CONSTRAINT rehearsal_participant_acknowledgement_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT rehearsal_participant_acknowledgement_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT rehearsal_participant_acknowledgement_pkey PRIMARY KEY (rehearsal_participant_acknowledgement_id),
  CONSTRAINT rehearsal_participant_acknowl_rehearsal_participant_invitat_key UNIQUE (rehearsal_participant_invitation_id)
);

-- owner: postgres
CREATE TABLE country_core.rehearsal_participant_invitation (
  rehearsal_participant_invitation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  organization_id uuid,
  invitation_kind text NOT NULL,
  institution_name text NOT NULL,
  institution_type text NOT NULL,
  invitee_name text NOT NULL,
  invite_email text NOT NULL,
  official_position text NOT NULL,
  proposed_role text NOT NULL,
  invitation_token_hash text NOT NULL,
  invitation_status text DEFAULT 'ISSUED'::text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  issued_by uuid NOT NULL,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  claimed_by uuid,
  claimed_auth_user_id uuid,
  claimed_at timestamp with time zone,
  accepted_at timestamp with time zone,
  classification text DEFAULT 'INTERNAL_INSTITUTION_REHEARSAL'::text NOT NULL,
  legal_effect text DEFAULT 'NONE_TEST_ONLY'::text NOT NULL,
  production_authority boolean DEFAULT false NOT NULL,
  government_authority boolean DEFAULT false NOT NULL,
  scientific_approval_authority boolean DEFAULT false NOT NULL,
  external_participation boolean DEFAULT false NOT NULL,
  CONSTRAINT rehearsal_participant_invita_scientific_approval_authorit_check CHECK (NOT scientific_approval_authority),
  CONSTRAINT rehearsal_participant_invitation_check CHECK (invitation_kind = 'INSTITUTION_ADMIN'::text AND proposed_role = 'INSTITUTION_ADMIN'::text AND ((invitation_status = ANY (ARRAY['ISSUED'::text, 'CLAIMED'::text, 'EXPIRED'::text, 'REVOKED'::text])) AND organization_id IS NULL OR invitation_status = 'ACCEPTED'::text AND organization_id IS NOT NULL) OR invitation_kind = 'TEAM_MEMBER'::text AND proposed_role <> 'INSTITUTION_ADMIN'::text AND organization_id IS NOT NULL),
  CONSTRAINT rehearsal_participant_invitation_classification_check CHECK (classification = 'INTERNAL_INSTITUTION_REHEARSAL'::text),
  CONSTRAINT rehearsal_participant_invitation_external_participation_check CHECK (NOT external_participation),
  CONSTRAINT rehearsal_participant_invitation_government_authority_check CHECK (NOT government_authority),
  CONSTRAINT rehearsal_participant_invitation_institution_name_check CHECK (length(btrim(institution_name)) >= 2 AND length(btrim(institution_name)) <= 240),
  CONSTRAINT rehearsal_participant_invitation_institution_type_check CHECK (institution_type = ANY (ARRAY['UNIVERSITY'::text, 'RESEARCH_INSTITUTE'::text, 'LABORATORY'::text, 'OTHER'::text])),
  CONSTRAINT rehearsal_participant_invitation_invitation_kind_check CHECK (invitation_kind = ANY (ARRAY['INSTITUTION_ADMIN'::text, 'TEAM_MEMBER'::text])),
  CONSTRAINT rehearsal_participant_invitation_invitation_status_check CHECK (invitation_status = ANY (ARRAY['ISSUED'::text, 'CLAIMED'::text, 'ACCEPTED'::text, 'EXPIRED'::text, 'REVOKED'::text])),
  CONSTRAINT rehearsal_participant_invitation_invite_email_check CHECK (invite_email = lower(invite_email)),
  CONSTRAINT rehearsal_participant_invitation_invitee_name_check CHECK (length(btrim(invitee_name)) >= 2 AND length(btrim(invitee_name)) <= 180),
  CONSTRAINT rehearsal_participant_invitation_legal_effect_check CHECK (legal_effect = 'NONE_TEST_ONLY'::text),
  CONSTRAINT rehearsal_participant_invitation_official_position_check CHECK (length(btrim(official_position)) >= 2 AND length(btrim(official_position)) <= 180),
  CONSTRAINT rehearsal_participant_invitation_production_authority_check CHECK (NOT production_authority),
  CONSTRAINT rehearsal_participant_invitation_claimed_auth_user_id_fkey FOREIGN KEY (claimed_auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT rehearsal_participant_invitation_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT rehearsal_participant_invitation_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT rehearsal_participant_invitation_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT rehearsal_participant_invitation_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT rehearsal_participant_invitation_pkey PRIMARY KEY (rehearsal_participant_invitation_id)
);
CREATE UNIQUE INDEX rehearsal_participant_one_open_email_uq ON country_core.rehearsal_participant_invitation USING btree (country_workspace_id, lower(invite_email), invitation_kind) WHERE (invitation_status = ANY (ARRAY['ISSUED'::text, 'CLAIMED'::text]));

-- owner: postgres
CREATE TABLE country_core.rehearsal_participant_otp_audit (
  rehearsal_participant_otp_audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
  rehearsal_participant_invitation_id uuid NOT NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  source_ip_sha256 text,
  outcome text NOT NULL,
  provider_status integer,
  failure_code text,
  CONSTRAINT rehearsal_participant_otp_audit_outcome_check CHECK (outcome = ANY (ARRAY['REQUESTED'::text, 'SENT'::text, 'FAILED'::text, 'RATE_LIMITED'::text])),
  CONSTRAINT rehearsal_participant_otp_aud_rehearsal_participant_invita_fkey FOREIGN KEY (rehearsal_participant_invitation_id) REFERENCES country_core.rehearsal_participant_invitation(rehearsal_participant_invitation_id),
  CONSTRAINT rehearsal_participant_otp_audit_pkey PRIMARY KEY (rehearsal_participant_otp_audit_id)
);

-- owner: postgres
CREATE TABLE country_core.rehearsal_provisioning_handoff (
  rehearsal_provisioning_handoff_id uuid DEFAULT gen_random_uuid() NOT NULL,
  handoff_correlation_id uuid NOT NULL,
  source_participation_request_id uuid,
  source_control_plane_decision_id uuid NOT NULL,
  classification text NOT NULL,
  nominated_test_head_admin_email text NOT NULL,
  document_version_id uuid NOT NULL,
  document_sha256 text NOT NULL,
  government_authority_verified boolean DEFAULT false NOT NULL,
  production_authority boolean DEFAULT false NOT NULL,
  legal_effect text DEFAULT 'NONE_TEST_ONLY'::text NOT NULL,
  external_invitations_locked boolean DEFAULT true NOT NULL,
  activation_id uuid NOT NULL,
  handoff_status text DEFAULT 'READY'::text NOT NULL,
  received_at timestamp with time zone DEFAULT now() NOT NULL,
  source_internal_rehearsal_nomination_id uuid,
  CONSTRAINT rehearsal_provisioning_hando_government_authority_verifie_check CHECK (NOT government_authority_verified),
  CONSTRAINT rehearsal_provisioning_handof_external_invitations_locked_check CHECK (external_invitations_locked),
  CONSTRAINT rehearsal_provisioning_handoff_classification_check CHECK (classification = 'PERSONAL_WA_REHEARSAL'::text),
  CONSTRAINT rehearsal_provisioning_handoff_document_sha256_check CHECK (document_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT rehearsal_provisioning_handoff_exactly_one_source_check CHECK (num_nonnulls(source_participation_request_id, source_internal_rehearsal_nomination_id) = 1),
  CONSTRAINT rehearsal_provisioning_handoff_handoff_status_check CHECK (handoff_status = ANY (ARRAY['READY'::text, 'CLAIMED'::text, 'ACTIVATED'::text, 'REVOKED'::text])),
  CONSTRAINT rehearsal_provisioning_handoff_legal_effect_check CHECK (legal_effect = 'NONE_TEST_ONLY'::text),
  CONSTRAINT rehearsal_provisioning_handoff_production_authority_check CHECK (NOT production_authority),
  CONSTRAINT rehearsal_provisioning_handoff_activation_id_fkey FOREIGN KEY (activation_id) REFERENCES country_core.country_activation(country_activation_id),
  CONSTRAINT rehearsal_provisioning_handoff_document_version_id_fkey FOREIGN KEY (document_version_id) REFERENCES country_core.legal_document_version(legal_document_version_id),
  CONSTRAINT rehearsal_provisioning_handoff_pkey PRIMARY KEY (rehearsal_provisioning_handoff_id),
  CONSTRAINT rehearsal_provisioning_handof_source_control_plane_decision_key UNIQUE (source_control_plane_decision_id),
  CONSTRAINT rehearsal_provisioning_handoff_handoff_correlation_id_key UNIQUE (handoff_correlation_id)
);

-- owner: postgres
CREATE TABLE country_core.rehearsal_role_catalog (
  role_code text NOT NULL,
  role_name text NOT NULL,
  description text NOT NULL,
  organization_role text NOT NULL,
  can_prepare_research boolean DEFAULT false NOT NULL,
  can_record_observations boolean DEFAULT false NOT NULL,
  can_review_quality boolean DEFAULT false NOT NULL,
  can_administer_team boolean DEFAULT false NOT NULL,
  can_approve_science boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT rehearsal_role_catalog_can_administer_team_check CHECK (NOT can_administer_team),
  CONSTRAINT rehearsal_role_catalog_can_approve_science_check CHECK (NOT can_approve_science),
  CONSTRAINT rehearsal_role_catalog_organization_role_check CHECK (organization_role = ANY (ARRAY['SCIENTIST'::text, 'RESEARCHER'::text, 'LAB_TECHNICIAN'::text, 'QUALITY_MANAGER'::text, 'AUDITOR'::text, 'VIEWER'::text])),
  CONSTRAINT rehearsal_role_catalog_role_code_check CHECK (role_code = ANY (ARRAY['SCIENTIST'::text, 'RESEARCHER'::text, 'LAB_TECHNICIAN'::text, 'QUALITY_REVIEWER'::text, 'AUDITOR'::text, 'VIEWER'::text])),
  CONSTRAINT rehearsal_role_catalog_pkey PRIMARY KEY (role_code)
);

-- owner: postgres
CREATE TABLE country_core.security_event (
  security_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid,
  country_workspace_id uuid,
  event_type text NOT NULL,
  event_summary text NOT NULL,
  event_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT security_event_event_type_check CHECK (event_type = ANY (ARRAY['LOGIN'::text, 'LOGOUT'::text, 'PASSWORD_CHANGED'::text, 'PASSWORD_RESET_REQUESTED'::text, 'PASSWORD_RESET_COMPLETED'::text, 'EMAIL_VERIFIED'::text, 'INVITATION_ACCEPTED'::text, 'SESSION_REVOKED'::text, 'ROLE_CHANGED'::text, 'MFA_CHANGED'::text, 'RECOVERY_CHANGED'::text])),
  CONSTRAINT security_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT security_event_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT security_event_pkey PRIMARY KEY (security_event_id)
);

-- owner: postgres
CREATE TABLE country_core.sharing_classification (
  sharing_classification_code text NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL,
  raw_data_external_visibility boolean DEFAULT false NOT NULL,
  cross_country_allowed boolean DEFAULT false NOT NULL,
  public_allowed boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT sharing_classification_pkey PRIMARY KEY (sharing_classification_code)
);

-- owner: postgres
CREATE TABLE country_core.spatial_acquisition (
  spatial_acquisition_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_scan_profile_id uuid NOT NULL,
  spatial_source_connection_id uuid NOT NULL,
  bootstrap_scan_run_id uuid,
  external_scene_id text NOT NULL,
  collection_code text NOT NULL,
  acquired_at timestamp with time zone,
  footprint_geojson jsonb DEFAULT '{}'::jsonb NOT NULL,
  cloud_cover_percent numeric,
  asset_manifest jsonb DEFAULT '{}'::jsonb NOT NULL,
  qualification_status text NOT NULL,
  qualification_reason text,
  checksum text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT spatial_acquisition_qualification_status_check CHECK (qualification_status = ANY (ARRAY['DISCOVERED'::text, 'QUALIFIED'::text, 'REJECTED'::text, 'PROCESSING'::text, 'PROCESSED'::text, 'FAILED'::text])),
  CONSTRAINT spatial_acquisition_bootstrap_scan_run_id_fkey FOREIGN KEY (bootstrap_scan_run_id) REFERENCES country_core.bootstrap_scan_run(bootstrap_scan_run_id),
  CONSTRAINT spatial_acquisition_country_scan_profile_id_fkey FOREIGN KEY (country_scan_profile_id) REFERENCES country_core.country_scan_profile(country_scan_profile_id) ON DELETE CASCADE,
  CONSTRAINT spatial_acquisition_spatial_source_connection_id_fkey FOREIGN KEY (spatial_source_connection_id) REFERENCES country_core.spatial_source_connection(spatial_source_connection_id),
  CONSTRAINT spatial_acquisition_pkey PRIMARY KEY (spatial_acquisition_id),
  CONSTRAINT spatial_acquisition_country_scan_profile_id_external_scene__key UNIQUE (country_scan_profile_id, external_scene_id)
);
CREATE INDEX spatial_acquisition_profile_time_idx ON country_core.spatial_acquisition USING btree (country_scan_profile_id, acquired_at DESC);
CREATE INDEX spatial_acquisition_run_idx ON country_core.spatial_acquisition USING btree (bootstrap_scan_run_id) WHERE (bootstrap_scan_run_id IS NOT NULL);
CREATE INDEX spatial_acquisition_source_idx ON country_core.spatial_acquisition USING btree (spatial_source_connection_id);
CREATE INDEX spatial_acquisition_status_idx ON country_core.spatial_acquisition USING btree (qualification_status);

-- owner: postgres
CREATE TABLE country_core.spatial_computed_observation (
  spatial_computed_observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  spatial_acquisition_id uuid NOT NULL,
  country_workspace_id uuid NOT NULL,
  observation_code text NOT NULL,
  metric_code text NOT NULL,
  metric_value numeric,
  metric_unit text,
  method_version text NOT NULL,
  area_of_interest_geojson jsonb DEFAULT '{}'::jsonb NOT NULL,
  computation_parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
  quality_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
  evidence_status text NOT NULL,
  computed_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  CONSTRAINT spatial_computed_observation_evidence_status_check CHECK (evidence_status = ANY (ARRAY['COMPUTED_UNVALIDATED'::text, 'REVIEW_REQUIRED'::text, 'VALIDATED'::text, 'REJECTED'::text])),
  CONSTRAINT spatial_computed_observation_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id) ON DELETE CASCADE,
  CONSTRAINT spatial_computed_observation_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT spatial_computed_observation_spatial_acquisition_id_fkey FOREIGN KEY (spatial_acquisition_id) REFERENCES country_core.spatial_acquisition(spatial_acquisition_id) ON DELETE CASCADE,
  CONSTRAINT spatial_computed_observation_pkey PRIMARY KEY (spatial_computed_observation_id),
  CONSTRAINT spatial_computed_observation_spatial_acquisition_id_observa_key UNIQUE (spatial_acquisition_id, observation_code, method_version)
);
CREATE INDEX spatial_observation_metric_idx ON country_core.spatial_computed_observation USING btree (metric_code, computed_at DESC);
CREATE INDEX spatial_observation_reviewed_by_idx ON country_core.spatial_computed_observation USING btree (reviewed_by) WHERE (reviewed_by IS NOT NULL);
CREATE INDEX spatial_observation_workspace_status_idx ON country_core.spatial_computed_observation USING btree (country_workspace_id, evidence_status);

-- owner: postgres
CREATE TABLE country_core.spatial_investigation_area (
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
  CONSTRAINT spatial_investigation_area_area_mode_check CHECK (area_mode = ANY (ARRAY['STATE'::text, 'REGION'::text, 'CUSTOM'::text])),
  CONSTRAINT spatial_investigation_area_area_name_check CHECK (length(btrim(area_name)) >= 3 AND length(btrim(area_name)) <= 120),
  CONSTRAINT spatial_investigation_area_geometry_geojson_check CHECK (jsonb_typeof(geometry_geojson) = 'object'::text),
  CONSTRAINT spatial_investigation_area_jurisdiction_code_check CHECK (jurisdiction_code = 'AU-WA'::text),
  CONSTRAINT spatial_investigation_area_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'ARCHIVED'::text])),
  CONSTRAINT spatial_investigation_area_map_geometry_check CHECK (jsonb_typeof(map_geometry) = 'array'::text),
  CONSTRAINT spatial_investigation_area_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT spatial_investigation_area_pkey PRIMARY KEY (spatial_investigation_area_id),
  CONSTRAINT spatial_investigation_area_area_code_key UNIQUE (area_code)
);
CREATE INDEX spatial_investigation_area_owner_idx ON country_core.spatial_investigation_area USING btree (owner_key_hash, jurisdiction_code, created_at DESC);

-- owner: postgres
CREATE TABLE country_core.spatial_investigation_run (
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
  CONSTRAINT spatial_investigation_run_formulation_eligible_check CHECK (formulation_eligible IS FALSE),
  CONSTRAINT spatial_investigation_run_run_number_check CHECK (run_number >= 1),
  CONSTRAINT spatial_investigation_run_run_status_check CHECK (run_status = ANY (ARRAY['QUEUED'::text, 'PROCESSING'::text, 'COMPUTED_UNVALIDATED'::text, 'FAILED'::text, 'REVIEWED'::text, 'REJECTED'::text])),
  CONSTRAINT spatial_investigation_run_spatial_investigation_area_id_fkey FOREIGN KEY (spatial_investigation_area_id) REFERENCES country_core.spatial_investigation_area(spatial_investigation_area_id) ON DELETE CASCADE,
  CONSTRAINT spatial_investigation_run_pkey PRIMARY KEY (spatial_investigation_run_id),
  CONSTRAINT spatial_investigation_run_spatial_investigation_area_id_run_key UNIQUE (spatial_investigation_area_id, run_number)
);
CREATE INDEX spatial_investigation_run_area_idx ON country_core.spatial_investigation_run USING btree (spatial_investigation_area_id, run_number DESC);

-- owner: postgres
CREATE TABLE country_core.spatial_source_connection (
  spatial_source_connection_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_scan_profile_id uuid NOT NULL,
  source_code text NOT NULL,
  source_name text NOT NULL,
  source_kind text NOT NULL,
  authority_tier text NOT NULL,
  endpoint_url text NOT NULL,
  collection_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
  connection_status text NOT NULL,
  last_checked_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_error text,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT spatial_source_connection_connection_status_check CHECK (connection_status = ANY (ARRAY['REGISTERED'::text, 'CONNECTED'::text, 'DEGRADED'::text, 'DISABLED'::text])),
  CONSTRAINT spatial_source_connection_source_kind_check CHECK (source_kind = ANY (ARRAY['BOUNDARY'::text, 'ADMIN_AREAS'::text, 'CATALOGUE'::text, 'STAC_IMAGERY'::text, 'VECTOR'::text, 'RASTER'::text])),
  CONSTRAINT spatial_source_connection_country_scan_profile_id_fkey FOREIGN KEY (country_scan_profile_id) REFERENCES country_core.country_scan_profile(country_scan_profile_id) ON DELETE CASCADE,
  CONSTRAINT spatial_source_connection_pkey PRIMARY KEY (spatial_source_connection_id),
  CONSTRAINT spatial_source_connection_country_scan_profile_id_source_co_key UNIQUE (country_scan_profile_id, source_code)
);
CREATE INDEX spatial_source_profile_status_idx ON country_core.spatial_source_connection USING btree (country_scan_profile_id, connection_status);

-- owner: postgres
CREATE TABLE country_core.user_dashboard_profile (
  actor_id uuid NOT NULL,
  preferred_workspace_id uuid,
  preferred_language text DEFAULT 'en'::text NOT NULL,
  timezone_name text DEFAULT 'UTC'::text NOT NULL,
  dashboard_layout jsonb DEFAULT '{}'::jsonb NOT NULL,
  email_notifications_enabled boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_dashboard_profile_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT user_dashboard_profile_preferred_workspace_id_fkey FOREIGN KEY (preferred_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT user_dashboard_profile_pkey PRIMARY KEY (actor_id)
);

-- owner: postgres
CREATE TABLE country_core.user_preference (
  actor_id uuid NOT NULL,
  language_code text DEFAULT 'en'::text NOT NULL,
  timezone_name text DEFAULT 'UTC'::text NOT NULL,
  default_landing_page text DEFAULT '/aab-local/app/_rebuild/my-dashboard.html'::text NOT NULL,
  dashboard_density text DEFAULT 'COMFORTABLE'::text NOT NULL,
  preferred_country_workspace_id uuid,
  preferred_organization_id uuid,
  email_notifications boolean DEFAULT true NOT NULL,
  in_app_notifications boolean DEFAULT true NOT NULL,
  task_review_alerts boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_preference_dashboard_density_check CHECK (dashboard_density = ANY (ARRAY['COMPACT'::text, 'COMFORTABLE'::text, 'SPACIOUS'::text])),
  CONSTRAINT user_preference_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT user_preference_preferred_country_workspace_id_fkey FOREIGN KEY (preferred_country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT user_preference_preferred_organization_id_fkey FOREIGN KEY (preferred_organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT user_preference_pkey PRIMARY KEY (actor_id)
);

-- owner: postgres
CREATE TABLE country_core.workspace_membership (
  workspace_membership_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_workspace_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  organization_id uuid,
  membership_role text NOT NULL,
  membership_status text DEFAULT 'ACTIVE'::text NOT NULL,
  can_invite_users boolean DEFAULT false NOT NULL,
  can_manage_roles boolean DEFAULT false NOT NULL,
  can_manage_country_settings boolean DEFAULT false NOT NULL,
  can_access_regulatory_gate boolean DEFAULT false NOT NULL,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone,
  CONSTRAINT workspace_membership_membership_role_check CHECK (membership_role = ANY (ARRAY['HEAD_ADMIN'::text, 'COUNTRY_ADMIN'::text, 'REGULATORY_ADMIN'::text, 'SCIENTIST'::text, 'RESEARCHER'::text, 'FIELD_TECHNICIAN'::text, 'AUDITOR'::text, 'TEACHER'::text, 'STUDENT'::text, 'COMMUNITY'::text, 'VIEWER'::text])),
  CONSTRAINT workspace_membership_membership_status_check CHECK (membership_status = ANY (ARRAY['INVITED'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text])),
  CONSTRAINT workspace_membership_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT workspace_membership_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT workspace_membership_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT workspace_membership_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id),
  CONSTRAINT workspace_membership_pkey PRIMARY KEY (workspace_membership_id),
  CONSTRAINT workspace_membership_country_workspace_id_actor_id_key UNIQUE (country_workspace_id, actor_id)
);
