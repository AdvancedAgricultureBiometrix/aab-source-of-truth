-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: observation_core. Grants: schema, table, sequence, column and function privileges, and default privileges.
-- Catalog counts for observation_core: functions 22, tables 10, views 9, sequences 0, rls_enabled_tables 0, constraints 71, triggers 0, policies 0, indexes 28.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema observation_core owner: postgres
-- observation_core.campaign: relacl is NULL (owner default privileges only)
-- observation_core.campaign_observation: relacl is NULL (owner default privileges only)
-- observation_core.community_participant_profile: relacl is NULL (owner default privileges only)
-- observation_core.community_submission: relacl is NULL (owner default privileges only)
-- observation_core.domain_adapter: relacl is NULL (owner default privileges only)
-- observation_core.evidence_link: relacl is NULL (owner default privileges only)
-- observation_core.measurement: relacl is NULL (owner default privileges only)
-- observation_core.observation: relacl is NULL (owner default privileges only)
-- observation_core.route: relacl is NULL (owner default privileges only)
-- observation_core.v_active_community_campaigns: relacl is NULL (owner default privileges only)
-- observation_core.v_campaign_status: relacl is NULL (owner default privileges only)
-- observation_core.v_community_submission_queue: relacl is NULL (owner default privileges only)
-- observation_core.v_domain_adapters: relacl is NULL (owner default privileges only)
-- observation_core.v_evidence_eligibility: relacl is NULL (owner default privileges only)
-- observation_core.v_integrity_attestation: relacl is NULL (owner default privileges only)
-- observation_core.v_observation_queue: relacl is NULL (owner default privileges only)
-- observation_core.v_review_queue: relacl is NULL (owner default privileges only)
-- observation_core.v_settings_summary: relacl is NULL (owner default privileges only)
-- observation_core.validation_event: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION observation_core.api_actor_can_attach_community_photo(p_actor_id uuid, p_observation_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_actor_can_attach_community_photo(p_actor_id uuid, p_observation_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_attach_photo_evidence(p_observation_id uuid, p_photo_evidence_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_attach_photo_evidence(p_observation_id uuid, p_photo_evidence_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_community_country_context() TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_community_country_context() TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_create_campaign(p_campaign_name text, p_country_code character, p_primary_domain_code text, p_campaign_question text, p_purpose text, p_actor_id uuid, p_supporting_domain_codes text[], p_target_locations jsonb, p_required_observations jsonb, p_participant_source_modes text[], p_photo_policy text, p_start_date date, p_end_date date) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_create_campaign(p_campaign_name text, p_country_code character, p_primary_domain_code text, p_campaign_question text, p_purpose text, p_actor_id uuid, p_supporting_domain_codes text[], p_target_locations jsonb, p_required_observations jsonb, p_participant_source_modes text[], p_photo_policy text, p_start_date date, p_end_date date) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_create_observation(p_domain_code text, p_country_code character, p_observation_type text, p_subject_type text, p_source_mode text, p_observed_at timestamp with time zone, p_brief_description text, p_actor_id uuid, p_subject_reference text, p_latitude numeric, p_longitude numeric, p_location_accuracy_metres numeric, p_location_description text, p_context_payload jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_create_observation(p_domain_code text, p_country_code character, p_observation_type text, p_subject_type text, p_source_mode text, p_observed_at timestamp with time zone, p_brief_description text, p_actor_id uuid, p_subject_reference text, p_latitude numeric, p_longitude numeric, p_location_accuracy_metres numeric, p_location_description text, p_context_payload jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_decide_campaign(p_campaign_id uuid, p_decision text, p_rationale text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_decide_campaign(p_campaign_id uuid, p_decision text, p_rationale text, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_finalize_community_submission(p_community_submission_id uuid, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_finalize_community_submission(p_community_submission_id uuid, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_find_offline_capture(p_actor_id uuid, p_offline_capture_id text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_find_offline_capture(p_actor_id uuid, p_offline_capture_id text) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_get_community_photo_metadata(p_actor_id uuid, p_photo_evidence_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_get_community_photo_metadata(p_actor_id uuid, p_photo_evidence_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_get_community_profile(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_get_community_profile(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_link_observation_to_campaign(p_campaign_id uuid, p_observation_id uuid, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_link_observation_to_campaign(p_campaign_id uuid, p_observation_id uuid, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_list_my_community_submissions(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_list_my_community_submissions(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_promote_observation_to_evidence(p_observation_id uuid, p_review_summary text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_promote_observation_to_evidence(p_observation_id uuid, p_review_summary text, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_propose_observation_routes(p_observation_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_propose_observation_routes(p_observation_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_record_validation(p_observation_id uuid, p_dimension text, p_result text, p_rule_code text, p_summary text, p_actor_id uuid, p_detail jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_record_validation(p_observation_id uuid, p_dimension text, p_result text, p_rule_code text, p_summary text, p_actor_id uuid, p_detail jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_review_observation(p_observation_id uuid, p_decision text, p_review_summary text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_review_observation(p_observation_id uuid, p_decision text, p_review_summary text, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_settings_snapshot(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_settings_snapshot(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_start_community_submission(p_actor_id uuid, p_domain_code text, p_country_code character, p_brief_description text, p_latitude numeric, p_longitude numeric, p_observed_at timestamp with time zone, p_consent_confirmed boolean, p_user_category_hint text, p_user_identification_text text, p_campaign_id uuid, p_offline_capture_id text, p_client_captured_at timestamp with time zone, p_client_app_version text, p_low_bandwidth_mode boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_start_community_submission(p_actor_id uuid, p_domain_code text, p_country_code character, p_brief_description text, p_latitude numeric, p_longitude numeric, p_observed_at timestamp with time zone, p_consent_confirmed boolean, p_user_category_hint text, p_user_identification_text text, p_campaign_id uuid, p_offline_capture_id text, p_client_captured_at timestamp with time zone, p_client_app_version text, p_low_bandwidth_mode boolean) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_submit_campaign_for_review(p_campaign_id uuid, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_submit_campaign_for_review(p_campaign_id uuid, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_upsert_community_profile(p_actor_id uuid, p_participant_type text, p_country_code character, p_consent_scientific_use boolean, p_consent_environmental_use boolean, p_organization_or_school text, p_preferred_language text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_upsert_community_profile(p_actor_id uuid, p_participant_type text, p_country_code character, p_consent_scientific_use boolean, p_consent_environmental_use boolean, p_organization_or_school text, p_preferred_language text) TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_validate_community_access_e2e() TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_validate_community_access_e2e() TO postgres;
GRANT EXECUTE ON FUNCTION observation_core.api_validate_universal_observation_e2e() TO PUBLIC;
GRANT EXECUTE ON FUNCTION observation_core.api_validate_universal_observation_e2e() TO postgres;
