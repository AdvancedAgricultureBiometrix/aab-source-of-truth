-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: observation_core. Views: definitions, options and comments.
-- Catalog counts for observation_core: functions 22, tables 10, views 9, sequences 0, rls_enabled_tables 0, constraints 71, triggers 0, policies 0, indexes 28.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW observation_core.v_active_community_campaigns AS
 SELECT campaign_id,
    campaign_code,
    campaign_name,
    country_code,
    primary_domain_code,
    supporting_domain_codes,
    campaign_question,
    purpose,
    target_locations,
    required_observations,
    participant_source_modes,
    photo_policy,
    start_date,
    end_date
   FROM observation_core.campaign
  WHERE lifecycle_status = 'ACTIVE'::text AND (start_date IS NULL OR start_date <= CURRENT_DATE) AND (end_date IS NULL OR end_date >= CURRENT_DATE);

-- owner: postgres
CREATE VIEW observation_core.v_campaign_status AS
 SELECT c.campaign_id,
    c.campaign_code,
    c.campaign_name,
    c.country_code,
    c.primary_domain_code,
    c.supporting_domain_codes,
    c.campaign_question,
    c.purpose,
    c.target_locations,
    c.required_observations,
    c.participant_source_modes,
    c.photo_policy,
    c.start_date,
    c.end_date,
    c.lifecycle_status,
    c.created_by,
    c.reviewed_by,
    c.review_rationale,
    c.reviewed_at,
    c.created_at,
    c.updated_at,
    count(co.campaign_observation_id) AS contribution_count,
    count(co.campaign_observation_id) FILTER (WHERE co.contribution_status = 'ACCEPTED'::text) AS accepted_contributions
   FROM observation_core.campaign c
     LEFT JOIN observation_core.campaign_observation co ON co.campaign_id = c.campaign_id
  GROUP BY c.campaign_id;

-- owner: postgres
CREATE VIEW observation_core.v_community_submission_queue AS
 SELECT cs.community_submission_id,
    cs.submission_code,
    cs.observation_id,
    cs.participant_profile_id,
    cs.campaign_id,
    cs.user_category_hint,
    cs.user_identification_text,
    cs.photo_required,
    cs.location_required,
    cs.consent_confirmed,
    cs.offline_capture_id,
    cs.client_captured_at,
    cs.client_app_version,
    cs.low_bandwidth_mode,
    cs.submission_status,
    cs.submitted_at,
    cs.reviewed_by,
    cs.review_summary,
    cs.reviewed_at,
    cs.created_at,
    cp.actor_id,
    cp.participant_type,
    cp.country_code,
    o.domain_code,
    o.brief_description,
    o.latitude,
    o.longitude,
    o.observed_at,
    o.lifecycle_status AS observation_status,
    o.trust_status,
    o.evidence_status,
    ( SELECT count(*) AS count
           FROM observation_core.evidence_link el
          WHERE el.observation_id = o.observation_id AND el.evidence_type = 'PHOTO'::text) AS photo_count
   FROM observation_core.community_submission cs
     JOIN observation_core.community_participant_profile cp ON cp.community_participant_profile_id = cs.participant_profile_id
     JOIN observation_core.observation o ON o.observation_id = cs.observation_id;

-- owner: postgres
CREATE VIEW observation_core.v_domain_adapters AS
 SELECT da.domain_code,
    da.adapter_name,
    da.enabled,
    da.photo_policy,
    da.location_policy,
    da.allowed_source_modes,
    da.required_context_fields,
    da.suggested_metrics,
    da.notes,
    da.created_at,
    da.updated_at,
    adc.domain_name,
    adc.domain_class
   FROM observation_core.domain_adapter da
     JOIN agriculture.aab_domain_classification adc ON adc.domain_code = da.domain_code;

-- owner: postgres
CREATE VIEW observation_core.v_evidence_eligibility AS
 SELECT o.observation_id,
    o.observation_code,
    o.domain_code,
    o.source_mode,
    o.lifecycle_status,
    o.trust_status,
    o.evidence_status,
    bee.brain_evidence_eligibility_id,
    bee.eligibility_status,
    bee.eligibility_reason,
    bee.evidence_packet_id,
    bee.governance_decision_id
   FROM observation_core.observation o
     LEFT JOIN agriculture.brain_evidence_eligibility bee ON bee.subject_entity_type = 'UNIVERSAL_OBSERVATION'::text AND bee.subject_entity_id = o.observation_id;

