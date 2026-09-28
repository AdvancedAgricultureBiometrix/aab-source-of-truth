-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: agriculture. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for agriculture: functions 170, tables 121, views 65, rls_enabled_tables 121, constraints 998, triggers 80, policies 0, indexes 334.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE agriculture.aab_domain_classification (
  domain_code text NOT NULL,
  domain_name text NOT NULL,
  domain_class text NOT NULL,
  data_ownership text NOT NULL,
  lifecycle_status text DEFAULT 'REGISTERED'::text NOT NULL,
  operational_enabled boolean DEFAULT false NOT NULL,
  parent_domain_code text,
  description text NOT NULL,
  scientist_authority_required boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT aab_domain_classification_data_ownership_check CHECK (data_ownership = ANY (ARRAY['OWNS_DOMAIN_DATA'::text, 'ADAPTER_ONLY'::text, 'EXTERNAL_SOURCE'::text, 'NO_RAW_DATA_OWNERSHIP'::text, 'GOVERNANCE_METADATA'::text])),
  CONSTRAINT aab_domain_classification_domain_class_check CHECK (domain_class = ANY (ARRAY['OPERATIONAL_DOMAIN'::text, 'DOMAIN_ADAPTER'::text, 'EXTERNAL_INTELLIGENCE_SOURCE'::text, 'EVIDENCE_LAYER'::text, 'CROSS_DOMAIN_INTELLIGENCE'::text, 'GOVERNANCE_LAYER'::text, 'FUTURE_RESTRICTED_DOMAIN'::text])),
  CONSTRAINT aab_domain_classification_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['REGISTERED'::text, 'ACTIVE'::text, 'RESTRICTED'::text, 'PLANNED'::text, 'ARCHIVED'::text])),
  CONSTRAINT aab_domain_classification_parent_domain_code_fkey FOREIGN KEY (parent_domain_code) REFERENCES agriculture.aab_domain_classification(domain_code),
  CONSTRAINT aab_domain_classification_pkey PRIMARY KEY (domain_code)
);

-- owner: postgres
CREATE TABLE agriculture.access_profile (
  access_profile_code text NOT NULL,
  access_profile_name text NOT NULL,
  access_profile_description text,
  can_read_canonical_data boolean DEFAULT false NOT NULL,
  can_create_drafts boolean DEFAULT false NOT NULL,
  can_update_drafts boolean DEFAULT false NOT NULL,
  can_submit_for_review boolean DEFAULT false NOT NULL,
  can_review boolean DEFAULT false NOT NULL,
  can_approve boolean DEFAULT false NOT NULL,
  can_retire boolean DEFAULT false NOT NULL,
  can_read_audit boolean DEFAULT false NOT NULL,
  can_run_integrity_checks boolean DEFAULT false NOT NULL,
  can_run_migrations boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT access_profile_pkey PRIMARY KEY (access_profile_code)
);

-- owner: postgres
CREATE TABLE agriculture.actor (
  actor_id uuid DEFAULT gen_random_uuid() NOT NULL,
  external_subject text,
  display_name text NOT NULL,
  actor_type text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT actor_actor_type_check CHECK (actor_type = ANY (ARRAY['USER'::text, 'SCIENTIST'::text, 'ADMIN'::text, 'SYSTEM'::text, 'SERVICE'::text])),
  CONSTRAINT actor_pkey PRIMARY KEY (actor_id),
  CONSTRAINT actor_external_subject_key UNIQUE (external_subject)
);

-- owner: postgres
CREATE TABLE agriculture.actor_access_assignment (
  actor_access_assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid NOT NULL,
  access_profile_code text NOT NULL,
  authority_scope text DEFAULT 'AGRICULTURE'::text NOT NULL,
  country_code character(2),
  granted_by uuid,
  grant_reason text NOT NULL,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_by uuid,
  revoked_at timestamp with time zone,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT actor_access_revocation_consistency CHECK (active = true AND revoked_at IS NULL AND revoked_by IS NULL OR active = false AND revoked_at IS NOT NULL),
  CONSTRAINT actor_access_assignment_access_profile_code_fkey FOREIGN KEY (access_profile_code) REFERENCES agriculture.access_profile(access_profile_code),
  CONSTRAINT actor_access_assignment_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT actor_access_assignment_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT actor_access_assignment_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT actor_access_assignment_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT actor_access_assignment_pkey PRIMARY KEY (actor_access_assignment_id)
);
CREATE INDEX ix_actor_access_actor_active ON agriculture.actor_access_assignment USING btree (actor_id, active);
CREATE UNIQUE INDEX ux_actor_access_active_profile_scope ON agriculture.actor_access_assignment USING btree (actor_id, access_profile_code, authority_scope, COALESCE(country_code, '--'::bpchar)) WHERE (active = true);

-- owner: postgres
CREATE TABLE agriculture.actor_authority (
  actor_authority_id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid NOT NULL,
  role_code text NOT NULL,
  country_code character(2),
  authority_scope text DEFAULT 'AGRICULTURE'::text NOT NULL,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_by uuid,
  revoked_at timestamp with time zone,
  grant_rationale text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT actor_authority_authority_scope_check CHECK (authority_scope = ANY (ARRAY['AGRICULTURE'::text, 'AGRICULTURE_INGREDIENTS'::text, 'AGRICULTURE_FORMULATIONS'::text, 'AGRICULTURE_TRIALS'::text, 'AGRICULTURE_FIELD_EVIDENCE'::text, 'AGRICULTURE_LEARNING'::text, 'AGRICULTURE_MEMORY'::text, 'AGRICULTURE_ADMINISTRATION'::text])),
  CONSTRAINT actor_authority_revocation_consistency CHECK (active = true AND revoked_at IS NULL AND revoked_by IS NULL OR active = false AND revoked_at IS NOT NULL),
  CONSTRAINT actor_authority_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT actor_authority_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT actor_authority_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT actor_authority_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT actor_authority_role_code_fkey FOREIGN KEY (role_code) REFERENCES agriculture.authority_role(role_code),
  CONSTRAINT actor_authority_pkey PRIMARY KEY (actor_authority_id)
);
CREATE UNIQUE INDEX ux_actor_authority_active_scope ON agriculture.actor_authority USING btree (actor_id, role_code, authority_scope, COALESCE(country_code, '--'::bpchar)) WHERE (active = true);

