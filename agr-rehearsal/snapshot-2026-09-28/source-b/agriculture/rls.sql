-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: agriculture. Row level security: the enabled/forced setting of every table, and every policy.
-- Catalog counts for agriculture: functions 170, tables 121, views 65, rls_enabled_tables 121, constraints 998, triggers 80, policies 0, indexes 334.
-- Evidence of what exists, not governed code. Never edited after commit.

-- agriculture.aab_domain_classification: row level security ENABLED
ALTER TABLE agriculture.aab_domain_classification ENABLE ROW LEVEL SECURITY;
-- agriculture.access_profile: row level security ENABLED
ALTER TABLE agriculture.access_profile ENABLE ROW LEVEL SECURITY;
-- agriculture.actor: row level security ENABLED
ALTER TABLE agriculture.actor ENABLE ROW LEVEL SECURITY;
-- agriculture.actor_access_assignment: row level security ENABLED
ALTER TABLE agriculture.actor_access_assignment ENABLE ROW LEVEL SECURITY;
-- agriculture.actor_authority: row level security ENABLED
ALTER TABLE agriculture.actor_authority ENABLE ROW LEVEL SECURITY;
-- agriculture.agricultural_problem: row level security ENABLED
ALTER TABLE agriculture.agricultural_problem ENABLE ROW LEVEL SECURITY;
-- agriculture.anomaly_detection_event: row level security ENABLED
ALTER TABLE agriculture.anomaly_detection_event ENABLE ROW LEVEL SECURITY;
-- agriculture.application_event: row level security ENABLED
ALTER TABLE agriculture.application_event ENABLE ROW LEVEL SECURITY;
-- agriculture.application_gateway_contract: row level security ENABLED
ALTER TABLE agriculture.application_gateway_contract ENABLE ROW LEVEL SECURITY;
-- agriculture.approved_learning: row level security ENABLED
ALTER TABLE agriculture.approved_learning ENABLE ROW LEVEL SECURITY;
-- agriculture.audit_event: row level security ENABLED
ALTER TABLE agriculture.audit_event ENABLE ROW LEVEL SECURITY;
-- agriculture.authority_role: row level security ENABLED
ALTER TABLE agriculture.authority_role ENABLE ROW LEVEL SECURITY;
-- agriculture.brain_evidence_eligibility: row level security ENABLED
ALTER TABLE agriculture.brain_evidence_eligibility ENABLE ROW LEVEL SECURITY;
-- agriculture.contradiction_record: row level security ENABLED
ALTER TABLE agriculture.contradiction_record ENABLE ROW LEVEL SECURITY;
-- agriculture.country_intelligence_settings: row level security ENABLED
ALTER TABLE agriculture.country_intelligence_settings ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_candidate: row level security ENABLED
ALTER TABLE agriculture.country_resource_candidate ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_domain_relevance: row level security ENABLED
ALTER TABLE agriculture.country_resource_domain_relevance ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_investigation: row level security ENABLED
ALTER TABLE agriculture.country_resource_investigation ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_investigation_decision: row level security ENABLED
ALTER TABLE agriculture.country_resource_investigation_decision ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_investigation_evidence: row level security ENABLED
ALTER TABLE agriculture.country_resource_investigation_evidence ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_investigation_measurement: row level security ENABLED
ALTER TABLE agriculture.country_resource_investigation_measurement ENABLE ROW LEVEL SECURITY;
-- agriculture.country_resource_investigation_observation: row level security ENABLED
ALTER TABLE agriculture.country_resource_investigation_observation ENABLE ROW LEVEL SECURITY;
-- agriculture.country_scope: row level security ENABLED
ALTER TABLE agriculture.country_scope ENABLE ROW LEVEL SECURITY;
-- agriculture.crop: row level security ENABLED
ALTER TABLE agriculture.crop ENABLE ROW LEVEL SECURITY;
-- agriculture.data_integrity_rule: row level security ENABLED
ALTER TABLE agriculture.data_integrity_rule ENABLE ROW LEVEL SECURITY;
-- agriculture.data_quality_assessment: row level security ENABLED
ALTER TABLE agriculture.data_quality_assessment ENABLE ROW LEVEL SECURITY;
-- agriculture.data_quality_flag: row level security ENABLED
ALTER TABLE agriculture.data_quality_flag ENABLE ROW LEVEL SECURITY;
-- agriculture.discovery_candidate: row level security ENABLED
ALTER TABLE agriculture.discovery_candidate ENABLE ROW LEVEL SECURITY;
-- agriculture.discovery_candidate_evidence: row level security ENABLED
ALTER TABLE agriculture.discovery_candidate_evidence ENABLE ROW LEVEL SECURITY;
-- agriculture.discovery_promotion_event: row level security ENABLED
ALTER TABLE agriculture.discovery_promotion_event ENABLE ROW LEVEL SECURITY;
-- agriculture.discovery_review: row level security ENABLED
ALTER TABLE agriculture.discovery_review ENABLE ROW LEVEL SECURITY;
-- agriculture.discovery_signal: row level security ENABLED
ALTER TABLE agriculture.discovery_signal ENABLE ROW LEVEL SECURITY;
-- agriculture.duplicate_detection_event: row level security ENABLED
ALTER TABLE agriculture.duplicate_detection_event ENABLE ROW LEVEL SECURITY;
-- agriculture.entity_correction: row level security ENABLED
ALTER TABLE agriculture.entity_correction ENABLE ROW LEVEL SECURITY;
-- agriculture.entity_version: row level security ENABLED
ALTER TABLE agriculture.entity_version ENABLE ROW LEVEL SECURITY;
-- agriculture.environmental_burden_profile: row level security ENABLED
ALTER TABLE agriculture.environmental_burden_profile ENABLE ROW LEVEL SECURITY;
-- agriculture.environmental_recovery_outcome: row level security ENABLED
ALTER TABLE agriculture.environmental_recovery_outcome ENABLE ROW LEVEL SECURITY;
-- agriculture.evidence_packet: row level security ENABLED
ALTER TABLE agriculture.evidence_packet ENABLE ROW LEVEL SECURITY;
-- agriculture.evidence_packet_item: row level security ENABLED
ALTER TABLE agriculture.evidence_packet_item ENABLE ROW LEVEL SECURITY;
-- agriculture.evidence_source: row level security ENABLED
ALTER TABLE agriculture.evidence_source ENABLE ROW LEVEL SECURITY;
-- agriculture.farm: row level security ENABLED
ALTER TABLE agriculture.farm ENABLE ROW LEVEL SECURITY;
-- agriculture.field_round_event: row level security ENABLED
ALTER TABLE agriculture.field_round_event ENABLE ROW LEVEL SECURITY;
-- agriculture.formulation_candidate: row level security ENABLED
ALTER TABLE agriculture.formulation_candidate ENABLE ROW LEVEL SECURITY;
-- agriculture.formulation_request: row level security ENABLED
ALTER TABLE agriculture.formulation_request ENABLE ROW LEVEL SECURITY;
-- agriculture.formulation_version: row level security ENABLED
ALTER TABLE agriculture.formulation_version ENABLE ROW LEVEL SECURITY;
-- agriculture.formulation_version_ingredient_line: row level security ENABLED
ALTER TABLE agriculture.formulation_version_ingredient_line ENABLE ROW LEVEL SECURITY;
-- agriculture.governance_decision: row level security ENABLED
ALTER TABLE agriculture.governance_decision ENABLE ROW LEVEL SECURITY;
-- agriculture.governance_review: row level security ENABLED
ALTER TABLE agriculture.governance_review ENABLE ROW LEVEL SECURITY;
-- agriculture.governance_transition_log: row level security ENABLED
ALTER TABLE agriculture.governance_transition_log ENABLE ROW LEVEL SECURITY;
-- agriculture.hypothesis: row level security ENABLED
ALTER TABLE agriculture.hypothesis ENABLE ROW LEVEL SECURITY;
-- agriculture.ingredient: row level security ENABLED
ALTER TABLE agriculture.ingredient ENABLE ROW LEVEL SECURITY;
-- agriculture.ingredient_alias: row level security ENABLED
ALTER TABLE agriculture.ingredient_alias ENABLE ROW LEVEL SECURITY;
-- agriculture.ingredient_evidence: row level security ENABLED
ALTER TABLE agriculture.ingredient_evidence ENABLE ROW LEVEL SECURITY;
-- agriculture.ingredient_version: row level security ENABLED
ALTER TABLE agriculture.ingredient_version ENABLE ROW LEVEL SECURITY;
-- agriculture.input_submission: row level security ENABLED
ALTER TABLE agriculture.input_submission ENABLE ROW LEVEL SECURITY;
-- agriculture.input_validation_event: row level security ENABLED
ALTER TABLE agriculture.input_validation_event ENABLE ROW LEVEL SECURITY;
-- agriculture.input_validation_result: row level security ENABLED
ALTER TABLE agriculture.input_validation_result ENABLE ROW LEVEL SECURITY;
-- agriculture.input_validation_run: row level security ENABLED
ALTER TABLE agriculture.input_validation_run ENABLE ROW LEVEL SECURITY;
-- agriculture.instrument: row level security ENABLED
ALTER TABLE agriculture.instrument ENABLE ROW LEVEL SECURITY;
-- agriculture.instrument_calibration: row level security ENABLED
ALTER TABLE agriculture.instrument_calibration ENABLE ROW LEVEL SECURITY;
-- agriculture.integration_checkpoint: row level security ENABLED
ALTER TABLE agriculture.integration_checkpoint ENABLE ROW LEVEL SECURITY;
-- agriculture.integrity_check_result: row level security ENABLED
ALTER TABLE agriculture.integrity_check_result ENABLE ROW LEVEL SECURITY;
-- agriculture.integrity_check_run: row level security ENABLED
ALTER TABLE agriculture.integrity_check_run ENABLE ROW LEVEL SECURITY;
-- agriculture.knowledge_gap: row level security ENABLED
ALTER TABLE agriculture.knowledge_gap ENABLE ROW LEVEL SECURITY;
-- agriculture.learning_candidate: row level security ENABLED
ALTER TABLE agriculture.learning_candidate ENABLE ROW LEVEL SECURITY;
-- agriculture.location: row level security ENABLED
ALTER TABLE agriculture.location ENABLE ROW LEVEL SECURITY;
-- agriculture.measurement: row level security ENABLED
ALTER TABLE agriculture.measurement ENABLE ROW LEVEL SECURITY;
-- agriculture.measurement_method: row level security ENABLED
ALTER TABLE agriculture.measurement_method ENABLE ROW LEVEL SECURITY;
-- agriculture.mechanism_hypothesis: row level security ENABLED
ALTER TABLE agriculture.mechanism_hypothesis ENABLE ROW LEVEL SECURITY;
-- agriculture.memory_evidence_link: row level security ENABLED
ALTER TABLE agriculture.memory_evidence_link ENABLE ROW LEVEL SECURITY;
-- agriculture.metric_definition: row level security ENABLED
ALTER TABLE agriculture.metric_definition ENABLE ROW LEVEL SECURITY;
-- agriculture.metric_enum_option: row level security ENABLED
ALTER TABLE agriculture.metric_enum_option ENABLE ROW LEVEL SECURITY;
-- agriculture.negative_learning_register: row level security ENABLED
ALTER TABLE agriculture.negative_learning_register ENABLE ROW LEVEL SECURITY;
-- agriculture.observation: row level security ENABLED
ALTER TABLE agriculture.observation ENABLE ROW LEVEL SECURITY;
-- agriculture.observation_template: row level security ENABLED
ALTER TABLE agriculture.observation_template ENABLE ROW LEVEL SECURITY;
-- agriculture.observation_template_metric: row level security ENABLED
ALTER TABLE agriculture.observation_template_metric ENABLE ROW LEVEL SECURITY;
-- agriculture.observation_template_version: row level security ENABLED
ALTER TABLE agriculture.observation_template_version ENABLE ROW LEVEL SECURITY;
-- agriculture.operation_failure_event: row level security ENABLED
ALTER TABLE agriculture.operation_failure_event ENABLE ROW LEVEL SECURITY;
-- agriculture.operation_run: row level security ENABLED
ALTER TABLE agriculture.operation_run ENABLE ROW LEVEL SECURITY;
-- agriculture.opportunity_dimension: row level security ENABLED
ALTER TABLE agriculture.opportunity_dimension ENABLE ROW LEVEL SECURITY;
-- agriculture.opportunity_profile: row level security ENABLED
ALTER TABLE agriculture.opportunity_profile ENABLE ROW LEVEL SECURITY;
-- agriculture.organization: row level security ENABLED
ALTER TABLE agriculture.organization ENABLE ROW LEVEL SECURITY;
-- agriculture.outcome: row level security ENABLED
ALTER TABLE agriculture.outcome ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_analysis: row level security ENABLED
ALTER TABLE agriculture.photo_analysis ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_annotation: row level security ENABLED
ALTER TABLE agriculture.photo_annotation ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_capture_requirement: row level security ENABLED
ALTER TABLE agriculture.photo_capture_requirement ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_comparison_member: row level security ENABLED
ALTER TABLE agriculture.photo_comparison_member ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_comparison_set: row level security ENABLED
ALTER TABLE agriculture.photo_comparison_set ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_evidence: row level security ENABLED
ALTER TABLE agriculture.photo_evidence ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_intelligence_finding: row level security ENABLED
ALTER TABLE agriculture.photo_intelligence_finding ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_review: row level security ENABLED
ALTER TABLE agriculture.photo_review ENABLE ROW LEVEL SECURITY;
-- agriculture.photo_validation_result: row level security ENABLED
ALTER TABLE agriculture.photo_validation_result ENABLE ROW LEVEL SECURITY;
-- agriculture.plot: row level security ENABLED
ALTER TABLE agriculture.plot ENABLE ROW LEVEL SECURITY;
-- agriculture.provenance_assertion: row level security ENABLED
ALTER TABLE agriculture.provenance_assertion ENABLE ROW LEVEL SECURITY;
-- agriculture.quarantined_record: row level security ENABLED
ALTER TABLE agriculture.quarantined_record ENABLE ROW LEVEL SECURITY;
-- agriculture.reasoning_finding: row level security ENABLED
ALTER TABLE agriculture.reasoning_finding ENABLE ROW LEVEL SECURITY;
-- agriculture.reasoning_run: row level security ENABLED
ALTER TABLE agriculture.reasoning_run ENABLE ROW LEVEL SECURITY;
-- agriculture.reconciliation_item: row level security ENABLED
ALTER TABLE agriculture.reconciliation_item ENABLE ROW LEVEL SECURITY;
-- agriculture.reconciliation_run: row level security ENABLED
ALTER TABLE agriculture.reconciliation_run ENABLE ROW LEVEL SECURITY;
-- agriculture.record_governance_state: row level security ENABLED
ALTER TABLE agriculture.record_governance_state ENABLE ROW LEVEL SECURITY;
-- agriculture.request_context: row level security ENABLED
ALTER TABLE agriculture.request_context ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_discovery_assessment: row level security ENABLED
ALTER TABLE agriculture.resource_discovery_assessment ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_discovery_brain_contribution: row level security ENABLED
ALTER TABLE agriculture.resource_discovery_brain_contribution ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_discovery_bridge: row level security ENABLED
ALTER TABLE agriculture.resource_discovery_bridge ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_discovery_priority: row level security ENABLED
ALTER TABLE agriculture.resource_discovery_priority ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_discovery_run: row level security ENABLED
ALTER TABLE agriculture.resource_discovery_run ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_discovery_scientist_review: row level security ENABLED
ALTER TABLE agriculture.resource_discovery_scientist_review ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_recovery_pathway: row level security ENABLED
ALTER TABLE agriculture.resource_recovery_pathway ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_safety_ecology_gate: row level security ENABLED
ALTER TABLE agriculture.resource_safety_ecology_gate ENABLE ROW LEVEL SECURITY;
-- agriculture.resource_waste_stream: row level security ENABLED
ALTER TABLE agriculture.resource_waste_stream ENABLE ROW LEVEL SECURITY;
-- agriculture.schema_migration: row level security ENABLED
ALTER TABLE agriculture.schema_migration ENABLE ROW LEVEL SECURITY;
-- agriculture.scientific_memory_entry: row level security ENABLED
ALTER TABLE agriculture.scientific_memory_entry ENABLE ROW LEVEL SECURITY;
-- agriculture.source_object: row level security ENABLED
ALTER TABLE agriculture.source_object ENABLE ROW LEVEL SECURITY;
-- agriculture.source_record_reference: row level security ENABLED
ALTER TABLE agriculture.source_record_reference ENABLE ROW LEVEL SECURITY;
-- agriculture.source_system: row level security ENABLED
ALTER TABLE agriculture.source_system ENABLE ROW LEVEL SECURITY;
-- agriculture.trial: row level security ENABLED
ALTER TABLE agriculture.trial ENABLE ROW LEVEL SECURITY;
-- agriculture.trial_activation_handoff: row level security ENABLED
ALTER TABLE agriculture.trial_activation_handoff ENABLE ROW LEVEL SECURITY;
-- agriculture.trial_protocol_binding: row level security ENABLED
ALTER TABLE agriculture.trial_protocol_binding ENABLE ROW LEVEL SECURITY;
-- agriculture.validation_rule: row level security ENABLED
ALTER TABLE agriculture.validation_rule ENABLE ROW LEVEL SECURITY;
-- agriculture.variety: row level security ENABLED
ALTER TABLE agriculture.variety ENABLE ROW LEVEL SECURITY;
-- agriculture.workbench_trial_handoff: row level security ENABLED
ALTER TABLE agriculture.workbench_trial_handoff ENABLE ROW LEVEL SECURITY;