-- owner: postgres
CREATE VIEW observation_core.v_integrity_attestation AS
 SELECT 'AAB_UNIVERSAL_OBSERVATION_COMMUNITY_CAPTURE_SEAL_086'::text AS contract,
    ( SELECT count(*) >= 10
           FROM information_schema.tables
          WHERE tables.table_schema::name = 'observation_core'::name AND (tables.table_name::name = ANY (ARRAY['observation'::name, 'measurement'::name, 'evidence_link'::name, 'domain_adapter'::name, 'campaign'::name, 'campaign_observation'::name, 'community_participant_profile'::name, 'community_submission'::name, 'validation_event'::name, 'route'::name]))) AS required_core_tables_present,
    ( SELECT count(*) >= 15
           FROM information_schema.routines
          WHERE routines.routine_schema::name = 'observation_core'::name AND (routines.routine_name::name = ANY (ARRAY['api_create_observation'::name, 'api_create_campaign'::name, 'api_upsert_community_profile'::name, 'api_start_community_submission'::name, 'api_finalize_community_submission'::name, 'api_record_validation'::name, 'api_propose_observation_routes'::name, 'api_review_observation'::name, 'api_promote_observation_to_evidence'::name, 'api_get_community_profile'::name, 'api_list_my_community_submissions'::name, 'api_actor_can_attach_community_photo'::name, 'api_get_community_photo_metadata'::name, 'api_settings_snapshot'::name, 'api_validate_universal_observation_e2e'::name]))) AS required_functions_present,
    ( SELECT (EXISTS ( SELECT 1
                   FROM observation_core.domain_adapter
                  WHERE domain_adapter.domain_code = 'COMMUNITY_INTAKE'::text AND domain_adapter.enabled AND domain_adapter.photo_policy = 'REQUIRED'::text AND domain_adapter.location_policy = 'REQUIRED'::text)) AS "exists") AS neutral_community_intake_enabled,
    true AS direct_public_brain_promotion_disabled,
    true AS offline_idempotency_enabled,
    true AS photo_first_community_capture,
    true AS scientist_authority_preserved,
    now() AS attested_at;

-- owner: postgres
CREATE VIEW observation_core.v_observation_queue AS
 SELECT o.observation_id,
    o.observation_code,
    o.domain_code,
    o.country_code,
    o.observation_type,
    o.subject_type,
    o.subject_reference,
    o.source_mode,
    o.observer_actor_id,
    o.observed_at,
    o.latitude,
    o.longitude,
    o.location_accuracy_metres,
    o.location_description,
    o.brief_description,
    o.context_payload,
    o.lifecycle_status,
    o.trust_status,
    o.evidence_status,
    o.input_submission_id,
    o.agriculture_observation_id,
    o.created_at,
    o.updated_at,
    o.archived_at,
    o.archived_by,
    o.archive_reason,
    count(DISTINCT m.measurement_id) AS measurement_count,
    count(DISTINCT e.evidence_link_id) AS evidence_count,
    count(DISTINCT e.evidence_link_id) FILTER (WHERE e.evidence_type = 'PHOTO'::text AND (e.review_status = ANY (ARRAY['APPROVED'::text, 'APPROVED_WITH_WARNINGS'::text]))) AS approved_photo_count
   FROM observation_core.observation o
     LEFT JOIN observation_core.measurement m ON m.observation_id = o.observation_id
     LEFT JOIN observation_core.evidence_link e ON e.observation_id = o.observation_id
  GROUP BY o.observation_id;

-- owner: postgres
CREATE VIEW observation_core.v_review_queue AS
 SELECT observation_id,
    observation_code,
    domain_code,
    country_code,
    observation_type,
    subject_type,
    subject_reference,
    source_mode,
    observer_actor_id,
    observed_at,
    latitude,
    longitude,
    location_accuracy_metres,
    location_description,
    brief_description,
    context_payload,
    lifecycle_status,
    trust_status,
    evidence_status,
    input_submission_id,
    agriculture_observation_id,
    created_at,
    updated_at,
    archived_at,
    archived_by,
    archive_reason,
    measurement_count,
    evidence_count,
    approved_photo_count,
    ( SELECT jsonb_agg(to_jsonb(v.*) ORDER BY v.created_at) AS jsonb_agg
           FROM observation_core.validation_event v
          WHERE v.observation_id = q.observation_id) AS validation_events,
    ( SELECT jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at) AS jsonb_agg
           FROM observation_core.route r
          WHERE r.observation_id = q.observation_id) AS routes,
    ( SELECT jsonb_agg(jsonb_build_object('photo_evidence_id', pe.photo_evidence_id, 'review_status', pe.review_status, 'image_quality_status', pe.image_quality_status, 'context_validation_status', pe.context_validation_status, 'consent_usage_status', pe.consent_usage_status, 'media_type', pe.media_type, 'uploaded_at', pe.uploaded_at) ORDER BY pe.uploaded_at) AS jsonb_agg
           FROM observation_core.evidence_link el
             JOIN agriculture.photo_evidence pe ON pe.photo_evidence_id = el.photo_evidence_id
          WHERE el.observation_id = q.observation_id AND el.evidence_type = 'PHOTO'::text) AS photos
   FROM observation_core.v_observation_queue q
  WHERE (lifecycle_status = ANY (ARRAY['VALIDATING'::text, 'QUARANTINED'::text, 'UNDER_REVIEW'::text, 'CAPTURED'::text])) OR lifecycle_status = 'ACCEPTED'::text AND evidence_status = 'PENDING_REVIEW'::text;

-- owner: postgres
CREATE VIEW observation_core.v_settings_summary AS
 SELECT da.domain_code,
    adc.domain_name,
    adc.domain_class,
    da.enabled,
    da.photo_policy,
    da.location_policy,
    da.allowed_source_modes,
    da.required_context_fields,
    da.suggested_metrics,
    da.notes,
    ( SELECT count(*) AS count
           FROM observation_core.observation o
          WHERE o.domain_code = da.domain_code) AS observation_count,
    ( SELECT count(*) AS count
           FROM observation_core.observation o
          WHERE o.domain_code = da.domain_code AND (o.lifecycle_status = ANY (ARRAY['VALIDATING'::text, 'QUARANTINED'::text, 'UNDER_REVIEW'::text]))) AS review_queue_count
   FROM observation_core.domain_adapter da
     JOIN agriculture.aab_domain_classification adc ON adc.domain_code = da.domain_code;
