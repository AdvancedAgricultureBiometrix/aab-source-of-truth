-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: cognitive_core. Grants: schema, table, sequence, column and function privileges, and default privileges.
-- Catalog counts for cognitive_core: functions 25, tables 18, views 1, sequences 0, rls_enabled_tables 0, constraints 157, triggers 0, policies 0, indexes 39.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema cognitive_core owner: postgres
-- cognitive_core.algorithm_registry: relacl is NULL (owner default privileges only)
-- cognitive_core.brain_registry: relacl is NULL (owner default privileges only)
-- cognitive_core.cognitive_loop_run: relacl is NULL (owner default privileges only)
-- cognitive_core.domain_brain_inheritance: relacl is NULL (owner default privileges only)
-- cognitive_core.ingredient_build_candidate: relacl is NULL (owner default privileges only)
-- cognitive_core.ingredient_candidate_component: relacl is NULL (owner default privileges only)
-- cognitive_core.intelligence_activity_event: relacl is NULL (owner default privileges only)
-- cognitive_core.intelligent_node: relacl is NULL (owner default privileges only)
-- cognitive_core.intelligent_relationship: relacl is NULL (owner default privileges only)
-- cognitive_core.next_investigation_candidate: relacl is NULL (owner default privileges only)
-- cognitive_core.node_cognitive_state: relacl is NULL (owner default privileges only)
-- cognitive_core.node_evidence_signal: relacl is NULL (owner default privileges only)
-- cognitive_core.node_target_link: relacl is NULL (owner default privileges only)
-- cognitive_core.opportunity_target_link: relacl is NULL (owner default privileges only)
-- cognitive_core.problem_signal: relacl is NULL (owner default privileges only)
-- cognitive_core.reassessment_queue: relacl is NULL (owner default privileges only)
-- cognitive_core.target_registry: relacl is NULL (owner default privileges only)
-- cognitive_core.transformation_opportunity: relacl is NULL (owner default privileges only)
-- cognitive_core.v_cognitive_foundation: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION cognitive_core.api_begin_intelligence_activity(p_domain_code text, p_activity_scope text, p_component_code text, p_component_label text, p_activity_type text, p_headline text, p_trigger_entity_type text, p_trigger_entity_id uuid, p_trigger_label text, p_detail jsonb, p_actor_id uuid, p_country_workspace_id uuid, p_correlation_id uuid, p_parent_event_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_begin_intelligence_activity(p_domain_code text, p_activity_scope text, p_component_code text, p_component_label text, p_activity_type text, p_headline text, p_trigger_entity_type text, p_trigger_entity_id uuid, p_trigger_label text, p_detail jsonb, p_actor_id uuid, p_country_workspace_id uuid, p_correlation_id uuid, p_parent_event_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_compute_node_state(p_node_id uuid, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_compute_node_state(p_node_id uuid, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_create_transformation_opportunity(p_problem_signal_id uuid, p_opportunity_type text, p_summary text, p_resource_hypothesis text, p_novelty_mode text, p_environmental_value numeric, p_economic_value numeric, p_scientific_value numeric, p_feasibility numeric, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_create_transformation_opportunity(p_problem_signal_id uuid, p_opportunity_type text, p_summary text, p_resource_hypothesis text, p_novelty_mode text, p_environmental_value numeric, p_economic_value numeric, p_scientific_value numeric, p_feasibility numeric, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_finish_intelligence_activity(p_activity_event_id uuid, p_status text, p_headline text, p_detail jsonb, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_finish_intelligence_activity(p_activity_event_id uuid, p_status text, p_headline text, p_detail jsonb, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_agriculture_cognitive_loop_workspace(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_agriculture_cognitive_loop_workspace(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_foundation_workspace(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_foundation_workspace(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_intelligence_activity_timeline(p_domain_code text, p_actor_id uuid, p_limit integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_intelligence_activity_timeline(p_domain_code text, p_actor_id uuid, p_limit integer) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_live_intelligence_surface(p_domain_code text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_get_live_intelligence_surface(p_domain_code text, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_propagate_reassessment(p_source_node_id uuid, p_reason text, p_severity text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_propagate_reassessment(p_source_node_id uuid, p_reason text, p_severity text) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_propose_ingredient_candidate(p_opportunity_id uuid, p_candidate_name text, p_novelty_mode text, p_candidate_concept text, p_composition_plan jsonb, p_process_plan jsonb, p_target_mechanisms jsonb, p_predicted_functions jsonb, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_propose_ingredient_candidate(p_opportunity_id uuid, p_candidate_name text, p_novelty_mode text, p_candidate_concept text, p_composition_plan jsonb, p_process_plan jsonb, p_target_mechanisms jsonb, p_predicted_functions jsonb, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_record_completed_intelligence_activity(p_domain_code text, p_activity_scope text, p_component_code text, p_component_label text, p_activity_type text, p_headline text, p_trigger_entity_type text, p_trigger_entity_id uuid, p_trigger_label text, p_detail jsonb, p_actor_id uuid, p_country_workspace_id uuid, p_correlation_id uuid, p_parent_event_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_record_completed_intelligence_activity(p_domain_code text, p_activity_scope text, p_component_code text, p_component_label text, p_activity_type text, p_headline text, p_trigger_entity_type text, p_trigger_entity_id uuid, p_trigger_label text, p_detail jsonb, p_actor_id uuid, p_country_workspace_id uuid, p_correlation_id uuid, p_parent_event_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_run_agriculture_cognitive_loop(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_run_agriculture_cognitive_loop(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_submit_problem_signal(p_problem_type text, p_problem_statement text, p_domain_code text, p_country_workspace_id uuid, p_origin_type text, p_origin_reference jsonb, p_local_context jsonb, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_submit_problem_signal(p_problem_type text, p_problem_statement text, p_domain_code text, p_country_workspace_id uuid, p_origin_type text, p_origin_reference jsonb, p_local_context jsonb, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_submit_problem_signal_guarded(p_problem_type text, p_problem_statement text, p_domain_code text, p_country_workspace_id uuid, p_origin_type text, p_origin_reference jsonb, p_local_context jsonb, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_submit_problem_signal_guarded(p_problem_type text, p_problem_statement text, p_domain_code text, p_country_workspace_id uuid, p_origin_type text, p_origin_reference jsonb, p_local_context jsonb, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_sync_agriculture_cognitive_loop(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_sync_agriculture_cognitive_loop(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_sync_agriculture_observation_nodes(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_sync_agriculture_observation_nodes(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_sync_country_objectives(p_country_workspace_id uuid, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_sync_country_objectives(p_country_workspace_id uuid, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_agriculture_cognitive_loop_e2e(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_agriculture_cognitive_loop_e2e(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_agriculture_full_scientific_learning_loop_e2e() TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_agriculture_full_scientific_learning_loop_e2e() TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_live_intelligence_surface(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_live_intelligence_surface(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_universal_cognitive_kernel_e2e() TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.api_validate_universal_cognitive_kernel_e2e() TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.ensure_agriculture_node(p_node_type text, p_label text, p_description text, p_subject_entity_type text, p_subject_entity_id uuid, p_country_workspace_id uuid, p_governance_status text, p_actor_id uuid, p_provenance_payload jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.ensure_agriculture_node(p_node_type text, p_label text, p_description text, p_subject_entity_type text, p_subject_entity_id uuid, p_country_workspace_id uuid, p_governance_status text, p_actor_id uuid, p_provenance_payload jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.ensure_relationship(p_source_node_id uuid, p_target_node_id uuid, p_relationship_type text, p_semantic_strength numeric, p_confidence numeric, p_evidence_packet_id uuid, p_country_workspace_id uuid, p_governance_status text, p_uncertainty_summary text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.ensure_relationship(p_source_node_id uuid, p_target_node_id uuid, p_relationship_type text, p_semantic_strength numeric, p_confidence numeric, p_evidence_packet_id uuid, p_country_workspace_id uuid, p_governance_status text, p_uncertainty_summary text, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.interpret_node_state(p_state jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.interpret_node_state(p_state jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION cognitive_core.score_context_fit(p_a jsonb, p_b jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cognitive_core.score_context_fit(p_a jsonb, p_b jsonb) TO postgres;
