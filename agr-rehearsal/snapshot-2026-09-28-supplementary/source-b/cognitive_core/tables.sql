-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: cognitive_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for cognitive_core: functions 25, tables 18, views 1, sequences 0, rls_enabled_tables 0, constraints 157, triggers 0, policies 0, indexes 39.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE cognitive_core.algorithm_registry (
  algorithm_code text NOT NULL,
  algorithm_name text NOT NULL,
  algorithm_family text NOT NULL,
  purpose text NOT NULL,
  output_dimensions jsonb DEFAULT '[]'::jsonb NOT NULL,
  explainability_required boolean DEFAULT true NOT NULL,
  governance_sensitive boolean DEFAULT true NOT NULL,
  algorithm_version text DEFAULT 'v1'::text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT algorithm_registry_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'EXPERIMENTAL'::text, 'SUSPENDED'::text, 'RETIRED'::text])),
  CONSTRAINT algorithm_registry_pkey PRIMARY KEY (algorithm_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.brain_registry (
  brain_code text NOT NULL,
  brain_name text NOT NULL,
  brain_type text NOT NULL,
  purpose text NOT NULL,
  parent_brain_code text,
  inherited_by_all_domains boolean DEFAULT true NOT NULL,
  advisory_only boolean DEFAULT true NOT NULL,
  scientist_authority_required boolean DEFAULT true NOT NULL,
  autonomous_approval_allowed boolean DEFAULT false NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT brain_registry_brain_type_check CHECK (brain_type = ANY (ARRAY['KERNEL'::text, 'TARGET_BRAIN'::text, 'DISCOVERY_BRAIN'::text, 'ENGINE'::text, 'DOMAIN_ADAPTER'::text])),
  CONSTRAINT brain_registry_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'RETIRED'::text])),
  CONSTRAINT brain_registry_parent_brain_code_fkey FOREIGN KEY (parent_brain_code) REFERENCES cognitive_core.brain_registry(brain_code),
  CONSTRAINT brain_registry_pkey PRIMARY KEY (brain_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.cognitive_loop_run (
  cognitive_loop_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  run_code text NOT NULL,
  domain_code text NOT NULL,
  actor_id uuid,
  run_started_at timestamp with time zone DEFAULT now() NOT NULL,
  run_completed_at timestamp with time zone,
  nodes_materialised integer DEFAULT 0 NOT NULL,
  relationships_materialised integer DEFAULT 0 NOT NULL,
  evidence_signals_materialised integer DEFAULT 0 NOT NULL,
  states_recomputed integer DEFAULT 0 NOT NULL,
  investigations_created integer DEFAULT 0 NOT NULL,
  aab_problem_signals_created integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'RUNNING'::text NOT NULL,
  run_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT cognitive_loop_run_status_check CHECK (status = ANY (ARRAY['RUNNING'::text, 'PASS'::text, 'FAIL'::text])),
  CONSTRAINT cognitive_loop_run_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT cognitive_loop_run_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT cognitive_loop_run_pkey PRIMARY KEY (cognitive_loop_run_id),
  CONSTRAINT cognitive_loop_run_run_code_key UNIQUE (run_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.domain_brain_inheritance (
  domain_code text NOT NULL,
  brain_code text NOT NULL,
  inheritance_status text DEFAULT 'REQUIRED'::text NOT NULL,
  local_override_allowed boolean DEFAULT false NOT NULL,
  fail_closed_on_kernel_absence boolean DEFAULT true NOT NULL,
  inherited_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT domain_brain_inheritance_inheritance_status_check CHECK (inheritance_status = ANY (ARRAY['REQUIRED'::text, 'ACTIVE'::text, 'SUSPENDED'::text])),
  CONSTRAINT domain_brain_inheritance_brain_code_fkey FOREIGN KEY (brain_code) REFERENCES cognitive_core.brain_registry(brain_code),
  CONSTRAINT domain_brain_inheritance_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT domain_brain_inheritance_pkey PRIMARY KEY (domain_code, brain_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.ingredient_build_candidate (
  ingredient_build_candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  candidate_code text NOT NULL,
  candidate_name text NOT NULL,
  source_opportunity_id uuid,
  primary_target_id uuid,
  country_workspace_id uuid,
  domain_code text DEFAULT 'AGRICULTURE'::text NOT NULL,
  novelty_mode text NOT NULL,
  candidate_concept text NOT NULL,
  composition_plan jsonb DEFAULT '[]'::jsonb NOT NULL,
  process_plan jsonb DEFAULT '{}'::jsonb NOT NULL,
  target_mechanisms jsonb DEFAULT '[]'::jsonb NOT NULL,
  predicted_functions jsonb DEFAULT '[]'::jsonb NOT NULL,
  safety_unknowns jsonb DEFAULT '[]'::jsonb NOT NULL,
  regulatory_unknowns jsonb DEFAULT '[]'::jsonb NOT NULL,
  manufacturing_unknowns jsonb DEFAULT '[]'::jsonb NOT NULL,
  required_characterisation jsonb DEFAULT '[]'::jsonb NOT NULL,
  required_tests jsonb DEFAULT '[]'::jsonb NOT NULL,
  novelty_score numeric DEFAULT 0.5 NOT NULL,
  mechanism_plausibility numeric DEFAULT 0.5 NOT NULL,
  environmental_value numeric DEFAULT 0 NOT NULL,
  country_relevance numeric DEFAULT 0 NOT NULL,
  test_value numeric DEFAULT 0.5 NOT NULL,
  scientific_status text DEFAULT 'EXPERIMENTAL_UNVERIFIED'::text NOT NULL,
  canonical_ingredient_id uuid,
  node_id uuid NOT NULL,
  human_confirmation_required boolean DEFAULT true NOT NULL,
  autonomous_promotion_allowed boolean DEFAULT false NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ingredient_build_candidate_country_relevance_check CHECK (country_relevance >= 0::numeric AND country_relevance <= 1::numeric),
  CONSTRAINT ingredient_build_candidate_environmental_value_check CHECK (environmental_value >= 0::numeric AND environmental_value <= 1::numeric),
  CONSTRAINT ingredient_build_candidate_mechanism_plausibility_check CHECK (mechanism_plausibility >= 0::numeric AND mechanism_plausibility <= 1::numeric),
  CONSTRAINT ingredient_build_candidate_novelty_mode_check CHECK (novelty_mode = ANY (ARRAY['NOVEL_COMBINATION'::text, 'NOVEL_INGREDIENT'::text, 'NOVEL_PROCESS'::text, 'NOVEL_BIOLOGICAL'::text, 'NOVEL_RESOURCE_RECOVERY'::text, 'NOVEL_MINERAL'::text, 'NOVEL_DELIVERY'::text, 'NOVEL_SYNERGY'::text])),
  CONSTRAINT ingredient_build_candidate_novelty_score_check CHECK (novelty_score >= 0::numeric AND novelty_score <= 1::numeric),
  CONSTRAINT ingredient_build_candidate_scientific_status_check CHECK (scientific_status = ANY (ARRAY['EXPERIMENTAL_UNVERIFIED'::text, 'CHARACTERISATION_REQUIRED'::text, 'READY_FOR_GOVERNED_TEST'::text, 'UNDER_TEST'::text, 'EVIDENCE_REVIEW'::text, 'APPROVED_FOR_INGREDIENT_REVIEW'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT ingredient_build_candidate_test_value_check CHECK (test_value >= 0::numeric AND test_value <= 1::numeric),
  CONSTRAINT ingredient_build_candidate_canonical_ingredient_id_fkey FOREIGN KEY (canonical_ingredient_id) REFERENCES agriculture.ingredient(ingredient_id),
  CONSTRAINT ingredient_build_candidate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT ingredient_build_candidate_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT ingredient_build_candidate_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT ingredient_build_candidate_primary_target_id_fkey FOREIGN KEY (primary_target_id) REFERENCES cognitive_core.target_registry(target_id),
  CONSTRAINT ingredient_build_candidate_source_opportunity_id_fkey FOREIGN KEY (source_opportunity_id) REFERENCES cognitive_core.transformation_opportunity(transformation_opportunity_id),
  CONSTRAINT ingredient_build_candidate_pkey PRIMARY KEY (ingredient_build_candidate_id),
  CONSTRAINT ingredient_build_candidate_candidate_code_key UNIQUE (candidate_code),
  CONSTRAINT ingredient_build_candidate_node_id_key UNIQUE (node_id)
);

-- owner: postgres
CREATE TABLE cognitive_core.ingredient_candidate_component (
  ingredient_candidate_component_id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingredient_build_candidate_id uuid NOT NULL,
  component_type text NOT NULL,
  linked_entity_type text,
  linked_entity_id uuid,
  component_name text NOT NULL,
  intended_role text NOT NULL,
  proposed_range jsonb DEFAULT '{}'::jsonb NOT NULL,
  evidence_status text DEFAULT 'UNVERIFIED'::text NOT NULL,
  notes text,
  CONSTRAINT ingredient_candidate_component_component_type_check CHECK (component_type = ANY (ARRAY['KNOWN_INGREDIENT'::text, 'COUNTRY_RESOURCE'::text, 'RECOVERED_RESOURCE'::text, 'MINERAL'::text, 'BIOLOGICAL'::text, 'FERMENT'::text, 'CARRIER'::text, 'PROCESS_INPUT'::text, 'OTHER'::text])),
  CONSTRAINT ingredient_candidate_component_evidence_status_check CHECK (evidence_status = ANY (ARRAY['UNVERIFIED'::text, 'LIMITED'::text, 'MODERATE'::text, 'STRONG'::text])),
  CONSTRAINT ingredient_candidate_componen_ingredient_build_candidate_i_fkey FOREIGN KEY (ingredient_build_candidate_id) REFERENCES cognitive_core.ingredient_build_candidate(ingredient_build_candidate_id) ON DELETE CASCADE,
  CONSTRAINT ingredient_candidate_component_pkey PRIMARY KEY (ingredient_candidate_component_id),
  CONSTRAINT ingredient_candidate_componen_ingredient_build_candidate_id_key UNIQUE (ingredient_build_candidate_id, component_name, intended_role)
);

-- owner: postgres
CREATE TABLE cognitive_core.intelligence_activity_event (
  activity_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  correlation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  parent_event_id uuid,
  domain_code text,
  country_workspace_id uuid,
  activity_scope text NOT NULL,
  component_code text,
  component_label text,
  activity_type text NOT NULL,
  status text DEFAULT 'RUNNING'::text NOT NULL,
  trigger_entity_type text,
  trigger_entity_id uuid,
  trigger_label text,
  headline text NOT NULL,
  detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  actor_id uuid,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  visible boolean DEFAULT true NOT NULL,
  CONSTRAINT intelligence_activity_event_activity_scope_check CHECK (activity_scope = ANY (ARRAY['BRAIN'::text, 'NODE'::text, 'RELATIONSHIP'::text, 'ALGORITHM'::text, 'INVESTIGATION'::text, 'SCIENTIFIC_ACTIVITY'::text, 'SYSTEM'::text])),
  CONSTRAINT intelligence_activity_event_activity_type_check CHECK (activity_type = ANY (ARRAY['PROCESSING'::text, 'ANALYSING'::text, 'CHECKING'::text, 'REASSESSING'::text, 'EVALUATING'::text, 'MATERIALISING'::text, 'RECOMPUTING'::text, 'CREATED'::text, 'UPDATED'::text, 'COMPLETED'::text, 'FAILED'::text, 'ATTENTION'::text])),
  CONSTRAINT intelligence_activity_event_status_check CHECK (status = ANY (ARRAY['RUNNING'::text, 'COMPLETED'::text, 'FAILED'::text, 'ATTENTION'::text])),
  CONSTRAINT intelligence_activity_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT intelligence_activity_event_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT intelligence_activity_event_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT intelligence_activity_event_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES cognitive_core.intelligence_activity_event(activity_event_id),
  CONSTRAINT intelligence_activity_event_pkey PRIMARY KEY (activity_event_id)
);
CREATE INDEX intelligence_activity_event_component_idx ON cognitive_core.intelligence_activity_event USING btree (activity_scope, component_code, started_at DESC);
CREATE INDEX intelligence_activity_event_correlation_idx ON cognitive_core.intelligence_activity_event USING btree (correlation_id, started_at);
CREATE INDEX intelligence_activity_event_domain_started_idx ON cognitive_core.intelligence_activity_event USING btree (domain_code, started_at DESC);
CREATE INDEX intelligence_activity_event_status_started_idx ON cognitive_core.intelligence_activity_event USING btree (status, started_at DESC);

-- owner: postgres
CREATE TABLE cognitive_core.intelligent_node (
  node_id uuid DEFAULT gen_random_uuid() NOT NULL,
  node_code text NOT NULL,
  node_type text NOT NULL,
  node_label text NOT NULL,
  node_description text,
  domain_code text,
  country_workspace_id uuid,
  subject_entity_type text,
  subject_entity_id uuid,
  provenance_type text DEFAULT 'GOVERNED_SYSTEM'::text NOT NULL,
  provenance_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  governance_status text DEFAULT 'EXPERIMENTAL_UNVERIFIED'::text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT intelligent_node_governance_status_check CHECK (governance_status = ANY (ARRAY['EXPERIMENTAL_UNVERIFIED'::text, 'REVIEW_REQUIRED'::text, 'APPROVED'::text, 'REJECTED'::text, 'QUARANTINED'::text])),
  CONSTRAINT intelligent_node_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'SUPERSEDED'::text, 'RETIRED'::text, 'ARCHIVED'::text])),
  CONSTRAINT intelligent_node_provenance_type_check CHECK (provenance_type = ANY (ARRAY['HUMAN'::text, 'COMMUNITY'::text, 'INSTITUTION'::text, 'GOVERNMENT'::text, 'DATASET'::text, 'SENSOR'::text, 'COUNTRY_SCAN'::text, 'AAB_DETECTION'::text, 'GOVERNED_SYSTEM'::text, 'IMPORT'::text, 'OTHER'::text])),
  CONSTRAINT intelligent_node_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT intelligent_node_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT intelligent_node_pkey PRIMARY KEY (node_id),
  CONSTRAINT intelligent_node_node_code_key UNIQUE (node_code),
  CONSTRAINT intelligent_node_subject_entity_type_subject_entity_id_node_key UNIQUE (subject_entity_type, subject_entity_id, node_type)
);

-- owner: postgres
CREATE TABLE cognitive_core.intelligent_relationship (
  relationship_id uuid DEFAULT gen_random_uuid() NOT NULL,
  relationship_code text NOT NULL,
  source_node_id uuid NOT NULL,
  target_node_id uuid NOT NULL,
  relationship_type text NOT NULL,
  semantic_strength numeric DEFAULT 0.5 NOT NULL,
  confidence numeric DEFAULT 0.5 NOT NULL,
  evidence_packet_id uuid,
  uncertainty_summary text,
  country_workspace_id uuid,
  governance_status text DEFAULT 'EXPERIMENTAL_UNVERIFIED'::text NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT intelligent_relationship_check CHECK (source_node_id <> target_node_id),
  CONSTRAINT intelligent_relationship_confidence_check CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
  CONSTRAINT intelligent_relationship_governance_status_check CHECK (governance_status = ANY (ARRAY['EXPERIMENTAL_UNVERIFIED'::text, 'REVIEW_REQUIRED'::text, 'APPROVED'::text, 'REJECTED'::text])),
  CONSTRAINT intelligent_relationship_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'SUPERSEDED'::text, 'RETIRED'::text, 'ARCHIVED'::text])),
  CONSTRAINT intelligent_relationship_relationship_type_check CHECK (relationship_type = ANY (ARRAY['RELATED_TO'::text, 'SUPPORTS'::text, 'CONTRADICTS'::text, 'DERIVED_FROM'::text, 'TESTED_IN'::text, 'MAY_CAUSE'::text, 'CAUSES'::text, 'INHIBITS'::text, 'ENABLES'::text, 'REQUIRES'::text, 'MODERATES'::text, 'TARGETS'::text, 'CONTRIBUTES_TO'::text, 'TRANSFORMS_INTO'::text, 'EVIDENCED_BY'::text, 'HAS_GAP'::text, 'HAS_MECHANISM'::text, 'HAS_NEGATIVE_LEARNING'::text, 'REASSESSMENT_REQUIRED'::text])),
  CONSTRAINT intelligent_relationship_semantic_strength_check CHECK (semantic_strength >= 0::numeric AND semantic_strength <= 1::numeric),
  CONSTRAINT intelligent_relationship_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT intelligent_relationship_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT intelligent_relationship_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT intelligent_relationship_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT intelligent_relationship_pkey PRIMARY KEY (relationship_id),
  CONSTRAINT intelligent_relationship_relationship_code_key UNIQUE (relationship_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.next_investigation_candidate (
  next_investigation_candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
  candidate_code text NOT NULL,
  domain_code text NOT NULL,
  country_workspace_id uuid,
  source_node_id uuid NOT NULL,
  knowledge_gap_id uuid,
  primary_target_id uuid,
  investigation_question text NOT NULL,
  proposed_action text,
  expected_information_gain numeric DEFAULT 0.5 NOT NULL,
  evidence_need numeric DEFAULT 0.5 NOT NULL,
  target_relevance numeric DEFAULT 0.5 NOT NULL,
  priority_score numeric DEFAULT 0.5 NOT NULL,
  status text DEFAULT 'CANDIDATE'::text NOT NULL,
  advisory_only boolean DEFAULT true NOT NULL,
  autonomous_execution_allowed boolean DEFAULT false NOT NULL,
  scientist_review_required boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT next_investigation_candidate_evidence_need_check CHECK (evidence_need >= 0::numeric AND evidence_need <= 1::numeric),
  CONSTRAINT next_investigation_candidate_expected_information_gain_check CHECK (expected_information_gain >= 0::numeric AND expected_information_gain <= 1::numeric),
  CONSTRAINT next_investigation_candidate_priority_score_check CHECK (priority_score >= 0::numeric AND priority_score <= 1::numeric),
  CONSTRAINT next_investigation_candidate_status_check CHECK (status = ANY (ARRAY['CANDIDATE'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_FOR_INVESTIGATION'::text, 'REJECTED'::text, 'COMPLETED'::text, 'ARCHIVED'::text])),
  CONSTRAINT next_investigation_candidate_target_relevance_check CHECK (target_relevance >= 0::numeric AND target_relevance <= 1::numeric),
  CONSTRAINT next_investigation_candidate_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT next_investigation_candidate_created_by_fkey FOREIGN KEY (created_by) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT next_investigation_candidate_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT next_investigation_candidate_knowledge_gap_id_fkey FOREIGN KEY (knowledge_gap_id) REFERENCES agriculture.knowledge_gap(knowledge_gap_id),
  CONSTRAINT next_investigation_candidate_primary_target_id_fkey FOREIGN KEY (primary_target_id) REFERENCES cognitive_core.target_registry(target_id),
  CONSTRAINT next_investigation_candidate_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT next_investigation_candidate_pkey PRIMARY KEY (next_investigation_candidate_id),
  CONSTRAINT next_investigation_candidate_candidate_code_key UNIQUE (candidate_code)
);
CREATE UNIQUE INDEX uq_next_investigation_gap_open ON cognitive_core.next_investigation_candidate USING btree (knowledge_gap_id) WHERE ((knowledge_gap_id IS NOT NULL) AND (status = ANY (ARRAY['CANDIDATE'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_FOR_INVESTIGATION'::text])));

-- owner: postgres
CREATE TABLE cognitive_core.node_cognitive_state (
  node_id uuid NOT NULL,
  belief_confidence numeric DEFAULT 0.5 NOT NULL,
  uncertainty numeric DEFAULT 1 NOT NULL,
  evidence_strength numeric DEFAULT 0 NOT NULL,
  evidence_diversity numeric DEFAULT 0 NOT NULL,
  replication_strength numeric DEFAULT 0 NOT NULL,
  context_fit numeric DEFAULT 0.5 NOT NULL,
  mechanism_support numeric DEFAULT 0 NOT NULL,
  contradiction_pressure numeric DEFAULT 0 NOT NULL,
  negative_learning_pressure numeric DEFAULT 0 NOT NULL,
  novelty numeric DEFAULT 0.5 NOT NULL,
  knowledge_gap_density numeric DEFAULT 0 NOT NULL,
  temporal_relevance numeric DEFAULT 1 NOT NULL,
  governance_readiness numeric DEFAULT 0 NOT NULL,
  cross_domain_relevance numeric DEFAULT 0 NOT NULL,
  information_gain_opportunity numeric DEFAULT 1 NOT NULL,
  anomaly_pressure numeric DEFAULT 0 NOT NULL,
  state_label text DEFAULT 'INSUFFICIENT_EVIDENCE'::text NOT NULL,
  explanation text DEFAULT 'No governed evidence has been assessed yet.'::text NOT NULL,
  next_evidence_needed jsonb DEFAULT '[]'::jsonb NOT NULL,
  algorithm_version text DEFAULT 'UCK-v1'::text NOT NULL,
  calculated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT node_cognitive_state_anomaly_pressure_check CHECK (anomaly_pressure >= 0::numeric AND anomaly_pressure <= 1::numeric),
  CONSTRAINT node_cognitive_state_belief_confidence_check CHECK (belief_confidence >= 0::numeric AND belief_confidence <= 1::numeric),
  CONSTRAINT node_cognitive_state_context_fit_check CHECK (context_fit >= 0::numeric AND context_fit <= 1::numeric),
  CONSTRAINT node_cognitive_state_contradiction_pressure_check CHECK (contradiction_pressure >= 0::numeric AND contradiction_pressure <= 1::numeric),
  CONSTRAINT node_cognitive_state_cross_domain_relevance_check CHECK (cross_domain_relevance >= 0::numeric AND cross_domain_relevance <= 1::numeric),
  CONSTRAINT node_cognitive_state_evidence_diversity_check CHECK (evidence_diversity >= 0::numeric AND evidence_diversity <= 1::numeric),
  CONSTRAINT node_cognitive_state_evidence_strength_check CHECK (evidence_strength >= 0::numeric AND evidence_strength <= 1::numeric),
  CONSTRAINT node_cognitive_state_governance_readiness_check CHECK (governance_readiness >= 0::numeric AND governance_readiness <= 1::numeric),
  CONSTRAINT node_cognitive_state_information_gain_opportunity_check CHECK (information_gain_opportunity >= 0::numeric AND information_gain_opportunity <= 1::numeric),
  CONSTRAINT node_cognitive_state_knowledge_gap_density_check CHECK (knowledge_gap_density >= 0::numeric AND knowledge_gap_density <= 1::numeric),
  CONSTRAINT node_cognitive_state_mechanism_support_check CHECK (mechanism_support >= 0::numeric AND mechanism_support <= 1::numeric),
  CONSTRAINT node_cognitive_state_negative_learning_pressure_check CHECK (negative_learning_pressure >= 0::numeric AND negative_learning_pressure <= 1::numeric),
  CONSTRAINT node_cognitive_state_novelty_check CHECK (novelty >= 0::numeric AND novelty <= 1::numeric),
  CONSTRAINT node_cognitive_state_replication_strength_check CHECK (replication_strength >= 0::numeric AND replication_strength <= 1::numeric),
  CONSTRAINT node_cognitive_state_temporal_relevance_check CHECK (temporal_relevance >= 0::numeric AND temporal_relevance <= 1::numeric),
  CONSTRAINT node_cognitive_state_uncertainty_check CHECK (uncertainty >= 0::numeric AND uncertainty <= 1::numeric),
  CONSTRAINT node_cognitive_state_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id) ON DELETE CASCADE,
  CONSTRAINT node_cognitive_state_pkey PRIMARY KEY (node_id)
);

-- owner: postgres
CREATE TABLE cognitive_core.node_evidence_signal (
  signal_id uuid DEFAULT gen_random_uuid() NOT NULL,
  node_id uuid NOT NULL,
  evidence_packet_id uuid,
  source_entity_type text NOT NULL,
  source_entity_id uuid,
  signal_direction text NOT NULL,
  evidence_quality numeric DEFAULT 0.5 NOT NULL,
  independence_weight numeric DEFAULT 0.5 NOT NULL,
  context_fit numeric DEFAULT 0.5 NOT NULL,
  temporal_relevance numeric DEFAULT 1 NOT NULL,
  mechanism_fit numeric DEFAULT 0.5 NOT NULL,
  governance_eligible boolean DEFAULT false NOT NULL,
  source_fingerprint text,
  source_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  recorded_by uuid,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT node_evidence_signal_context_fit_check CHECK (context_fit >= 0::numeric AND context_fit <= 1::numeric),
  CONSTRAINT node_evidence_signal_evidence_quality_check CHECK (evidence_quality >= 0::numeric AND evidence_quality <= 1::numeric),
  CONSTRAINT node_evidence_signal_independence_weight_check CHECK (independence_weight >= 0::numeric AND independence_weight <= 1::numeric),
  CONSTRAINT node_evidence_signal_mechanism_fit_check CHECK (mechanism_fit >= 0::numeric AND mechanism_fit <= 1::numeric),
  CONSTRAINT node_evidence_signal_signal_direction_check CHECK (signal_direction = ANY (ARRAY['SUPPORTS'::text, 'CONTRADICTS'::text, 'NEUTRAL'::text, 'NEGATIVE_LEARNING'::text])),
  CONSTRAINT node_evidence_signal_temporal_relevance_check CHECK (temporal_relevance >= 0::numeric AND temporal_relevance <= 1::numeric),
  CONSTRAINT node_evidence_signal_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT node_evidence_signal_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id) ON DELETE CASCADE,
  CONSTRAINT node_evidence_signal_pkey PRIMARY KEY (signal_id),
  CONSTRAINT node_evidence_signal_node_id_source_entity_type_source_enti_key UNIQUE (node_id, source_entity_type, source_entity_id, signal_direction)
);

-- owner: postgres
CREATE TABLE cognitive_core.node_target_link (
  node_id uuid NOT NULL,
  target_id uuid NOT NULL,
  alignment_strength numeric DEFAULT 0.5 NOT NULL,
  alignment_basis text DEFAULT 'EXPLICIT'::text NOT NULL,
  rationale text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT node_target_link_alignment_strength_check CHECK (alignment_strength >= 0::numeric AND alignment_strength <= 1::numeric),
  CONSTRAINT node_target_link_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id) ON DELETE CASCADE,
  CONSTRAINT node_target_link_target_id_fkey FOREIGN KEY (target_id) REFERENCES cognitive_core.target_registry(target_id) ON DELETE CASCADE,
  CONSTRAINT node_target_link_pkey PRIMARY KEY (node_id, target_id)
);

-- owner: postgres
CREATE TABLE cognitive_core.opportunity_target_link (
  transformation_opportunity_id uuid NOT NULL,
  target_id uuid NOT NULL,
  alignment_strength numeric DEFAULT 0.5 NOT NULL,
  contribution_type text DEFAULT 'POTENTIAL'::text NOT NULL,
  rationale text,
  CONSTRAINT opportunity_target_link_alignment_strength_check CHECK (alignment_strength >= '-1'::integer::numeric AND alignment_strength <= 1::numeric),
  CONSTRAINT opportunity_target_link_contribution_type_check CHECK (contribution_type = ANY (ARRAY['POTENTIAL'::text, 'SUPPORTS'::text, 'CONFLICTS'::text, 'NEUTRAL'::text])),
  CONSTRAINT opportunity_target_link_target_id_fkey FOREIGN KEY (target_id) REFERENCES cognitive_core.target_registry(target_id),
  CONSTRAINT opportunity_target_link_transformation_opportunity_id_fkey FOREIGN KEY (transformation_opportunity_id) REFERENCES cognitive_core.transformation_opportunity(transformation_opportunity_id) ON DELETE CASCADE,
  CONSTRAINT opportunity_target_link_pkey PRIMARY KEY (transformation_opportunity_id, target_id)
);

-- owner: postgres
CREATE TABLE cognitive_core.problem_signal (
  problem_signal_id uuid DEFAULT gen_random_uuid() NOT NULL,
  problem_code text NOT NULL,
  problem_type text NOT NULL,
  problem_statement text NOT NULL,
  domain_code text,
  country_workspace_id uuid,
  origin_type text NOT NULL,
  origin_actor_id uuid,
  origin_reference jsonb DEFAULT '{}'::jsonb NOT NULL,
  local_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  evidence_packet_id uuid,
  verification_status text DEFAULT 'UNVERIFIED'::text NOT NULL,
  lifecycle_status text DEFAULT 'OPEN'::text NOT NULL,
  node_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT problem_signal_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_ANALYSIS'::text, 'TRANSFORMED'::text, 'RESOLVED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT problem_signal_origin_type_check CHECK (origin_type = ANY (ARRAY['HUMAN'::text, 'COMMUNITY'::text, 'INSTITUTION'::text, 'GOVERNMENT'::text, 'DATASET'::text, 'SENSOR'::text, 'COUNTRY_SCAN'::text, 'AAB_DETECTION'::text, 'IMPORT'::text, 'OTHER'::text])),
  CONSTRAINT problem_signal_verification_status_check CHECK (verification_status = ANY (ARRAY['UNVERIFIED'::text, 'PARTIALLY_VERIFIED'::text, 'VERIFIED'::text, 'REJECTED'::text])),
  CONSTRAINT problem_signal_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT problem_signal_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT problem_signal_evidence_packet_id_fkey FOREIGN KEY (evidence_packet_id) REFERENCES agriculture.evidence_packet(evidence_packet_id),
  CONSTRAINT problem_signal_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT problem_signal_pkey PRIMARY KEY (problem_signal_id),
  CONSTRAINT problem_signal_node_id_key UNIQUE (node_id),
  CONSTRAINT problem_signal_problem_code_key UNIQUE (problem_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.reassessment_queue (
  reassessment_id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_node_id uuid NOT NULL,
  affected_node_id uuid NOT NULL,
  reason text NOT NULL,
  severity text DEFAULT 'MODERATE'::text NOT NULL,
  status text DEFAULT 'OPEN'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reassessment_queue_severity_check CHECK (severity = ANY (ARRAY['LOW'::text, 'MODERATE'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT reassessment_queue_status_check CHECK (status = ANY (ARRAY['OPEN'::text, 'REVIEWED'::text, 'DISMISSED'::text, 'RESOLVED'::text])),
  CONSTRAINT reassessment_queue_affected_node_id_fkey FOREIGN KEY (affected_node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT reassessment_queue_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT reassessment_queue_pkey PRIMARY KEY (reassessment_id),
  CONSTRAINT reassessment_queue_source_node_id_affected_node_id_status_key UNIQUE (source_node_id, affected_node_id, status)
);

-- owner: postgres
CREATE TABLE cognitive_core.target_registry (
  target_id uuid DEFAULT gen_random_uuid() NOT NULL,
  target_code text NOT NULL,
  target_scope text NOT NULL,
  target_type text NOT NULL,
  target_label text NOT NULL,
  target_description text,
  domain_code text,
  country_workspace_id uuid,
  source_object_type text,
  source_object_id uuid,
  node_id uuid NOT NULL,
  priority_weight numeric DEFAULT 0.5 NOT NULL,
  lifecycle_status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT target_registry_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'ACHIEVED'::text, 'RETIRED'::text, 'ARCHIVED'::text])),
  CONSTRAINT target_registry_priority_weight_check CHECK (priority_weight >= 0::numeric AND priority_weight <= 1::numeric),
  CONSTRAINT target_registry_target_scope_check CHECK (target_scope = ANY (ARRAY['GLOBAL'::text, 'COUNTRY'::text, 'DOMAIN'::text, 'LOCAL_PROBLEM'::text])),
  CONSTRAINT target_registry_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id),
  CONSTRAINT target_registry_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT target_registry_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT target_registry_pkey PRIMARY KEY (target_id),
  CONSTRAINT target_registry_node_id_key UNIQUE (node_id),
  CONSTRAINT target_registry_target_code_key UNIQUE (target_code)
);

-- owner: postgres
CREATE TABLE cognitive_core.transformation_opportunity (
  transformation_opportunity_id uuid DEFAULT gen_random_uuid() NOT NULL,
  opportunity_code text NOT NULL,
  source_problem_signal_id uuid NOT NULL,
  opportunity_question text DEFAULT 'Can this problem become a resource, mechanism, process, material, learning asset or discovery opportunity?'::text NOT NULL,
  opportunity_type text NOT NULL,
  opportunity_summary text NOT NULL,
  scientific_resource_hypothesis text,
  novelty_mode text DEFAULT 'UNASSESSED'::text NOT NULL,
  evidence_strength numeric DEFAULT 0 NOT NULL,
  uncertainty numeric DEFAULT 1 NOT NULL,
  environmental_value numeric DEFAULT 0 NOT NULL,
  economic_value numeric DEFAULT 0 NOT NULL,
  scientific_value numeric DEFAULT 0.5 NOT NULL,
  feasibility numeric DEFAULT 0.5 NOT NULL,
  regulatory_uncertainty numeric DEFAULT 1 NOT NULL,
  safety_uncertainty numeric DEFAULT 1 NOT NULL,
  expected_information_gain numeric DEFAULT 1 NOT NULL,
  objective_conflict_pressure numeric DEFAULT 0 NOT NULL,
  next_best_action text,
  status text DEFAULT 'CANDIDATE'::text NOT NULL,
  scientist_review_required boolean DEFAULT true NOT NULL,
  autonomous_execution_allowed boolean DEFAULT false NOT NULL,
  node_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT transformation_opportunity_economic_value_check CHECK (economic_value >= 0::numeric AND economic_value <= 1::numeric),
  CONSTRAINT transformation_opportunity_environmental_value_check CHECK (environmental_value >= 0::numeric AND environmental_value <= 1::numeric),
  CONSTRAINT transformation_opportunity_evidence_strength_check CHECK (evidence_strength >= 0::numeric AND evidence_strength <= 1::numeric),
  CONSTRAINT transformation_opportunity_expected_information_gain_check CHECK (expected_information_gain >= 0::numeric AND expected_information_gain <= 1::numeric),
  CONSTRAINT transformation_opportunity_feasibility_check CHECK (feasibility >= 0::numeric AND feasibility <= 1::numeric),
  CONSTRAINT transformation_opportunity_novelty_mode_check CHECK (novelty_mode = ANY (ARRAY['UNASSESSED'::text, 'KNOWN'::text, 'NOVEL_COMBINATION'::text, 'NOVEL_INGREDIENT'::text, 'NOVEL_PROCESS'::text, 'NOVEL_MECHANISM'::text])),
  CONSTRAINT transformation_opportunity_objective_conflict_pressure_check CHECK (objective_conflict_pressure >= 0::numeric AND objective_conflict_pressure <= 1::numeric),
  CONSTRAINT transformation_opportunity_opportunity_type_check CHECK (opportunity_type = ANY (ARRAY['RESOURCE'::text, 'INGREDIENT'::text, 'FORMULATION'::text, 'PROCESS'::text, 'MECHANISM'::text, 'ENVIRONMENTAL_INTERVENTION'::text, 'RESEARCH'::text, 'NEGATIVE_LEARNING'::text, 'CROSS_DOMAIN'::text, 'OTHER'::text])),
  CONSTRAINT transformation_opportunity_regulatory_uncertainty_check CHECK (regulatory_uncertainty >= 0::numeric AND regulatory_uncertainty <= 1::numeric),
  CONSTRAINT transformation_opportunity_safety_uncertainty_check CHECK (safety_uncertainty >= 0::numeric AND safety_uncertainty <= 1::numeric),
  CONSTRAINT transformation_opportunity_scientific_value_check CHECK (scientific_value >= 0::numeric AND scientific_value <= 1::numeric),
  CONSTRAINT transformation_opportunity_status_check CHECK (status = ANY (ARRAY['CANDIDATE'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_FOR_INVESTIGATION'::text, 'REJECTED'::text, 'TESTED'::text, 'ARCHIVED'::text])),
  CONSTRAINT transformation_opportunity_uncertainty_check CHECK (uncertainty >= 0::numeric AND uncertainty <= 1::numeric),
  CONSTRAINT transformation_opportunity_node_id_fkey FOREIGN KEY (node_id) REFERENCES cognitive_core.intelligent_node(node_id),
  CONSTRAINT transformation_opportunity_source_problem_signal_id_fkey FOREIGN KEY (source_problem_signal_id) REFERENCES cognitive_core.problem_signal(problem_signal_id),
  CONSTRAINT transformation_opportunity_pkey PRIMARY KEY (transformation_opportunity_id),
  CONSTRAINT transformation_opportunity_node_id_key UNIQUE (node_id),
  CONSTRAINT transformation_opportunity_opportunity_code_key UNIQUE (opportunity_code)
);
