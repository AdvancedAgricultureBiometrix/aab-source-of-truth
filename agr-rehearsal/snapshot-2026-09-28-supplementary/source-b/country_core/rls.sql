-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: country_core. Row level security: the enabled/forced setting of every table, and every policy.
-- Catalog counts for country_core: functions 41, tables 72, views 9, sequences 0, rls_enabled_tables 71, constraints 427, triggers 0, policies 0, indexes 147.
-- Evidence of what exists, not governed code. Never edited after commit.

-- country_core.action_item: row level security ENABLED
ALTER TABLE country_core.action_item ENABLE ROW LEVEL SECURITY;
-- country_core.asset_ownership: row level security ENABLED
ALTER TABLE country_core.asset_ownership ENABLE ROW LEVEL SECURITY;
-- country_core.bootstrap_scan_brain_event: row level security ENABLED
ALTER TABLE country_core.bootstrap_scan_brain_event ENABLE ROW LEVEL SECURITY;
-- country_core.bootstrap_scan_finding: row level security ENABLED
ALTER TABLE country_core.bootstrap_scan_finding ENABLE ROW LEVEL SECURITY;
-- country_core.bootstrap_scan_run: row level security ENABLED
ALTER TABLE country_core.bootstrap_scan_run ENABLE ROW LEVEL SECURITY;
-- country_core.bootstrap_source_adapter: row level security ENABLED
ALTER TABLE country_core.bootstrap_source_adapter ENABLE ROW LEVEL SECURITY;
-- country_core.country_activation: row level security ENABLED
ALTER TABLE country_core.country_activation ENABLE ROW LEVEL SECURITY;
-- country_core.country_brain_registry: row level security ENABLED
ALTER TABLE country_core.country_brain_registry ENABLE ROW LEVEL SECURITY;
-- country_core.country_discovery_recipe: row level security ENABLED
ALTER TABLE country_core.country_discovery_recipe ENABLE ROW LEVEL SECURITY;
-- country_core.country_economic_baseline: row level security ENABLED
ALTER TABLE country_core.country_economic_baseline ENABLE ROW LEVEL SECURITY;
-- country_core.country_economic_fact: row level security ENABLED
ALTER TABLE country_core.country_economic_fact ENABLE ROW LEVEL SECURITY;
-- country_core.country_ingredient_availability: row level security ENABLED
ALTER TABLE country_core.country_ingredient_availability ENABLE ROW LEVEL SECURITY;
-- country_core.country_intelligence_brief: row level security ENABLED
ALTER TABLE country_core.country_intelligence_brief ENABLE ROW LEVEL SECURITY;
-- country_core.country_invitation: row level security ENABLED
ALTER TABLE country_core.country_invitation ENABLE ROW LEVEL SECURITY;
-- country_core.country_recommendation: row level security ENABLED
ALTER TABLE country_core.country_recommendation ENABLE ROW LEVEL SECURITY;
-- country_core.country_recovery_contact: row level security ENABLED
ALTER TABLE country_core.country_recovery_contact ENABLE ROW LEVEL SECURITY;
-- country_core.country_resource_investigation_execution_policy: row level security ENABLED
ALTER TABLE country_core.country_resource_investigation_execution_policy ENABLE ROW LEVEL SECURITY;
-- country_core.country_scan_execution_policy: row level security ENABLED
ALTER TABLE country_core.country_scan_execution_policy ENABLE ROW LEVEL SECURITY;
-- country_core.country_scan_knowledge_definition: row level security ENABLED
ALTER TABLE country_core.country_scan_knowledge_definition ENABLE ROW LEVEL SECURITY;
-- country_core.country_scan_profile: row level security ENABLED
ALTER TABLE country_core.country_scan_profile ENABLE ROW LEVEL SECURITY;
-- country_core.country_scan_source_requirement: row level security ENABLED
ALTER TABLE country_core.country_scan_source_requirement ENABLE ROW LEVEL SECURITY;
-- country_core.country_security_policy: row level security ENABLED
ALTER TABLE country_core.country_security_policy ENABLE ROW LEVEL SECURITY;
-- country_core.country_source_adapter_config: row level security ENABLED
ALTER TABLE country_core.country_source_adapter_config ENABLE ROW LEVEL SECURITY;
-- country_core.country_source_evidence_snapshot: row level security ENABLED
ALTER TABLE country_core.country_source_evidence_snapshot ENABLE ROW LEVEL SECURITY;
-- country_core.country_source_registry: row level security ENABLED
ALTER TABLE country_core.country_source_registry ENABLE ROW LEVEL SECURITY;
-- country_core.country_workspace: row level security ENABLED
ALTER TABLE country_core.country_workspace ENABLE ROW LEVEL SECURITY;
-- country_core.daily_impact_snapshot: row level security ENABLED
ALTER TABLE country_core.daily_impact_snapshot ENABLE ROW LEVEL SECURITY;
-- country_core.data_sharing_classification: row level security ENABLED
ALTER TABLE country_core.data_sharing_classification ENABLE ROW LEVEL SECURITY;
-- country_core.demo_jurisdiction_execution_policy: row level security ENABLED
ALTER TABLE country_core.demo_jurisdiction_execution_policy ENABLE ROW LEVEL SECURITY;
-- country_core.demo_jurisdiction_profile: row level security ENABLED
ALTER TABLE country_core.demo_jurisdiction_profile ENABLE ROW LEVEL SECURITY;
-- country_core.demo_jurisdiction_scan_finding: row level security ENABLED
ALTER TABLE country_core.demo_jurisdiction_scan_finding ENABLE ROW LEVEL SECURITY;
-- country_core.demo_jurisdiction_scan_run: row level security ENABLED
ALTER TABLE country_core.demo_jurisdiction_scan_run ENABLE ROW LEVEL SECURITY;
-- country_core.discovery_evidence_atom: row level security ENABLED
ALTER TABLE country_core.discovery_evidence_atom ENABLE ROW LEVEL SECURITY;
-- country_core.discovery_synthesis_result: row level security ENABLED
ALTER TABLE country_core.discovery_synthesis_result ENABLE ROW LEVEL SECURITY;
-- country_core.email_outbox: row level security ENABLED
ALTER TABLE country_core.email_outbox ENABLE ROW LEVEL SECURITY;
-- country_core.entity_sharing_grant: row level security ENABLED
ALTER TABLE country_core.entity_sharing_grant ENABLE ROW LEVEL SECURITY;
-- country_core.entity_sharing_policy: row level security ENABLED
ALTER TABLE country_core.entity_sharing_policy ENABLE ROW LEVEL SECURITY;
-- country_core.global_ingredient_knowledge: row level security ENABLED
ALTER TABLE country_core.global_ingredient_knowledge ENABLE ROW LEVEL SECURITY;
-- country_core.impact_metric_definition: row level security ENABLED
ALTER TABLE country_core.impact_metric_definition ENABLE ROW LEVEL SECURITY;
-- country_core.institution_metric_definition: row level security ENABLED
ALTER TABLE country_core.institution_metric_definition ENABLE ROW LEVEL SECURITY;
-- country_core.institution_scientific_settings: row level security ENABLED
ALTER TABLE country_core.institution_scientific_settings ENABLE ROW LEVEL SECURITY;
-- country_core.institution_unit_definition: row level security ENABLED
ALTER TABLE country_core.institution_unit_definition ENABLE ROW LEVEL SECURITY;
-- country_core.ip_ownership_record: row level security ENABLED
ALTER TABLE country_core.ip_ownership_record ENABLE ROW LEVEL SECURITY;
-- country_core.legal_acceptance_receipt: row level security ENABLED
ALTER TABLE country_core.legal_acceptance_receipt ENABLE ROW LEVEL SECURITY;
-- country_core.legal_document_version: row level security ENABLED
ALTER TABLE country_core.legal_document_version ENABLE ROW LEVEL SECURITY;
-- country_core.national_objective: row level security ENABLED
ALTER TABLE country_core.national_objective ENABLE ROW LEVEL SECURITY;
-- country_core.notification: row level security ENABLED
ALTER TABLE country_core.notification ENABLE ROW LEVEL SECURITY;
-- country_core.objective_impact_link: row level security ENABLED
ALTER TABLE country_core.objective_impact_link ENABLE ROW LEVEL SECURITY;
-- country_core.onboarding_profile: row level security ENABLED
ALTER TABLE country_core.onboarding_profile ENABLE ROW LEVEL SECURITY;
-- country_core.organization: row level security ENABLED
ALTER TABLE country_core.organization ENABLE ROW LEVEL SECURITY;
-- country_core.organization_membership: row level security ENABLED
ALTER TABLE country_core.organization_membership ENABLE ROW LEVEL SECURITY;
-- country_core.organization_workspace: row level security ENABLED
ALTER TABLE country_core.organization_workspace ENABLE ROW LEVEL SECURITY;
-- country_core.regulatory_access_event: row level security ENABLED
ALTER TABLE country_core.regulatory_access_event ENABLE ROW LEVEL SECURITY;
-- country_core.regulatory_security_gate: row level security ENABLED
ALTER TABLE country_core.regulatory_security_gate ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_acknowledgement_receipt: row level security ENABLED
ALTER TABLE country_core.rehearsal_acknowledgement_receipt ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_activation_reissue: row level security ENABLED
ALTER TABLE country_core.rehearsal_activation_reissue ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_otp_request_audit: row level security DISABLED
-- country_core.rehearsal_participant_acknowledgement: row level security ENABLED
ALTER TABLE country_core.rehearsal_participant_acknowledgement ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_participant_invitation: row level security ENABLED
ALTER TABLE country_core.rehearsal_participant_invitation ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_participant_otp_audit: row level security ENABLED
ALTER TABLE country_core.rehearsal_participant_otp_audit ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_provisioning_handoff: row level security ENABLED
ALTER TABLE country_core.rehearsal_provisioning_handoff ENABLE ROW LEVEL SECURITY;
-- country_core.rehearsal_role_catalog: row level security ENABLED
ALTER TABLE country_core.rehearsal_role_catalog ENABLE ROW LEVEL SECURITY;
-- country_core.security_event: row level security ENABLED
ALTER TABLE country_core.security_event ENABLE ROW LEVEL SECURITY;
-- country_core.sharing_classification: row level security ENABLED
ALTER TABLE country_core.sharing_classification ENABLE ROW LEVEL SECURITY;
-- country_core.spatial_acquisition: row level security ENABLED
ALTER TABLE country_core.spatial_acquisition ENABLE ROW LEVEL SECURITY;
-- country_core.spatial_computed_observation: row level security ENABLED
ALTER TABLE country_core.spatial_computed_observation ENABLE ROW LEVEL SECURITY;
-- country_core.spatial_investigation_area: row level security ENABLED
ALTER TABLE country_core.spatial_investigation_area ENABLE ROW LEVEL SECURITY;
-- country_core.spatial_investigation_run: row level security ENABLED
ALTER TABLE country_core.spatial_investigation_run ENABLE ROW LEVEL SECURITY;
-- country_core.spatial_source_connection: row level security ENABLED
ALTER TABLE country_core.spatial_source_connection ENABLE ROW LEVEL SECURITY;
-- country_core.user_dashboard_profile: row level security ENABLED
ALTER TABLE country_core.user_dashboard_profile ENABLE ROW LEVEL SECURITY;
-- country_core.user_preference: row level security ENABLED
ALTER TABLE country_core.user_preference ENABLE ROW LEVEL SECURITY;
-- country_core.workspace_membership: row level security ENABLED
ALTER TABLE country_core.workspace_membership ENABLE ROW LEVEL SECURITY;