-- owner: postgres
CREATE TABLE agriculture.agricultural_problem (
  agricultural_problem_id uuid DEFAULT gen_random_uuid() NOT NULL,
  problem_code text NOT NULL,
  problem_name text NOT NULL,
  problem_type text NOT NULL,
  crop_id uuid,
  description text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT agricultural_problem_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT agricultural_problem_problem_type_check CHECK (problem_type = ANY (ARRAY['PEST'::text, 'DISEASE'::text, 'NUTRIENT'::text, 'WATER'::text, 'SOIL'::text, 'ENVIRONMENTAL_STRESS'::text, 'GROWTH'::text, 'YIELD'::text, 'QUALITY'::text, 'OTHER'::text])),
  CONSTRAINT problem_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT agricultural_problem_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT agricultural_problem_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT agricultural_problem_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES agriculture.crop(crop_id),
  CONSTRAINT agricultural_problem_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT agricultural_problem_pkey PRIMARY KEY (agricultural_problem_id),
  CONSTRAINT agricultural_problem_problem_code_key UNIQUE (problem_code)
);
CREATE INDEX ix_problem_crop ON agriculture.agricultural_problem USING btree (crop_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.anomaly_detection_event (
  anomaly_detection_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  anomaly_type text NOT NULL,
  anomaly_status text DEFAULT 'DETECTED'::text NOT NULL,
  anomaly_summary text NOT NULL,
  anomaly_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  detected_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_reason text,
  CONSTRAINT anomaly_detection_event_anomaly_status_check CHECK (anomaly_status = ANY (ARRAY['DETECTED'::text, 'UNDER_REVIEW'::text, 'EXPLAINED'::text, 'CONFIRMED_ISSUE'::text, 'DISMISSED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT anomaly_detection_event_anomaly_type_check CHECK (anomaly_type = ANY (ARRAY['UNEXPECTED_VALUE'::text, 'UNEXPECTED_RATE_OF_CHANGE'::text, 'UNUSUAL_REPETITION'::text, 'SUSPICIOUS_PERFECTION'::text, 'SEQUENCE_BREAK'::text, 'TEMPORAL_ANOMALY'::text, 'SPATIAL_ANOMALY'::text, 'PHOTO_ANOMALY'::text, 'OTHER'::text])),
  CONSTRAINT anomaly_detection_event_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT anomaly_detection_event_pkey PRIMARY KEY (anomaly_detection_event_id)
);
CREATE INDEX ix_anomaly_subject ON agriculture.anomaly_detection_event USING btree (subject_entity_type, subject_entity_id, anomaly_status);

-- owner: postgres
CREATE TABLE agriculture.application_event (
  application_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  trial_id uuid NOT NULL,
  plot_id uuid NOT NULL,
  formulation_version_id uuid,
  applied_at timestamp with time zone NOT NULL,
  application_method text NOT NULL,
  application_rate numeric,
  application_unit text,
  operator_id uuid,
  weather_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  notes text,
  evidence_packet_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT application_event_application_rate_check CHECK (application_rate IS NULL OR application_rate >= 0::numeric),
  CONSTRAINT application_event_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT application_event_formulation_version_id_fkey FOREIGN KEY (formulation_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT application_event_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT application_event_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES agriculture.plot(plot_id),
  CONSTRAINT application_event_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT application_event_pkey PRIMARY KEY (application_event_id)
);
CREATE INDEX ix_application_plot_time ON agriculture.application_event USING btree (plot_id, applied_at);

-- owner: postgres
CREATE TABLE agriculture.application_gateway_contract (
  gateway_contract_id uuid DEFAULT gen_random_uuid() NOT NULL,
  contract_code text NOT NULL,
  resource_code text NOT NULL,
  resource_type text NOT NULL,
  schema_name text DEFAULT 'agriculture'::text NOT NULL,
  object_name text NOT NULL,
  operation_class text NOT NULL,
  authority_requirement text,
  audit_required boolean DEFAULT true NOT NULL,
  direct_table_access_allowed boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT application_gateway_contract_operation_class_check CHECK (operation_class = ANY (ARRAY['READ'::text, 'CREATE'::text, 'UPDATE'::text, 'ARCHIVE'::text, 'REVIEW'::text, 'APPROVE'::text, 'VALIDATE'::text, 'EXECUTE'::text])),
  CONSTRAINT application_gateway_contract_resource_type_check CHECK (resource_type = ANY (ARRAY['READ_VIEW'::text, 'COMMAND_FUNCTION'::text, 'HEALTH_VIEW'::text])),
  CONSTRAINT application_gateway_no_direct_table_access CHECK (direct_table_access_allowed = false),
  CONSTRAINT application_gateway_contract_pkey PRIMARY KEY (gateway_contract_id),
  CONSTRAINT application_gateway_contract_contract_code_key UNIQUE (contract_code),
  CONSTRAINT application_gateway_contract_resource_code_key UNIQUE (resource_code)
);

-- owner: postgres
CREATE TABLE agriculture.approved_learning (
  approved_learning_id uuid DEFAULT gen_random_uuid() NOT NULL,
  approved_learning_code text NOT NULL,
  learning_candidate_id uuid NOT NULL,
  learning_type text NOT NULL,
  learning_statement text NOT NULL,
  applicability_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
  limitation_summary text,
  evidence_packet_id uuid NOT NULL,
  governance_decision_id uuid NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  approved_by uuid NOT NULL,
  approved_at timestamp with time zone NOT NULL,
  supersedes_approved_learning_id uuid,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT approved_learning_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT approved_learning_learning_type_check CHECK (learning_type = ANY (ARRAY['POSITIVE'::text, 'NEGATIVE'::text, 'NEUTRAL'::text, 'CONTRADICTION'::text, 'MECHANISM'::text, 'SAFETY'::text, 'OTHER'::text])),
  CONSTRAINT approved_learning_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'SUPERSEDED'::text, 'RETIRED'::text, 'ARCHIVED'::text])),
  CONSTRAINT approved_learning_no_self_supersession CHECK (supersedes_approved_learning_id IS NULL OR supersedes_approved_learning_id <> approved_learning_id),
  CONSTRAINT approved_learning_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT approved_learning_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT approved_learning_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT approved_learning_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT approved_learning_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT approved_learning_learning_candidate_id_fkey FOREIGN KEY (learning_candidate_id) REFERENCES agriculture.learning_candidate(learning_candidate_id),
  CONSTRAINT approved_learning_supersedes_approved_learning_id_fkey FOREIGN KEY (supersedes_approved_learning_id) REFERENCES agriculture.approved_learning(approved_learning_id),
  CONSTRAINT approved_learning_pkey PRIMARY KEY (approved_learning_id),
  CONSTRAINT approved_learning_approved_learning_code_key UNIQUE (approved_learning_code),
  CONSTRAINT approved_learning_learning_candidate_id_key UNIQUE (learning_candidate_id)
);
CREATE INDEX approved_learning_country_idx ON agriculture.approved_learning USING btree (country_workspace_id);
CREATE INDEX ix_approved_learning_status ON agriculture.approved_learning USING btree (lifecycle_status, learning_type);

-- owner: postgres
CREATE TABLE agriculture.audit_event (
  audit_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_code text NOT NULL,
  event_type text NOT NULL,
  event_category text NOT NULL,
  actor_id uuid,
  request_context_id uuid,
  operation_run_id uuid,
  subject_entity_type text,
  subject_entity_id uuid,
  governance_decision_id uuid,
  event_summary text NOT NULL,
  event_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  previous_event_hash text,
  event_hash text NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT audit_event_summary_not_blank CHECK (length(btrim(event_summary)) > 0),
  CONSTRAINT audit_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT audit_event_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT audit_event_operation_run_id_fkey FOREIGN KEY (operation_run_id) REFERENCES agriculture.operation_run(operation_run_id),
  CONSTRAINT audit_event_request_context_id_fkey FOREIGN KEY (request_context_id) REFERENCES agriculture.request_context(request_context_id),
  CONSTRAINT audit_event_pkey PRIMARY KEY (audit_event_id),
  CONSTRAINT audit_event_event_code_key UNIQUE (event_code),
  CONSTRAINT audit_event_event_hash_key UNIQUE (event_hash)
);
CREATE INDEX ix_audit_event_actor ON agriculture.audit_event USING btree (actor_id, occurred_at);
CREATE INDEX ix_audit_event_request ON agriculture.audit_event USING btree (request_context_id, occurred_at);
CREATE INDEX ix_audit_event_subject ON agriculture.audit_event USING btree (subject_entity_type, subject_entity_id, occurred_at);

-- owner: postgres
CREATE TABLE agriculture.authority_role (
  role_code text NOT NULL,
  role_name text NOT NULL,
  role_description text,
  can_review boolean DEFAULT false NOT NULL,
  can_approve boolean DEFAULT false NOT NULL,
  can_administer boolean DEFAULT false NOT NULL,
  can_run_migrations boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT authority_role_pkey PRIMARY KEY (role_code)
);

-- owner: postgres
CREATE TABLE agriculture.brain_evidence_eligibility (
  brain_evidence_eligibility_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  evidence_packet_id uuid,
  validation_passed boolean DEFAULT false NOT NULL,
  context_complete boolean DEFAULT false NOT NULL,
  quality_acceptable boolean DEFAULT false NOT NULL,
  photo_requirement_satisfied boolean DEFAULT false NOT NULL,
  required_review_complete boolean DEFAULT false NOT NULL,
  quarantine_clear boolean DEFAULT false NOT NULL,
  eligibility_status text DEFAULT 'NOT_ELIGIBLE'::text NOT NULL,
  eligibility_reason text NOT NULL,
  assessed_by uuid,
  assessed_at timestamp with time zone DEFAULT now() NOT NULL,
  governance_decision_id uuid,
  CONSTRAINT brain_eligibility_consistency CHECK ((eligibility_status <> ALL (ARRAY['ELIGIBLE'::text, 'ELIGIBLE_WITH_WARNINGS'::text])) OR validation_passed = true AND context_complete = true AND quality_acceptable = true AND photo_requirement_satisfied = true AND required_review_complete = true AND quarantine_clear = true AND governance_decision_id IS NOT NULL),
  CONSTRAINT brain_evidence_eligibility_eligibility_status_check CHECK (eligibility_status = ANY (ARRAY['NOT_ELIGIBLE'::text, 'PENDING_VALIDATION'::text, 'PENDING_EVIDENCE'::text, 'PENDING_REVIEW'::text, 'ELIGIBLE_WITH_WARNINGS'::text, 'ELIGIBLE'::text, 'REJECTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT brain_evidence_eligibility_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT brain_evidence_eligibility_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT brain_evidence_eligibility_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT brain_evidence_eligibility_pkey PRIMARY KEY (brain_evidence_eligibility_id),
  CONSTRAINT brain_evidence_eligibility_subject_entity_type_subject_enti_key UNIQUE (subject_entity_type, subject_entity_id)
);
CREATE INDEX ix_brain_eligibility_status ON agriculture.brain_evidence_eligibility USING btree (eligibility_status, subject_entity_type);

-- owner: postgres
CREATE TABLE agriculture.contradiction_record (
  contradiction_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
  contradiction_code text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  claim_a text NOT NULL,
  claim_b text NOT NULL,
  contradiction_summary text NOT NULL,
  severity text DEFAULT 'UNASSESSED'::text NOT NULL,
  lifecycle_status text DEFAULT 'OPEN'::text NOT NULL,
  evidence_packet_a_id uuid,
  evidence_packet_b_id uuid,
  governance_review_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_summary text,
  country_workspace_id uuid,
  CONSTRAINT contradiction_record_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text, 'RESOLVED'::text, 'UNRESOLVED_ACCEPTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT contradiction_record_severity_check CHECK (severity = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT contradiction_resolution_consistency CHECK ((lifecycle_status = ANY (ARRAY['RESOLVED'::text, 'UNRESOLVED_ACCEPTED'::text])) AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution_summary IS NOT NULL OR (lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text, 'ARCHIVED'::text]))),
  CONSTRAINT contradiction_record_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT contradiction_record_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT contradiction_record_evidence_packet_a_id_fkey FOREIGN KEY (evidence_packet_a_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT contradiction_record_evidence_packet_b_id_fkey FOREIGN KEY (evidence_packet_b_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT contradiction_record_governance_review_id_fkey FOREIGN KEY (governance_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT contradiction_record_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT contradiction_record_pkey PRIMARY KEY (contradiction_record_id),
  CONSTRAINT contradiction_record_contradiction_code_key UNIQUE (contradiction_code)
);
CREATE INDEX contradiction_record_country_idx ON agriculture.contradiction_record USING btree (country_workspace_id);
CREATE INDEX ix_contradiction_subject ON agriculture.contradiction_record USING btree (subject_entity_type, subject_entity_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.country_intelligence_settings (
  country_intelligence_settings_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_code character(2),
  country_resource_intelligence_enabled boolean DEFAULT false NOT NULL,
  resource_recovery_intelligence_enabled boolean DEFAULT false NOT NULL,
  environmental_intelligence_enabled boolean DEFAULT false NOT NULL,
  traditional_knowledge_handling text DEFAULT 'ADVISORY_NOT_PROOF'::text NOT NULL,
  waste_burning_priority text DEFAULT 'UNASSESSED'::text NOT NULL,
  dumping_priority text DEFAULT 'UNASSESSED'::text NOT NULL,
  landfill_priority text DEFAULT 'UNASSESSED'::text NOT NULL,
  water_pollution_priority text DEFAULT 'UNASSESSED'::text NOT NULL,
  air_pollution_priority text DEFAULT 'UNASSESSED'::text NOT NULL,
  required_safety_review boolean DEFAULT true NOT NULL,
  required_ecology_review boolean DEFAULT true NOT NULL,
  required_scientist_review boolean DEFAULT true NOT NULL,
  automatic_ingredient_promotion_allowed boolean DEFAULT false NOT NULL,
  automatic_formulation_generation_allowed boolean DEFAULT false NOT NULL,
  settings_notes text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_intelligence_setting_automatic_formulation_genera_check CHECK (automatic_formulation_generation_allowed = false),
  CONSTRAINT country_intelligence_setting_automatic_ingredient_promoti_check CHECK (automatic_ingredient_promotion_allowed = false),
  CONSTRAINT country_intelligence_setting_traditional_knowledge_handli_check CHECK (traditional_knowledge_handling = ANY (ARRAY['ADVISORY_NOT_PROOF'::text, 'RESTRICTED'::text, 'DISABLED'::text])),
  CONSTRAINT country_intelligence_settings_air_pollution_priority_check CHECK (air_pollution_priority = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT country_intelligence_settings_dumping_priority_check CHECK (dumping_priority = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT country_intelligence_settings_landfill_priority_check CHECK (landfill_priority = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT country_intelligence_settings_waste_burning_priority_check CHECK (waste_burning_priority = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT country_intelligence_settings_water_pollution_priority_check CHECK (water_pollution_priority = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT country_intelligence_settings_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT country_intelligence_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_intelligence_settings_pkey PRIMARY KEY (country_intelligence_settings_id),
  CONSTRAINT country_intelligence_settings_country_code_key UNIQUE (country_code)
);

-- owner: postgres
CREATE TABLE agriculture.country_resource_candidate (
  country_resource_candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_code text NOT NULL,
  country_code character(2),
  resource_name text NOT NULL,
  resource_class text NOT NULL,
  asset_type text NOT NULL,
  resource_origin text,
  current_known_use text,
  traditional_knowledge_linked boolean DEFAULT false NOT NULL,
  traditional_knowledge_summary text,
  composition_status text DEFAULT 'UNKNOWN'::text NOT NULL,
  mechanism_status text DEFAULT 'UNKNOWN'::text NOT NULL,
  evidence_status text DEFAULT 'NONE'::text NOT NULL,
  observation_status text DEFAULT 'NONE'::text NOT NULL,
  knowledge_gap_status text DEFAULT 'HIGH'::text NOT NULL,
  discovery_potential text DEFAULT 'UNASSESSED'::text NOT NULL,
  scientific_status text DEFAULT 'EXPERIMENTAL_UNVERIFIED'::text NOT NULL,
  candidate_summary text NOT NULL,
  uncertainty_summary text NOT NULL,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT country_resource_archive_consistency CHECK (scientific_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR scientific_status <> 'ARCHIVED'::text),
  CONSTRAINT country_resource_candidate_asset_type_check CHECK (asset_type = ANY (ARRAY['BOTANICAL'::text, 'MICROBIAL'::text, 'FERMENT'::text, 'COMPOST'::text, 'MINERAL_OR_GEOLOGICAL'::text, 'AQUATIC_BIOLOGICAL'::text, 'ENVIRONMENTAL_BIOLOGICAL'::text, 'TRADITIONAL_MATERIAL'::text, 'INDUSTRIAL_BYPRODUCT'::text, 'AGRICULTURAL_RESIDUE'::text, 'FOOD_PROCESSING_RESIDUE'::text, 'FORESTRY_RESIDUE'::text, 'OTHER'::text])),
  CONSTRAINT country_resource_candidate_composition_status_check CHECK (composition_status = ANY (ARRAY['UNKNOWN'::text, 'PARTIAL'::text, 'CHARACTERISED'::text])),
  CONSTRAINT country_resource_candidate_discovery_potential_check CHECK (discovery_potential = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'EXTREME'::text])),
  CONSTRAINT country_resource_candidate_evidence_status_check CHECK (evidence_status = ANY (ARRAY['NONE'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT country_resource_candidate_knowledge_gap_status_check CHECK (knowledge_gap_status = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
  CONSTRAINT country_resource_candidate_mechanism_status_check CHECK (mechanism_status = ANY (ARRAY['KNOWN'::text, 'PARTIAL'::text, 'UNKNOWN'::text])),
  CONSTRAINT country_resource_candidate_observation_status_check CHECK (observation_status = ANY (ARRAY['NONE'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text])),
  CONSTRAINT country_resource_candidate_resource_class_check CHECK (resource_class = ANY (ARRAY['CORE_KNOWN_MATERIAL'::text, 'COUNTRY_RELEVANT_MATERIAL'::text, 'WASTE_OR_BYPRODUCT_RESOURCE'::text, 'NATIVE_OR_LOCAL_BIOLOGICAL'::text, 'GEOLOGICAL_OR_MINERAL_RESOURCE'::text, 'AQUATIC_RESOURCE'::text, 'TRADITIONAL_KNOWLEDGE_LINKED'::text, 'ELITE_STRATEGIC_DISCOVERY_ASSET'::text, 'OTHER'::text])),
  CONSTRAINT country_resource_candidate_scientific_status_check CHECK (scientific_status = ANY (ARRAY['EXPERIMENTAL_UNVERIFIED'::text, 'UNDER_REVIEW'::text, 'INVESTIGATION_READY'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT country_resource_name_not_blank CHECK (length(btrim(resource_name)) > 0),
  CONSTRAINT country_resource_summary_not_blank CHECK (length(btrim(candidate_summary)) > 0),
  CONSTRAINT country_resource_candidate_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_candidate_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT country_resource_candidate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT country_resource_candidate_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_candidate_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT country_resource_candidate_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_candidate_pkey PRIMARY KEY (country_resource_candidate_id),
  CONSTRAINT country_resource_candidate_resource_code_key UNIQUE (resource_code)
);
CREATE INDEX ix_country_resource_candidate_country_workspace ON agriculture.country_resource_candidate USING btree (country_workspace_id);
CREATE INDEX ix_country_resource_class ON agriculture.country_resource_candidate USING btree (resource_class, asset_type);
CREATE INDEX ix_country_resource_country ON agriculture.country_resource_candidate USING btree (country_code, scientific_status);

-- owner: postgres
CREATE TABLE agriculture.country_resource_domain_relevance (
  country_resource_domain_relevance_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_resource_candidate_id uuid NOT NULL,
  domain_code text NOT NULL,
  relevance_status text DEFAULT 'POSSIBLE'::text NOT NULL,
  relevance_summary text NOT NULL,
  evidence_strength text DEFAULT 'UNASSESSED'::text NOT NULL,
  CONSTRAINT country_resource_domain_relevance_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT country_resource_domain_relevance_relevance_status_check CHECK (relevance_status = ANY (ARRAY['POSSIBLE'::text, 'PLAUSIBLE'::text, 'SUPPORTED'::text, 'NOT_RELEVANT'::text, 'BLOCKED'::text])),
  CONSTRAINT country_resource_domain_relev_country_resource_candidate_i_fkey FOREIGN KEY (country_resource_candidate_id) REFERENCES agriculture.country_resource_candidate(country_resource_candidate_id),
  CONSTRAINT country_resource_domain_relevance_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES agriculture.aab_domain_classification(domain_code),
  CONSTRAINT country_resource_domain_relevance_pkey PRIMARY KEY (country_resource_domain_relevance_id),
  CONSTRAINT country_resource_domain_relev_country_resource_candidate_id_key UNIQUE (country_resource_candidate_id, domain_code)
);

-- owner: postgres
CREATE TABLE agriculture.country_resource_investigation (
  country_resource_investigation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_resource_candidate_id uuid NOT NULL,
  source_finding_id text NOT NULL,
  jurisdiction_code text NOT NULL,
  investigation_status text DEFAULT 'OPEN'::text NOT NULL,
  material_identity text,
  material_class text,
  preparation_class text,
  safety_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  opened_by uuid,
  opened_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  investigation_profile_code text DEFAULT 'MATERIAL_RESOURCE'::text NOT NULL,
  candidate_family_code text DEFAULT 'UNCLASSIFIED'::text NOT NULL,
  profile_version text DEFAULT '1.0.0'::text NOT NULL,
  CONSTRAINT country_resource_investigation_investigation_status_check CHECK (investigation_status = ANY (ARRAY['OPEN'::text, 'EVIDENCE_REVIEW'::text, 'MEASUREMENT'::text, 'SCIENTIST_REVIEW'::text, 'HELD'::text, 'REJECTED'::text, 'INGREDIENT_PROJECTED'::text])),
  CONSTRAINT country_resource_investigation_profile_code_check CHECK (investigation_profile_code = ANY (ARRAY['MATERIAL_RESOURCE'::text, 'ENVIRONMENTAL_PRESSURE'::text, 'EVIDENCE_COVERAGE'::text, 'UNCLASSIFIED_CANDIDATE'::text])),
  CONSTRAINT country_resource_investigation_safety_status_check CHECK (safety_status = ANY (ARRAY['UNASSESSED'::text, 'INCOMPLETE'::text, 'CLEARED_FOR_CONTROLLED_RESEARCH'::text, 'BLOCKED'::text])),
  CONSTRAINT country_resource_investigatio_country_resource_candidate_i_fkey FOREIGN KEY (country_resource_candidate_id) REFERENCES agriculture.country_resource_candidate(country_resource_candidate_id),
  CONSTRAINT country_resource_investigation_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_investigation_pkey PRIMARY KEY (country_resource_investigation_id),
  CONSTRAINT country_resource_investigatio_jurisdiction_code_source_find_key UNIQUE (jurisdiction_code, source_finding_id)
);
COMMENT ON COLUMN agriculture.country_resource_investigation.investigation_profile_code IS 'Shared country-neutral investigation contract selected from governed finding evidence.';
COMMENT ON COLUMN agriculture.country_resource_investigation.candidate_family_code IS 'Candidate-specific scientific requirement family; never a scientific approval.';
COMMENT ON COLUMN agriculture.country_resource_investigation.profile_version IS 'Version of the deterministic investigation-profile resolver.';

-- owner: postgres
CREATE TABLE agriculture.country_resource_investigation_decision (
  country_resource_investigation_decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_resource_investigation_id uuid NOT NULL,
  decision_type text NOT NULL,
  decision_rationale text NOT NULL,
  evidence_reviewed_summary text,
  unresolved_questions text,
  decided_by uuid NOT NULL,
  decided_at timestamp with time zone DEFAULT now() NOT NULL,
  projected_ingredient_id uuid,
  projected_ingredient_version_id uuid,
  CONSTRAINT country_resource_investigation_decision_decision_type_check CHECK (decision_type = ANY (ARRAY['CONTINUE_INVESTIGATION'::text, 'HOLD'::text, 'REJECT'::text, 'APPROVE_EXPERIMENTAL_INGREDIENT'::text])),
  CONSTRAINT country_resource_investigati_country_resource_investigati_fkey2 FOREIGN KEY (country_resource_investigation_id) REFERENCES agriculture.country_resource_investigation(country_resource_investigation_id) ON DELETE CASCADE,
  CONSTRAINT country_resource_investigatio_projected_ingredient_version_fkey FOREIGN KEY (projected_ingredient_version_id) REFERENCES agriculture.ingredient_version(ingredient_version_id),
  CONSTRAINT country_resource_investigation_dec_projected_ingredient_id_fkey FOREIGN KEY (projected_ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT country_resource_investigation_decision_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_investigation_decision_pkey PRIMARY KEY (country_resource_investigation_decision_id)
);

-- owner: postgres
CREATE TABLE agriculture.country_resource_investigation_evidence (
  country_resource_investigation_evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_resource_investigation_id uuid NOT NULL,
  evidence_type text NOT NULL,
  title text NOT NULL,
  evidence_summary text,
  evidence_position text DEFAULT 'CONTEXT'::text NOT NULL,
  publisher_or_holder text,
  evidence_date date,
  source_url text,
  storage_bucket text,
  storage_path text,
  original_filename text,
  media_type text,
  size_bytes bigint,
  sha256 text,
  verification_status text DEFAULT 'UPLOADED_UNREVIEWED'::text NOT NULL,
  supplied_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  country_resource_investigation_observation_id uuid,
  direct_claim text,
  stated_limitations text,
  capture_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  brain_routing_status text DEFAULT 'NOT_ROUTED'::text NOT NULL,
  CONSTRAINT country_resource_investigation_eviden_verification_status_check CHECK (verification_status = ANY (ARRAY['UPLOADED_UNREVIEWED'::text, 'SOURCE_VERIFIED'::text, 'SCIENTIST_REVIEWED'::text, 'REJECTED'::text])),
  CONSTRAINT country_resource_investigation_evidence_evidence_position_check CHECK (evidence_position = ANY (ARRAY['SUPPORTS'::text, 'CONTRADICTS'::text, 'CONTEXT'::text, 'INCONCLUSIVE'::text])),
  CONSTRAINT country_resource_investigati_country_resource_investigati_fkey4 FOREIGN KEY (country_resource_investigation_observation_id) REFERENCES agriculture.country_resource_investigation_observation(country_resource_investigation_observation_id),
  CONSTRAINT country_resource_investigatio_country_resource_investigati_fkey FOREIGN KEY (country_resource_investigation_id) REFERENCES agriculture.country_resource_investigation(country_resource_investigation_id) ON DELETE CASCADE,
  CONSTRAINT country_resource_investigation_evidence_supplied_by_fkey FOREIGN KEY (supplied_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_investigation_evidence_pkey PRIMARY KEY (country_resource_investigation_evidence_id)
);
CREATE INDEX country_resource_evidence_observation_idx ON agriculture.country_resource_investigation_evidence USING btree (country_resource_investigation_observation_id);

-- owner: postgres
CREATE TABLE agriculture.country_resource_investigation_measurement (
  country_resource_investigation_measurement_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_resource_investigation_id uuid NOT NULL,
  measurement_code text NOT NULL,
  measurement_name text NOT NULL,
  measurement_status text DEFAULT 'RECORDED'::text NOT NULL,
  numeric_value numeric,
  text_value text,
  unit text,
  method text,
  sample_identifier text,
  measured_at date,
  laboratory text,
  notes text,
  evidence_id uuid,
  recorded_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  country_resource_investigation_observation_id uuid,
  CONSTRAINT country_resource_investigation_measure_measurement_status_check CHECK (measurement_status = ANY (ARRAY['RECORDED'::text, 'NOT_MEASURED'::text, 'NOT_AVAILABLE'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT country_resource_investigati_country_resource_investigati_fkey1 FOREIGN KEY (country_resource_investigation_id) REFERENCES agriculture.country_resource_investigation(country_resource_investigation_id) ON DELETE CASCADE,
  CONSTRAINT country_resource_investigati_country_resource_investigati_fkey5 FOREIGN KEY (country_resource_investigation_observation_id) REFERENCES agriculture.country_resource_investigation_observation(country_resource_investigation_observation_id),
  CONSTRAINT country_resource_investigation_measurement_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES agriculture.country_resource_investigation_evidence(country_resource_investigation_evidence_id),
  CONSTRAINT country_resource_investigation_measurement_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_investigation_measurement_pkey PRIMARY KEY (country_resource_investigation_measurement_id),
  CONSTRAINT country_resource_investigatio_country_resource_investigatio_key UNIQUE (country_resource_investigation_id, measurement_code, sample_identifier)
);
CREATE INDEX country_resource_measurement_observation_idx ON agriculture.country_resource_investigation_measurement USING btree (country_resource_investigation_observation_id);

-- owner: postgres
CREATE TABLE agriculture.country_resource_investigation_observation (
  country_resource_investigation_observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  country_resource_investigation_id uuid NOT NULL,
  observation_type text NOT NULL,
  title text NOT NULL,
  observed_at timestamp with time zone,
  location_name text,
  latitude numeric,
  longitude numeric,
  observer_or_holder text,
  organisation text,
  sample_or_batch_id text,
  method text,
  direct_observation text NOT NULL,
  interpretation text,
  limitations text NOT NULL,
  observation_status text DEFAULT 'RECORDED_UNREVIEWED'::text NOT NULL,
  brain_routing_status text DEFAULT 'NOT_ROUTED'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT country_resource_investigation_obser_brain_routing_status_check CHECK (brain_routing_status = ANY (ARRAY['NOT_ROUTED'::text, 'ROUTING_PROPOSED'::text, 'SCIENTIST_APPROVED_FOR_ROUTING'::text, 'REJECTED'::text])),
  CONSTRAINT country_resource_investigation_observa_observation_status_check CHECK (observation_status = ANY (ARRAY['RECORDED_UNREVIEWED'::text, 'EVIDENCE_ATTACHED'::text, 'MEASUREMENTS_RECORDED'::text, 'SCIENTIST_REVIEWED'::text, 'REJECTED'::text])),
  CONSTRAINT country_resource_investigation_observati_observation_type_check CHECK (observation_type = ANY (ARRAY['FIELD_SITE'::text, 'FACILITY_PRODUCTION'::text, 'PHYSICAL_SAMPLE'::text, 'EXISTING_DATASET'::text, 'PRIOR_TRIAL_RESEARCH'::text, 'SPATIAL_ENVIRONMENTAL'::text, 'SOURCE_COVERAGE'::text])),
  CONSTRAINT country_resource_investigati_country_resource_investigati_fkey3 FOREIGN KEY (country_resource_investigation_id) REFERENCES agriculture.country_resource_investigation(country_resource_investigation_id) ON DELETE CASCADE,
  CONSTRAINT country_resource_investigation_observation_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT country_resource_investigation_observation_pkey PRIMARY KEY (country_resource_investigation_observation_id)
);
CREATE INDEX country_resource_observation_investigation_idx ON agriculture.country_resource_investigation_observation USING btree (country_resource_investigation_id, created_at DESC);
COMMENT ON TABLE agriculture.country_resource_investigation_observation IS 'Scientist-supplied candidate observations. Direct observations, interpretations and limitations remain separate; no automatic Brain admission.';

-- owner: postgres
CREATE TABLE agriculture.country_scope (
  country_code character(2) NOT NULL,
  country_name text NOT NULL,
  is_operating_country boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT country_scope_pkey PRIMARY KEY (country_code)
);

-- owner: postgres
CREATE TABLE agriculture.crop (
  crop_id uuid DEFAULT gen_random_uuid() NOT NULL,
  crop_code text NOT NULL,
  common_name text NOT NULL,
  scientific_name text,
  crop_group text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT crop_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT crop_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT crop_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT crop_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT crop_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT crop_pkey PRIMARY KEY (crop_id),
  CONSTRAINT crop_crop_code_key UNIQUE (crop_code)
);

-- owner: postgres
CREATE TABLE agriculture.data_integrity_rule (
  integrity_rule_id uuid DEFAULT gen_random_uuid() NOT NULL,
  integrity_rule_code text NOT NULL,
  rule_name text NOT NULL,
  rule_description text NOT NULL,
  entity_type text NOT NULL,
  rule_category text NOT NULL,
  enforcement_level text NOT NULL,
  rule_version integer DEFAULT 1 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  rule_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  supersedes_integrity_rule_id uuid,
  CONSTRAINT data_integrity_rule_enforcement_level_check CHECK (enforcement_level = ANY (ARRAY['DATABASE_BLOCK'::text, 'SERVICE_BLOCK'::text, 'WARNING'::text, 'REVIEW_REQUIRED'::text])),
  CONSTRAINT data_integrity_rule_rule_category_check CHECK (rule_category = ANY (ARRAY['REQUIRED_FIELD'::text, 'REFERENCE_INTEGRITY'::text, 'LIFECYCLE'::text, 'VERSION_LINEAGE'::text, 'EVIDENCE_COMPLETENESS'::text, 'AUTHORITY'::text, 'DUPLICATE_PREVENTION'::text, 'RANGE'::text, 'CROSS_FIELD'::text, 'OTHER'::text])),
  CONSTRAINT data_integrity_rule_rule_version_check CHECK (rule_version >= 1),
  CONSTRAINT integrity_rule_no_self_supersession CHECK (supersedes_integrity_rule_id IS NULL OR supersedes_integrity_rule_id <> integrity_rule_id),
  CONSTRAINT data_integrity_rule_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT data_integrity_rule_supersedes_integrity_rule_id_fkey FOREIGN KEY (supersedes_integrity_rule_id) REFERENCES agriculture.data_integrity_rule(integrity_rule_id),
  CONSTRAINT data_integrity_rule_pkey PRIMARY KEY (integrity_rule_id),
  CONSTRAINT data_integrity_rule_integrity_rule_code_key UNIQUE (integrity_rule_code)
);
CREATE INDEX ix_integrity_rule_entity ON agriculture.data_integrity_rule USING btree (entity_type, active, enforcement_level);

-- owner: postgres
CREATE TABLE agriculture.data_quality_assessment (
  data_quality_assessment_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  input_submission_id uuid,
  quality_status text NOT NULL,
  completeness_status text NOT NULL,
  context_quality text NOT NULL,
  method_quality text NOT NULL,
  evidence_quality text NOT NULL,
  photo_quality text DEFAULT 'NOT_APPLICABLE'::text NOT NULL,
  assessment_summary text NOT NULL,
  assessed_by uuid,
  assessed_at timestamp with time zone DEFAULT now() NOT NULL,
  review_required boolean DEFAULT false NOT NULL,
  governance_review_id uuid,
  CONSTRAINT data_quality_assessment_completeness_status_check CHECK (completeness_status = ANY (ARRAY['INCOMPLETE'::text, 'COMPLETE_WITH_WARNINGS'::text, 'COMPLETE'::text])),
  CONSTRAINT data_quality_assessment_context_quality_check CHECK (context_quality = ANY (ARRAY['MISSING'::text, 'LIMITED'::text, 'ADEQUATE'::text, 'STRONG'::text])),
  CONSTRAINT data_quality_assessment_evidence_quality_check CHECK (evidence_quality = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text])),
  CONSTRAINT data_quality_assessment_method_quality_check CHECK (method_quality = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'REFERENCE_GRADE'::text])),
  CONSTRAINT data_quality_assessment_photo_quality_check CHECK (photo_quality = ANY (ARRAY['NOT_APPLICABLE'::text, 'MISSING'::text, 'UNUSABLE'::text, 'LIMITED'::text, 'ACCEPTABLE'::text, 'STRONG'::text])),
  CONSTRAINT data_quality_assessment_quality_status_check CHECK (quality_status = ANY (ARRAY['UNASSESSED'::text, 'ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text, 'REVIEW_REQUIRED'::text, 'QUARANTINED'::text, 'REJECTED'::text])),
  CONSTRAINT data_quality_assessment_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT data_quality_assessment_governance_review_id_fkey FOREIGN KEY (governance_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT data_quality_assessment_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT data_quality_assessment_pkey PRIMARY KEY (data_quality_assessment_id),
  CONSTRAINT data_quality_assessment_subject_entity_type_subject_entity__key UNIQUE (subject_entity_type, subject_entity_id)
);
CREATE INDEX ix_data_quality_subject ON agriculture.data_quality_assessment USING btree (subject_entity_type, subject_entity_id, quality_status);

-- owner: postgres
CREATE TABLE agriculture.data_quality_flag (
  data_quality_flag_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  flag_type text NOT NULL,
  severity text NOT NULL,
  flag_status text DEFAULT 'OPEN'::text NOT NULL,
  flag_summary text NOT NULL,
  flag_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  raised_by uuid,
  raised_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_reason text,
  CONSTRAINT data_quality_flag_flag_status_check CHECK (flag_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text, 'RESOLVED'::text, 'ACCEPTED_EXCEPTION'::text, 'REJECTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT data_quality_flag_flag_type_check CHECK (flag_type = ANY (ARRAY['MISSING_CONTEXT'::text, 'OUT_OF_RANGE'::text, 'UNIT_MISMATCH'::text, 'DUPLICATE_SUSPECTED'::text, 'ANOMALY_DETECTED'::text, 'PHOTO_MISSING'::text, 'PHOTO_DUPLICATE'::text, 'PHOTO_CONTEXT_MISMATCH'::text, 'INSTRUMENT_UNCALIBRATED'::text, 'METHOD_UNSUITABLE'::text, 'TEMPORAL_INCONSISTENCY'::text, 'SPATIAL_INCONSISTENCY'::text, 'CROSS_FIELD_CONTRADICTION'::text, 'AUTHORITY_MISSING'::text, 'OTHER'::text])),
  CONSTRAINT data_quality_flag_severity_check CHECK (severity = ANY (ARRAY['INFO'::text, 'WARNING'::text, 'ERROR'::text, 'CRITICAL'::text])),
  CONSTRAINT quality_flag_resolution_consistency CHECK ((flag_status = ANY (ARRAY['RESOLVED'::text, 'ACCEPTED_EXCEPTION'::text, 'REJECTED'::text])) AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution_reason IS NOT NULL OR (flag_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text, 'SUPERSEDED'::text]))),
  CONSTRAINT data_quality_flag_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT data_quality_flag_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT data_quality_flag_pkey PRIMARY KEY (data_quality_flag_id)
);
CREATE INDEX ix_data_quality_flag_subject ON agriculture.data_quality_flag USING btree (subject_entity_type, subject_entity_id, flag_status, severity);

-- owner: postgres
CREATE TABLE agriculture.discovery_candidate (
  discovery_candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  candidate_code text NOT NULL,
  candidate_name text NOT NULL,
  candidate_object_type text NOT NULL,
  discovery_signal_id uuid,
  country_code character(2),
  material_class text,
  source_material text,
  preparation_class text,
  hypothesised_pathway text,
  candidate_summary text NOT NULL,
  uncertainty_summary text NOT NULL,
  lifecycle_status text DEFAULT 'DISCOVERY_CANDIDATE'::text NOT NULL,
  canonical_ingredient_id uuid,
  governance_decision_id uuid,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT discovery_candidate_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT discovery_candidate_candidate_object_type_check CHECK (candidate_object_type = ANY (ARRAY['INGREDIENT'::text, 'MECHANISM'::text, 'METHOD'::text, 'FORMULATION_STRATEGY'::text, 'PROCESS'::text, 'BIOLOGICAL_RELATIONSHIP'::text, 'OTHER'::text])),
  CONSTRAINT discovery_candidate_canonical_link_consistency CHECK (canonical_ingredient_id IS NULL OR (lifecycle_status = ANY (ARRAY['APPROVED_RESEARCH_INGREDIENT'::text, 'PROVEN_CANONICAL'::text])) AND governance_decision_id IS NOT NULL),
  CONSTRAINT discovery_candidate_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DISCOVERY_CANDIDATE'::text, 'IDENTITY_REVIEW'::text, 'PRELIMINARY_EVIDENCE_REVIEW'::text, 'MECHANISM_HYPOTHESIS'::text, 'SAFETY_AND_ECOLOGICAL_REVIEW'::text, 'LABORATORY_CANDIDATE'::text, 'SCIENTIST_ADMIN_DECISION'::text, 'UNDER_REVIEW'::text, 'REVIEWED'::text, 'INVESTIGATION_READY'::text, 'APPROVED_RESEARCH_INGREDIENT'::text, 'CONTROLLED_TRIAL'::text, 'PROVEN_CANONICAL'::text, 'REJECTED'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT discovery_candidate_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_candidate_canonical_ingredient_id_fkey FOREIGN KEY (canonical_ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT discovery_candidate_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT discovery_candidate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT discovery_candidate_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_candidate_discovery_signal_id_fkey FOREIGN KEY (discovery_signal_id) REFERENCES agriculture.discovery_signal(discovery_signal_id),
  CONSTRAINT discovery_candidate_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT discovery_candidate_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT discovery_candidate_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_candidate_pkey PRIMARY KEY (discovery_candidate_id),
  CONSTRAINT discovery_candidate_candidate_code_key UNIQUE (candidate_code)
);
CREATE INDEX ix_discovery_candidate_country_workspace ON agriculture.discovery_candidate USING btree (country_workspace_id);
CREATE INDEX ix_discovery_candidate_source ON agriculture.discovery_candidate USING btree (discovery_signal_id);
CREATE INDEX ix_discovery_candidate_status ON agriculture.discovery_candidate USING btree (lifecycle_status, candidate_object_type, country_code);

-- owner: postgres
CREATE TABLE agriculture.discovery_candidate_evidence (
  discovery_candidate_evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
  discovery_candidate_id uuid NOT NULL,
  evidence_packet_id uuid NOT NULL,
  evidence_role text NOT NULL,
  evidence_summary text NOT NULL,
  evidence_strength text DEFAULT 'UNASSESSED'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discovery_candidate_evidence_evidence_role_check CHECK (evidence_role = ANY (ARRAY['IDENTITY'::text, 'MECHANISM'::text, 'SAFETY'::text, 'ECOLOGICAL'::text, 'AGRICULTURAL'::text, 'ENVIRONMENTAL'::text, 'ECONOMIC'::text, 'MANUFACTURING'::text, 'CONTRADICTORY'::text, 'OTHER'::text])),
  CONSTRAINT discovery_candidate_evidence_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT discovery_candidate_evidence_discovery_candidate_id_fkey FOREIGN KEY (discovery_candidate_id) REFERENCES agriculture.discovery_candidate(discovery_candidate_id),
  CONSTRAINT discovery_candidate_evidence_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT discovery_candidate_evidence_pkey PRIMARY KEY (discovery_candidate_evidence_id),
  CONSTRAINT discovery_candidate_evidence_discovery_candidate_id_evidenc_key UNIQUE (discovery_candidate_id, evidence_packet_id, evidence_role)
);
CREATE INDEX ix_discovery_evidence_candidate ON agriculture.discovery_candidate_evidence USING btree (discovery_candidate_id, evidence_role);

-- owner: postgres
CREATE TABLE agriculture.discovery_promotion_event (
  discovery_promotion_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  promotion_code text NOT NULL,
  discovery_candidate_id uuid NOT NULL,
  promoted_entity_type text NOT NULL,
  promoted_entity_id uuid NOT NULL,
  governance_decision_id uuid NOT NULL,
  evidence_packet_id uuid NOT NULL,
  promotion_rationale text NOT NULL,
  promoted_by uuid NOT NULL,
  promoted_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discovery_promotion_event_promoted_entity_type_check CHECK (promoted_entity_type = 'INGREDIENT'::text),
  CONSTRAINT discovery_promotion_rationale_not_blank CHECK (length(btrim(promotion_rationale)) > 0),
  CONSTRAINT discovery_promotion_event_discovery_candidate_id_fkey FOREIGN KEY (discovery_candidate_id) REFERENCES agriculture.discovery_candidate(discovery_candidate_id),
  CONSTRAINT discovery_promotion_event_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT discovery_promotion_event_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT discovery_promotion_event_promoted_by_fkey FOREIGN KEY (promoted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_promotion_event_pkey PRIMARY KEY (discovery_promotion_event_id),
  CONSTRAINT discovery_promotion_event_discovery_candidate_id_promoted_e_key UNIQUE (discovery_candidate_id, promoted_entity_type),
  CONSTRAINT discovery_promotion_event_promotion_code_key UNIQUE (promotion_code)
);

-- owner: postgres
CREATE TABLE agriculture.discovery_review (
  discovery_review_id uuid DEFAULT gen_random_uuid() NOT NULL,
  discovery_candidate_id uuid NOT NULL,
  review_stage text NOT NULL,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  reviewer_id uuid,
  governance_review_id uuid,
  review_rationale text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discovery_review_final_consistency CHECK ((review_status = ANY (ARRAY['APPROVED_TO_PROGRESS'::text, 'CHANGES_REQUIRED'::text, 'REJECTED'::text, 'SUSPENDED'::text])) AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND review_rationale IS NOT NULL OR (review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text]))),
  CONSTRAINT discovery_review_review_stage_check CHECK (review_stage = ANY (ARRAY['IDENTITY'::text, 'PRELIMINARY_EVIDENCE'::text, 'MECHANISM'::text, 'SAFETY'::text, 'ECOLOGICAL'::text, 'LABORATORY'::text, 'FINAL_SCIENTIST_ADMIN'::text, 'TRIAL_READINESS'::text])),
  CONSTRAINT discovery_review_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text, 'APPROVED_TO_PROGRESS'::text, 'CHANGES_REQUIRED'::text, 'REJECTED'::text, 'SUSPENDED'::text])),
  CONSTRAINT discovery_review_discovery_candidate_id_fkey FOREIGN KEY (discovery_candidate_id) REFERENCES agriculture.discovery_candidate(discovery_candidate_id),
  CONSTRAINT discovery_review_governance_review_id_fkey FOREIGN KEY (governance_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT discovery_review_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_review_pkey PRIMARY KEY (discovery_review_id)
);
CREATE INDEX ix_discovery_review_candidate ON agriculture.discovery_review USING btree (discovery_candidate_id, review_stage, review_status);

-- owner: postgres
CREATE TABLE agriculture.discovery_signal (
  discovery_signal_id uuid DEFAULT gen_random_uuid() NOT NULL,
  signal_code text NOT NULL,
  signal_type text NOT NULL,
  signal_title text NOT NULL,
  signal_summary text NOT NULL,
  country_code character(2),
  source_object_id uuid,
  evidence_packet_id uuid,
  lifecycle_status text DEFAULT 'NEW'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT discovery_signal_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT discovery_signal_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['NEW'::text, 'UNDER_REVIEW'::text, 'CANDIDATE_CREATED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT discovery_signal_signal_type_check CHECK (signal_type = ANY (ARRAY['FIELD_OBSERVATION'::text, 'RESEARCH_SOURCE'::text, 'WASTE_STREAM'::text, 'NATURAL_MATERIAL'::text, 'MECHANISM_CLUE'::text, 'SCIENTIST_PROPOSAL'::text, 'EXTERNAL_RESEARCH'::text, 'OTHER'::text])),
  CONSTRAINT discovery_signal_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_signal_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT discovery_signal_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT discovery_signal_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT discovery_signal_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT discovery_signal_source_object_id_fkey FOREIGN KEY (source_object_id) REFERENCES agriculture.source_object(source_object_id),
  CONSTRAINT discovery_signal_pkey PRIMARY KEY (discovery_signal_id),
  CONSTRAINT discovery_signal_signal_code_key UNIQUE (signal_code)
);
CREATE INDEX ix_discovery_signal_country_workspace ON agriculture.discovery_signal USING btree (country_workspace_id);
CREATE INDEX ix_discovery_signal_status ON agriculture.discovery_signal USING btree (lifecycle_status, country_code);

-- owner: postgres
CREATE TABLE agriculture.duplicate_detection_event (
  duplicate_detection_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  suspected_duplicate_entity_type text NOT NULL,
  suspected_duplicate_entity_id uuid NOT NULL,
  detection_method text NOT NULL,
  detection_status text DEFAULT 'SUSPECTED'::text NOT NULL,
  finding_summary text NOT NULL,
  comparison_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  detected_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT duplicate_detection_event_detection_method_check CHECK (detection_method = ANY (ARRAY['EXACT_HASH'::text, 'FIELD_MATCH'::text, 'PHOTO_HASH'::text, 'TEMPORAL_MATCH'::text, 'SPATIAL_MATCH'::text, 'SIMILARITY_ANALYSIS'::text, 'MANUAL_REPORT'::text, 'OTHER'::text])),
  CONSTRAINT duplicate_detection_event_detection_status_check CHECK (detection_status = ANY (ARRAY['SUSPECTED'::text, 'CONFIRMED_DUPLICATE'::text, 'NOT_DUPLICATE'::text, 'ACCEPTED_REPEAT'::text, 'UNDER_REVIEW'::text])),
  CONSTRAINT duplicate_entities_must_differ CHECK (subject_entity_type <> suspected_duplicate_entity_type OR subject_entity_id <> suspected_duplicate_entity_id),
  CONSTRAINT duplicate_detection_event_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT duplicate_detection_event_pkey PRIMARY KEY (duplicate_detection_event_id)
);
CREATE INDEX ix_duplicate_subject ON agriculture.duplicate_detection_event USING btree (subject_entity_type, subject_entity_id, detection_status);

-- owner: postgres
CREATE TABLE agriculture.entity_correction (
  entity_correction_id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  affected_version_id uuid,
  correction_type text NOT NULL,
  original_value jsonb,
  corrected_value jsonb,
  correction_reason text NOT NULL,
  correction_status text DEFAULT 'PENDING'::text NOT NULL,
  governance_decision_id uuid,
  requested_by uuid,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  applied_version_id uuid,
  CONSTRAINT entity_correction_approval_consistency CHECK ((correction_status = ANY (ARRAY['APPROVED'::text, 'APPLIED'::text])) AND approved_by IS NOT NULL AND approved_at IS NOT NULL OR (correction_status <> ALL (ARRAY['APPROVED'::text, 'APPLIED'::text]))),
  CONSTRAINT entity_correction_correction_status_check CHECK (correction_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'APPLIED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT entity_correction_correction_type_check CHECK (correction_type = ANY (ARRAY['DATA_ENTRY_ERROR'::text, 'UNIT_ERROR'::text, 'IDENTITY_ERROR'::text, 'SCIENTIFIC_CORRECTION'::text, 'PROVENANCE_CORRECTION'::text, 'ADMINISTRATIVE_CORRECTION'::text, 'OTHER'::text])),
  CONSTRAINT entity_correction_affected_version_id_fkey FOREIGN KEY (affected_version_id) REFERENCES agriculture.entity_version(entity_version_id),
  CONSTRAINT entity_correction_applied_version_id_fkey FOREIGN KEY (applied_version_id) REFERENCES agriculture.entity_version(entity_version_id),
  CONSTRAINT entity_correction_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT entity_correction_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT entity_correction_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT entity_correction_pkey PRIMARY KEY (entity_correction_id)
);
CREATE INDEX ix_entity_correction_subject ON agriculture.entity_correction USING btree (entity_type, entity_id, correction_status);

-- owner: postgres
CREATE TABLE agriculture.entity_version (
  entity_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  version_no integer NOT NULL,
  version_status text DEFAULT 'DRAFT'::text NOT NULL,
  change_type text NOT NULL,
  change_reason text NOT NULL,
  change_summary text,
  supersedes_entity_version_id uuid,
  superseded_by_entity_version_id uuid,
  effective_from timestamp with time zone DEFAULT now() NOT NULL,
  effective_until timestamp with time zone,
  governance_decision_id uuid,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  version_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT entity_version_approval_consistency CHECK (version_status = 'APPROVED'::text AND approved_by IS NOT NULL AND approved_at IS NOT NULL OR version_status <> 'APPROVED'::text),
  CONSTRAINT entity_version_change_type_check CHECK (change_type = ANY (ARRAY['INITIAL'::text, 'CORRECTION'::text, 'AMENDMENT'::text, 'SCIENTIFIC_UPDATE'::text, 'SAFETY_UPDATE'::text, 'ADMINISTRATIVE_UPDATE'::text, 'SUPERSESSION'::text, 'OTHER'::text])),
  CONSTRAINT entity_version_effective_period CHECK (effective_until IS NULL OR effective_until >= effective_from),
  CONSTRAINT entity_version_no_self_supersession CHECK ((supersedes_entity_version_id IS NULL OR supersedes_entity_version_id <> entity_version_id) AND (superseded_by_entity_version_id IS NULL OR superseded_by_entity_version_id <> entity_version_id)),
  CONSTRAINT entity_version_version_no_check CHECK (version_no >= 1),
  CONSTRAINT entity_version_version_status_check CHECK (version_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'RETIRED'::text])),
  CONSTRAINT entity_version_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT entity_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT entity_version_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT entity_version_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT entity_version_superseded_by_entity_version_id_fkey FOREIGN KEY (superseded_by_entity_version_id) REFERENCES agriculture.entity_version(entity_version_id),
  CONSTRAINT entity_version_supersedes_entity_version_id_fkey FOREIGN KEY (supersedes_entity_version_id) REFERENCES agriculture.entity_version(entity_version_id),
  CONSTRAINT entity_version_pkey PRIMARY KEY (entity_version_id),
  CONSTRAINT entity_version_entity_type_entity_id_version_no_key UNIQUE (entity_type, entity_id, version_no)
);
CREATE INDEX ix_entity_version_status ON agriculture.entity_version USING btree (version_status, effective_from);
CREATE INDEX ix_entity_version_subject ON agriculture.entity_version USING btree (entity_type, entity_id, version_no);

-- owner: postgres
CREATE TABLE agriculture.environmental_burden_profile (
  environmental_burden_profile_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_waste_stream_id uuid NOT NULL,
  air_pollution_burden text DEFAULT 'UNASSESSED'::text NOT NULL,
  water_pollution_burden text DEFAULT 'UNASSESSED'::text NOT NULL,
  soil_pollution_burden text DEFAULT 'UNASSESSED'::text NOT NULL,
  burning_pressure text DEFAULT 'UNASSESSED'::text NOT NULL,
  landfill_pressure text DEFAULT 'UNASSESSED'::text NOT NULL,
  dumping_pressure text DEFAULT 'UNASSESSED'::text NOT NULL,
  environmental_burden_summary text NOT NULL,
  evidence_strength text DEFAULT 'UNASSESSED'::text NOT NULL,
  evidence_packet_id uuid,
  assessed_by uuid,
  assessed_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT environmental_burden_profile_air_pollution_burden_check CHECK (air_pollution_burden = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'SEVERE'::text])),
  CONSTRAINT environmental_burden_profile_burning_pressure_check CHECK (burning_pressure = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'SEVERE'::text])),
  CONSTRAINT environmental_burden_profile_dumping_pressure_check CHECK (dumping_pressure = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'SEVERE'::text])),
  CONSTRAINT environmental_burden_profile_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT environmental_burden_profile_landfill_pressure_check CHECK (landfill_pressure = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'SEVERE'::text])),
  CONSTRAINT environmental_burden_profile_soil_pollution_burden_check CHECK (soil_pollution_burden = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'SEVERE'::text])),
  CONSTRAINT environmental_burden_profile_water_pollution_burden_check CHECK (water_pollution_burden = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'SEVERE'::text])),
  CONSTRAINT environmental_burden_profile_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT environmental_burden_profile_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT environmental_burden_profile_resource_waste_stream_id_fkey FOREIGN KEY (resource_waste_stream_id) REFERENCES agriculture.resource_waste_stream(resource_waste_stream_id),
  CONSTRAINT environmental_burden_profile_pkey PRIMARY KEY (environmental_burden_profile_id),
  CONSTRAINT environmental_burden_profile_resource_waste_stream_id_key UNIQUE (resource_waste_stream_id)
);

-- owner: postgres
CREATE TABLE agriculture.environmental_recovery_outcome (
  environmental_recovery_outcome_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_waste_stream_id uuid NOT NULL,
  resource_recovery_pathway_id uuid,
  subject_entity_type text,
  subject_entity_id uuid,
  waste_diverted_quantity numeric,
  waste_diverted_unit text,
  burning_avoided_quantity numeric,
  burning_avoided_unit text,
  landfill_avoided_quantity numeric,
  landfill_avoided_unit text,
  nutrient_recovered_summary text,
  pollution_reduction_summary text,
  circular_economy_summary text,
  outcome_status text DEFAULT 'DRAFT'::text NOT NULL,
  evidence_packet_id uuid,
  validated_by uuid,
  validated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT environmental_recovery_outcome_outcome_status_check CHECK (outcome_status = ANY (ARRAY['DRAFT'::text, 'MEASURED'::text, 'VALIDATED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT recovery_outcome_validation_consistency CHECK (outcome_status = 'VALIDATED'::text AND validated_by IS NOT NULL AND validated_at IS NOT NULL AND evidence_packet_id IS NOT NULL OR outcome_status <> 'VALIDATED'::text),
  CONSTRAINT environmental_recovery_outcom_resource_recovery_pathway_id_fkey FOREIGN KEY (resource_recovery_pathway_id) REFERENCES agriculture.resource_recovery_pathway(resource_recovery_pathway_id),
  CONSTRAINT environmental_recovery_outcome_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT environmental_recovery_outcome_resource_waste_stream_id_fkey FOREIGN KEY (resource_waste_stream_id) REFERENCES agriculture.resource_waste_stream(resource_waste_stream_id),
  CONSTRAINT environmental_recovery_outcome_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT environmental_recovery_outcome_pkey PRIMARY KEY (environmental_recovery_outcome_id)
);

-- owner: postgres
CREATE TABLE agriculture.evidence_packet (
  evidence_packet_id uuid DEFAULT gen_random_uuid() NOT NULL,
  evidence_packet_code text NOT NULL,
  packet_type text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  packet_status text DEFAULT 'DRAFT'::text NOT NULL,
  evidence_summary text,
  completeness_status text DEFAULT 'INCOMPLETE'::text NOT NULL,
  current_version_no integer DEFAULT 1 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  country_workspace_id uuid,
  CONSTRAINT evidence_packet_completeness_status_check CHECK (completeness_status = ANY (ARRAY['INCOMPLETE'::text, 'COMPLETE_WITH_WARNINGS'::text, 'COMPLETE'::text])),
  CONSTRAINT evidence_packet_current_version_no_check CHECK (current_version_no >= 1),
  CONSTRAINT evidence_packet_packet_status_check CHECK (packet_status = ANY (ARRAY['DRAFT'::text, 'ASSEMBLING'::text, 'COMPLETE'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT evidence_packet_packet_type_check CHECK (packet_type = ANY (ARRAY['INGREDIENT'::text, 'FORMULATION'::text, 'TRIAL'::text, 'PLOT'::text, 'OBSERVATION'::text, 'MEASUREMENT'::text, 'OUTCOME'::text, 'DISCOVERY_CANDIDATE'::text, 'LEARNING_CANDIDATE'::text, 'SCIENTIFIC_MEMORY'::text, 'OTHER'::text])),
  CONSTRAINT evidence_packet_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT evidence_packet_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT evidence_packet_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT evidence_packet_pkey PRIMARY KEY (evidence_packet_id),
  CONSTRAINT evidence_packet_evidence_packet_code_key UNIQUE (evidence_packet_code)
);
CREATE INDEX ix_evidence_packet_country_workspace ON agriculture.evidence_packet USING btree (country_workspace_id);
CREATE INDEX ix_evidence_packet_subject ON agriculture.evidence_packet USING btree (subject_entity_type, subject_entity_id, packet_status);

-- owner: postgres
CREATE TABLE agriculture.evidence_packet_item (
  evidence_packet_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
  evidence_packet_id uuid NOT NULL,
  item_order integer DEFAULT 1 NOT NULL,
  evidence_item_type text NOT NULL,
  linked_entity_type text,
  linked_entity_id uuid,
  source_object_id uuid,
  evidence_role text DEFAULT 'SUPPORTING'::text NOT NULL,
  item_summary text,
  inclusion_status text DEFAULT 'INCLUDED'::text NOT NULL,
  added_by uuid,
  added_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT evidence_packet_item_evidence_item_type_check CHECK (evidence_item_type = ANY (ARRAY['SOURCE_OBJECT'::text, 'OBSERVATION'::text, 'MEASUREMENT'::text, 'PHOTO'::text, 'DOCUMENT'::text, 'LAB_RESULT'::text, 'FIELD_NOTE'::text, 'INSTRUMENT_READING'::text, 'DECISION'::text, 'REVIEW'::text, 'OTHER'::text])),
  CONSTRAINT evidence_packet_item_evidence_role_check CHECK (evidence_role = ANY (ARRAY['PRIMARY'::text, 'SUPPORTING'::text, 'CONTEXTUAL'::text, 'CONTRADICTORY'::text, 'EXCLUDED'::text])),
  CONSTRAINT evidence_packet_item_inclusion_status_check CHECK (inclusion_status = ANY (ARRAY['INCLUDED'::text, 'PENDING_REVIEW'::text, 'EXCLUDED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT evidence_packet_item_item_order_check CHECK (item_order >= 1),
  CONSTRAINT evidence_packet_item_added_by_fkey FOREIGN KEY (added_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT evidence_packet_item_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT evidence_packet_item_source_object_id_fkey FOREIGN KEY (source_object_id) REFERENCES agriculture.source_object(source_object_id),
  CONSTRAINT evidence_packet_item_pkey PRIMARY KEY (evidence_packet_item_id),
  CONSTRAINT evidence_packet_item_evidence_packet_id_item_order_key UNIQUE (evidence_packet_id, item_order)
);
CREATE INDEX ix_evidence_packet_item_packet ON agriculture.evidence_packet_item USING btree (evidence_packet_id, item_order);

-- owner: postgres
CREATE TABLE agriculture.evidence_source (
  evidence_source_id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_type text NOT NULL,
  title text NOT NULL,
  citation text,
  source_url text,
  publication_date date,
  jurisdiction text,
  source_hash text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT evidence_source_source_type_check CHECK (source_type = ANY (ARRAY['PEER_REVIEWED_PAPER'::text, 'GOVERNMENT'::text, 'STANDARD'::text, 'PATENT'::text, 'INSTITUTIONAL'::text, 'SUPPLIER'::text, 'HISTORICAL_DATASET'::text, 'FIELD_EVIDENCE'::text, 'OTHER'::text])),
  CONSTRAINT evidence_source_pkey PRIMARY KEY (evidence_source_id)
);

-- owner: postgres
CREATE TABLE agriculture.farm (
  farm_id uuid DEFAULT gen_random_uuid() NOT NULL,
  farm_code text NOT NULL,
  farm_name text NOT NULL,
  organization_id uuid,
  country_code character(2),
  description text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT farm_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT farm_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT farm_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT farm_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT farm_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT farm_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES agriculture.organization(organization_id),
  CONSTRAINT farm_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT farm_pkey PRIMARY KEY (farm_id),
  CONSTRAINT farm_farm_code_key UNIQUE (farm_code)
);
CREATE INDEX ix_farm_organization ON agriculture.farm USING btree (organization_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.field_round_event (
  field_round_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  trial_id uuid NOT NULL,
  plot_id uuid,
  round_code text NOT NULL,
  round_type text DEFAULT 'DAILY_CAPTURE'::text NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  captured_by uuid,
  status text DEFAULT 'STARTED'::text NOT NULL,
  summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT field_round_event_status_check CHECK (status = ANY (ARRAY['STARTED'::text, 'COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'ABORTED'::text])),
  CONSTRAINT field_round_event_captured_by_fkey FOREIGN KEY (captured_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT field_round_event_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES agriculture.plot(plot_id),
  CONSTRAINT field_round_event_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT field_round_event_pkey PRIMARY KEY (field_round_event_id),
  CONSTRAINT field_round_event_trial_id_round_code_key UNIQUE (trial_id, round_code)
);
CREATE INDEX ix_field_round_trial ON agriculture.field_round_event USING btree (trial_id, started_at);

-- owner: postgres
CREATE TABLE agriculture.formulation_candidate (
  formulation_candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  candidate_code text NOT NULL,
  formulation_request_id uuid NOT NULL,
  reasoning_run_id uuid,
  hypothesis_id uuid,
  candidate_name text NOT NULL,
  candidate_summary text NOT NULL,
  candidate_status text DEFAULT 'ADVISORY'::text NOT NULL,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT formulation_candidate_archive_consistency CHECK (candidate_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR candidate_status <> 'ARCHIVED'::text),
  CONSTRAINT formulation_candidate_candidate_status_check CHECK (candidate_status = ANY (ARRAY['ADVISORY'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_FOR_VERSIONING'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT formulation_candidate_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_candidate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT formulation_candidate_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_candidate_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT formulation_candidate_formulation_request_id_fkey FOREIGN KEY (formulation_request_id) REFERENCES agriculture.formulation_request(formulation_request_id),
  CONSTRAINT formulation_candidate_hypothesis_id_fkey FOREIGN KEY (hypothesis_id) REFERENCES agriculture.hypothesis(hypothesis_id),
  CONSTRAINT formulation_candidate_reasoning_run_id_fkey FOREIGN KEY (reasoning_run_id) REFERENCES agriculture.reasoning_run(reasoning_run_id),
  CONSTRAINT formulation_candidate_pkey PRIMARY KEY (formulation_candidate_id),
  CONSTRAINT formulation_candidate_candidate_code_key UNIQUE (candidate_code)
);
CREATE INDEX ix_candidate_request ON agriculture.formulation_candidate USING btree (formulation_request_id, candidate_status);
CREATE INDEX ix_formulation_candidate_country_workspace ON agriculture.formulation_candidate USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.formulation_request (
  formulation_request_id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_code text NOT NULL,
  request_title text NOT NULL,
  problem_id uuid,
  crop_id uuid,
  variety_id uuid,
  request_objective text NOT NULL,
  request_constraints jsonb DEFAULT '{}'::jsonb NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT formulation_request_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT formulation_request_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'UNDER_REVIEW'::text, 'COMPLETED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT formulation_request_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_request_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT formulation_request_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_request_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES agriculture.crop(crop_id),
  CONSTRAINT formulation_request_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES agriculture.agricultural_problem(agricultural_problem_id),
  CONSTRAINT formulation_request_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_request_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES agriculture.variety(variety_id),
  CONSTRAINT formulation_request_pkey PRIMARY KEY (formulation_request_id),
  CONSTRAINT formulation_request_request_code_key UNIQUE (request_code)
);
CREATE INDEX ix_formulation_request_country_workspace ON agriculture.formulation_request USING btree (country_workspace_id);
CREATE INDEX ix_formulation_request_crop ON agriculture.formulation_request USING btree (crop_id, variety_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.formulation_version (
  formulation_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
  version_code text NOT NULL,
  formulation_name text NOT NULL,
  version_number integer NOT NULL,
  formulation_type text DEFAULT 'OTHER'::text NOT NULL,
  formulation_candidate_id uuid,
  derived_from_version_id uuid,
  change_type text DEFAULT 'INITIAL'::text NOT NULL,
  change_rationale text NOT NULL,
  expected_outcomes text,
  data_class text DEFAULT 'TEST'::text NOT NULL,
  trial_readiness text DEFAULT 'NOT_READY'::text NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  governance_decision_id uuid,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  country_workspace_id uuid,
  CONSTRAINT formulation_version_approval_consistency CHECK (lifecycle_status = 'APPROVED'::text AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND governance_decision_id IS NOT NULL OR lifecycle_status <> 'APPROVED'::text),
  CONSTRAINT formulation_version_change_type_check CHECK (change_type = ANY (ARRAY['INITIAL'::text, 'GO_HARD'::text, 'GO_HARDER'::text, 'CONTROL_VARIANT'::text, 'DRY_GEL_VARIANT'::text, 'WET_GEL_VARIANT'::text, 'STRESS_RESPONSE_VARIANT'::text, 'NUTRIENT_UPTAKE_VARIANT'::text, 'COST_OPTIMISED_VARIANT'::text, 'CORRECTION'::text, 'OTHER'::text])),
  CONSTRAINT formulation_version_data_class_check CHECK (data_class = ANY (ARRAY['REAL'::text, 'TEST'::text, 'SYSTEM_SEED'::text, 'AI_GENERATED'::text, 'ARCHIVED'::text])),
  CONSTRAINT formulation_version_formulation_type_check CHECK (formulation_type = ANY (ARRAY['DRY_GEL'::text, 'WET_GEL'::text, 'CONTROL'::text, 'OTHER'::text])),
  CONSTRAINT formulation_version_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'RETIRED'::text])),
  CONSTRAINT formulation_version_no_self_derivation CHECK (derived_from_version_id IS NULL OR derived_from_version_id <> formulation_version_id),
  CONSTRAINT formulation_version_trial_readiness_check CHECK (trial_readiness = ANY (ARRAY['NOT_READY'::text, 'SCIENTIST_REVIEW_REQUIRED'::text, 'READY_FOR_TRIAL'::text, 'BLOCKED'::text, 'RETIRED'::text])),
  CONSTRAINT formulation_version_version_number_check CHECK (version_number >= 1),
  CONSTRAINT formulation_version_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_version_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT formulation_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_version_derived_from_version_id_fkey FOREIGN KEY (derived_from_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT formulation_version_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT formulation_version_formulation_candidate_id_fkey FOREIGN KEY (formulation_candidate_id) REFERENCES agriculture.formulation_candidate(formulation_candidate_id),
  CONSTRAINT formulation_version_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT formulation_version_pkey PRIMARY KEY (formulation_version_id),
  CONSTRAINT formulation_version_formulation_name_version_number_key UNIQUE (formulation_name, version_number),
  CONSTRAINT formulation_version_version_code_key UNIQUE (version_code)
);
CREATE INDEX ix_formulation_version_country_workspace ON agriculture.formulation_version USING btree (country_workspace_id);
CREATE INDEX ix_formulation_version_parent ON agriculture.formulation_version USING btree (derived_from_version_id);
CREATE INDEX ix_formulation_version_status ON agriculture.formulation_version USING btree (lifecycle_status, trial_readiness);

-- owner: postgres
CREATE TABLE agriculture.formulation_version_ingredient_line (
  formulation_version_ingredient_line_id uuid DEFAULT gen_random_uuid() NOT NULL,
  formulation_version_id uuid NOT NULL,
  ingredient_id uuid NOT NULL,
  inclusion_rate_percent numeric(8,4) NOT NULL,
  sequence_order integer NOT NULL,
  ingredient_role text NOT NULL,
  line_notes text,
  data_class text DEFAULT 'TEST'::text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT formulation_version_ingredient_lin_inclusion_rate_percent_check CHECK (inclusion_rate_percent >= 0::numeric AND inclusion_rate_percent <= 100::numeric),
  CONSTRAINT formulation_version_ingredient_line_data_class_check CHECK (data_class = ANY (ARRAY['REAL'::text, 'TEST'::text, 'SYSTEM_SEED'::text, 'AI_GENERATED'::text, 'ARCHIVED'::text])),
  CONSTRAINT formulation_version_ingredient_line_sequence_order_check CHECK (sequence_order >= 1),
  CONSTRAINT formulation_version_ingredient_line_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT formulation_version_ingredient_line_formulation_version_id_fkey FOREIGN KEY (formulation_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT formulation_version_ingredient_line_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT formulation_version_ingredient_line_pkey PRIMARY KEY (formulation_version_ingredient_line_id),
  CONSTRAINT formulation_version_ingredien_formulation_version_id_ingred_key UNIQUE (formulation_version_id, ingredient_id),
  CONSTRAINT formulation_version_ingredien_formulation_version_id_sequen_key UNIQUE (formulation_version_id, sequence_order)
);
CREATE INDEX ix_formulation_line_version ON agriculture.formulation_version_ingredient_line USING btree (formulation_version_id, sequence_order);

-- owner: postgres
CREATE TABLE agriculture.governance_decision (
  decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
  decision_code text NOT NULL,
  decision_type text NOT NULL,
  decision_status text DEFAULT 'DRAFT'::text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  required_authority_role text,
  rationale text NOT NULL,
  evidence_summary text,
  outcome_summary text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  decided_by uuid,
  decided_at timestamp with time zone,
  supersedes_decision_id uuid,
  CONSTRAINT governance_decision_decision_status_check CHECK (decision_status = ANY (ARRAY['DRAFT'::text, 'PENDING_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'WITHDRAWN'::text, 'SUPERSEDED'::text])),
  CONSTRAINT governance_decision_decision_type_check CHECK (decision_type = ANY (ARRAY['CREATE'::text, 'ACTIVATE'::text, 'APPROVE'::text, 'REJECT'::text, 'AMEND'::text, 'SUSPEND'::text, 'RETIRE'::text, 'SUPERSEDE'::text, 'QUARANTINE'::text, 'RELEASE_FROM_QUARANTINE'::text, 'AUTHORISE_TRIAL'::text, 'APPROVE_LEARNING'::text, 'APPROVE_MEMORY'::text, 'OTHER'::text])),
  CONSTRAINT governance_decision_final_state_consistency CHECK ((decision_status = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text])) AND decided_by IS NOT NULL AND decided_at IS NOT NULL OR (decision_status <> ALL (ARRAY['APPROVED'::text, 'REJECTED'::text]))),
  CONSTRAINT governance_decision_no_self_supersession CHECK (supersedes_decision_id IS NULL OR supersedes_decision_id <> decision_id),
  CONSTRAINT governance_decision_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT governance_decision_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT governance_decision_required_authority_role_fkey FOREIGN KEY (required_authority_role) REFERENCES agriculture.authority_role(role_code),
  CONSTRAINT governance_decision_supersedes_decision_id_fkey FOREIGN KEY (supersedes_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT governance_decision_pkey PRIMARY KEY (decision_id),
  CONSTRAINT governance_decision_decision_code_key UNIQUE (decision_code)
);
CREATE INDEX ix_governance_decision_status ON agriculture.governance_decision USING btree (decision_status, created_at);
CREATE INDEX ix_governance_decision_subject ON agriculture.governance_decision USING btree (subject_entity_type, subject_entity_id);

-- owner: postgres
CREATE TABLE agriculture.governance_review (
  review_id uuid DEFAULT gen_random_uuid() NOT NULL,
  review_code text NOT NULL,
  decision_id uuid,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  review_type text NOT NULL,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  reviewer_id uuid,
  required_authority_role text,
  evidence_reviewed_summary text,
  review_rationale text,
  review_result text,
  required_follow_up text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  CONSTRAINT governance_review_final_state_consistency CHECK ((review_status = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text, 'CHANGES_REQUIRED'::text])) AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND review_rationale IS NOT NULL OR (review_status <> ALL (ARRAY['APPROVED'::text, 'REJECTED'::text, 'CHANGES_REQUIRED'::text]))),
  CONSTRAINT governance_review_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'CHANGES_REQUIRED'::text, 'WITHDRAWN'::text, 'SUPERSEDED'::text])),
  CONSTRAINT governance_review_review_type_check CHECK (review_type = ANY (ARRAY['SCIENTIFIC'::text, 'SAFETY'::text, 'ECOLOGICAL'::text, 'DATA_QUALITY'::text, 'EVIDENCE'::text, 'FIELD'::text, 'ADMINISTRATIVE'::text, 'FINAL_APPROVAL'::text])),
  CONSTRAINT governance_review_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT governance_review_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT governance_review_required_authority_role_fkey FOREIGN KEY (required_authority_role) REFERENCES agriculture.authority_role(role_code),
  CONSTRAINT governance_review_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT governance_review_pkey PRIMARY KEY (review_id),
  CONSTRAINT governance_review_review_code_key UNIQUE (review_code)
);
CREATE INDEX ix_governance_review_status ON agriculture.governance_review USING btree (review_status, created_at);
CREATE INDEX ix_governance_review_subject ON agriculture.governance_review USING btree (subject_entity_type, subject_entity_id);

-- owner: postgres
CREATE TABLE agriculture.governance_transition_log (
  governance_transition_id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  from_lifecycle_status text,
  to_lifecycle_status text NOT NULL,
  from_approval_status text,
  to_approval_status text,
  transition_reason text NOT NULL,
  decision_id uuid,
  review_id uuid,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  transition_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT governance_transition_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT governance_transition_log_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT governance_transition_log_review_id_fkey FOREIGN KEY (review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT governance_transition_log_pkey PRIMARY KEY (governance_transition_id)
);
CREATE INDEX ix_governance_transition_entity ON agriculture.governance_transition_log USING btree (entity_type, entity_id, changed_at);

-- owner: postgres
CREATE TABLE agriculture.hypothesis (
  hypothesis_id uuid DEFAULT gen_random_uuid() NOT NULL,
  hypothesis_code text NOT NULL,
  formulation_request_id uuid,
  reasoning_run_id uuid,
  hypothesis_statement text NOT NULL,
  expected_outcomes text,
  uncertainty_summary text,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT hypothesis_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT hypothesis_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_FOR_TEST'::text, 'REJECTED'::text, 'TESTED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT hypothesis_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT hypothesis_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT hypothesis_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT hypothesis_formulation_request_id_fkey FOREIGN KEY (formulation_request_id) REFERENCES agriculture.formulation_request(formulation_request_id),
  CONSTRAINT hypothesis_reasoning_run_id_fkey FOREIGN KEY (reasoning_run_id) REFERENCES agriculture.reasoning_run(reasoning_run_id),
  CONSTRAINT hypothesis_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT hypothesis_pkey PRIMARY KEY (hypothesis_id),
  CONSTRAINT hypothesis_hypothesis_code_key UNIQUE (hypothesis_code)
);
CREATE INDEX ix_hypothesis_country_workspace ON agriculture.hypothesis USING btree (country_workspace_id);
CREATE INDEX ix_hypothesis_request ON agriculture.hypothesis USING btree (formulation_request_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.ingredient (
  ingredient_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingredient_code text NOT NULL,
  ingredient_name text NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  material_class text NOT NULL,
  preparation_class text,
  data_class text DEFAULT 'MIGRATED_UNREVIEWED'::text NOT NULL,
  country_code character(2),
  current_version_no integer DEFAULT 1 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  retired_at timestamp with time zone,
  country_workspace_id uuid,
  CONSTRAINT ingredient_current_version_no_check CHECK (current_version_no >= 1),
  CONSTRAINT ingredient_data_class_check CHECK (data_class = ANY (ARRAY['RESEARCHED'::text, 'MIGRATED_UNREVIEWED'::text, 'SCIENTIST_APPROVED'::text, 'EXPERIMENTAL_UNVERIFIED'::text, 'ARCHIVED'::text])),
  CONSTRAINT ingredient_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'SUPERSEDED'::text, 'QUARANTINED'::text])),
  CONSTRAINT ingredient_material_class_check CHECK (material_class = ANY (ARRAY['PLANT_DERIVED'::text, 'ANIMAL_DERIVED'::text, 'MICROBIAL'::text, 'FERMENTATION_DERIVED'::text, 'MARINE_DERIVED'::text, 'NATURALLY_OCCURRING_MINERAL'::text, 'GEOLOGICAL_MATERIAL'::text, 'NATURAL_WASTE_OR_BYPRODUCT'::text, 'RECOVERED_MINERAL_MATERIAL'::text, 'OTHER_NATURAL_OR_BIOLOGICAL'::text, 'SYNTHETIC_AGROCHEMICAL'::text, 'UNDECLARED_CHEMICAL_BLEND'::text, 'UNVERIFIED_PROPRIETARY_CHEMISTRY'::text, 'PROHIBITED_OR_RESTRICTED_MATERIAL'::text, 'UNSAFE_OR_UNIDENTIFIED_MATERIAL'::text])),
  CONSTRAINT ingredient_preparation_class_check CHECK (preparation_class = ANY (ARRAY['UNPROCESSED'::text, 'PHYSICALLY_PROCESSED'::text, 'DRIED'::text, 'GROUND'::text, 'FILTERED'::text, 'FERMENTED'::text, 'WATER_EXTRACTED'::text, 'OTHER_LOW_TRANSFORMATION'::text])),
  CONSTRAINT ingredient_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT ingredient_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT ingredient_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT ingredient_pkey PRIMARY KEY (ingredient_id),
  CONSTRAINT ingredient_ingredient_code_key UNIQUE (ingredient_code)
);
CREATE INDEX ix_ingredient_country_workspace ON agriculture.ingredient USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.ingredient_alias (
  ingredient_alias_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingredient_id uuid NOT NULL,
  alias_name text NOT NULL,
  language_code text,
  alias_type text DEFAULT 'COMMON'::text NOT NULL,
  CONSTRAINT ingredient_alias_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT ingredient_alias_pkey PRIMARY KEY (ingredient_alias_id),
  CONSTRAINT ingredient_alias_ingredient_id_alias_name_language_code_key UNIQUE (ingredient_id, alias_name, language_code)
);

-- owner: postgres
CREATE TABLE agriculture.ingredient_evidence (
  ingredient_evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingredient_id uuid NOT NULL,
  ingredient_version_id uuid,
  evidence_source_id uuid NOT NULL,
  claim_type text NOT NULL,
  claim_summary text NOT NULL,
  evidence_strength text DEFAULT 'UNASSESSED'::text NOT NULL,
  supports_claim boolean,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT ingredient_evidence_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT ingredient_evidence_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  CONSTRAINT ingredient_evidence_evidence_source_id_fkey FOREIGN KEY (evidence_source_id) REFERENCES agriculture.evidence_source(evidence_source_id),
  CONSTRAINT ingredient_evidence_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT ingredient_evidence_ingredient_version_id_fkey FOREIGN KEY (ingredient_version_id) REFERENCES agriculture.ingredient_version(ingredient_version_id),
  CONSTRAINT ingredient_evidence_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT ingredient_evidence_pkey PRIMARY KEY (ingredient_evidence_id)
);

-- owner: postgres
CREATE TABLE agriculture.ingredient_version (
  ingredient_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingredient_id uuid NOT NULL,
  version_no integer NOT NULL,
  category text,
  foliar_compatibility text,
  fertigation_compatibility text,
  risks_contraindications text,
  mitigation_lever text,
  handling_storage_notes text,
  amendment_rationale text NOT NULL,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  created_by uuid,
  approved_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_at timestamp with time zone,
  CONSTRAINT ingredient_version_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT ingredient_version_version_no_check CHECK (version_no >= 1),
  CONSTRAINT ingredient_version_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT ingredient_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT ingredient_version_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT ingredient_version_pkey PRIMARY KEY (ingredient_version_id),
  CONSTRAINT ingredient_version_ingredient_id_version_no_key UNIQUE (ingredient_id, version_no)
);

-- owner: postgres
CREATE TABLE agriculture.input_submission (
  input_submission_id uuid DEFAULT gen_random_uuid() NOT NULL,
  submission_code text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid,
  submission_type text NOT NULL,
  submission_status text DEFAULT 'RECEIVED'::text NOT NULL,
  submitted_payload jsonb NOT NULL,
  normalised_payload jsonb,
  submitted_by uuid,
  request_context_id uuid,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  validation_completed_at timestamp with time zone,
  accepted_by uuid,
  accepted_at timestamp with time zone,
  rejection_reason text,
  CONSTRAINT input_submission_final_state_consistency CHECK (submission_status = 'ACCEPTED'::text AND accepted_by IS NOT NULL AND accepted_at IS NOT NULL OR submission_status <> 'ACCEPTED'::text),
  CONSTRAINT input_submission_rejection_consistency CHECK (submission_status = 'REJECTED'::text AND rejection_reason IS NOT NULL OR submission_status <> 'REJECTED'::text),
  CONSTRAINT input_submission_submission_status_check CHECK (submission_status = ANY (ARRAY['RECEIVED'::text, 'VALIDATING'::text, 'VALID'::text, 'VALID_WITH_WARNINGS'::text, 'QUARANTINED'::text, 'REJECTED'::text, 'ACCEPTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT input_submission_submission_type_check CHECK (submission_type = ANY (ARRAY['INGREDIENT'::text, 'TRIAL'::text, 'PLOT'::text, 'APPLICATION'::text, 'OBSERVATION'::text, 'MEASUREMENT'::text, 'OUTCOME'::text, 'PHOTO_EVIDENCE'::text, 'DISCOVERY_CANDIDATE'::text, 'OTHER'::text])),
  CONSTRAINT input_submission_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT input_submission_request_context_id_fkey FOREIGN KEY (request_context_id) REFERENCES agriculture.request_context(request_context_id),
  CONSTRAINT input_submission_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT input_submission_pkey PRIMARY KEY (input_submission_id),
  CONSTRAINT input_submission_submission_code_key UNIQUE (submission_code)
);
CREATE INDEX ix_input_submission_subject ON agriculture.input_submission USING btree (subject_entity_type, subject_entity_id, submission_status);

-- owner: postgres
CREATE TABLE agriculture.input_validation_event (
  input_validation_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  input_submission_id uuid NOT NULL,
  validation_type text NOT NULL,
  validation_result text NOT NULL,
  rule_code text NOT NULL,
  validation_summary text NOT NULL,
  validation_detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  validated_by uuid,
  validated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT input_validation_event_validation_result_check CHECK (validation_result = ANY (ARRAY['PASS'::text, 'WARNING'::text, 'FAIL'::text])),
  CONSTRAINT input_validation_summary_not_blank CHECK (length(btrim(validation_summary)) > 0),
  CONSTRAINT input_validation_event_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT input_validation_event_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT input_validation_event_pkey PRIMARY KEY (input_validation_event_id)
);
CREATE INDEX ix_input_validation_submission ON agriculture.input_validation_event USING btree (input_submission_id, validated_at);

-- owner: postgres
CREATE TABLE agriculture.input_validation_result (
  input_validation_result_id uuid DEFAULT gen_random_uuid() NOT NULL,
  input_validation_run_id uuid NOT NULL,
  validation_rule_id uuid NOT NULL,
  field_path text,
  result_status text NOT NULL,
  submitted_value jsonb,
  normalised_value jsonb,
  expected_value jsonb,
  result_reason text NOT NULL,
  corrective_guidance text,
  requires_review boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT input_validation_result_result_status_check CHECK (result_status = ANY (ARRAY['PASS'::text, 'WARNING'::text, 'FAIL'::text, 'QUARANTINE'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT input_validation_result_input_validation_run_id_fkey FOREIGN KEY (input_validation_run_id) REFERENCES agriculture.input_validation_run(input_validation_run_id),
  CONSTRAINT input_validation_result_validation_rule_id_fkey FOREIGN KEY (validation_rule_id) REFERENCES agriculture.validation_rule(validation_rule_id),
  CONSTRAINT input_validation_result_pkey PRIMARY KEY (input_validation_result_id)
);
CREATE INDEX ix_validation_result_run ON agriculture.input_validation_result USING btree (input_validation_run_id, result_status);

-- owner: postgres
CREATE TABLE agriculture.input_validation_run (
  input_validation_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  validation_run_code text NOT NULL,
  input_submission_id uuid NOT NULL,
  run_status text DEFAULT 'PENDING'::text NOT NULL,
  validation_rule_set_version text,
  initiated_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  rules_evaluated integer DEFAULT 0 NOT NULL,
  pass_count integer DEFAULT 0 NOT NULL,
  warning_count integer DEFAULT 0 NOT NULL,
  fail_count integer DEFAULT 0 NOT NULL,
  quarantine_count integer DEFAULT 0 NOT NULL,
  result_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT input_validation_run_fail_count_check CHECK (fail_count >= 0),
  CONSTRAINT input_validation_run_pass_count_check CHECK (pass_count >= 0),
  CONSTRAINT input_validation_run_quarantine_count_check CHECK (quarantine_count >= 0),
  CONSTRAINT input_validation_run_rules_evaluated_check CHECK (rules_evaluated >= 0),
  CONSTRAINT input_validation_run_run_status_check CHECK (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'PASSED'::text, 'PASSED_WITH_WARNINGS'::text, 'QUARANTINED'::text, 'FAILED'::text, 'CANCELLED'::text])),
  CONSTRAINT input_validation_run_warning_count_check CHECK (warning_count >= 0),
  CONSTRAINT validation_run_completion_consistency CHECK ((run_status = ANY (ARRAY['PASSED'::text, 'PASSED_WITH_WARNINGS'::text, 'QUARANTINED'::text, 'FAILED'::text, 'CANCELLED'::text])) AND completed_at IS NOT NULL OR (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text]))),
  CONSTRAINT validation_run_count_consistency CHECK ((pass_count + warning_count + fail_count + quarantine_count) <= rules_evaluated),
  CONSTRAINT input_validation_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT input_validation_run_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT input_validation_run_pkey PRIMARY KEY (input_validation_run_id),
  CONSTRAINT input_validation_run_validation_run_code_key UNIQUE (validation_run_code)
);
CREATE INDEX ix_input_validation_run_submission ON agriculture.input_validation_run USING btree (input_submission_id, run_status);

-- owner: postgres
CREATE TABLE agriculture.instrument (
  instrument_id uuid DEFAULT gen_random_uuid() NOT NULL,
  instrument_code text NOT NULL,
  instrument_name text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  instrument_type text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  owned_by_actor_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  retired_at timestamp with time zone,
  CONSTRAINT instrument_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'CALIBRATION_DUE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'QUARANTINED'::text])),
  CONSTRAINT instrument_owned_by_actor_id_fkey FOREIGN KEY (owned_by_actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT instrument_pkey PRIMARY KEY (instrument_id),
  CONSTRAINT instrument_instrument_code_key UNIQUE (instrument_code)
);
CREATE INDEX ix_instrument_status ON agriculture.instrument USING btree (lifecycle_status, instrument_type);

-- owner: postgres
CREATE TABLE agriculture.instrument_calibration (
  instrument_calibration_id uuid DEFAULT gen_random_uuid() NOT NULL,
  instrument_id uuid NOT NULL,
  calibration_date date NOT NULL,
  valid_until date,
  calibration_status text NOT NULL,
  calibration_provider text,
  certificate_reference text,
  source_object_id uuid,
  notes text,
  recorded_by uuid,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT calibration_period_consistency CHECK (valid_until IS NULL OR valid_until >= calibration_date),
  CONSTRAINT instrument_calibration_calibration_status_check CHECK (calibration_status = ANY (ARRAY['PASSED'::text, 'PASSED_WITH_LIMITATIONS'::text, 'FAILED'::text, 'EXPIRED'::text, 'UNVERIFIED'::text])),
  CONSTRAINT instrument_calibration_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES agriculture.instrument(instrument_id),
  CONSTRAINT instrument_calibration_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT instrument_calibration_source_object_id_fkey FOREIGN KEY (source_object_id) REFERENCES agriculture.source_object(source_object_id),
  CONSTRAINT instrument_calibration_pkey PRIMARY KEY (instrument_calibration_id)
);

-- owner: postgres
CREATE TABLE agriculture.integration_checkpoint (
  integration_checkpoint_id uuid DEFAULT gen_random_uuid() NOT NULL,
  operation_run_id uuid NOT NULL,
  checkpoint_code text NOT NULL,
  checkpoint_order integer NOT NULL,
  checkpoint_status text DEFAULT 'PENDING'::text NOT NULL,
  checkpoint_summary text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  checkpoint_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT integration_checkpoint_checkpoint_order_check CHECK (checkpoint_order >= 1),
  CONSTRAINT integration_checkpoint_checkpoint_status_check CHECK (checkpoint_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'PASSED'::text, 'PASSED_WITH_WARNINGS'::text, 'FAILED'::text, 'SKIPPED'::text])),
  CONSTRAINT integration_checkpoint_operation_run_id_fkey FOREIGN KEY (operation_run_id) REFERENCES agriculture.operation_run(operation_run_id),
  CONSTRAINT integration_checkpoint_pkey PRIMARY KEY (integration_checkpoint_id),
  CONSTRAINT integration_checkpoint_operation_run_id_checkpoint_code_key UNIQUE (operation_run_id, checkpoint_code),
  CONSTRAINT integration_checkpoint_operation_run_id_checkpoint_order_key UNIQUE (operation_run_id, checkpoint_order)
);
CREATE INDEX ix_integration_checkpoint_operation ON agriculture.integration_checkpoint USING btree (operation_run_id, checkpoint_order);

-- owner: postgres
CREATE TABLE agriculture.integrity_check_result (
  integrity_check_result_id uuid DEFAULT gen_random_uuid() NOT NULL,
  integrity_check_run_id uuid NOT NULL,
  integrity_rule_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  result_status text NOT NULL,
  finding_summary text NOT NULL,
  observed_value jsonb,
  expected_value jsonb,
  requires_review boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT integrity_check_result_result_status_check CHECK (result_status = ANY (ARRAY['PASS'::text, 'WARNING'::text, 'FAIL'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT integrity_check_result_integrity_check_run_id_fkey FOREIGN KEY (integrity_check_run_id) REFERENCES agriculture.integrity_check_run(integrity_check_run_id),
  CONSTRAINT integrity_check_result_integrity_rule_id_fkey FOREIGN KEY (integrity_rule_id) REFERENCES agriculture.data_integrity_rule(integrity_rule_id),
  CONSTRAINT integrity_check_result_pkey PRIMARY KEY (integrity_check_result_id)
);
CREATE INDEX ix_integrity_result_run ON agriculture.integrity_check_result USING btree (integrity_check_run_id, result_status);

-- owner: postgres
CREATE TABLE agriculture.integrity_check_run (
  integrity_check_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  integrity_check_code text NOT NULL,
  operation_run_id uuid,
  check_scope text NOT NULL,
  check_status text DEFAULT 'PENDING'::text NOT NULL,
  initiated_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  rules_checked integer DEFAULT 0 NOT NULL,
  records_checked integer DEFAULT 0 NOT NULL,
  findings_count integer DEFAULT 0 NOT NULL,
  result_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT integrity_check_run_check_status_check CHECK (check_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'PASSED'::text, 'PASSED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])),
  CONSTRAINT integrity_check_run_findings_count_check CHECK (findings_count >= 0),
  CONSTRAINT integrity_check_run_records_checked_check CHECK (records_checked >= 0),
  CONSTRAINT integrity_check_run_rules_checked_check CHECK (rules_checked >= 0),
  CONSTRAINT integrity_check_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT integrity_check_run_operation_run_id_fkey FOREIGN KEY (operation_run_id) REFERENCES agriculture.operation_run(operation_run_id),
  CONSTRAINT integrity_check_run_pkey PRIMARY KEY (integrity_check_run_id),
  CONSTRAINT integrity_check_run_integrity_check_code_key UNIQUE (integrity_check_code)
);

-- owner: postgres
CREATE TABLE agriculture.knowledge_gap (
  knowledge_gap_id uuid DEFAULT gen_random_uuid() NOT NULL,
  gap_code text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  gap_type text NOT NULL,
  gap_statement text NOT NULL,
  why_it_matters text NOT NULL,
  proposed_resolution text,
  priority_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  lifecycle_status text DEFAULT 'OPEN'::text NOT NULL,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_summary text,
  country_workspace_id uuid,
  CONSTRAINT knowledge_gap_gap_type_check CHECK (gap_type = ANY (ARRAY['MISSING_EVIDENCE'::text, 'INSUFFICIENT_REPLICATION'::text, 'UNKNOWN_MECHANISM'::text, 'CONTEXT_GAP'::text, 'MEASUREMENT_GAP'::text, 'SAFETY_GAP'::text, 'ECOLOGICAL_GAP'::text, 'CONTRADICTORY_EVIDENCE'::text, 'OTHER'::text])),
  CONSTRAINT knowledge_gap_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_INVESTIGATION'::text, 'RESOLVED'::text, 'ACCEPTED_UNCERTAINTY'::text, 'ARCHIVED'::text])),
  CONSTRAINT knowledge_gap_priority_status_check CHECK (priority_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT knowledge_gap_resolution_consistency CHECK ((lifecycle_status = ANY (ARRAY['RESOLVED'::text, 'ACCEPTED_UNCERTAINTY'::text])) AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution_summary IS NOT NULL OR (lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_INVESTIGATION'::text, 'ARCHIVED'::text]))),
  CONSTRAINT knowledge_gap_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT knowledge_gap_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT knowledge_gap_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT knowledge_gap_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT knowledge_gap_pkey PRIMARY KEY (knowledge_gap_id),
  CONSTRAINT knowledge_gap_gap_code_key UNIQUE (gap_code)
);
CREATE INDEX ix_knowledge_gap_country_workspace ON agriculture.knowledge_gap USING btree (country_workspace_id);
CREATE INDEX ix_knowledge_gap_subject ON agriculture.knowledge_gap USING btree (subject_entity_type, subject_entity_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.learning_candidate (
  learning_candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  learning_candidate_code text NOT NULL,
  candidate_type text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  brain_evidence_eligibility_id uuid NOT NULL,
  evidence_packet_id uuid NOT NULL,
  learning_statement text NOT NULL,
  uncertainty_summary text,
  contradiction_summary text,
  candidate_status text DEFAULT 'DRAFT'::text NOT NULL,
  governance_decision_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT learning_candidate_approval_consistency CHECK (candidate_status = 'APPROVED'::text AND governance_decision_id IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL OR candidate_status <> 'APPROVED'::text),
  CONSTRAINT learning_candidate_archive_consistency CHECK (candidate_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR candidate_status <> 'ARCHIVED'::text),
  CONSTRAINT learning_candidate_candidate_status_check CHECK (candidate_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT learning_candidate_candidate_type_check CHECK (candidate_type = ANY (ARRAY['POSITIVE'::text, 'NEGATIVE'::text, 'NEUTRAL'::text, 'CONTRADICTION'::text, 'MECHANISM'::text, 'SAFETY'::text, 'OTHER'::text])),
  CONSTRAINT learning_candidate_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT learning_candidate_brain_evidence_eligibility_id_fkey FOREIGN KEY (brain_evidence_eligibility_id) REFERENCES agriculture.brain_evidence_eligibility(brain_evidence_eligibility_id),
  CONSTRAINT learning_candidate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT learning_candidate_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT learning_candidate_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT learning_candidate_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT learning_candidate_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT learning_candidate_pkey PRIMARY KEY (learning_candidate_id),
  CONSTRAINT learning_candidate_learning_candidate_code_key UNIQUE (learning_candidate_code)
);
CREATE INDEX ix_learning_candidate_status ON agriculture.learning_candidate USING btree (candidate_status, candidate_type);
CREATE INDEX ix_learning_candidate_subject ON agriculture.learning_candidate USING btree (subject_entity_type, subject_entity_id, candidate_status);
CREATE INDEX learning_candidate_country_idx ON agriculture.learning_candidate USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.location (
  location_id uuid DEFAULT gen_random_uuid() NOT NULL,
  location_code text NOT NULL,
  location_name text NOT NULL,
  farm_id uuid,
  location_type text DEFAULT 'FIELD'::text NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  elevation_m numeric,
  area_ha numeric,
  description text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT location_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT location_area_ha_check CHECK (area_ha IS NULL OR area_ha >= 0::numeric),
  CONSTRAINT location_latitude_check CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  CONSTRAINT location_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT location_location_type_check CHECK (location_type = ANY (ARRAY['FIELD'::text, 'BLOCK'::text, 'PADDOCK'::text, 'GREENHOUSE'::text, 'NURSERY'::text, 'ORCHARD'::text, 'LAB'::text, 'STORAGE'::text, 'OTHER'::text])),
  CONSTRAINT location_longitude_check CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  CONSTRAINT location_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT location_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT location_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES agriculture.farm(farm_id),
  CONSTRAINT location_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT location_pkey PRIMARY KEY (location_id),
  CONSTRAINT location_location_code_key UNIQUE (location_code)
);
CREATE INDEX ix_location_farm ON agriculture.location USING btree (farm_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.measurement (
  measurement_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_id uuid NOT NULL,
  metric_definition_id uuid NOT NULL,
  measurement_method_id uuid,
  instrument_id uuid,
  numeric_value numeric,
  text_value text,
  boolean_value boolean,
  "json_value" jsonb,
  unit text,
  measurement_status text DEFAULT 'SUBMITTED'::text NOT NULL,
  input_submission_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  source_numeric_value numeric,
  source_unit text,
  normalization_status text,
  normalization_rule text,
  normalization_version text,
  source_record_reference text,
  CONSTRAINT measurement_measurement_status_check CHECK (measurement_status = ANY (ARRAY['SUBMITTED'::text, 'VALID'::text, 'VALID_WITH_WARNINGS'::text, 'QUARANTINED'::text, 'REJECTED'::text, 'REVIEWED'::text])),
  CONSTRAINT measurement_one_value CHECK (((numeric_value IS NOT NULL)::integer + (text_value IS NOT NULL)::integer + (boolean_value IS NOT NULL)::integer + ("json_value" IS NOT NULL)::integer) = 1),
  CONSTRAINT measurement_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT measurement_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES agriculture.instrument(instrument_id),
  CONSTRAINT measurement_measurement_method_id_fkey FOREIGN KEY (measurement_method_id) REFERENCES agriculture.measurement_method(measurement_method_id),
  CONSTRAINT measurement_metric_definition_id_fkey FOREIGN KEY (metric_definition_id) REFERENCES agriculture.metric_definition(metric_definition_id),
  CONSTRAINT measurement_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES agriculture.observation(observation_id),
  CONSTRAINT measurement_pkey PRIMARY KEY (measurement_id),
  CONSTRAINT measurement_observation_id_metric_definition_id_key UNIQUE (observation_id, metric_definition_id)
);
CREATE INDEX ix_measurement_observation ON agriculture.measurement USING btree (observation_id, metric_definition_id);
COMMENT ON COLUMN agriculture.measurement.numeric_value IS 'Canonical normalized numeric value used by AAB scientific reasoning.';
COMMENT ON COLUMN agriculture.measurement.unit IS 'Canonical unit governed by the linked metric definition.';
COMMENT ON COLUMN agriculture.measurement.source_numeric_value IS 'Original imported/source numeric value retained unchanged for provenance.';
COMMENT ON COLUMN agriculture.measurement.source_unit IS 'Original imported/source unit retained unchanged for provenance.';

-- owner: postgres
CREATE TABLE agriculture.measurement_method (
  measurement_method_id uuid DEFAULT gen_random_uuid() NOT NULL,
  method_code text NOT NULL,
  method_name text NOT NULL,
  method_description text,
  method_type text NOT NULL,
  evidence_quality_class text NOT NULL,
  calibration_required boolean DEFAULT false NOT NULL,
  photo_required boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT measurement_method_evidence_quality_class_check CHECK (evidence_quality_class = ANY (ARRAY['LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'REFERENCE_GRADE'::text, 'UNASSESSED'::text])),
  CONSTRAINT measurement_method_method_type_check CHECK (method_type = ANY (ARRAY['MANUAL_ESTIMATE'::text, 'MANUAL_MEASUREMENT'::text, 'PHONE_CAPTURE'::text, 'CALIBRATED_INSTRUMENT'::text, 'LABORATORY'::text, 'REMOTE_SENSOR'::text, 'DERIVED_CALCULATION'::text, 'OTHER'::text])),
  CONSTRAINT measurement_method_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT measurement_method_pkey PRIMARY KEY (measurement_method_id),
  CONSTRAINT measurement_method_method_code_key UNIQUE (method_code)
);

-- owner: postgres
CREATE TABLE agriculture.mechanism_hypothesis (
  mechanism_hypothesis_id uuid DEFAULT gen_random_uuid() NOT NULL,
  mechanism_code text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  mechanism_statement text NOT NULL,
  proposed_pathway text NOT NULL,
  expected_observable_effects text,
  uncertainty_summary text NOT NULL,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  lifecycle_status text DEFAULT 'HYPOTHESIS'::text NOT NULL,
  evidence_packet_id uuid,
  governance_decision_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_rationale text,
  country_workspace_id uuid,
  CONSTRAINT mechanism_hypothesis_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text])),
  CONSTRAINT mechanism_hypothesis_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['HYPOTHESIS'::text, 'UNDER_REVIEW'::text, 'SUPPORTED'::text, 'CONTRADICTED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT mechanism_hypothesis_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT mechanism_hypothesis_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT mechanism_hypothesis_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT mechanism_hypothesis_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT mechanism_hypothesis_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT mechanism_hypothesis_pkey PRIMARY KEY (mechanism_hypothesis_id),
  CONSTRAINT mechanism_hypothesis_mechanism_code_key UNIQUE (mechanism_code)
);
CREATE INDEX ix_mechanism_subject ON agriculture.mechanism_hypothesis USING btree (subject_entity_type, subject_entity_id, lifecycle_status);
CREATE INDEX mechanism_hypothesis_country_idx ON agriculture.mechanism_hypothesis USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.memory_evidence_link (
  memory_evidence_link_id uuid DEFAULT gen_random_uuid() NOT NULL,
  scientific_memory_entry_id uuid NOT NULL,
  evidence_packet_id uuid NOT NULL,
  evidence_role text DEFAULT 'SUPPORTING'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT memory_evidence_link_evidence_role_check CHECK (evidence_role = ANY (ARRAY['PRIMARY'::text, 'SUPPORTING'::text, 'CONTRADICTORY'::text, 'CONTEXTUAL'::text])),
  CONSTRAINT memory_evidence_link_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT memory_evidence_link_scientific_memory_entry_id_fkey FOREIGN KEY (scientific_memory_entry_id) REFERENCES agriculture.scientific_memory_entry(scientific_memory_entry_id),
  CONSTRAINT memory_evidence_link_pkey PRIMARY KEY (memory_evidence_link_id),
  CONSTRAINT memory_evidence_link_scientific_memory_entry_id_evidence_pa_key UNIQUE (scientific_memory_entry_id, evidence_packet_id, evidence_role)
);

-- owner: postgres
CREATE TABLE agriculture.metric_definition (
  metric_definition_id uuid DEFAULT gen_random_uuid() NOT NULL,
  metric_code text NOT NULL,
  metric_name text NOT NULL,
  metric_description text,
  value_type text NOT NULL,
  canonical_unit text,
  allowed_precision integer,
  minimum_plausible_value numeric,
  maximum_plausible_value numeric,
  context_required boolean DEFAULT true NOT NULL,
  photo_requirement_policy text DEFAULT 'OPTIONAL'::text NOT NULL,
  review_requirement text DEFAULT 'RULE_DEPENDENT'::text NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  current_version_no integer DEFAULT 1 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT metric_definition_allowed_precision_check CHECK (allowed_precision IS NULL OR allowed_precision >= 0),
  CONSTRAINT metric_definition_current_version_no_check CHECK (current_version_no >= 1),
  CONSTRAINT metric_definition_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT metric_definition_photo_requirement_policy_check CHECK (photo_requirement_policy = ANY (ARRAY['NOT_REQUIRED'::text, 'OPTIONAL'::text, 'RECOMMENDED'::text, 'REQUIRED'::text, 'CONDITIONALLY_REQUIRED'::text])),
  CONSTRAINT metric_definition_review_requirement_check CHECK (review_requirement = ANY (ARRAY['NOT_REQUIRED'::text, 'RULE_DEPENDENT'::text, 'SCIENTIST_REQUIRED'::text, 'ADMIN_REQUIRED'::text])),
  CONSTRAINT metric_definition_value_type_check CHECK (value_type = ANY (ARRAY['INTEGER'::text, 'DECIMAL'::text, 'BOOLEAN'::text, 'TEXT'::text, 'ENUM'::text, 'DATE'::text, 'DATETIME'::text, 'JSON'::text])),
  CONSTRAINT metric_plausible_range_consistency CHECK (minimum_plausible_value IS NULL OR maximum_plausible_value IS NULL OR minimum_plausible_value <= maximum_plausible_value),
  CONSTRAINT metric_definition_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT metric_definition_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT metric_definition_pkey PRIMARY KEY (metric_definition_id),
  CONSTRAINT metric_definition_metric_code_key UNIQUE (metric_code)
);
CREATE INDEX ix_metric_definition_status ON agriculture.metric_definition USING btree (lifecycle_status, metric_code);

-- owner: postgres
CREATE TABLE agriculture.metric_enum_option (
  metric_enum_option_id uuid DEFAULT gen_random_uuid() NOT NULL,
  metric_definition_id uuid NOT NULL,
  option_code text NOT NULL,
  option_label text NOT NULL,
  option_order integer DEFAULT 1 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT metric_enum_option_option_order_check CHECK (option_order >= 1),
  CONSTRAINT metric_enum_option_metric_definition_id_fkey FOREIGN KEY (metric_definition_id) REFERENCES agriculture.metric_definition(metric_definition_id),
  CONSTRAINT metric_enum_option_pkey PRIMARY KEY (metric_enum_option_id),
  CONSTRAINT metric_enum_option_metric_definition_id_option_code_key UNIQUE (metric_definition_id, option_code),
  CONSTRAINT metric_enum_option_metric_definition_id_option_order_key UNIQUE (metric_definition_id, option_order)
);

-- owner: postgres
CREATE TABLE agriculture.negative_learning_register (
  negative_learning_id uuid DEFAULT gen_random_uuid() NOT NULL,
  approved_learning_id uuid NOT NULL,
  suppression_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
  warning_text text NOT NULL,
  downstream_action text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  governance_decision_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT negative_learning_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT negative_learning_register_downstream_action_check CHECK (downstream_action = ANY (ARRAY['WARN'::text, 'SUPPRESS'::text, 'REJECT'::text, 'ESCALATE_FOR_REVIEW'::text])),
  CONSTRAINT negative_learning_register_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'SUPERSEDED'::text, 'RETIRED'::text, 'ARCHIVED'::text])),
  CONSTRAINT negative_learning_register_approved_learning_id_fkey FOREIGN KEY (approved_learning_id) REFERENCES agriculture.approved_learning(approved_learning_id),
  CONSTRAINT negative_learning_register_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT negative_learning_register_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT negative_learning_register_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT negative_learning_register_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT negative_learning_register_pkey PRIMARY KEY (negative_learning_id),
  CONSTRAINT negative_learning_register_approved_learning_id_key UNIQUE (approved_learning_id)
);
CREATE INDEX ix_negative_learning_status ON agriculture.negative_learning_register USING btree (lifecycle_status, downstream_action);
CREATE INDEX negative_learning_country_idx ON agriculture.negative_learning_register USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.observation (
  observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_code text NOT NULL,
  trial_id uuid NOT NULL,
  plot_id uuid NOT NULL,
  observation_template_version_id uuid,
  observed_at timestamp with time zone NOT NULL,
  observer_id uuid,
  observation_status text DEFAULT 'DRAFT'::text NOT NULL,
  notes text,
  input_submission_id uuid,
  data_quality_assessment_id uuid,
  evidence_packet_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT observation_archive_consistency CHECK (observation_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR observation_status <> 'ARCHIVED'::text),
  CONSTRAINT observation_observation_status_check CHECK (observation_status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'VALIDATING'::text, 'VALID'::text, 'VALID_WITH_WARNINGS'::text, 'QUARANTINED'::text, 'REJECTED'::text, 'REVIEWED'::text, 'ARCHIVED'::text])),
  CONSTRAINT observation_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT observation_data_quality_assessment_id_fkey FOREIGN KEY (data_quality_assessment_id) REFERENCES agriculture.data_quality_assessment(data_quality_assessment_id),
  CONSTRAINT observation_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT observation_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT observation_observation_template_version_id_fkey FOREIGN KEY (observation_template_version_id) REFERENCES agriculture.observation_template_version(observation_template_version_id),
  CONSTRAINT observation_observer_id_fkey FOREIGN KEY (observer_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES agriculture.plot(plot_id),
  CONSTRAINT observation_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT observation_pkey PRIMARY KEY (observation_id),
  CONSTRAINT observation_observation_code_key UNIQUE (observation_code)
);
CREATE INDEX ix_observation_country_workspace ON agriculture.observation USING btree (country_workspace_id);
CREATE INDEX ix_observation_plot_time ON agriculture.observation USING btree (plot_id, observed_at);

-- owner: postgres
CREATE TABLE agriculture.observation_template (
  observation_template_id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_code text NOT NULL,
  template_name text NOT NULL,
  purpose text,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  current_version_no integer DEFAULT 1 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT observation_template_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT observation_template_current_version_no_check CHECK (current_version_no >= 1),
  CONSTRAINT observation_template_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT observation_template_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_template_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_template_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_template_pkey PRIMARY KEY (observation_template_id),
  CONSTRAINT observation_template_template_code_key UNIQUE (template_code)
);

-- owner: postgres
CREATE TABLE agriculture.observation_template_metric (
  observation_template_metric_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_template_version_id uuid NOT NULL,
  metric_definition_id uuid NOT NULL,
  requirement_level text DEFAULT 'RECOMMENDED'::text NOT NULL,
  display_order integer NOT NULL,
  capture_guidance text,
  conditional_rule jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT observation_template_metric_display_order_check CHECK (display_order >= 1),
  CONSTRAINT observation_template_metric_requirement_level_check CHECK (requirement_level = ANY (ARRAY['REQUIRED'::text, 'RECOMMENDED'::text, 'OPTIONAL'::text, 'CONDITIONAL'::text])),
  CONSTRAINT observation_template_metric_metric_definition_id_fkey FOREIGN KEY (metric_definition_id) REFERENCES agriculture.metric_definition(metric_definition_id),
  CONSTRAINT observation_template_metric_observation_template_version_i_fkey FOREIGN KEY (observation_template_version_id) REFERENCES agriculture.observation_template_version(observation_template_version_id),
  CONSTRAINT observation_template_metric_pkey PRIMARY KEY (observation_template_metric_id),
  CONSTRAINT observation_template_metric_observation_template_version_i_key1 UNIQUE (observation_template_version_id, display_order),
  CONSTRAINT observation_template_metric_observation_template_version_id_key UNIQUE (observation_template_version_id, metric_definition_id)
);

-- owner: postgres
CREATE TABLE agriculture.observation_template_version (
  observation_template_version_id uuid DEFAULT gen_random_uuid() NOT NULL,
  observation_template_id uuid NOT NULL,
  version_no integer NOT NULL,
  version_status text DEFAULT 'DRAFT'::text NOT NULL,
  objective text,
  guidance text,
  hidden_sections jsonb DEFAULT '[]'::jsonb NOT NULL,
  provenance_summary text,
  governance_decision_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  CONSTRAINT observation_template_version_approval_consistency CHECK (version_status = 'ACTIVE'::text AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND governance_decision_id IS NOT NULL OR version_status <> 'ACTIVE'::text),
  CONSTRAINT observation_template_version_version_no_check CHECK (version_no >= 1),
  CONSTRAINT observation_template_version_version_status_check CHECK (version_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'RETIRED'::text])),
  CONSTRAINT observation_template_version_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_template_version_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT observation_template_version_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT observation_template_version_observation_template_id_fkey FOREIGN KEY (observation_template_id) REFERENCES agriculture.observation_template(observation_template_id),
  CONSTRAINT observation_template_version_pkey PRIMARY KEY (observation_template_version_id),
  CONSTRAINT observation_template_version_observation_template_id_versio_key UNIQUE (observation_template_id, version_no)
);

-- owner: postgres
CREATE TABLE agriculture.operation_failure_event (
  operation_failure_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  operation_run_id uuid,
  request_context_id uuid,
  failure_code text NOT NULL,
  failure_category text NOT NULL,
  severity text NOT NULL,
  safe_message text NOT NULL,
  entity_type text,
  entity_id uuid,
  retryable boolean DEFAULT false NOT NULL,
  failure_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT operation_failure_event_failure_category_check CHECK (failure_category = ANY (ARRAY['VALIDATION'::text, 'AUTHENTICATION'::text, 'AUTHORISATION'::text, 'DATABASE'::text, 'INTEGRITY'::text, 'NETWORK'::text, 'CONFIGURATION'::text, 'DEPENDENCY'::text, 'UNEXPECTED'::text])),
  CONSTRAINT operation_failure_event_severity_check CHECK (severity = ANY (ARRAY['INFO'::text, 'WARNING'::text, 'ERROR'::text, 'CRITICAL'::text])),
  CONSTRAINT operation_failure_event_operation_run_id_fkey FOREIGN KEY (operation_run_id) REFERENCES agriculture.operation_run(operation_run_id),
  CONSTRAINT operation_failure_event_request_context_id_fkey FOREIGN KEY (request_context_id) REFERENCES agriculture.request_context(request_context_id),
  CONSTRAINT operation_failure_event_pkey PRIMARY KEY (operation_failure_event_id)
);
CREATE INDEX ix_operation_failure_operation ON agriculture.operation_failure_event USING btree (operation_run_id, occurred_at);
CREATE INDEX ix_operation_failure_severity ON agriculture.operation_failure_event USING btree (severity, failure_category, occurred_at);

-- owner: postgres
CREATE TABLE agriculture.operation_run (
  operation_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  operation_code text NOT NULL,
  operation_type text NOT NULL,
  operation_name text NOT NULL,
  request_context_id uuid,
  run_status text DEFAULT 'PENDING'::text NOT NULL,
  initiated_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  records_attempted integer DEFAULT 0 NOT NULL,
  records_succeeded integer DEFAULT 0 NOT NULL,
  records_failed integer DEFAULT 0 NOT NULL,
  operation_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT operation_completion_consistency CHECK ((run_status = ANY (ARRAY['COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])) AND completed_at IS NOT NULL OR (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text]))),
  CONSTRAINT operation_record_count_consistency CHECK ((records_succeeded + records_failed) <= records_attempted),
  CONSTRAINT operation_run_operation_type_check CHECK (operation_type = ANY (ARRAY['DATABASE_MIGRATION'::text, 'REPOSITORY_OPERATION'::text, 'API_REQUEST'::text, 'VALIDATION_RUN'::text, 'INTEGRITY_CHECK'::text, 'RECONCILIATION'::text, 'IMPORT_STAGING'::text, 'EVIDENCE_ASSEMBLY'::text, 'OTHER'::text])),
  CONSTRAINT operation_run_records_attempted_check CHECK (records_attempted >= 0),
  CONSTRAINT operation_run_records_failed_check CHECK (records_failed >= 0),
  CONSTRAINT operation_run_records_succeeded_check CHECK (records_succeeded >= 0),
  CONSTRAINT operation_run_run_status_check CHECK (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])),
  CONSTRAINT operation_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT operation_run_request_context_id_fkey FOREIGN KEY (request_context_id) REFERENCES agriculture.request_context(request_context_id),
  CONSTRAINT operation_run_pkey PRIMARY KEY (operation_run_id),
  CONSTRAINT operation_run_operation_code_key UNIQUE (operation_code)
);
CREATE INDEX ix_operation_run_status ON agriculture.operation_run USING btree (run_status, operation_type, started_at);

-- owner: postgres
CREATE TABLE agriculture.opportunity_dimension (
  opportunity_dimension_id uuid DEFAULT gen_random_uuid() NOT NULL,
  opportunity_profile_id uuid NOT NULL,
  dimension_type text NOT NULL,
  significance text NOT NULL,
  dimension_summary text NOT NULL,
  evidence_strength text DEFAULT 'UNASSESSED'::text NOT NULL,
  uncertainty_summary text,
  CONSTRAINT opportunity_dimension_dimension_type_check CHECK (dimension_type = ANY (ARRAY['AGRICULTURAL'::text, 'ENVIRONMENTAL'::text, 'ECONOMIC'::text, 'COUNTRY'::text, 'MANUFACTURING'::text, 'WASTE_REDUCTION'::text, 'POLLUTION_REDUCTION'::text, 'CIRCULAR_ECONOMY'::text, 'FARMER_VALUE'::text, 'SAFETY'::text, 'ECOLOGICAL'::text, 'OTHER'::text])),
  CONSTRAINT opportunity_dimension_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT opportunity_dimension_significance_check CHECK (significance = ANY (ARRAY['NOT_APPLICABLE'::text, 'LIMITED'::text, 'MODERATE'::text, 'HIGH'::text, 'EXCEPTIONAL'::text, 'UNKNOWN'::text])),
  CONSTRAINT opportunity_dimension_opportunity_profile_id_fkey FOREIGN KEY (opportunity_profile_id) REFERENCES agriculture.opportunity_profile(opportunity_profile_id),
  CONSTRAINT opportunity_dimension_pkey PRIMARY KEY (opportunity_dimension_id),
  CONSTRAINT opportunity_dimension_opportunity_profile_id_dimension_type_key UNIQUE (opportunity_profile_id, dimension_type)
);
CREATE INDEX ix_opportunity_dimension_profile ON agriculture.opportunity_dimension USING btree (opportunity_profile_id, dimension_type);

-- owner: postgres
CREATE TABLE agriculture.opportunity_profile (
  opportunity_profile_id uuid DEFAULT gen_random_uuid() NOT NULL,
  opportunity_profile_code text NOT NULL,
  discovery_candidate_id uuid NOT NULL,
  primary_opportunity text NOT NULL,
  additional_opportunities jsonb DEFAULT '[]'::jsonb NOT NULL,
  scientific_novelty text NOT NULL,
  evidence_strength text NOT NULL,
  potential_upside text NOT NULL,
  research_difficulty text NOT NULL,
  main_uncertainties text NOT NULL,
  recommended_investigation text,
  scientist_admin_review_required boolean DEFAULT true NOT NULL,
  profile_status text DEFAULT 'ADVISORY'::text NOT NULL,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT opportunity_profile_archive_consistency CHECK (profile_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR profile_status <> 'ARCHIVED'::text),
  CONSTRAINT opportunity_profile_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT opportunity_profile_potential_upside_check CHECK (potential_upside = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'HIGH'::text, 'EXCEPTIONAL'::text])),
  CONSTRAINT opportunity_profile_profile_status_check CHECK (profile_status = ANY (ARRAY['ADVISORY'::text, 'UNDER_REVIEW'::text, 'REVIEWED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT opportunity_profile_research_difficulty_check CHECK (research_difficulty = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERY_HIGH'::text])),
  CONSTRAINT opportunity_profile_scientific_novelty_check CHECK (scientific_novelty = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'EXCEPTIONAL'::text])),
  CONSTRAINT opportunity_profile_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT opportunity_profile_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT opportunity_profile_discovery_candidate_id_fkey FOREIGN KEY (discovery_candidate_id) REFERENCES agriculture.discovery_candidate(discovery_candidate_id),
  CONSTRAINT opportunity_profile_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT opportunity_profile_pkey PRIMARY KEY (opportunity_profile_id),
  CONSTRAINT opportunity_profile_opportunity_profile_code_key UNIQUE (opportunity_profile_code)
);
CREATE INDEX ix_opportunity_profile_candidate ON agriculture.opportunity_profile USING btree (discovery_candidate_id, profile_status);

-- owner: postgres
CREATE TABLE agriculture.organization (
  organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_code text NOT NULL,
  organization_name text NOT NULL,
  organization_type text DEFAULT 'OTHER'::text NOT NULL,
  country_code character(2),
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT organization_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT organization_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT organization_organization_type_check CHECK (organization_type = ANY (ARRAY['FARM_BUSINESS'::text, 'RESEARCH_INSTITUTION'::text, 'UNIVERSITY'::text, 'GOVERNMENT'::text, 'NGO'::text, 'PRIVATE_COMPANY'::text, 'INDIVIDUAL'::text, 'OTHER'::text])),
  CONSTRAINT organization_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT organization_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT organization_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT organization_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT organization_pkey PRIMARY KEY (organization_id),
  CONSTRAINT organization_organization_code_key UNIQUE (organization_code)
);

-- owner: postgres
CREATE TABLE agriculture.outcome (
  outcome_id uuid DEFAULT gen_random_uuid() NOT NULL,
  outcome_code text NOT NULL,
  trial_id uuid NOT NULL,
  plot_id uuid,
  outcome_type text NOT NULL,
  outcome_status text DEFAULT 'DRAFT'::text NOT NULL,
  outcome_summary text NOT NULL,
  outcome_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  evidence_packet_id uuid,
  governance_decision_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT outcome_approval_consistency CHECK (outcome_status = 'APPROVED'::text AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND governance_decision_id IS NOT NULL OR outcome_status <> 'APPROVED'::text),
  CONSTRAINT outcome_archive_consistency CHECK (outcome_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR outcome_status <> 'ARCHIVED'::text),
  CONSTRAINT outcome_outcome_status_check CHECK (outcome_status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT outcome_outcome_type_check CHECK (outcome_type = ANY (ARRAY['TRIAL'::text, 'PLOT'::text, 'YIELD'::text, 'QUALITY'::text, 'STRESS'::text, 'DISEASE'::text, 'ECONOMIC'::text, 'OTHER'::text])),
  CONSTRAINT outcome_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT outcome_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT outcome_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT outcome_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT outcome_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT outcome_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES agriculture.plot(plot_id),
  CONSTRAINT outcome_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT outcome_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT outcome_pkey PRIMARY KEY (outcome_id),
  CONSTRAINT outcome_outcome_code_key UNIQUE (outcome_code)
);
CREATE INDEX ix_outcome_country_workspace ON agriculture.outcome USING btree (country_workspace_id);
CREATE INDEX ix_outcome_trial ON agriculture.outcome USING btree (trial_id, outcome_status);

-- owner: postgres
CREATE TABLE agriculture.photo_analysis (
  photo_analysis_id uuid DEFAULT gen_random_uuid() NOT NULL,
  photo_evidence_id uuid NOT NULL,
  analysis_type text NOT NULL,
  analyzer_type text NOT NULL,
  analyzer_reference text,
  analysis_status text DEFAULT 'DRAFT'::text NOT NULL,
  observation_summary text NOT NULL,
  detected_features jsonb DEFAULT '{}'::jsonb NOT NULL,
  anomaly_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  requires_human_review boolean DEFAULT true NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_rationale text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT photo_analysis_analysis_status_check CHECK (analysis_status = ANY (ARRAY['DRAFT'::text, 'COMPLETED'::text, 'REVIEWED'::text, 'REJECTED'::text])),
  CONSTRAINT photo_analysis_analyzer_type_check CHECK (analyzer_type = ANY (ARRAY['HUMAN'::text, 'AI_MODEL'::text, 'HYBRID'::text])),
  CONSTRAINT photo_analysis_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text])),
  CONSTRAINT photo_analysis_review_consistency CHECK (analysis_status = 'REVIEWED'::text AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_rationale IS NOT NULL OR (analysis_status = ANY (ARRAY['DRAFT'::text, 'COMPLETED'::text, 'REJECTED'::text]))),
  CONSTRAINT photo_analysis_summary_not_blank CHECK (length(btrim(observation_summary)) > 0),
  CONSTRAINT photo_analysis_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT photo_analysis_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_analysis_pkey PRIMARY KEY (photo_analysis_id)
);
CREATE INDEX ix_photo_analysis_evidence ON agriculture.photo_analysis USING btree (photo_evidence_id, analysis_status);

-- owner: postgres
CREATE TABLE agriculture.photo_annotation (
  photo_annotation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  photo_evidence_id uuid NOT NULL,
  annotation_type text NOT NULL,
  annotation_label text NOT NULL,
  annotation_geometry jsonb DEFAULT '{}'::jsonb NOT NULL,
  annotation_summary text NOT NULL,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  annotation_source text DEFAULT 'HUMAN'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  review_rationale text,
  CONSTRAINT photo_annotation_annotation_source_check CHECK (annotation_source = ANY (ARRAY['HUMAN'::text, 'MODEL_ADVISORY'::text, 'INSTRUMENT'::text, 'OTHER'::text])),
  CONSTRAINT photo_annotation_annotation_type_check CHECK (annotation_type = ANY (ARRAY['REGION'::text, 'POINT'::text, 'LINE'::text, 'WHOLE_IMAGE'::text, 'TEXT_NOTE'::text])),
  CONSTRAINT photo_annotation_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text])),
  CONSTRAINT photo_annotation_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT photo_annotation_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_annotation_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT photo_annotation_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_annotation_pkey PRIMARY KEY (photo_annotation_id)
);
CREATE INDEX ix_photo_annotation_photo ON agriculture.photo_annotation USING btree (photo_evidence_id, review_status);

-- owner: postgres
CREATE TABLE agriculture.photo_capture_requirement (
  photo_capture_requirement_id uuid DEFAULT gen_random_uuid() NOT NULL,
  requirement_code text NOT NULL,
  applies_to_entity_type text NOT NULL,
  applies_to_metric_id uuid,
  requirement_status text DEFAULT 'DRAFT'::text NOT NULL,
  minimum_photo_count integer DEFAULT 1 NOT NULL,
  overview_required boolean DEFAULT false NOT NULL,
  closeup_required boolean DEFAULT false NOT NULL,
  scale_reference_required boolean DEFAULT false NOT NULL,
  gps_required boolean DEFAULT false NOT NULL,
  capture_direction_required boolean DEFAULT false NOT NULL,
  minimum_width_pixels integer,
  minimum_height_pixels integer,
  requirement_guidance text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT photo_capture_requirement_minimum_height_pixels_check CHECK (minimum_height_pixels IS NULL OR minimum_height_pixels >= 1),
  CONSTRAINT photo_capture_requirement_minimum_photo_count_check CHECK (minimum_photo_count >= 1),
  CONSTRAINT photo_capture_requirement_minimum_width_pixels_check CHECK (minimum_width_pixels IS NULL OR minimum_width_pixels >= 1),
  CONSTRAINT photo_capture_requirement_requirement_status_check CHECK (requirement_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT photo_capture_requirement_applies_to_metric_id_fkey FOREIGN KEY (applies_to_metric_id) REFERENCES agriculture.metric_definition(metric_definition_id),
  CONSTRAINT photo_capture_requirement_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_capture_requirement_pkey PRIMARY KEY (photo_capture_requirement_id),
  CONSTRAINT photo_capture_requirement_requirement_code_key UNIQUE (requirement_code)
);

-- owner: postgres
CREATE TABLE agriculture.photo_comparison_member (
  photo_comparison_member_id uuid DEFAULT gen_random_uuid() NOT NULL,
  photo_comparison_set_id uuid NOT NULL,
  photo_evidence_id uuid NOT NULL,
  member_role text NOT NULL,
  sequence_order integer DEFAULT 1 NOT NULL,
  member_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT photo_comparison_member_member_role_check CHECK (member_role = ANY (ARRAY['BASELINE'::text, 'FOLLOW_UP'::text, 'CONTROL'::text, 'TREATMENT'::text, 'REFERENCE'::text, 'COMPARATOR'::text, 'OTHER'::text])),
  CONSTRAINT photo_comparison_member_sequence_order_check CHECK (sequence_order > 0),
  CONSTRAINT photo_comparison_member_photo_comparison_set_id_fkey FOREIGN KEY (photo_comparison_set_id) REFERENCES agriculture.photo_comparison_set(photo_comparison_set_id),
  CONSTRAINT photo_comparison_member_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT photo_comparison_member_pkey PRIMARY KEY (photo_comparison_member_id),
  CONSTRAINT photo_comparison_member_photo_comparison_set_id_photo_evide_key UNIQUE (photo_comparison_set_id, photo_evidence_id)
);
CREATE INDEX ix_photo_comparison_member_set ON agriculture.photo_comparison_member USING btree (photo_comparison_set_id, sequence_order);

-- owner: postgres
CREATE TABLE agriculture.photo_comparison_set (
  photo_comparison_set_id uuid DEFAULT gen_random_uuid() NOT NULL,
  comparison_code text NOT NULL,
  comparison_name text NOT NULL,
  comparison_type text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  comparison_question text NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT photo_comparison_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT photo_comparison_set_comparison_type_check CHECK (comparison_type = ANY (ARRAY['TIME_SERIES'::text, 'TREATMENT_VS_CONTROL'::text, 'PLOT_VS_PLOT'::text, 'BEFORE_AFTER'::text, 'SYMPTOM_PROGRESSION'::text, 'CROSS_TRIAL'::text, 'OTHER'::text])),
  CONSTRAINT photo_comparison_set_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'REVIEWED'::text, 'ARCHIVED'::text])),
  CONSTRAINT photo_comparison_set_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_comparison_set_pkey PRIMARY KEY (photo_comparison_set_id),
  CONSTRAINT photo_comparison_set_comparison_code_key UNIQUE (comparison_code)
);

-- owner: postgres
CREATE TABLE agriculture.photo_evidence (
  photo_evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
  photo_evidence_code text NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  input_submission_id uuid,
  photo_type text NOT NULL,
  storage_provider text NOT NULL,
  storage_object_key text NOT NULL,
  original_filename text,
  media_type text NOT NULL,
  file_size_bytes bigint NOT NULL,
  width_pixels integer,
  height_pixels integer,
  image_hash_sha256 text NOT NULL,
  perceptual_hash text,
  captured_at timestamp with time zone,
  uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
  captured_by uuid,
  upload_actor_id uuid,
  capture_device text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  altitude_metres numeric,
  camera_direction_degrees numeric,
  scale_reference_present boolean DEFAULT false NOT NULL,
  image_quality_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  context_validation_status text DEFAULT 'NOT_VALIDATED'::text NOT NULL,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  consent_usage_status text DEFAULT 'PENDING'::text NOT NULL,
  source_object_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT photo_evidence_camera_direction_degrees_check CHECK (camera_direction_degrees IS NULL OR camera_direction_degrees >= 0::numeric AND camera_direction_degrees <= 359.999),
  CONSTRAINT photo_evidence_consent_usage_status_check CHECK (consent_usage_status = ANY (ARRAY['PENDING'::text, 'APPROVED_FOR_RESEARCH'::text, 'RESTRICTED'::text, 'WITHDRAWN'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT photo_evidence_context_validation_status_check CHECK (context_validation_status = ANY (ARRAY['NOT_VALIDATED'::text, 'VALID'::text, 'VALID_WITH_WARNINGS'::text, 'CONTEXT_MISMATCH'::text, 'QUARANTINED'::text, 'REJECTED'::text])),
  CONSTRAINT photo_evidence_file_size_bytes_check CHECK (file_size_bytes > 0),
  CONSTRAINT photo_evidence_height_pixels_check CHECK (height_pixels IS NULL OR height_pixels > 0),
  CONSTRAINT photo_evidence_image_quality_status_check CHECK (image_quality_status = ANY (ARRAY['UNASSESSED'::text, 'ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text, 'UNUSABLE'::text, 'QUARANTINED'::text, 'REJECTED'::text])),
  CONSTRAINT photo_evidence_latitude_check CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  CONSTRAINT photo_evidence_longitude_check CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  CONSTRAINT photo_evidence_photo_type_check CHECK (photo_type = ANY (ARRAY['OVERVIEW'::text, 'CLOSEUP'::text, 'SCALE_REFERENCE'::text, 'CONTROL'::text, 'TREATMENT'::text, 'SYMPTOM'::text, 'HARVEST'::text, 'SOIL_SURFACE'::text, 'WATER_CONDITION'::text, 'EQUIPMENT'::text, 'OTHER'::text])),
  CONSTRAINT photo_evidence_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT photo_evidence_width_pixels_check CHECK (width_pixels IS NULL OR width_pixels > 0),
  CONSTRAINT photo_evidence_captured_by_fkey FOREIGN KEY (captured_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_evidence_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT photo_evidence_source_object_id_fkey FOREIGN KEY (source_object_id) REFERENCES agriculture.source_object(source_object_id),
  CONSTRAINT photo_evidence_upload_actor_id_fkey FOREIGN KEY (upload_actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_evidence_pkey PRIMARY KEY (photo_evidence_id),
  CONSTRAINT photo_evidence_photo_evidence_code_key UNIQUE (photo_evidence_code),
  CONSTRAINT photo_evidence_storage_object_key_key UNIQUE (storage_object_key)
);
CREATE INDEX ix_photo_evidence_hash ON agriculture.photo_evidence USING btree (image_hash_sha256);
CREATE INDEX ix_photo_evidence_subject ON agriculture.photo_evidence USING btree (subject_entity_type, subject_entity_id, review_status);

-- owner: postgres
CREATE TABLE agriculture.photo_intelligence_finding (
  photo_intelligence_finding_id uuid DEFAULT gen_random_uuid() NOT NULL,
  finding_code text NOT NULL,
  photo_evidence_id uuid,
  photo_comparison_set_id uuid,
  finding_type text NOT NULL,
  finding_statement text NOT NULL,
  evidence_scope text NOT NULL,
  uncertainty_summary text NOT NULL,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  finding_source text DEFAULT 'MODEL_ADVISORY'::text NOT NULL,
  lifecycle_status text DEFAULT 'ADVISORY'::text NOT NULL,
  governance_review_id uuid,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_rationale text,
  CONSTRAINT photo_finding_review_consistency CHECK ((lifecycle_status = ANY (ARRAY['REVIEWED'::text, 'REJECTED'::text])) AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_rationale IS NOT NULL OR (lifecycle_status = ANY (ARRAY['ADVISORY'::text, 'UNDER_REVIEW'::text, 'ARCHIVED'::text]))),
  CONSTRAINT photo_finding_source_required CHECK (photo_evidence_id IS NOT NULL OR photo_comparison_set_id IS NOT NULL),
  CONSTRAINT photo_intelligence_finding_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text])),
  CONSTRAINT photo_intelligence_finding_finding_source_check CHECK (finding_source = ANY (ARRAY['HUMAN'::text, 'MODEL_ADVISORY'::text, 'INSTRUMENT'::text, 'OTHER'::text])),
  CONSTRAINT photo_intelligence_finding_finding_type_check CHECK (finding_type = ANY (ARRAY['VISIBLE_CHANGE'::text, 'SYMPTOM'::text, 'GROWTH_PATTERN'::text, 'DAMAGE_PATTERN'::text, 'COLOUR_CHANGE'::text, 'COVERAGE_CHANGE'::text, 'MORPHOLOGY'::text, 'ANOMALY'::text, 'MEASUREMENT_CLUE'::text, 'OTHER'::text])),
  CONSTRAINT photo_intelligence_finding_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ADVISORY'::text, 'UNDER_REVIEW'::text, 'REVIEWED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT photo_intelligence_finding_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_intelligence_finding_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT photo_intelligence_finding_governance_review_id_fkey FOREIGN KEY (governance_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT photo_intelligence_finding_photo_comparison_set_id_fkey FOREIGN KEY (photo_comparison_set_id) REFERENCES agriculture.photo_comparison_set(photo_comparison_set_id),
  CONSTRAINT photo_intelligence_finding_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT photo_intelligence_finding_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_intelligence_finding_pkey PRIMARY KEY (photo_intelligence_finding_id),
  CONSTRAINT photo_intelligence_finding_finding_code_key UNIQUE (finding_code)
);
CREATE INDEX ix_photo_finding_comparison ON agriculture.photo_intelligence_finding USING btree (photo_comparison_set_id, lifecycle_status);
CREATE INDEX ix_photo_finding_photo ON agriculture.photo_intelligence_finding USING btree (photo_evidence_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.photo_review (
  photo_review_id uuid DEFAULT gen_random_uuid() NOT NULL,
  photo_evidence_id uuid NOT NULL,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  reviewer_id uuid,
  review_rationale text,
  visible_findings_summary text,
  required_follow_up text,
  reviewed_at timestamp with time zone,
  governance_review_id uuid,
  CONSTRAINT photo_review_final_state_consistency CHECK ((review_status = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text, 'CHANGES_REQUIRED'::text, 'QUARANTINED'::text])) AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND review_rationale IS NOT NULL OR review_status = 'PENDING'::text),
  CONSTRAINT photo_review_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'CHANGES_REQUIRED'::text, 'QUARANTINED'::text])),
  CONSTRAINT photo_review_governance_review_id_fkey FOREIGN KEY (governance_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT photo_review_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT photo_review_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT photo_review_pkey PRIMARY KEY (photo_review_id)
);

-- owner: postgres
CREATE TABLE agriculture.photo_validation_result (
  photo_validation_result_id uuid DEFAULT gen_random_uuid() NOT NULL,
  photo_evidence_id uuid NOT NULL,
  validation_type text NOT NULL,
  validation_status text NOT NULL,
  validation_summary text NOT NULL,
  validation_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  requires_review boolean DEFAULT false NOT NULL,
  validated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT photo_validation_result_validation_status_check CHECK (validation_status = ANY (ARRAY['PASS'::text, 'WARNING'::text, 'FAIL'::text, 'QUARANTINE'::text, 'NOT_APPLICABLE'::text])),
  CONSTRAINT photo_validation_result_validation_type_check CHECK (validation_type = ANY (ARRAY['FILE_TYPE'::text, 'FILE_SIZE'::text, 'DIMENSIONS'::text, 'HASH_DUPLICATE'::text, 'PERCEPTUAL_DUPLICATE'::text, 'CAPTURE_TIME'::text, 'GPS'::text, 'TRIAL_CONTEXT'::text, 'PLOT_CONTEXT'::text, 'CROP_CONTEXT'::text, 'SCALE_REFERENCE'::text, 'IMAGE_QUALITY'::text, 'EDITING_METADATA'::text, 'OTHER'::text])),
  CONSTRAINT photo_validation_result_photo_evidence_id_fkey FOREIGN KEY (photo_evidence_id) REFERENCES agriculture.photo_evidence(photo_evidence_id),
  CONSTRAINT photo_validation_result_pkey PRIMARY KEY (photo_validation_result_id)
);
CREATE INDEX ix_photo_validation_photo ON agriculture.photo_validation_result USING btree (photo_evidence_id, validation_status);

-- owner: postgres
CREATE TABLE agriculture.plot (
  plot_id uuid DEFAULT gen_random_uuid() NOT NULL,
  plot_code text NOT NULL,
  trial_id uuid NOT NULL,
  plot_name text NOT NULL,
  replicate_number integer,
  treatment_role text DEFAULT 'TREATMENT'::text NOT NULL,
  formulation_version_id uuid,
  latitude numeric(9,6),
  longitude numeric(9,6),
  area_value numeric,
  area_unit text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT plot_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT plot_area_value_check CHECK (area_value IS NULL OR area_value > 0::numeric),
  CONSTRAINT plot_latitude_check CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  CONSTRAINT plot_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'PAUSED'::text, 'COMPLETED'::text, 'ARCHIVED'::text])),
  CONSTRAINT plot_longitude_check CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  CONSTRAINT plot_replicate_number_check CHECK (replicate_number IS NULL OR replicate_number >= 1),
  CONSTRAINT plot_treatment_role_check CHECK (treatment_role = ANY (ARRAY['CONTROL'::text, 'TREATMENT'::text, 'REFERENCE'::text, 'OTHER'::text])),
  CONSTRAINT plot_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT plot_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT plot_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT plot_formulation_version_id_fkey FOREIGN KEY (formulation_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT plot_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT plot_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT plot_pkey PRIMARY KEY (plot_id),
  CONSTRAINT plot_plot_code_key UNIQUE (plot_code)
);
CREATE INDEX ix_plot_country_workspace ON agriculture.plot USING btree (country_workspace_id);
CREATE INDEX ix_plot_trial ON agriculture.plot USING btree (trial_id, treatment_role, replicate_number);

-- owner: postgres
CREATE TABLE agriculture.provenance_assertion (
  provenance_assertion_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  source_object_id uuid NOT NULL,
  provenance_type text NOT NULL,
  provenance_summary text NOT NULL,
  claim_scope text,
  verified_status text DEFAULT 'UNVERIFIED'::text NOT NULL,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT provenance_assertion_provenance_type_check CHECK (provenance_type = ANY (ARRAY['CREATED_FROM'::text, 'DERIVED_FROM'::text, 'SUPPORTED_BY'::text, 'OBSERVED_IN'::text, 'MEASURED_BY'::text, 'REPORTED_BY'::text, 'MIGRATED_FROM'::text, 'REFERENCES'::text, 'CONTRADICTED_BY'::text, 'OTHER'::text])),
  CONSTRAINT provenance_assertion_verified_status_check CHECK (verified_status = ANY (ARRAY['UNVERIFIED'::text, 'VERIFIED'::text, 'PARTIALLY_VERIFIED'::text, 'REJECTED'::text])),
  CONSTRAINT provenance_verification_consistency CHECK ((verified_status = ANY (ARRAY['VERIFIED'::text, 'PARTIALLY_VERIFIED'::text, 'REJECTED'::text])) AND verified_by IS NOT NULL AND verified_at IS NOT NULL OR verified_status = 'UNVERIFIED'::text),
  CONSTRAINT provenance_assertion_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT provenance_assertion_source_object_id_fkey FOREIGN KEY (source_object_id) REFERENCES agriculture.source_object(source_object_id),
  CONSTRAINT provenance_assertion_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT provenance_assertion_pkey PRIMARY KEY (provenance_assertion_id)
);
CREATE INDEX ix_provenance_subject ON agriculture.provenance_assertion USING btree (subject_entity_type, subject_entity_id, created_at);

-- owner: postgres
CREATE TABLE agriculture.quarantined_record (
  quarantined_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
  subject_entity_type text NOT NULL,
  subject_entity_id uuid NOT NULL,
  input_submission_id uuid,
  quarantine_reason text NOT NULL,
  quarantine_status text DEFAULT 'QUARANTINED'::text NOT NULL,
  quarantined_by uuid,
  quarantined_at timestamp with time zone DEFAULT now() NOT NULL,
  release_decision_id uuid,
  released_by uuid,
  released_at timestamp with time zone,
  release_reason text,
  CONSTRAINT quarantine_release_consistency CHECK (quarantine_status = 'RELEASED'::text AND release_decision_id IS NOT NULL AND released_by IS NOT NULL AND released_at IS NOT NULL AND release_reason IS NOT NULL OR quarantine_status <> 'RELEASED'::text),
  CONSTRAINT quarantined_record_quarantine_status_check CHECK (quarantine_status = ANY (ARRAY['QUARANTINED'::text, 'UNDER_REVIEW'::text, 'RELEASED'::text, 'REJECTED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT quarantined_record_input_submission_id_fkey FOREIGN KEY (input_submission_id) REFERENCES agriculture.input_submission(input_submission_id),
  CONSTRAINT quarantined_record_quarantined_by_fkey FOREIGN KEY (quarantined_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT quarantined_record_release_decision_id_fkey FOREIGN KEY (release_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT quarantined_record_released_by_fkey FOREIGN KEY (released_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT quarantined_record_pkey PRIMARY KEY (quarantined_record_id),
  CONSTRAINT quarantined_record_subject_entity_type_subject_entity_id_key UNIQUE (subject_entity_type, subject_entity_id)
);
CREATE INDEX ix_quarantine_subject ON agriculture.quarantined_record USING btree (subject_entity_type, subject_entity_id, quarantine_status);

-- owner: postgres
CREATE TABLE agriculture.reasoning_finding (
  reasoning_finding_id uuid DEFAULT gen_random_uuid() NOT NULL,
  reasoning_run_id uuid NOT NULL,
  finding_type text NOT NULL,
  finding_summary text NOT NULL,
  finding_detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  confidence_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  evidence_packet_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reasoning_finding_confidence_status_check CHECK (confidence_status = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CONTRADICTED'::text])),
  CONSTRAINT reasoning_finding_finding_type_check CHECK (finding_type = ANY (ARRAY['MECHANISM'::text, 'SUITABILITY'::text, 'COMPATIBILITY'::text, 'CONTRADICTION'::text, 'CONFIDENCE'::text, 'SAFETY'::text, 'EVIDENCE_GAP'::text, 'OTHER'::text])),
  CONSTRAINT reasoning_finding_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT reasoning_finding_reasoning_run_id_fkey FOREIGN KEY (reasoning_run_id) REFERENCES agriculture.reasoning_run(reasoning_run_id),
  CONSTRAINT reasoning_finding_pkey PRIMARY KEY (reasoning_finding_id)
);
CREATE INDEX ix_reasoning_finding_run ON agriculture.reasoning_finding USING btree (reasoning_run_id, finding_type);

-- owner: postgres
CREATE TABLE agriculture.reasoning_run (
  reasoning_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  reasoning_run_code text NOT NULL,
  formulation_request_id uuid NOT NULL,
  run_type text NOT NULL,
  run_status text DEFAULT 'PENDING'::text NOT NULL,
  input_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  output_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  initiated_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT reasoning_run_completion_consistency CHECK ((run_status = ANY (ARRAY['COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])) AND completed_at IS NOT NULL OR (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text]))),
  CONSTRAINT reasoning_run_run_status_check CHECK (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])),
  CONSTRAINT reasoning_run_run_type_check CHECK (run_type = ANY (ARRAY['AGRICULTURE_BRAIN'::text, 'OPPORTUNITY_BRAIN'::text, 'MANUAL_SCIENTIFIC_REVIEW'::text, 'OTHER'::text])),
  CONSTRAINT reasoning_run_formulation_request_id_fkey FOREIGN KEY (formulation_request_id) REFERENCES agriculture.formulation_request(formulation_request_id),
  CONSTRAINT reasoning_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT reasoning_run_pkey PRIMARY KEY (reasoning_run_id),
  CONSTRAINT reasoning_run_reasoning_run_code_key UNIQUE (reasoning_run_code)
);
CREATE INDEX ix_reasoning_run_request ON agriculture.reasoning_run USING btree (formulation_request_id, run_status);

-- owner: postgres
CREATE TABLE agriculture.reconciliation_item (
  reconciliation_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
  reconciliation_run_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  source_object_id uuid,
  reconciliation_status text NOT NULL,
  finding_summary text NOT NULL,
  recommended_action text,
  resolved_status text DEFAULT 'OPEN'::text NOT NULL,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  CONSTRAINT reconciliation_item_reconciliation_status_check CHECK (reconciliation_status = ANY (ARRAY['MATCHED'::text, 'MISMATCH'::text, 'MISSING_SOURCE'::text, 'MISSING_CANONICAL'::text, 'DUPLICATE'::text, 'UNVERIFIED'::text, 'EXCLUDED'::text])),
  CONSTRAINT reconciliation_item_resolved_status_check CHECK (resolved_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text, 'RESOLVED'::text, 'ACCEPTED_EXCEPTION'::text, 'REJECTED'::text])),
  CONSTRAINT reconciliation_item_reconciliation_run_id_fkey FOREIGN KEY (reconciliation_run_id) REFERENCES agriculture.reconciliation_run(reconciliation_run_id),
  CONSTRAINT reconciliation_item_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT reconciliation_item_source_object_id_fkey FOREIGN KEY (source_object_id) REFERENCES agriculture.source_object(source_object_id),
  CONSTRAINT reconciliation_item_pkey PRIMARY KEY (reconciliation_item_id)
);
CREATE INDEX ix_reconciliation_item_status ON agriculture.reconciliation_item USING btree (reconciliation_run_id, reconciliation_status, resolved_status);

-- owner: postgres
CREATE TABLE agriculture.reconciliation_run (
  reconciliation_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  reconciliation_code text NOT NULL,
  reconciliation_type text NOT NULL,
  run_status text DEFAULT 'PENDING'::text NOT NULL,
  scope_summary text NOT NULL,
  started_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  records_checked integer DEFAULT 0 NOT NULL,
  records_matched integer DEFAULT 0 NOT NULL,
  records_flagged integer DEFAULT 0 NOT NULL,
  result_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT reconciliation_completion_consistency CHECK ((run_status = ANY (ARRAY['COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])) AND completed_at IS NOT NULL OR (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text]))),
  CONSTRAINT reconciliation_run_reconciliation_type_check CHECK (reconciliation_type = ANY (ARRAY['SOURCE_TO_CANONICAL'::text, 'VERSION_CONSISTENCY'::text, 'EVIDENCE_COMPLETENESS'::text, 'LINEAGE_VALIDATION'::text, 'REFERENCE_INTEGRITY'::text, 'OTHER'::text])),
  CONSTRAINT reconciliation_run_records_checked_check CHECK (records_checked >= 0),
  CONSTRAINT reconciliation_run_records_flagged_check CHECK (records_flagged >= 0),
  CONSTRAINT reconciliation_run_records_matched_check CHECK (records_matched >= 0),
  CONSTRAINT reconciliation_run_run_status_check CHECK (run_status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'COMPLETED'::text, 'COMPLETED_WITH_WARNINGS'::text, 'FAILED'::text, 'CANCELLED'::text])),
  CONSTRAINT reconciliation_run_started_by_fkey FOREIGN KEY (started_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT reconciliation_run_pkey PRIMARY KEY (reconciliation_run_id),
  CONSTRAINT reconciliation_run_reconciliation_code_key UNIQUE (reconciliation_code)
);

-- owner: postgres
CREATE TABLE agriculture.record_governance_state (
  record_governance_state_id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  approval_status text DEFAULT 'NOT_SUBMITTED'::text NOT NULL,
  validation_status text DEFAULT 'NOT_VALIDATED'::text NOT NULL,
  data_quality_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  current_version_no integer DEFAULT 1 NOT NULL,
  current_decision_id uuid,
  current_review_id uuid,
  supersedes_entity_id uuid,
  superseded_by_entity_id uuid,
  change_reason text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT governance_state_no_self_supersession CHECK ((supersedes_entity_id IS NULL OR supersedes_entity_id <> entity_id) AND (superseded_by_entity_id IS NULL OR superseded_by_entity_id <> entity_id)),
  CONSTRAINT record_governance_state_approval_status_check CHECK (approval_status = ANY (ARRAY['NOT_SUBMITTED'::text, 'PENDING_REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'CHANGES_REQUIRED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT record_governance_state_current_version_no_check CHECK (current_version_no >= 1),
  CONSTRAINT record_governance_state_data_quality_status_check CHECK (data_quality_status = ANY (ARRAY['UNASSESSED'::text, 'ACCEPTABLE'::text, 'WARNING'::text, 'QUARANTINED'::text, 'REJECTED'::text])),
  CONSTRAINT record_governance_state_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'REJECTED'::text, 'SUPERSEDED'::text, 'QUARANTINED'::text])),
  CONSTRAINT record_governance_state_validation_status_check CHECK (validation_status = ANY (ARRAY['NOT_VALIDATED'::text, 'VALID'::text, 'VALID_WITH_WARNINGS'::text, 'QUARANTINED'::text, 'REJECTED'::text])),
  CONSTRAINT record_governance_state_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT record_governance_state_current_decision_id_fkey FOREIGN KEY (current_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT record_governance_state_current_review_id_fkey FOREIGN KEY (current_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT record_governance_state_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT record_governance_state_pkey PRIMARY KEY (record_governance_state_id),
  CONSTRAINT record_governance_state_entity_type_entity_id_key UNIQUE (entity_type, entity_id)
);
CREATE INDEX ix_record_governance_lifecycle ON agriculture.record_governance_state USING btree (lifecycle_status, approval_status, validation_status);

-- owner: postgres
CREATE TABLE agriculture.request_context (
  request_context_id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id text NOT NULL,
  request_type text NOT NULL,
  request_source text NOT NULL,
  actor_id uuid,
  access_profile_code text,
  correlation_id text,
  client_ip_hash text,
  user_agent_hash text,
  request_status text DEFAULT 'RECEIVED'::text NOT NULL,
  received_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  failure_code text,
  CONSTRAINT request_completion_consistency CHECK ((request_status = ANY (ARRAY['COMPLETED'::text, 'FAILED'::text, 'REJECTED'::text])) AND completed_at IS NOT NULL OR (request_status = ANY (ARRAY['RECEIVED'::text, 'VALIDATING'::text, 'ACCEPTED'::text]))),
  CONSTRAINT request_context_request_source_check CHECK (request_source = ANY (ARRAY['WEB_UI'::text, 'PHP_API'::text, 'MIGRATION'::text, 'VALIDATION'::text, 'BACKGROUND_JOB'::text, 'ADMIN_TOOL'::text, 'OTHER'::text])),
  CONSTRAINT request_context_request_status_check CHECK (request_status = ANY (ARRAY['RECEIVED'::text, 'VALIDATING'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'COMPLETED'::text, 'FAILED'::text])),
  CONSTRAINT request_context_access_profile_code_fkey FOREIGN KEY (access_profile_code) REFERENCES agriculture.access_profile(access_profile_code),
  CONSTRAINT request_context_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT request_context_pkey PRIMARY KEY (request_context_id),
  CONSTRAINT request_context_request_id_key UNIQUE (request_id)
);
CREATE INDEX ix_request_context_status ON agriculture.request_context USING btree (request_status, received_at);

-- owner: postgres
CREATE TABLE agriculture.resource_discovery_assessment (
  resource_discovery_assessment_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_discovery_run_id uuid NOT NULL,
  discovery_potential_score numeric NOT NULL,
  environmental_benefit_score numeric NOT NULL,
  resource_availability_score numeric NOT NULL,
  recovery_feasibility_score numeric NOT NULL,
  scientific_novelty_score numeric NOT NULL,
  mechanism_plausibility_score numeric NOT NULL,
  ingredient_compatibility_potential_score numeric NOT NULL,
  cross_domain_utility_score numeric NOT NULL,
  evidence_strength_score numeric NOT NULL,
  knowledge_gap_value_score numeric NOT NULL,
  safety_concern_score numeric NOT NULL,
  ecological_concern_score numeric NOT NULL,
  processing_requirement_score numeric NOT NULL,
  circular_economy_potential_score numeric NOT NULL,
  investigation_priority_score numeric NOT NULL,
  assessment_summary text NOT NULL,
  algorithm_explanation jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discovery_assessment_not_proof CHECK (discovery_potential_score >= 0::numeric),
  CONSTRAINT resource_discovery_assessmen_circular_economy_potential_s_check CHECK (circular_economy_potential_score >= 0::numeric AND circular_economy_potential_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessmen_ingredient_compatibility_pot_check CHECK (ingredient_compatibility_potential_score >= 0::numeric AND ingredient_compatibility_potential_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessmen_investigation_priority_score_check CHECK (investigation_priority_score >= 0::numeric AND investigation_priority_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessmen_mechanism_plausibility_score_check CHECK (mechanism_plausibility_score >= 0::numeric AND mechanism_plausibility_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessmen_processing_requirement_score_check CHECK (processing_requirement_score >= 0::numeric AND processing_requirement_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_cross_domain_utility_score_check CHECK (cross_domain_utility_score >= 0::numeric AND cross_domain_utility_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_discovery_potential_score_check CHECK (discovery_potential_score >= 0::numeric AND discovery_potential_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_ecological_concern_score_check CHECK (ecological_concern_score >= 0::numeric AND ecological_concern_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_environmental_benefit_score_check CHECK (environmental_benefit_score >= 0::numeric AND environmental_benefit_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_evidence_strength_score_check CHECK (evidence_strength_score >= 0::numeric AND evidence_strength_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_knowledge_gap_value_score_check CHECK (knowledge_gap_value_score >= 0::numeric AND knowledge_gap_value_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_recovery_feasibility_score_check CHECK (recovery_feasibility_score >= 0::numeric AND recovery_feasibility_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_resource_availability_score_check CHECK (resource_availability_score >= 0::numeric AND resource_availability_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_safety_concern_score_check CHECK (safety_concern_score >= 0::numeric AND safety_concern_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_scientific_novelty_score_check CHECK (scientific_novelty_score >= 0::numeric AND scientific_novelty_score <= 100::numeric),
  CONSTRAINT resource_discovery_assessment_resource_discovery_run_id_fkey FOREIGN KEY (resource_discovery_run_id) REFERENCES agriculture.resource_discovery_run(resource_discovery_run_id),
  CONSTRAINT resource_discovery_assessment_pkey PRIMARY KEY (resource_discovery_assessment_id),
  CONSTRAINT resource_discovery_assessment_resource_discovery_run_id_key UNIQUE (resource_discovery_run_id)
);

-- owner: postgres
CREATE TABLE agriculture.resource_discovery_brain_contribution (
  resource_discovery_brain_contribution_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_discovery_run_id uuid NOT NULL,
  brain_code text NOT NULL,
  contribution_status text NOT NULL,
  contribution_summary text NOT NULL,
  evidence_strength text DEFAULT 'UNASSESSED'::text NOT NULL,
  contribution_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resource_discovery_brain_contribution_brain_code_check CHECK (brain_code = ANY (ARRAY['COUNTRY_RESOURCE'::text, 'RESOURCE_RECOVERY'::text, 'ENVIRONMENTAL_INTELLIGENCE'::text, 'INGREDIENT_INTELLIGENCE'::text, 'MECHANISM_INTELLIGENCE'::text, 'CONTRADICTION_INTELLIGENCE'::text, 'KNOWLEDGE_GAP_INTELLIGENCE'::text, 'FORMULATION_INTELLIGENCE'::text, 'SCIENTIFIC_MEMORY'::text])),
  CONSTRAINT resource_discovery_brain_contribution_contribution_status_check CHECK (contribution_status = ANY (ARRAY['NO_SIGNAL'::text, 'WEAK_SIGNAL'::text, 'MATERIAL_SIGNAL'::text, 'BLOCKING_SIGNAL'::text])),
  CONSTRAINT resource_discovery_brain_contribution_evidence_strength_check CHECK (evidence_strength = ANY (ARRAY['UNASSESSED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text, 'CONTRADICTED'::text])),
  CONSTRAINT resource_discovery_brain_contrib_resource_discovery_run_id_fkey FOREIGN KEY (resource_discovery_run_id) REFERENCES agriculture.resource_discovery_run(resource_discovery_run_id),
  CONSTRAINT resource_discovery_brain_contribution_pkey PRIMARY KEY (resource_discovery_brain_contribution_id),
  CONSTRAINT resource_discovery_brain_cont_resource_discovery_run_id_bra_key UNIQUE (resource_discovery_run_id, brain_code)
);

-- owner: postgres
CREATE TABLE agriculture.resource_discovery_bridge (
  resource_discovery_bridge_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_discovery_run_id uuid NOT NULL,
  country_resource_candidate_id uuid NOT NULL,
  discovery_signal_id uuid NOT NULL,
  discovery_candidate_id uuid NOT NULL,
  bridge_status text DEFAULT 'CREATED_FOR_INVESTIGATION'::text NOT NULL,
  bridge_rationale text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resource_discovery_bridge_bridge_status_check CHECK (bridge_status = ANY (ARRAY['CREATED_FOR_INVESTIGATION'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT resource_discovery_bridge_country_resource_candidate_id_fkey FOREIGN KEY (country_resource_candidate_id) REFERENCES agriculture.country_resource_candidate(country_resource_candidate_id),
  CONSTRAINT resource_discovery_bridge_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_discovery_bridge_discovery_candidate_id_fkey FOREIGN KEY (discovery_candidate_id) REFERENCES agriculture.discovery_candidate(discovery_candidate_id),
  CONSTRAINT resource_discovery_bridge_discovery_signal_id_fkey FOREIGN KEY (discovery_signal_id) REFERENCES agriculture.discovery_signal(discovery_signal_id),
  CONSTRAINT resource_discovery_bridge_resource_discovery_run_id_fkey FOREIGN KEY (resource_discovery_run_id) REFERENCES agriculture.resource_discovery_run(resource_discovery_run_id),
  CONSTRAINT resource_discovery_bridge_pkey PRIMARY KEY (resource_discovery_bridge_id),
  CONSTRAINT resource_discovery_bridge_resource_discovery_run_id_key UNIQUE (resource_discovery_run_id)
);

-- owner: postgres
CREATE TABLE agriculture.resource_discovery_priority (
  resource_discovery_priority_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_discovery_run_id uuid NOT NULL,
  priority_band text NOT NULL,
  investigation_priority_score numeric NOT NULL,
  environmental_opportunity_band text NOT NULL,
  scientific_opportunity_band text NOT NULL,
  evidence_readiness_band text NOT NULL,
  safety_attention_band text NOT NULL,
  rationale text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resource_discovery_priority_environmental_opportunity_ban_check CHECK (environmental_opportunity_band = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'EXTREME'::text])),
  CONSTRAINT resource_discovery_priority_evidence_readiness_band_check CHECK (evidence_readiness_band = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
  CONSTRAINT resource_discovery_priority_investigation_priority_score_check CHECK (investigation_priority_score >= 0::numeric AND investigation_priority_score <= 100::numeric),
  CONSTRAINT resource_discovery_priority_priority_band_check CHECK (priority_band = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'EXTREME'::text])),
  CONSTRAINT resource_discovery_priority_safety_attention_band_check CHECK (safety_attention_band = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT resource_discovery_priority_scientific_opportunity_band_check CHECK (scientific_opportunity_band = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'EXTREME'::text])),
  CONSTRAINT resource_discovery_priority_resource_discovery_run_id_fkey FOREIGN KEY (resource_discovery_run_id) REFERENCES agriculture.resource_discovery_run(resource_discovery_run_id),
  CONSTRAINT resource_discovery_priority_pkey PRIMARY KEY (resource_discovery_priority_id),
  CONSTRAINT resource_discovery_priority_resource_discovery_run_id_key UNIQUE (resource_discovery_run_id)
);

-- owner: postgres
CREATE TABLE agriculture.resource_discovery_run (
  resource_discovery_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  run_code text NOT NULL,
  country_resource_candidate_id uuid NOT NULL,
  resource_waste_stream_id uuid,
  run_status text DEFAULT 'COMPLETED'::text NOT NULL,
  algorithm_version text DEFAULT 'AAB_RESOURCE_DISCOVERY_V1'::text NOT NULL,
  input_snapshot jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  country_workspace_id uuid,
  CONSTRAINT resource_discovery_run_run_status_check CHECK (run_status = ANY (ARRAY['RUNNING'::text, 'COMPLETED'::text, 'FAILED'::text, 'ARCHIVED'::text])),
  CONSTRAINT resource_discovery_run_country_resource_candidate_id_fkey FOREIGN KEY (country_resource_candidate_id) REFERENCES agriculture.country_resource_candidate(country_resource_candidate_id),
  CONSTRAINT resource_discovery_run_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT resource_discovery_run_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_discovery_run_resource_waste_stream_id_fkey FOREIGN KEY (resource_waste_stream_id) REFERENCES agriculture.resource_waste_stream(resource_waste_stream_id),
  CONSTRAINT resource_discovery_run_pkey PRIMARY KEY (resource_discovery_run_id),
  CONSTRAINT resource_discovery_run_run_code_key UNIQUE (run_code)
);
CREATE INDEX ix_resource_discovery_run_country_workspace ON agriculture.resource_discovery_run USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.resource_discovery_scientist_review (
  resource_discovery_scientist_review_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_discovery_run_id uuid NOT NULL,
  review_status text DEFAULT 'PENDING'::text NOT NULL,
  evidence_reviewed_summary text,
  review_rationale text,
  review_result text,
  required_follow_up text,
  reviewer_id uuid,
  reviewed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resource_discovery_scientist_review_review_status_check CHECK (review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text, 'APPROVED_FOR_INVESTIGATION'::text, 'CHANGES_REQUIRED'::text, 'HOLD'::text, 'REJECTED'::text])),
  CONSTRAINT resource_review_final_consistency CHECK ((review_status = ANY (ARRAY['APPROVED_FOR_INVESTIGATION'::text, 'CHANGES_REQUIRED'::text, 'HOLD'::text, 'REJECTED'::text])) AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND evidence_reviewed_summary IS NOT NULL AND review_rationale IS NOT NULL AND review_result IS NOT NULL OR (review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text]))),
  CONSTRAINT resource_discovery_scientist_rev_resource_discovery_run_id_fkey FOREIGN KEY (resource_discovery_run_id) REFERENCES agriculture.resource_discovery_run(resource_discovery_run_id),
  CONSTRAINT resource_discovery_scientist_review_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_discovery_scientist_review_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_discovery_scientist_review_pkey PRIMARY KEY (resource_discovery_scientist_review_id)
);
CREATE INDEX ix_resource_review_run ON agriculture.resource_discovery_scientist_review USING btree (resource_discovery_run_id, created_at DESC);

-- owner: postgres
CREATE TABLE agriculture.resource_recovery_pathway (
  resource_recovery_pathway_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_waste_stream_id uuid NOT NULL,
  pathway_code text NOT NULL,
  pathway_type text NOT NULL,
  pathway_summary text NOT NULL,
  processing_requirements text,
  recovery_feasibility text DEFAULT 'UNASSESSED'::text NOT NULL,
  safety_review_required boolean DEFAULT true NOT NULL,
  ecology_review_required boolean DEFAULT true NOT NULL,
  lifecycle_status text DEFAULT 'ADVISORY'::text NOT NULL,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resource_recovery_pathway_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ADVISORY'::text, 'UNDER_REVIEW'::text, 'SUPPORTED_FOR_INVESTIGATION'::text, 'BLOCKED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT resource_recovery_pathway_pathway_type_check CHECK (pathway_type = ANY (ARRAY['DIRECT_REUSE'::text, 'COMPOSTING'::text, 'FERMENTATION'::text, 'EXTRACTION'::text, 'MINERAL_RECOVERY'::text, 'BIOLOGICAL_PROCESSING'::text, 'PHYSICAL_PROCESSING'::text, 'WATER_TREATMENT_MEDIA'::text, 'SOIL_AMENDMENT_PROCESSING'::text, 'FORMULATION_FEEDSTOCK'::text, 'OTHER'::text])),
  CONSTRAINT resource_recovery_pathway_recovery_feasibility_check CHECK (recovery_feasibility = ANY (ARRAY['UNASSESSED'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERY_HIGH'::text])),
  CONSTRAINT resource_recovery_pathway_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_recovery_pathway_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT resource_recovery_pathway_resource_waste_stream_id_fkey FOREIGN KEY (resource_waste_stream_id) REFERENCES agriculture.resource_waste_stream(resource_waste_stream_id),
  CONSTRAINT resource_recovery_pathway_pkey PRIMARY KEY (resource_recovery_pathway_id),
  CONSTRAINT resource_recovery_pathway_pathway_code_key UNIQUE (pathway_code)
);

-- owner: postgres
CREATE TABLE agriculture.resource_safety_ecology_gate (
  resource_safety_ecology_gate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_discovery_run_id uuid NOT NULL,
  contamination_status text NOT NULL,
  toxicity_review_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  ecological_review_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  unknown_material_flag boolean DEFAULT true NOT NULL,
  traditional_knowledge_only_flag boolean DEFAULT false NOT NULL,
  supplier_claim_only_flag boolean DEFAULT false NOT NULL,
  gate_status text NOT NULL,
  gate_reason text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT resource_gate_human_review_consistency CHECK (gate_status = 'PASS_FOR_INVESTIGATION'::text AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL OR gate_status <> 'PASS_FOR_INVESTIGATION'::text),
  CONSTRAINT resource_safety_ecology_gate_ecological_review_status_check CHECK (ecological_review_status = ANY (ARRAY['UNASSESSED'::text, 'LOW_CONCERN'::text, 'REVIEW_REQUIRED'::text, 'HIGH_CONCERN'::text, 'PROHIBITIVE'::text])),
  CONSTRAINT resource_safety_ecology_gate_gate_status_check CHECK (gate_status = ANY (ARRAY['BLOCKED'::text, 'REVIEW_REQUIRED'::text, 'PASS_FOR_INVESTIGATION'::text])),
  CONSTRAINT resource_safety_ecology_gate_toxicity_review_status_check CHECK (toxicity_review_status = ANY (ARRAY['UNASSESSED'::text, 'LOW_CONCERN'::text, 'REVIEW_REQUIRED'::text, 'HIGH_CONCERN'::text, 'PROHIBITIVE'::text])),
  CONSTRAINT resource_safety_ecology_gate_resource_discovery_run_id_fkey FOREIGN KEY (resource_discovery_run_id) REFERENCES agriculture.resource_discovery_run(resource_discovery_run_id),
  CONSTRAINT resource_safety_ecology_gate_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_safety_ecology_gate_pkey PRIMARY KEY (resource_safety_ecology_gate_id)
);
CREATE INDEX ix_resource_safety_gate_run ON agriculture.resource_safety_ecology_gate USING btree (resource_discovery_run_id, created_at DESC);

-- owner: postgres
CREATE TABLE agriculture.resource_waste_stream (
  resource_waste_stream_id uuid DEFAULT gen_random_uuid() NOT NULL,
  waste_stream_code text NOT NULL,
  country_code character(2),
  waste_stream_name text NOT NULL,
  waste_stream_type text NOT NULL,
  source_sector text,
  generation_context text,
  current_disposal_pathway text,
  burning_involved boolean DEFAULT false NOT NULL,
  dumping_involved boolean DEFAULT false NOT NULL,
  landfill_involved boolean DEFAULT false NOT NULL,
  pollution_pathway text,
  estimated_availability_status text DEFAULT 'UNKNOWN'::text NOT NULL,
  seasonality_summary text,
  contamination_status text DEFAULT 'UNKNOWN'::text NOT NULL,
  known_contaminants text,
  recovery_status text DEFAULT 'UNASSESSED'::text NOT NULL,
  linked_country_resource_candidate_id uuid,
  evidence_packet_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  country_workspace_id uuid,
  CONSTRAINT resource_waste_stream_contamination_status_check CHECK (contamination_status = ANY (ARRAY['UNKNOWN'::text, 'LOW_CONCERN'::text, 'REVIEW_REQUIRED'::text, 'HIGH_CONCERN'::text, 'PROHIBITIVE'::text])),
  CONSTRAINT resource_waste_stream_estimated_availability_status_check CHECK (estimated_availability_status = ANY (ARRAY['UNKNOWN'::text, 'LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'VERY_HIGH'::text])),
  CONSTRAINT resource_waste_stream_recovery_status_check CHECK (recovery_status = ANY (ARRAY['UNASSESSED'::text, 'POTENTIAL'::text, 'UNDER_INVESTIGATION'::text, 'RECOVERABLE'::text, 'NOT_RECOVERABLE'::text, 'ARCHIVED'::text])),
  CONSTRAINT resource_waste_stream_waste_stream_type_check CHECK (waste_stream_type = ANY (ARRAY['AGRICULTURAL_RESIDUE'::text, 'FOOD_PROCESSING_WASTE'::text, 'FORESTRY_RESIDUE'::text, 'AQUACULTURE_WASTE'::text, 'MARINE_BIOMASS'::text, 'FERMENTATION_RESIDUE'::text, 'MINERAL_RESIDUE'::text, 'INDUSTRIAL_BYPRODUCT'::text, 'ORGANIC_MUNICIPAL_STREAM'::text, 'OTHER'::text])),
  CONSTRAINT waste_stream_name_not_blank CHECK (length(btrim(waste_stream_name)) > 0),
  CONSTRAINT resource_waste_stream_country_code_fkey FOREIGN KEY (country_code) REFERENCES agriculture.country_scope(country_code),
  CONSTRAINT resource_waste_stream_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT resource_waste_stream_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_waste_stream_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT resource_waste_stream_linked_country_resource_candidate_id_fkey FOREIGN KEY (linked_country_resource_candidate_id) REFERENCES agriculture.country_resource_candidate(country_resource_candidate_id),
  CONSTRAINT resource_waste_stream_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT resource_waste_stream_pkey PRIMARY KEY (resource_waste_stream_id),
  CONSTRAINT resource_waste_stream_waste_stream_code_key UNIQUE (waste_stream_code)
);
CREATE INDEX ix_resource_waste_stream_country_workspace ON agriculture.resource_waste_stream USING btree (country_workspace_id);
CREATE INDEX ix_waste_stream_burning ON agriculture.resource_waste_stream USING btree (country_code, burning_involved) WHERE burning_involved;
CREATE INDEX ix_waste_stream_country ON agriculture.resource_waste_stream USING btree (country_code, recovery_status);

-- owner: postgres
CREATE TABLE agriculture.schema_migration (
  migration_code text NOT NULL,
  applied_at timestamp with time zone DEFAULT now() NOT NULL,
  checksum_sha256 text,
  applied_by text DEFAULT CURRENT_USER NOT NULL,
  CONSTRAINT schema_migration_pkey PRIMARY KEY (migration_code)
);

-- owner: postgres
CREATE TABLE agriculture.scientific_memory_entry (
  scientific_memory_entry_id uuid DEFAULT gen_random_uuid() NOT NULL,
  memory_code text NOT NULL,
  approved_learning_id uuid NOT NULL,
  memory_type text NOT NULL,
  memory_statement text NOT NULL,
  context_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
  evidence_packet_id uuid NOT NULL,
  governance_decision_id uuid NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  version_no integer DEFAULT 1 NOT NULL,
  supersedes_memory_entry_id uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT scientific_memory_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT scientific_memory_entry_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'SUPERSEDED'::text, 'RETIRED'::text, 'ARCHIVED'::text])),
  CONSTRAINT scientific_memory_entry_memory_type_check CHECK (memory_type = ANY (ARRAY['LEARNING'::text, 'MECHANISM'::text, 'CONTRADICTION'::text, 'NEGATIVE_LEARNING'::text, 'SAFETY'::text, 'OUTCOME'::text, 'OTHER'::text])),
  CONSTRAINT scientific_memory_entry_version_no_check CHECK (version_no >= 1),
  CONSTRAINT scientific_memory_no_self_supersession CHECK (supersedes_memory_entry_id IS NULL OR supersedes_memory_entry_id <> scientific_memory_entry_id),
  CONSTRAINT scientific_memory_entry_approved_learning_id_fkey FOREIGN KEY (approved_learning_id) REFERENCES agriculture.approved_learning(approved_learning_id),
  CONSTRAINT scientific_memory_entry_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT scientific_memory_entry_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT scientific_memory_entry_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT scientific_memory_entry_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT scientific_memory_entry_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT scientific_memory_entry_supersedes_memory_entry_id_fkey FOREIGN KEY (supersedes_memory_entry_id) REFERENCES agriculture.scientific_memory_entry(scientific_memory_entry_id),
  CONSTRAINT scientific_memory_entry_pkey PRIMARY KEY (scientific_memory_entry_id),
  CONSTRAINT scientific_memory_entry_memory_code_key UNIQUE (memory_code)
);
CREATE INDEX ix_memory_learning ON agriculture.scientific_memory_entry USING btree (approved_learning_id);
CREATE INDEX ix_memory_status ON agriculture.scientific_memory_entry USING btree (lifecycle_status, memory_type);
CREATE INDEX ix_scientific_memory_entry_country_workspace ON agriculture.scientific_memory_entry USING btree (country_workspace_id);

-- owner: postgres
CREATE TABLE agriculture.source_object (
  source_object_id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_system_code text NOT NULL,
  source_object_type text NOT NULL,
  source_object_reference text,
  title text,
  source_uri text,
  source_hash_sha256 text,
  source_created_at timestamp with time zone,
  source_observed_at timestamp with time zone,
  preservation_status text DEFAULT 'PRESERVED'::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  registered_by uuid,
  registered_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT source_object_preservation_status_check CHECK (preservation_status = ANY (ARRAY['PRESERVED'::text, 'VERIFIED'::text, 'SUPERSEDED'::text, 'UNAVAILABLE'::text, 'REJECTED'::text])),
  CONSTRAINT source_object_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT source_object_source_system_code_fkey FOREIGN KEY (source_system_code) REFERENCES agriculture.source_system(source_system_code),
  CONSTRAINT source_object_pkey PRIMARY KEY (source_object_id),
  CONSTRAINT source_object_source_system_code_source_object_type_source__key UNIQUE (source_system_code, source_object_type, source_object_reference)
);
CREATE INDEX ix_source_object_system_reference ON agriculture.source_object USING btree (source_system_code, source_object_type, source_object_reference);

-- owner: postgres
CREATE TABLE agriculture.source_record_reference (
  source_record_reference_id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_system text NOT NULL,
  source_table text,
  source_record_id text,
  canonical_entity_type text NOT NULL,
  canonical_entity_id uuid NOT NULL,
  source_snapshot jsonb,
  imported_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT source_record_reference_pkey PRIMARY KEY (source_record_reference_id),
  CONSTRAINT source_record_reference_source_system_source_table_source_r_key UNIQUE (source_system, source_table, source_record_id)
);

-- owner: postgres
CREATE TABLE agriculture.source_system (
  source_system_code text NOT NULL,
  source_system_name text NOT NULL,
  source_system_type text NOT NULL,
  authoritative_status text DEFAULT 'NON_CANONICAL'::text NOT NULL,
  description text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT source_system_authoritative_status_check CHECK (authoritative_status = ANY (ARRAY['CANONICAL'::text, 'NON_CANONICAL'::text, 'REFERENCE_ONLY'::text, 'UNVERIFIED'::text])),
  CONSTRAINT source_system_source_system_type_check CHECK (source_system_type = ANY (ARRAY['USER_ENTRY'::text, 'FIELD_CAPTURE'::text, 'LABORATORY'::text, 'INSTRUMENT'::text, 'DOCUMENT'::text, 'EXTERNAL_DATABASE'::text, 'RESEARCH_SOURCE'::text, 'LEGACY_REFERENCE'::text, 'SYSTEM_GENERATED'::text, 'OTHER'::text])),
  CONSTRAINT source_system_pkey PRIMARY KEY (source_system_code)
);

-- owner: postgres
CREATE TABLE agriculture.trial (
  trial_id uuid DEFAULT gen_random_uuid() NOT NULL,
  trial_code text NOT NULL,
  trial_name text NOT NULL,
  formulation_version_id uuid,
  organization_id uuid,
  farm_id uuid,
  location_id uuid,
  crop_id uuid,
  variety_id uuid,
  problem_id uuid,
  trial_objective text NOT NULL,
  protocol_summary text,
  start_date date,
  planned_end_date date,
  actual_end_date date,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  outcome_status text DEFAULT 'NOT_RECORDED'::text NOT NULL,
  governance_decision_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  country_workspace_id uuid,
  CONSTRAINT trial_actual_date_consistency CHECK (actual_end_date IS NULL OR start_date IS NULL OR actual_end_date >= start_date),
  CONSTRAINT trial_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT trial_date_consistency CHECK (planned_end_date IS NULL OR start_date IS NULL OR planned_end_date >= start_date),
  CONSTRAINT trial_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'APPROVED'::text, 'ACTIVE'::text, 'PAUSED'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'ARCHIVED'::text])),
  CONSTRAINT trial_outcome_status_check CHECK (outcome_status = ANY (ARRAY['NOT_RECORDED'::text, 'PARTIAL'::text, 'RECORDED'::text, 'REVIEWED'::text])),
  CONSTRAINT trial_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT trial_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT trial_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT trial_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES agriculture.crop(crop_id),
  CONSTRAINT trial_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES agriculture.farm(farm_id),
  CONSTRAINT trial_formulation_version_id_fkey FOREIGN KEY (formulation_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT trial_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT trial_location_id_fkey FOREIGN KEY (location_id) REFERENCES agriculture.location(location_id),
  CONSTRAINT trial_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES agriculture.organization(organization_id),
  CONSTRAINT trial_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES agriculture.agricultural_problem(agricultural_problem_id),
  CONSTRAINT trial_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT trial_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES agriculture.variety(variety_id),
  CONSTRAINT trial_pkey PRIMARY KEY (trial_id),
  CONSTRAINT trial_trial_code_key UNIQUE (trial_code)
);
CREATE INDEX ix_trial_country_workspace ON agriculture.trial USING btree (country_workspace_id);
CREATE INDEX ix_trial_formulation ON agriculture.trial USING btree (formulation_version_id);
CREATE INDEX ix_trial_status ON agriculture.trial USING btree (lifecycle_status, start_date);

-- owner: postgres
CREATE TABLE agriculture.trial_activation_handoff (
  trial_activation_handoff_id uuid DEFAULT gen_random_uuid() NOT NULL,
  trial_id uuid NOT NULL,
  governance_decision_id uuid NOT NULL,
  governance_review_id uuid NOT NULL,
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_status text DEFAULT 'PENDING'::text NOT NULL,
  CONSTRAINT trial_activation_handoff_decision_status_check CHECK (decision_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  CONSTRAINT trial_activation_handoff_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT trial_activation_handoff_governance_decision_id_fkey FOREIGN KEY (governance_decision_id) REFERENCES agriculture.governance_decision(decision_id),
  CONSTRAINT trial_activation_handoff_governance_review_id_fkey FOREIGN KEY (governance_review_id) REFERENCES agriculture.governance_review(review_id),
  CONSTRAINT trial_activation_handoff_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT trial_activation_handoff_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT trial_activation_handoff_pkey PRIMARY KEY (trial_activation_handoff_id),
  CONSTRAINT trial_activation_handoff_trial_id_governance_decision_id_key UNIQUE (trial_id, governance_decision_id)
);

-- owner: postgres
CREATE TABLE agriculture.trial_protocol_binding (
  trial_protocol_binding_id uuid DEFAULT gen_random_uuid() NOT NULL,
  trial_id uuid NOT NULL,
  observation_template_version_id uuid NOT NULL,
  binding_role text DEFAULT 'PRIMARY'::text NOT NULL,
  required boolean DEFAULT true NOT NULL,
  effective_from timestamp with time zone DEFAULT now() NOT NULL,
  effective_until timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trial_protocol_binding_binding_role_check CHECK (binding_role = ANY (ARRAY['PRIMARY'::text, 'SUPPLEMENTARY'::text, 'DIAGNOSTIC_FOLLOWUP'::text, 'OUTCOME'::text])),
  CONSTRAINT trial_protocol_period_consistency CHECK (effective_until IS NULL OR effective_until >= effective_from),
  CONSTRAINT trial_protocol_binding_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT trial_protocol_binding_observation_template_version_id_fkey FOREIGN KEY (observation_template_version_id) REFERENCES agriculture.observation_template_version(observation_template_version_id),
  CONSTRAINT trial_protocol_binding_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT trial_protocol_binding_pkey PRIMARY KEY (trial_protocol_binding_id),
  CONSTRAINT trial_protocol_binding_trial_id_observation_template_versio_key UNIQUE (trial_id, observation_template_version_id, binding_role)
);

-- owner: postgres
CREATE TABLE agriculture.validation_rule (
  validation_rule_id uuid DEFAULT gen_random_uuid() NOT NULL,
  validation_rule_code text NOT NULL,
  validation_rule_name text NOT NULL,
  validation_rule_description text NOT NULL,
  applies_to_entity_type text NOT NULL,
  validation_category text NOT NULL,
  enforcement_level text NOT NULL,
  rule_version integer DEFAULT 1 NOT NULL,
  rule_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
  lifecycle_status text DEFAULT 'DRAFT'::text NOT NULL,
  supersedes_validation_rule_id uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT validation_rule_approval_consistency CHECK (lifecycle_status = 'ACTIVE'::text AND approved_by IS NOT NULL AND approved_at IS NOT NULL OR lifecycle_status <> 'ACTIVE'::text),
  CONSTRAINT validation_rule_enforcement_level_check CHECK (enforcement_level = ANY (ARRAY['DATABASE_BLOCK'::text, 'SERVICE_BLOCK'::text, 'WARNING'::text, 'QUARANTINE'::text, 'SCIENTIST_REVIEW_REQUIRED'::text])),
  CONSTRAINT validation_rule_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text, 'SUPERSEDED'::text])),
  CONSTRAINT validation_rule_no_self_supersession CHECK (supersedes_validation_rule_id IS NULL OR supersedes_validation_rule_id <> validation_rule_id),
  CONSTRAINT validation_rule_rule_version_check CHECK (rule_version >= 1),
  CONSTRAINT validation_rule_validation_category_check CHECK (validation_category = ANY (ARRAY['STRUCTURAL'::text, 'REQUIRED_FIELD'::text, 'DATA_TYPE'::text, 'UNIT'::text, 'SCIENTIFIC_RANGE'::text, 'CONTEXT'::text, 'CROSS_FIELD'::text, 'DUPLICATE'::text, 'ANOMALY'::text, 'PHOTO'::text, 'METHOD'::text, 'INSTRUMENT'::text, 'AUTHORITY'::text, 'TEMPORAL'::text, 'SPATIAL'::text, 'OTHER'::text])),
  CONSTRAINT validation_rule_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT validation_rule_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT validation_rule_supersedes_validation_rule_id_fkey FOREIGN KEY (supersedes_validation_rule_id) REFERENCES agriculture.validation_rule(validation_rule_id),
  CONSTRAINT validation_rule_pkey PRIMARY KEY (validation_rule_id),
  CONSTRAINT validation_rule_validation_rule_code_key UNIQUE (validation_rule_code)
);
CREATE INDEX ix_validation_rule_entity ON agriculture.validation_rule USING btree (applies_to_entity_type, lifecycle_status, enforcement_level);

-- owner: postgres
CREATE TABLE agriculture.variety (
  variety_id uuid DEFAULT gen_random_uuid() NOT NULL,
  variety_code text NOT NULL,
  crop_id uuid NOT NULL,
  variety_name text NOT NULL,
  breeder_or_source text,
  notes text,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  archived_by uuid,
  archived_at timestamp with time zone,
  archive_reason text,
  CONSTRAINT variety_archive_consistency CHECK (lifecycle_status = 'ARCHIVED'::text AND archived_at IS NOT NULL AND archive_reason IS NOT NULL OR lifecycle_status <> 'ARCHIVED'::text),
  CONSTRAINT variety_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])),
  CONSTRAINT variety_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT variety_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT variety_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES agriculture.crop(crop_id),
  CONSTRAINT variety_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT variety_pkey PRIMARY KEY (variety_id),
  CONSTRAINT variety_crop_id_variety_name_key UNIQUE (crop_id, variety_name),
  CONSTRAINT variety_variety_code_key UNIQUE (variety_code)
);
CREATE INDEX ix_variety_crop ON agriculture.variety USING btree (crop_id, lifecycle_status);

-- owner: postgres
CREATE TABLE agriculture.workbench_trial_handoff (
  workbench_trial_handoff_id uuid DEFAULT gen_random_uuid() NOT NULL,
  formulation_version_id uuid NOT NULL,
  trial_id uuid NOT NULL,
  trial_code text NOT NULL,
  country_workspace_id uuid,
  handed_off_by uuid,
  handoff_rationale text DEFAULT 'Scientist-approved formulation handed to Trial workspace'::text NOT NULL,
  handed_off_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT workbench_trial_handoff_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT workbench_trial_handoff_formulation_version_id_fkey FOREIGN KEY (formulation_version_id) REFERENCES agriculture.formulation_version(formulation_version_id),
  CONSTRAINT workbench_trial_handoff_handed_off_by_fkey FOREIGN KEY (handed_off_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT workbench_trial_handoff_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES agriculture.trial(trial_id),
  CONSTRAINT workbench_trial_handoff_pkey PRIMARY KEY (workbench_trial_handoff_id),
  CONSTRAINT workbench_trial_handoff_trial_code_key UNIQUE (trial_code),
  CONSTRAINT workbench_trial_handoff_trial_id_key UNIQUE (trial_id)
);
