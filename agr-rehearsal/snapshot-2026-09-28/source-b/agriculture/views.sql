-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: agriculture. Views: definitions, options and comments.
-- Catalog counts for agriculture: functions 170, tables 121, views 65, rls_enabled_tables 121, constraints 998, triggers 80, policies 0, indexes 334.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW agriculture.v_aab_domain_map AS
 SELECT domain_code,
    domain_name,
    domain_class,
    data_ownership,
    lifecycle_status,
    operational_enabled,
    parent_domain_code,
    description,
    scientist_authority_required,
    created_at
   FROM agriculture.aab_domain_classification
  WHERE lifecycle_status <> 'ARCHIVED'::text
  ORDER BY domain_class, domain_name;

-- owner: postgres
CREATE VIEW agriculture.v_active_agricultural_problems AS
 SELECT agricultural_problem_id,
    problem_code,
    problem_name,
    problem_type,
    crop_id,
    description,
    lifecycle_status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.agricultural_problem
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_crops AS
 SELECT crop_id,
    crop_code,
    common_name,
    scientific_name,
    crop_group,
    lifecycle_status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.crop
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_discovery_candidates AS
 SELECT discovery_candidate_id,
    candidate_code,
    candidate_name,
    candidate_object_type,
    discovery_signal_id,
    country_code,
    material_class,
    source_material,
    preparation_class,
    hypothesised_pathway,
    candidate_summary,
    uncertainty_summary,
    lifecycle_status,
    canonical_ingredient_id,
    governance_decision_id,
    evidence_packet_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.discovery_candidate
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_farms AS
 SELECT farm_id,
    farm_code,
    farm_name,
    organization_id,
    country_code,
    description,
    lifecycle_status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.farm
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_ingredients AS
 SELECT ingredient_id,
    ingredient_code,
    ingredient_name,
    material_class,
    preparation_class,
    data_class,
    country_code,
    current_version_no,
    lifecycle_status,
    created_at,
    updated_at
   FROM agriculture.ingredient
  WHERE lifecycle_status <> ALL (ARRAY['RETIRED'::text, 'ARCHIVED'::text]);

-- owner: postgres
CREATE VIEW agriculture.v_active_locations AS
 SELECT location_id,
    location_code,
    location_name,
    farm_id,
    location_type,
    latitude,
    longitude,
    elevation_m,
    area_ha,
    description,
    lifecycle_status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.location
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_observations AS
 SELECT observation_id,
    observation_code,
    trial_id,
    plot_id,
    observation_template_version_id,
    observed_at,
    observer_id,
    observation_status,
    notes,
    input_submission_id,
    data_quality_assessment_id,
    evidence_packet_id,
    created_at,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.observation
  WHERE observation_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_organizations AS
 SELECT organization_id,
    organization_code,
    organization_name,
    organization_type,
    country_code,
    lifecycle_status,
    notes,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.organization
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_outcomes AS
 SELECT outcome_id,
    outcome_code,
    trial_id,
    plot_id,
    outcome_type,
    outcome_status,
    outcome_summary,
    outcome_payload,
    evidence_packet_id,
    governance_decision_id,
    created_by,
    created_at,
    reviewed_by,
    reviewed_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.outcome
  WHERE outcome_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_plots AS
 SELECT plot_id,
    plot_code,
    trial_id,
    plot_name,
    replicate_number,
    treatment_role,
    formulation_version_id,
    latitude,
    longitude,
    area_value,
    area_unit,
    lifecycle_status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.plot
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_trials AS
 SELECT trial_id,
    trial_code,
    trial_name,
    formulation_version_id,
    organization_id,
    farm_id,
    location_id,
    crop_id,
    variety_id,
    problem_id,
    trial_objective,
    protocol_summary,
    start_date,
    planned_end_date,
    actual_end_date,
    lifecycle_status,
    outcome_status,
    governance_decision_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.trial
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_active_varieties AS
 SELECT variety_id,
    variety_code,
    crop_id,
    variety_name,
    breeder_or_source,
    notes,
    lifecycle_status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason
   FROM agriculture.variety
  WHERE lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_actor_effective_authority AS
 SELECT a.actor_id,
    a.display_name,
    a.actor_type,
    a.active AS actor_active,
    aaa.access_profile_code,
    NULL::text AS role_code,
    aaa.authority_scope,
    aaa.country_code,
    aaa.active AS assignment_active,
    'ACCESS_PROFILE'::text AS assignment_type
   FROM agriculture.actor a
     JOIN agriculture.actor_access_assignment aaa ON aaa.actor_id = a.actor_id
UNION ALL
 SELECT a.actor_id,
    a.display_name,
    a.actor_type,
    a.active AS actor_active,
    NULL::text AS access_profile_code,
    aa.role_code,
    aa.authority_scope,
    aa.country_code,
    aa.active AS assignment_active,
    'AUTHORITY_ROLE'::text AS assignment_type
   FROM agriculture.actor a
     JOIN agriculture.actor_authority aa ON aa.actor_id = a.actor_id;

-- owner: postgres
CREATE VIEW agriculture.v_agriculture_integrity_attestation AS
 SELECT agriculture.system_integrity_check() AS attestation;

-- owner: postgres
CREATE VIEW agriculture.v_application_gateway_integrity AS
 SELECT resource_code,
    resource_type,
    object_name,
    operation_class,
    authority_requirement,
    audit_required,
    direct_table_access_allowed,
        CASE
            WHEN resource_type = 'COMMAND_FUNCTION'::text THEN (EXISTS ( SELECT 1
               FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = agc.schema_name AND p.proname = agc.object_name))
            ELSE (EXISTS ( SELECT 1
               FROM information_schema.views v
              WHERE v.table_schema::name = agc.schema_name AND v.table_name::name = agc.object_name))
        END AS object_exists,
        CASE
            WHEN direct_table_access_allowed = false THEN true
            ELSE false
        END AS private_access_contract_valid
   FROM agriculture.application_gateway_contract agc
  WHERE active = true;

-- owner: postgres
CREATE VIEW agriculture.v_archive_only_protection AS
 SELECT c.relname AS table_name,
    t.tgname AS trigger_name
   FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'agriculture'::name AND t.tgname ~~ 'trg_%_archive_only'::text AND NOT t.tgisinternal
  ORDER BY c.relname;

-- owner: postgres
CREATE VIEW agriculture.v_audit_event_ledger AS
 SELECT ae.audit_event_id,
    ae.event_code,
    ae.event_type,
    ae.event_category,
    ae.actor_id,
    a.display_name AS actor_name,
    ae.request_context_id,
    rc.request_id,
    ae.operation_run_id,
    op.operation_code,
    ae.subject_entity_type,
    ae.subject_entity_id,
    ae.governance_decision_id,
    gd.decision_code,
    ae.event_summary,
    ae.event_context,
    ae.previous_event_hash,
    ae.event_hash,
    ae.occurred_at
   FROM agriculture.audit_event ae
     LEFT JOIN agriculture.actor a ON a.actor_id = ae.actor_id
     LEFT JOIN agriculture.request_context rc ON rc.request_context_id = ae.request_context_id
     LEFT JOIN agriculture.operation_run op ON op.operation_run_id = ae.operation_run_id
     LEFT JOIN agriculture.governance_decision gd ON gd.decision_id = ae.governance_decision_id;

-- owner: postgres
CREATE VIEW agriculture.v_audit_integrity AS
 WITH ordered AS (
         SELECT audit_event.audit_event_id,
            audit_event.event_code,
            audit_event.event_hash,
            audit_event.previous_event_hash,
            lag(audit_event.event_hash) OVER (ORDER BY audit_event.occurred_at, audit_event.audit_event_id) AS expected_previous_hash
           FROM agriculture.audit_event
        )
 SELECT audit_event_id,
    event_code,
    event_hash,
    previous_event_hash,
    expected_previous_hash,
    NOT previous_event_hash IS DISTINCT FROM expected_previous_hash AS chain_link_valid
   FROM ordered;

-- owner: postgres
CREATE VIEW agriculture.v_brain_evidence_gate_status AS
 SELECT bee.brain_evidence_eligibility_id,
    bee.subject_entity_type,
    bee.subject_entity_id,
    bee.evidence_packet_id,
    bee.validation_passed,
    bee.context_complete,
    bee.quality_acceptable,
    bee.photo_requirement_satisfied,
    bee.required_review_complete,
    bee.quarantine_clear,
    bee.eligibility_status,
    bee.eligibility_reason,
    bee.assessed_by,
    bee.assessed_at,
    bee.governance_decision_id,
    dqa.quality_status,
    dqa.completeness_status,
    dqa.context_quality,
    dqa.evidence_quality,
    dqa.photo_quality,
    dqa.review_required,
    dqa.governance_review_id,
    ( SELECT count(*) AS count
           FROM agriculture.data_quality_flag dqf
          WHERE dqf.subject_entity_type = bee.subject_entity_type AND dqf.subject_entity_id = bee.subject_entity_id AND dqf.flag_status = 'OPEN'::text AND (dqf.severity = ANY (ARRAY['HIGH'::text, 'CRITICAL'::text]))) AS open_serious_quality_flags,
    ( SELECT count(*) AS count
           FROM agriculture.photo_evidence pe
          WHERE pe.subject_entity_type = bee.subject_entity_type AND pe.subject_entity_id = bee.subject_entity_id AND (pe.image_quality_status = ANY (ARRAY['ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text])) AND (pe.context_validation_status = ANY (ARRAY['VALIDATED'::text, 'VALIDATED_WITH_WARNINGS'::text])) AND (pe.review_status = ANY (ARRAY['APPROVED'::text, 'APPROVED_WITH_WARNINGS'::text])) AND (pe.consent_usage_status = ANY (ARRAY['APPROVED'::text, 'RESTRICTED'::text]))) AS usable_photo_count
   FROM agriculture.brain_evidence_eligibility bee
     LEFT JOIN agriculture.data_quality_assessment dqa ON dqa.subject_entity_type = bee.subject_entity_type AND dqa.subject_entity_id = bee.subject_entity_id;

-- owner: postgres
CREATE VIEW agriculture.v_country_intelligence_settings AS
 SELECT cis.country_intelligence_settings_id,
    cis.country_code,
    cis.country_resource_intelligence_enabled,
    cis.resource_recovery_intelligence_enabled,
    cis.environmental_intelligence_enabled,
    cis.traditional_knowledge_handling,
    cis.waste_burning_priority,
    cis.dumping_priority,
    cis.landfill_priority,
    cis.water_pollution_priority,
    cis.air_pollution_priority,
    cis.required_safety_review,
    cis.required_ecology_review,
    cis.required_scientist_review,
    cis.automatic_ingredient_promotion_allowed,
    cis.automatic_formulation_generation_allowed,
    cis.settings_notes,
    cis.updated_by,
    cis.updated_at,
    cs.country_name,
    cs.active AS country_active
   FROM agriculture.country_intelligence_settings cis
     JOIN agriculture.country_scope cs ON cs.country_code = cis.country_code;

-- owner: postgres
CREATE VIEW agriculture.v_country_resource_intelligence AS
 SELECT country_resource_candidate_id,
    resource_code,
    country_code,
    resource_name,
    resource_class,
    asset_type,
    resource_origin,
    current_known_use,
    traditional_knowledge_linked,
    traditional_knowledge_summary,
    composition_status,
    mechanism_status,
    evidence_status,
    observation_status,
    knowledge_gap_status,
    discovery_potential,
    scientific_status,
    candidate_summary,
    uncertainty_summary,
    evidence_packet_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    archived_by,
    archived_at,
    archive_reason,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('domain_code', cdr.domain_code, 'relevance_status', cdr.relevance_status, 'summary', cdr.relevance_summary, 'evidence_strength', cdr.evidence_strength) ORDER BY cdr.domain_code) AS jsonb_agg
           FROM agriculture.country_resource_domain_relevance cdr
          WHERE cdr.country_resource_candidate_id = crc.country_resource_candidate_id), '[]'::jsonb) AS domain_relevance
   FROM agriculture.country_resource_candidate crc
  WHERE scientific_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_discovery_governance_status AS
 SELECT dc.discovery_candidate_id,
    dc.candidate_code,
    dc.candidate_name,
    dc.candidate_object_type,
    dc.lifecycle_status,
    dc.canonical_ingredient_id,
    dc.evidence_packet_id,
    dc.governance_decision_id,
    count(DISTINCT op.opportunity_profile_id) FILTER (WHERE op.profile_status <> 'ARCHIVED'::text) AS opportunity_profile_count,
    count(DISTINCT kg.knowledge_gap_id) FILTER (WHERE kg.lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_INVESTIGATION'::text])) AS open_knowledge_gap_count,
    count(DISTINCT cr.contradiction_record_id) FILTER (WHERE cr.lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text])) AS open_contradiction_count,
    count(DISTINCT mh.mechanism_hypothesis_id) FILTER (WHERE mh.lifecycle_status <> ALL (ARRAY['ARCHIVED'::text, 'REJECTED'::text])) AS mechanism_hypothesis_count,
        CASE
            WHEN dc.lifecycle_status = 'INVESTIGATION_READY'::text AND dc.canonical_ingredient_id IS NULL THEN true
            ELSE false
        END AS governed_investigation_ready,
    false AS automatic_promotion_allowed
   FROM agriculture.discovery_candidate dc
     LEFT JOIN agriculture.opportunity_profile op ON op.discovery_candidate_id = dc.discovery_candidate_id
     LEFT JOIN agriculture.knowledge_gap kg ON kg.subject_entity_type = 'DISCOVERY_CANDIDATE'::text AND kg.subject_entity_id = dc.discovery_candidate_id
     LEFT JOIN agriculture.contradiction_record cr ON cr.subject_entity_type = 'DISCOVERY_CANDIDATE'::text AND cr.subject_entity_id = dc.discovery_candidate_id
     LEFT JOIN agriculture.mechanism_hypothesis mh ON mh.subject_entity_type = 'DISCOVERY_CANDIDATE'::text AND mh.subject_entity_id = dc.discovery_candidate_id
  GROUP BY dc.discovery_candidate_id;

-- owner: postgres
CREATE VIEW agriculture.v_discovery_pipeline AS
 SELECT dc.discovery_candidate_id,
    dc.candidate_code,
    dc.candidate_name,
    dc.candidate_object_type,
    dc.lifecycle_status,
    dc.country_code,
    dc.material_class,
    dc.source_material,
    dc.preparation_class,
    dc.hypothesised_pathway,
    dc.uncertainty_summary,
    dc.canonical_ingredient_id,
    dc.governance_decision_id,
    count(DISTINCT dce.discovery_candidate_evidence_id) AS evidence_item_count,
    count(DISTINCT dr.discovery_review_id) AS review_count,
    count(DISTINCT op.opportunity_profile_id) AS opportunity_profile_count
   FROM agriculture.discovery_candidate dc
     LEFT JOIN agriculture.discovery_candidate_evidence dce ON dce.discovery_candidate_id = dc.discovery_candidate_id
     LEFT JOIN agriculture.discovery_review dr ON dr.discovery_candidate_id = dc.discovery_candidate_id
     LEFT JOIN agriculture.opportunity_profile op ON op.discovery_candidate_id = dc.discovery_candidate_id AND op.profile_status <> 'ARCHIVED'::text
  GROUP BY dc.discovery_candidate_id;

-- owner: postgres
CREATE VIEW agriculture.v_discovery_promotion_audit AS
 SELECT dpe.discovery_promotion_event_id,
    dpe.promotion_code,
    dpe.discovery_candidate_id,
    dc.candidate_code,
    dc.candidate_name,
    dc.lifecycle_status AS discovery_status,
    dpe.promoted_entity_type,
    dpe.promoted_entity_id,
    i.ingredient_code,
    i.ingredient_name,
    i.lifecycle_status AS ingredient_status,
    i.data_class,
    dpe.governance_decision_id,
    dpe.evidence_packet_id,
    dpe.promotion_rationale,
    dpe.promoted_by,
    dpe.promoted_at
   FROM agriculture.discovery_promotion_event dpe
     JOIN agriculture.discovery_candidate dc ON dc.discovery_candidate_id = dpe.discovery_candidate_id
     LEFT JOIN agriculture.ingredient i ON dpe.promoted_entity_type = 'INGREDIENT'::text AND i.ingredient_id = dpe.promoted_entity_id;

-- owner: postgres
CREATE VIEW agriculture.v_environmental_resource_burden AS
 SELECT rws.resource_waste_stream_id,
    rws.waste_stream_code,
    rws.country_code,
    rws.waste_stream_name,
    rws.burning_involved,
    rws.dumping_involved,
    rws.landfill_involved,
    ebp.air_pollution_burden,
    ebp.water_pollution_burden,
    ebp.soil_pollution_burden,
    ebp.burning_pressure,
    ebp.landfill_pressure,
    ebp.dumping_pressure,
    ebp.environmental_burden_summary,
    ebp.evidence_strength
   FROM agriculture.resource_waste_stream rws
     LEFT JOIN agriculture.environmental_burden_profile ebp ON ebp.resource_waste_stream_id = rws.resource_waste_stream_id
  WHERE rws.recovery_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_evidence_packet_readiness AS
 SELECT ep.evidence_packet_id,
    ep.evidence_packet_code,
    ep.packet_type,
    ep.subject_entity_type,
    ep.subject_entity_id,
    ep.packet_status,
    ep.completeness_status,
    ep.evidence_summary,
    count(epi.evidence_packet_item_id) FILTER (WHERE epi.inclusion_status = 'INCLUDED'::text) AS included_item_count,
    count(epi.evidence_packet_item_id) FILTER (WHERE epi.inclusion_status = 'INCLUDED'::text AND epi.evidence_role = 'SUPPORTING'::text) AS supporting_item_count,
    count(epi.evidence_packet_item_id) FILTER (WHERE epi.inclusion_status = 'INCLUDED'::text AND (epi.evidence_role = ANY (ARRAY['CONTRADICTING'::text, 'LIMITING'::text]))) AS challenge_item_count,
    count(epi.evidence_packet_item_id) FILTER (WHERE epi.inclusion_status = 'INCLUDED'::text AND epi.source_object_id IS NOT NULL) AS source_item_count
   FROM agriculture.evidence_packet ep
     LEFT JOIN agriculture.evidence_packet_item epi ON epi.evidence_packet_id = ep.evidence_packet_id
  GROUP BY ep.evidence_packet_id;

-- owner: postgres
CREATE VIEW agriculture.v_formulation_reasoning_pipeline AS
 SELECT fr.formulation_request_id,
    fr.request_code,
    fr.request_title,
    fr.lifecycle_status AS request_status,
    rr.reasoning_run_id,
    rr.reasoning_run_code,
    rr.run_status,
    h.hypothesis_id,
    h.hypothesis_code,
    h.lifecycle_status AS hypothesis_status,
    fc.formulation_candidate_id,
    fc.candidate_code,
    fc.candidate_status,
    fv.formulation_version_id,
    fv.version_code,
    fv.lifecycle_status AS version_status,
    fv.trial_readiness
   FROM agriculture.formulation_request fr
     LEFT JOIN agriculture.reasoning_run rr ON rr.formulation_request_id = fr.formulation_request_id
     LEFT JOIN agriculture.hypothesis h ON h.formulation_request_id = fr.formulation_request_id OR h.reasoning_run_id = rr.reasoning_run_id
     LEFT JOIN agriculture.formulation_candidate fc ON fc.formulation_request_id = fr.formulation_request_id AND (fc.reasoning_run_id IS NULL OR fc.reasoning_run_id = rr.reasoning_run_id)
     LEFT JOIN agriculture.formulation_version fv ON fv.formulation_candidate_id = fc.formulation_candidate_id;

-- owner: postgres
CREATE VIEW agriculture.v_formulation_versions_with_total AS
 SELECT fv.formulation_version_id,
    fv.version_code,
    fv.formulation_name,
    fv.version_number,
    fv.formulation_type,
    fv.formulation_candidate_id,
    fv.derived_from_version_id,
    fv.change_type,
    fv.change_rationale,
    fv.expected_outcomes,
    fv.data_class,
    fv.trial_readiness,
    fv.lifecycle_status,
    fv.governance_decision_id,
    fv.evidence_packet_id,
    fv.created_by,
    fv.created_at,
    fv.approved_by,
    fv.approved_at,
    COALESCE(sum(
        CASE
            WHEN fvil.is_active THEN fvil.inclusion_rate_percent
            ELSE 0::numeric
        END), 0::numeric)::numeric(10,4) AS total_inclusion_percent,
    count(fvil.formulation_version_ingredient_line_id) FILTER (WHERE fvil.is_active) AS active_ingredient_line_count
   FROM agriculture.formulation_version fv
     LEFT JOIN agriculture.formulation_version_ingredient_line fvil ON fvil.formulation_version_id = fv.formulation_version_id
  GROUP BY fv.formulation_version_id;

-- owner: postgres
CREATE VIEW agriculture.v_governance_review_queue AS
 SELECT gr.review_id,
    gr.review_code,
    gr.decision_id,
    gr.subject_entity_type,
    gr.subject_entity_id,
    gr.review_type,
    gr.review_status,
    gr.required_authority_role,
    gr.created_by,
    gr.created_at,
    gd.decision_code,
    gd.decision_type,
    gd.decision_status,
    gd.rationale,
    gd.evidence_summary
   FROM agriculture.governance_review gr
     LEFT JOIN agriculture.governance_decision gd ON gd.decision_id = gr.decision_id
  WHERE gr.review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text]);

-- owner: postgres
CREATE VIEW agriculture.v_governed_scientific_memory AS
 SELECT al.approved_learning_id,
    al.approved_learning_code,
    al.learning_type,
    al.learning_statement,
    al.applicability_scope,
    al.limitation_summary,
    al.evidence_packet_id,
    al.governance_decision_id,
    al.lifecycle_status,
    al.approved_by,
    al.approved_at,
    lc.subject_entity_type,
    lc.subject_entity_id,
    lc.uncertainty_summary,
    lc.contradiction_summary,
    (EXISTS ( SELECT 1
           FROM agriculture.negative_learning_register nlr
          WHERE nlr.approved_learning_id = al.approved_learning_id AND nlr.lifecycle_status = 'ACTIVE'::text)) AS has_active_negative_learning,
    ( SELECT jsonb_agg(jsonb_build_object('warning', nlr.warning_text, 'action', nlr.downstream_action, 'scope', nlr.suppression_scope)) AS jsonb_agg
           FROM agriculture.negative_learning_register nlr
          WHERE nlr.approved_learning_id = al.approved_learning_id AND nlr.lifecycle_status = 'ACTIVE'::text) AS negative_learning_controls
   FROM agriculture.approved_learning al
     JOIN agriculture.learning_candidate lc ON lc.learning_candidate_id = al.learning_candidate_id
  WHERE al.lifecycle_status = 'ACTIVE'::text;

-- owner: postgres
CREATE VIEW agriculture.v_ingredient_detail AS
 SELECT i.ingredient_id,
    i.ingredient_code,
    i.ingredient_name,
    i.lifecycle_status,
    i.material_class,
    i.preparation_class,
    i.data_class,
    i.country_code,
    i.current_version_no,
    i.created_by,
    i.created_at,
    i.updated_at,
    i.retired_at,
    iv.ingredient_version_id,
    iv.category,
    iv.foliar_compatibility,
    iv.fertigation_compatibility,
    iv.risks_contraindications,
    iv.mitigation_lever,
    iv.handling_storage_notes,
    iv.amendment_rationale,
    iv.review_status AS current_version_review_status,
    iv.approved_by,
    iv.approved_at,
    ( SELECT count(*) AS count
           FROM agriculture.ingredient_version x
          WHERE x.ingredient_id = i.ingredient_id) AS version_count,
    ( SELECT count(*) AS count
           FROM agriculture.ingredient_evidence e
          WHERE e.ingredient_id = i.ingredient_id) AS evidence_count,
    ( SELECT count(*) AS count
           FROM agriculture.audit_event a
          WHERE a.subject_entity_type = 'INGREDIENT'::text AND a.subject_entity_id = i.ingredient_id) AS audit_event_count
   FROM agriculture.ingredient i
     LEFT JOIN agriculture.ingredient_version iv ON iv.ingredient_id = i.ingredient_id AND iv.version_no = i.current_version_no;

-- owner: postgres
CREATE VIEW agriculture.v_ingredient_governance_status AS
 SELECT i.ingredient_id,
    i.ingredient_code,
    i.ingredient_name,
    i.lifecycle_status,
    i.material_class,
    i.preparation_class,
    i.data_class,
    i.country_code,
    i.current_version_no,
    iv.ingredient_version_id,
    iv.review_status AS current_version_review_status,
    iv.amendment_rationale,
    iv.approved_by,
    iv.approved_at,
    count(DISTINCT ia.ingredient_alias_id) AS alias_count,
    count(DISTINCT ie.ingredient_evidence_id) AS evidence_count,
    count(DISTINCT ie.ingredient_evidence_id) FILTER (WHERE ie.review_status = 'APPROVED'::text) AS approved_evidence_count,
    (EXISTS ( SELECT 1
           FROM agriculture.discovery_promotion_event dpe
          WHERE dpe.promoted_entity_type = 'INGREDIENT'::text AND dpe.promoted_entity_id = i.ingredient_id)) AS originated_from_discovery
   FROM agriculture.ingredient i
     LEFT JOIN agriculture.ingredient_version iv ON iv.ingredient_id = i.ingredient_id AND iv.version_no = i.current_version_no
     LEFT JOIN agriculture.ingredient_alias ia ON ia.ingredient_id = i.ingredient_id
     LEFT JOIN agriculture.ingredient_evidence ie ON ie.ingredient_id = i.ingredient_id
  GROUP BY i.ingredient_id, iv.ingredient_version_id;

-- owner: postgres
CREATE VIEW agriculture.v_ingredient_version_history AS
 SELECT iv.ingredient_version_id,
    iv.ingredient_id,
    i.ingredient_code,
    i.ingredient_name,
    iv.version_no,
    iv.category,
    iv.foliar_compatibility,
    iv.fertigation_compatibility,
    iv.risks_contraindications,
    iv.mitigation_lever,
    iv.handling_storage_notes,
    iv.amendment_rationale,
    iv.review_status,
    iv.created_by,
    ca.display_name AS created_by_name,
    iv.created_at,
    iv.approved_by,
    aa.display_name AS approved_by_name,
    iv.approved_at
   FROM agriculture.ingredient_version iv
     JOIN agriculture.ingredient i ON i.ingredient_id = iv.ingredient_id
     LEFT JOIN agriculture.actor ca ON ca.actor_id = iv.created_by
     LEFT JOIN agriculture.actor aa ON aa.actor_id = iv.approved_by;

-- owner: postgres
CREATE VIEW agriculture.v_input_integrity_gate AS
 SELECT s.input_submission_id,
    s.submission_code,
    s.subject_entity_type,
    s.subject_entity_id,
    s.submission_type,
    s.submission_status,
    s.submitted_by,
    s.submitted_at,
    count(v.input_validation_event_id) AS validation_count,
    count(v.input_validation_event_id) FILTER (WHERE v.validation_result = 'FAIL'::text) AS failed_validation_count,
    count(v.input_validation_event_id) FILTER (WHERE v.validation_result = 'WARNING'::text) AS warning_validation_count,
    count(DISTINCT pe.photo_evidence_id) FILTER (WHERE (pe.image_quality_status = ANY (ARRAY['ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text])) AND (pe.context_validation_status = ANY (ARRAY['VALIDATED'::text, 'VALIDATED_WITH_WARNINGS'::text])) AND (pe.review_status = ANY (ARRAY['APPROVED'::text, 'APPROVED_WITH_WARNINGS'::text])) AND (pe.consent_usage_status = ANY (ARRAY['APPROVED'::text, 'RESTRICTED'::text]))) AS usable_photo_count,
        CASE
            WHEN s.submission_status = 'ACCEPTED'::text AND count(v.input_validation_event_id) FILTER (WHERE v.validation_result = 'FAIL'::text) = 0 AND (s.submission_type <> 'OBSERVATION'::text OR count(DISTINCT pe.photo_evidence_id) FILTER (WHERE (pe.image_quality_status = ANY (ARRAY['ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text])) AND (pe.context_validation_status = ANY (ARRAY['VALIDATED'::text, 'VALIDATED_WITH_WARNINGS'::text])) AND (pe.review_status = ANY (ARRAY['APPROVED'::text, 'APPROVED_WITH_WARNINGS'::text])) AND (pe.consent_usage_status = ANY (ARRAY['APPROVED'::text, 'RESTRICTED'::text]))) > 0) THEN true
            ELSE false
        END AS eligible_for_downstream_quality_assessment
   FROM agriculture.input_submission s
     LEFT JOIN agriculture.input_validation_event v ON v.input_submission_id = s.input_submission_id
     LEFT JOIN agriculture.photo_evidence pe ON pe.input_submission_id = s.input_submission_id
  GROUP BY s.input_submission_id;

-- owner: postgres
CREATE VIEW agriculture.v_input_validation_queue AS
 SELECT s.input_submission_id,
    s.submission_code,
    s.subject_entity_type,
    s.subject_entity_id,
    s.submission_type,
    s.submission_status,
    s.submitted_by,
    s.submitted_at,
    s.validation_completed_at,
    vr.input_validation_run_id,
    vr.run_status AS validation_run_status,
    vr.rules_evaluated,
    vr.pass_count,
    vr.warning_count,
    vr.fail_count,
    vr.quarantine_count
   FROM agriculture.input_submission s
     LEFT JOIN LATERAL ( SELECT x.input_validation_run_id,
            x.validation_run_code,
            x.input_submission_id,
            x.run_status,
            x.validation_rule_set_version,
            x.initiated_by,
            x.started_at,
            x.completed_at,
            x.rules_evaluated,
            x.pass_count,
            x.warning_count,
            x.fail_count,
            x.quarantine_count,
            x.result_summary
           FROM agriculture.input_validation_run x
          WHERE x.input_submission_id = s.input_submission_id
          ORDER BY x.started_at DESC NULLS LAST
         LIMIT 1) vr ON true
  WHERE s.submission_status = ANY (ARRAY['RECEIVED'::text, 'VALIDATING'::text, 'QUARANTINED'::text, 'REJECTED'::text]);

-- owner: postgres
CREATE VIEW agriculture.v_learning_gate_status AS
 SELECT bee.brain_evidence_eligibility_id,
    bee.subject_entity_type,
    bee.subject_entity_id,
    bee.eligibility_status,
    bee.validation_passed,
    bee.context_complete,
    bee.quality_acceptable,
    bee.photo_requirement_satisfied,
    bee.required_review_complete,
    bee.quarantine_clear,
    bee.governance_decision_id,
    dqa.quality_status,
    dqa.completeness_status,
    dqa.context_quality,
    dqa.method_quality,
    dqa.evidence_quality,
    dqa.photo_quality,
    COALESCE(( SELECT count(*) AS count
           FROM agriculture.photo_evidence pe
          WHERE pe.subject_entity_type = bee.subject_entity_type AND pe.subject_entity_id = bee.subject_entity_id AND pe.review_status <> 'REJECTED'::text), 0::bigint) AS photo_count,
    COALESCE(( SELECT count(*) AS count
           FROM agriculture.learning_candidate lc
          WHERE lc.brain_evidence_eligibility_id = bee.brain_evidence_eligibility_id AND lc.candidate_status <> 'ARCHIVED'::text), 0::bigint) AS learning_candidate_count
   FROM agriculture.brain_evidence_eligibility bee
     LEFT JOIN agriculture.data_quality_assessment dqa ON dqa.subject_entity_type = bee.subject_entity_type AND dqa.subject_entity_id = bee.subject_entity_id;

-- owner: postgres
CREATE VIEW agriculture.v_learning_pipeline AS
 SELECT lc.learning_candidate_id,
    lc.learning_candidate_code,
    lc.candidate_type,
    lc.subject_entity_type,
    lc.subject_entity_id,
    lc.learning_statement,
    lc.uncertainty_summary,
    lc.contradiction_summary,
    lc.candidate_status,
    bee.eligibility_status,
    lc.evidence_packet_id,
    lc.governance_decision_id,
    al.approved_learning_id,
    al.approved_learning_code,
    al.lifecycle_status AS approved_learning_status,
    sme.scientific_memory_entry_id,
    sme.memory_code,
    sme.lifecycle_status AS memory_status
   FROM agriculture.learning_candidate lc
     JOIN agriculture.brain_evidence_eligibility bee ON bee.brain_evidence_eligibility_id = lc.brain_evidence_eligibility_id
     LEFT JOIN agriculture.approved_learning al ON al.learning_candidate_id = lc.learning_candidate_id
     LEFT JOIN agriculture.scientific_memory_entry sme ON sme.approved_learning_id = al.approved_learning_id AND sme.lifecycle_status = 'ACTIVE'::text;

-- owner: postgres
CREATE VIEW agriculture.v_mechanism_learning_state AS
 SELECT mh.mechanism_hypothesis_id,
    mh.mechanism_code,
    mh.subject_entity_type,
    mh.subject_entity_id,
    mh.mechanism_statement,
    mh.proposed_pathway,
    mh.expected_observable_effects,
    mh.uncertainty_summary,
    mh.confidence_status,
    mh.lifecycle_status,
    mh.evidence_packet_id,
    mh.governance_decision_id,
    mh.reviewed_by,
    mh.reviewed_at,
    count(DISTINCT kg.knowledge_gap_id) FILTER (WHERE kg.lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_INVESTIGATION'::text])) AS open_knowledge_gaps,
    count(DISTINCT cr.contradiction_record_id) FILTER (WHERE cr.lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text])) AS open_contradictions,
    count(DISTINCT al.approved_learning_id) FILTER (WHERE al.lifecycle_status = 'ACTIVE'::text) AS related_approved_learning_count,
        CASE
            WHEN mh.lifecycle_status = 'SUPPORTED'::text AND (mh.confidence_status = ANY (ARRAY['MODERATE'::text, 'HIGH'::text])) AND count(DISTINCT cr.contradiction_record_id) FILTER (WHERE (cr.lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text])) AND (cr.severity = ANY (ARRAY['HIGH'::text, 'CRITICAL'::text]))) = 0 THEN true
            ELSE false
        END AS eligible_as_governed_mechanism_memory
   FROM agriculture.mechanism_hypothesis mh
     LEFT JOIN agriculture.knowledge_gap kg ON kg.subject_entity_type = mh.subject_entity_type AND kg.subject_entity_id = mh.subject_entity_id
     LEFT JOIN agriculture.contradiction_record cr ON cr.subject_entity_type = mh.subject_entity_type AND cr.subject_entity_id = mh.subject_entity_id
     LEFT JOIN agriculture.learning_candidate lc ON lc.subject_entity_type = mh.subject_entity_type AND lc.subject_entity_id = mh.subject_entity_id
     LEFT JOIN agriculture.approved_learning al ON al.learning_candidate_id = lc.learning_candidate_id
  GROUP BY mh.mechanism_hypothesis_id;

-- owner: postgres
CREATE VIEW agriculture.v_mutation_audit_coverage AS
 SELECT c.relname AS table_name,
    t.tgname AS trigger_name
   FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'agriculture'::name AND t.tgname ~~ 'trg_%_mutation_audit'::text AND NOT t.tgisinternal
  ORDER BY c.relname;

-- owner: postgres
CREATE VIEW agriculture.v_observation_capture_status AS
 SELECT o.observation_id,
    o.observation_code,
    o.trial_id,
    o.plot_id,
    o.observation_template_version_id,
    o.observed_at,
    o.observation_status,
    o.evidence_packet_id,
    count(DISTINCT m.measurement_id) FILTER (WHERE m.measurement_status <> 'REJECTED'::text) AS measurement_count,
    count(DISTINCT pe.photo_evidence_id) FILTER (WHERE pe.review_status <> 'REJECTED'::text) AS photo_count,
    dqa.quality_status,
    dqa.completeness_status,
    bee.eligibility_status AS brain_eligibility_status,
        CASE
            WHEN o.observation_template_version_id IS NULL THEN 0::bigint
            ELSE ( SELECT count(*) AS count
               FROM agriculture.observation_template_metric otm
              WHERE otm.observation_template_version_id = o.observation_template_version_id AND otm.requirement_level = 'REQUIRED'::text AND NOT (EXISTS ( SELECT 1
                       FROM agriculture.measurement mx
                      WHERE mx.observation_id = o.observation_id AND mx.metric_definition_id = otm.metric_definition_id AND mx.measurement_status <> 'REJECTED'::text)))
        END AS missing_required_measurement_count
   FROM agriculture.observation o
     LEFT JOIN agriculture.measurement m ON m.observation_id = o.observation_id
     LEFT JOIN agriculture.photo_evidence pe ON pe.subject_entity_type = 'OBSERVATION'::text AND pe.subject_entity_id = o.observation_id
     LEFT JOIN agriculture.data_quality_assessment dqa ON dqa.subject_entity_type = 'OBSERVATION'::text AND dqa.subject_entity_id = o.observation_id
     LEFT JOIN agriculture.brain_evidence_eligibility bee ON bee.subject_entity_type = 'OBSERVATION'::text AND bee.subject_entity_id = o.observation_id
  GROUP BY o.observation_id, dqa.quality_status, dqa.completeness_status, bee.eligibility_status;

-- owner: postgres
CREATE VIEW agriculture.v_observation_evidence_readiness AS
 SELECT o.observation_id,
    o.observation_code,
    o.trial_id,
    o.plot_id,
    o.observed_at,
    o.observation_status,
    o.data_quality_assessment_id,
    o.evidence_packet_id,
    COALESCE(( SELECT count(*) AS count
           FROM agriculture.photo_evidence pe
          WHERE pe.subject_entity_type = 'OBSERVATION'::text AND pe.subject_entity_id = o.observation_id AND pe.review_status <> 'REJECTED'::text), 0::bigint) AS photo_count,
    bee.eligibility_status AS brain_eligibility_status,
    bee.validation_passed,
    bee.context_complete,
    bee.quality_acceptable,
    bee.photo_requirement_satisfied,
    bee.required_review_complete,
    bee.quarantine_clear
   FROM agriculture.observation o
     LEFT JOIN agriculture.brain_evidence_eligibility bee ON bee.subject_entity_type = 'OBSERVATION'::text AND bee.subject_entity_id = o.observation_id;

-- owner: postgres
CREATE VIEW agriculture.v_observation_science_workspace AS
 SELECT o.observation_id,
    o.observation_code,
    o.trial_id,
    t.trial_code,
    t.trial_name,
    o.plot_id,
    p.plot_code,
    p.plot_name,
    t.formulation_version_id,
    fv.version_code AS formulation_version_code,
    fv.formulation_name,
    fv.version_number,
    o.observation_template_version_id,
    ot.template_code,
    ot.template_name,
    otv.version_no AS template_version_no,
    o.observed_at,
    o.observer_id,
    a.display_name AS observer_name,
    o.observation_status,
    o.notes,
    o.country_workspace_id,
    o.created_at,
    o.updated_at,
    o.evidence_packet_id,
    ep.packet_status AS evidence_packet_status,
    ep.completeness_status AS evidence_completeness_status,
    o.data_quality_assessment_id,
    dq.quality_status,
    dq.completeness_status,
    dq.context_quality,
    dq.method_quality,
    dq.evidence_quality,
    dq.photo_quality,
    dq.review_required,
    be.eligibility_status AS brain_eligibility_status,
    be.eligibility_reason AS brain_eligibility_reason,
    ( SELECT count(*) AS count
           FROM agriculture.measurement m
          WHERE m.observation_id = o.observation_id) AS measurement_count,
    ( SELECT count(*) AS count
           FROM agriculture.photo_evidence pe
          WHERE pe.subject_entity_type = 'OBSERVATION'::text AND pe.subject_entity_id = o.observation_id AND pe.review_status <> 'REJECTED'::text) AS photo_count,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('measurement_id', m.measurement_id, 'metric_code', md.metric_code, 'metric_name', md.metric_name, 'numeric_value', m.numeric_value, 'text_value', m.text_value, 'boolean_value', m.boolean_value, 'unit', m.unit, 'measurement_status', m.measurement_status, 'source_numeric_value', m.source_numeric_value, 'source_unit', m.source_unit, 'normalization_status', m.normalization_status) ORDER BY md.metric_code) AS jsonb_agg
           FROM agriculture.measurement m
             JOIN agriculture.metric_definition md ON md.metric_definition_id = m.metric_definition_id
          WHERE m.observation_id = o.observation_id), '[]'::jsonb) AS measurements
   FROM agriculture.observation o
     JOIN agriculture.trial t ON t.trial_id = o.trial_id
     JOIN agriculture.plot p ON p.plot_id = o.plot_id
     LEFT JOIN agriculture.formulation_version fv ON fv.formulation_version_id = t.formulation_version_id
     LEFT JOIN agriculture.observation_template_version otv ON otv.observation_template_version_id = o.observation_template_version_id
     LEFT JOIN agriculture.observation_template ot ON ot.observation_template_id = otv.observation_template_id
     LEFT JOIN agriculture.actor a ON a.actor_id = o.observer_id
     LEFT JOIN agriculture.evidence_packet ep ON ep.evidence_packet_id = o.evidence_packet_id
     LEFT JOIN agriculture.data_quality_assessment dq ON dq.data_quality_assessment_id = o.data_quality_assessment_id
     LEFT JOIN agriculture.brain_evidence_eligibility be ON be.subject_entity_type = 'OBSERVATION'::text AND be.subject_entity_id = o.observation_id;

-- owner: postgres
CREATE VIEW agriculture.v_outcome_workspace AS
 SELECT o.outcome_id,
    o.outcome_code,
    o.trial_id,
    t.trial_code,
    t.trial_name,
    o.plot_id,
    p.plot_code,
    p.plot_name,
    t.formulation_version_id,
    fv.version_code AS formulation_version_code,
    fv.formulation_name,
    fv.version_number,
    o.outcome_type,
    o.outcome_status,
    o.outcome_summary,
    o.outcome_payload,
    o.evidence_packet_id,
    ep.packet_status AS evidence_packet_status,
    ep.completeness_status AS evidence_completeness_status,
    o.governance_decision_id,
    gd.decision_status AS governance_decision_status,
    o.created_by,
    o.created_at,
    o.reviewed_by,
    o.reviewed_at,
    o.country_workspace_id,
    t.lifecycle_status AS trial_lifecycle_status,
    t.outcome_status AS trial_outcome_status,
    ( SELECT count(*) AS count
           FROM agriculture.observation ob
          WHERE ob.trial_id = o.trial_id AND (o.plot_id IS NULL OR ob.plot_id = o.plot_id) AND ob.observation_status = 'REVIEWED'::text) AS reviewed_observation_count
   FROM agriculture.outcome o
     JOIN agriculture.trial t ON t.trial_id = o.trial_id
     LEFT JOIN agriculture.plot p ON p.plot_id = o.plot_id
     LEFT JOIN agriculture.formulation_version fv ON fv.formulation_version_id = t.formulation_version_id
     LEFT JOIN agriculture.evidence_packet ep ON ep.evidence_packet_id = o.evidence_packet_id
     LEFT JOIN agriculture.governance_decision gd ON gd.decision_id = o.governance_decision_id;

-- owner: postgres
CREATE VIEW agriculture.v_photo_brain_readiness AS
 SELECT pe.photo_evidence_id,
    pe.photo_evidence_code,
    pe.subject_entity_type,
    pe.subject_entity_id,
    pe.photo_type,
    pe.image_quality_status,
    pe.context_validation_status,
    pe.review_status,
    pe.consent_usage_status,
    pe.scale_reference_present,
    count(pa.photo_analysis_id) AS analysis_count,
    count(pa.photo_analysis_id) FILTER (WHERE pa.analysis_status = 'REVIEWED'::text) AS reviewed_analysis_count,
        CASE
            WHEN (pe.image_quality_status = ANY (ARRAY['ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text])) AND (pe.context_validation_status = ANY (ARRAY['VALID'::text, 'VALID_WITH_WARNINGS'::text])) AND pe.review_status = 'APPROVED'::text AND (pe.consent_usage_status = ANY (ARRAY['APPROVED_FOR_RESEARCH'::text, 'RESTRICTED'::text])) THEN true
            ELSE false
        END AS photo_evidence_usable,
        CASE
            WHEN (pe.image_quality_status = ANY (ARRAY['ACCEPTABLE'::text, 'ACCEPTABLE_WITH_WARNINGS'::text])) AND (pe.context_validation_status = ANY (ARRAY['VALID'::text, 'VALID_WITH_WARNINGS'::text])) AND pe.review_status = 'APPROVED'::text AND (pe.consent_usage_status = ANY (ARRAY['APPROVED_FOR_RESEARCH'::text, 'RESTRICTED'::text])) AND count(pa.photo_analysis_id) FILTER (WHERE pa.analysis_status = 'REVIEWED'::text) > 0 THEN true
            ELSE false
        END AS photo_brain_eligible
   FROM agriculture.photo_evidence pe
     LEFT JOIN agriculture.photo_analysis pa ON pa.photo_evidence_id = pe.photo_evidence_id
  GROUP BY pe.photo_evidence_id;

-- owner: postgres
CREATE VIEW agriculture.v_photo_evidence_readiness AS
 SELECT pe.photo_evidence_id,
    pe.photo_evidence_code,
    pe.subject_entity_type,
    pe.subject_entity_id,
    pe.photo_type,
    pe.captured_at,
    pe.uploaded_at,
    pe.width_pixels,
    pe.height_pixels,
    pe.scale_reference_present,
    pe.image_quality_status,
    pe.context_validation_status,
    pe.review_status,
    pe.consent_usage_status,
    count(DISTINCT pvr.photo_validation_result_id) AS validation_count,
    count(DISTINCT pa.photo_annotation_id) FILTER (WHERE pa.review_status <> 'REJECTED'::text) AS annotation_count,
    count(DISTINCT pif.photo_intelligence_finding_id) FILTER (WHERE pif.lifecycle_status <> 'REJECTED'::text) AS intelligence_finding_count
   FROM agriculture.photo_evidence pe
     LEFT JOIN agriculture.photo_validation_result pvr ON pvr.photo_evidence_id = pe.photo_evidence_id
     LEFT JOIN agriculture.photo_annotation pa ON pa.photo_evidence_id = pe.photo_evidence_id
     LEFT JOIN agriculture.photo_intelligence_finding pif ON pif.photo_evidence_id = pe.photo_evidence_id
  GROUP BY pe.photo_evidence_id;

-- owner: postgres
CREATE VIEW agriculture.v_private_schema_security_posture AS
 SELECT role_name,
    has_schema_privilege(role_name::name, 'agriculture'::text, 'USAGE'::text) AS schema_usage,
    has_schema_privilege(role_name::name, 'agriculture'::text, 'CREATE'::text) AS schema_create,
    (EXISTS ( SELECT 1
           FROM information_schema.role_table_grants g
          WHERE g.table_schema::name = 'agriculture'::name AND g.grantee::name = r.role_name)) AS any_direct_table_grant
   FROM ( VALUES ('anon'::text), ('authenticated'::text)) r(role_name);

-- owner: postgres
CREATE VIEW agriculture.v_reference_entity_status AS
 SELECT 'CROP'::text AS entity_type,
    crop.crop_id AS entity_id,
    crop.crop_code AS entity_code,
    crop.common_name AS entity_name,
    crop.lifecycle_status,
    crop.created_at,
    crop.updated_at,
    crop.archived_at,
    crop.archive_reason
   FROM agriculture.crop
UNION ALL
 SELECT 'VARIETY'::text AS entity_type,
    variety.variety_id AS entity_id,
    variety.variety_code AS entity_code,
    variety.variety_name AS entity_name,
    variety.lifecycle_status,
    variety.created_at,
    variety.updated_at,
    variety.archived_at,
    variety.archive_reason
   FROM agriculture.variety
UNION ALL
 SELECT 'ORGANIZATION'::text AS entity_type,
    organization.organization_id AS entity_id,
    organization.organization_code AS entity_code,
    organization.organization_name AS entity_name,
    organization.lifecycle_status,
    organization.created_at,
    organization.updated_at,
    organization.archived_at,
    organization.archive_reason
   FROM agriculture.organization
UNION ALL
 SELECT 'FARM'::text AS entity_type,
    farm.farm_id AS entity_id,
    farm.farm_code AS entity_code,
    farm.farm_name AS entity_name,
    farm.lifecycle_status,
    farm.created_at,
    farm.updated_at,
    farm.archived_at,
    farm.archive_reason
   FROM agriculture.farm
UNION ALL
 SELECT 'LOCATION'::text AS entity_type,
    location.location_id AS entity_id,
    location.location_code AS entity_code,
    location.location_name AS entity_name,
    location.lifecycle_status,
    location.created_at,
    location.updated_at,
    location.archived_at,
    location.archive_reason
   FROM agriculture.location;

-- owner: postgres
CREATE VIEW agriculture.v_resource_discovery_assessments AS
 SELECT r.run_code,
    r.country_resource_candidate_id,
    r.resource_waste_stream_id,
    r.algorithm_version,
    r.created_at AS run_at,
    a.resource_discovery_assessment_id,
    a.resource_discovery_run_id,
    a.discovery_potential_score,
    a.environmental_benefit_score,
    a.resource_availability_score,
    a.recovery_feasibility_score,
    a.scientific_novelty_score,
    a.mechanism_plausibility_score,
    a.ingredient_compatibility_potential_score,
    a.cross_domain_utility_score,
    a.evidence_strength_score,
    a.knowledge_gap_value_score,
    a.safety_concern_score,
    a.ecological_concern_score,
    a.processing_requirement_score,
    a.circular_economy_potential_score,
    a.investigation_priority_score,
    a.assessment_summary,
    a.algorithm_explanation,
    a.created_at
   FROM agriculture.resource_discovery_run r
     JOIN agriculture.resource_discovery_assessment a ON a.resource_discovery_run_id = r.resource_discovery_run_id
  WHERE r.run_status = 'COMPLETED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_resource_discovery_brain_map AS
 SELECT resource_discovery_brain_contribution_id,
    resource_discovery_run_id,
    brain_code,
    contribution_status,
    contribution_summary,
    evidence_strength,
    contribution_payload,
    created_at
   FROM agriculture.resource_discovery_brain_contribution
  ORDER BY resource_discovery_run_id, brain_code;

-- owner: postgres
CREATE VIEW agriculture.v_resource_discovery_bridge_audit AS
 SELECT rb.resource_discovery_bridge_id,
    rb.resource_discovery_run_id,
    rb.country_resource_candidate_id,
    rb.discovery_signal_id,
    rb.discovery_candidate_id,
    rb.bridge_status,
    rb.bridge_rationale,
    rb.created_by,
    rb.created_at,
    c.resource_code,
    c.resource_name,
    c.country_code,
    dc.candidate_code,
    dc.candidate_name,
    dc.candidate_object_type,
    dc.lifecycle_status AS discovery_candidate_status
   FROM agriculture.resource_discovery_bridge rb
     JOIN agriculture.country_resource_candidate c ON c.country_resource_candidate_id = rb.country_resource_candidate_id
     JOIN agriculture.discovery_candidate dc ON dc.discovery_candidate_id = rb.discovery_candidate_id;

-- owner: postgres
CREATE VIEW agriculture.v_resource_discovery_integrity_attestation AS
 SELECT 'AAB_RESOURCE_DISCOVERY_INTEGRITY_067'::text AS contract,
    (( SELECT count(*) AS count
           FROM information_schema.tables
          WHERE tables.table_schema::name = 'agriculture'::name AND (tables.table_name::name = ANY (ARRAY['aab_domain_classification'::name, 'country_resource_candidate'::name, 'country_resource_domain_relevance'::name, 'resource_waste_stream'::name, 'resource_recovery_pathway'::name, 'environmental_burden_profile'::name, 'environmental_recovery_outcome'::name, 'resource_discovery_run'::name, 'resource_discovery_assessment'::name, 'resource_discovery_brain_contribution'::name, 'resource_discovery_priority'::name, 'resource_safety_ecology_gate'::name, 'resource_discovery_scientist_review'::name, 'country_intelligence_settings'::name, 'resource_discovery_bridge'::name])))) = 15 AS required_tables_present,
    (( SELECT count(*) AS count
           FROM information_schema.routines
          WHERE routines.routine_schema::name = 'agriculture'::name AND (routines.routine_name::name = ANY (ARRAY['api_run_resource_discovery_assessment'::name, 'api_build_resource_discovery_brain_map'::name, 'api_prioritise_resource_discovery'::name, 'api_assess_resource_safety_gate'::name, 'api_submit_resource_discovery_for_review'::name, 'api_complete_resource_discovery_review'::name, 'api_bridge_resource_to_discovery_candidate'::name, 'api_validate_resource_discovery_e2e'::name])))) >= 8 AS required_functions_present,
    NOT (EXISTS ( SELECT 1
           FROM agriculture.country_intelligence_settings
          WHERE country_intelligence_settings.automatic_ingredient_promotion_allowed OR country_intelligence_settings.automatic_formulation_generation_allowed)) AS autonomy_disabled,
    true AS scientist_authority_preserved,
    now() AS attested_at;

-- owner: postgres
CREATE VIEW agriculture.v_resource_discovery_priority_queue AS
 SELECT p.resource_discovery_priority_id,
    p.resource_discovery_run_id,
    p.priority_band,
    p.investigation_priority_score,
    p.environmental_opportunity_band,
    p.scientific_opportunity_band,
    p.evidence_readiness_band,
    p.safety_attention_band,
    p.rationale,
    p.generated_at,
    r.country_resource_candidate_id,
    r.resource_waste_stream_id,
    c.resource_code,
    c.resource_name,
    c.country_code,
    c.resource_class,
    c.asset_type
   FROM agriculture.resource_discovery_priority p
     JOIN agriculture.resource_discovery_run r ON r.resource_discovery_run_id = p.resource_discovery_run_id
     JOIN agriculture.country_resource_candidate c ON c.country_resource_candidate_id = r.country_resource_candidate_id
  ORDER BY p.investigation_priority_score DESC, p.generated_at DESC;

-- owner: postgres
CREATE VIEW agriculture.v_resource_discovery_review_queue AS
 SELECT sr.resource_discovery_scientist_review_id,
    sr.resource_discovery_run_id,
    sr.review_status,
    sr.evidence_reviewed_summary,
    sr.review_rationale,
    sr.review_result,
    sr.required_follow_up,
    sr.reviewer_id,
    sr.reviewed_at,
    sr.created_by,
    sr.created_at,
    rr.run_code,
    rr.country_resource_candidate_id,
    rr.resource_waste_stream_id,
    c.resource_name,
    c.country_code,
    p.priority_band,
    p.investigation_priority_score,
    g.gate_status
   FROM agriculture.resource_discovery_scientist_review sr
     JOIN agriculture.resource_discovery_run rr ON rr.resource_discovery_run_id = sr.resource_discovery_run_id
     JOIN agriculture.country_resource_candidate c ON c.country_resource_candidate_id = rr.country_resource_candidate_id
     LEFT JOIN agriculture.resource_discovery_priority p ON p.resource_discovery_run_id = rr.resource_discovery_run_id
     LEFT JOIN agriculture.v_resource_safety_gate_latest g ON g.resource_discovery_run_id = rr.resource_discovery_run_id
  WHERE sr.review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text])
  ORDER BY p.investigation_priority_score DESC NULLS LAST, sr.created_at;

-- owner: postgres
CREATE VIEW agriculture.v_resource_recovery_intelligence AS
 SELECT resource_waste_stream_id,
    waste_stream_code,
    country_code,
    waste_stream_name,
    waste_stream_type,
    source_sector,
    generation_context,
    current_disposal_pathway,
    burning_involved,
    dumping_involved,
    landfill_involved,
    pollution_pathway,
    estimated_availability_status,
    seasonality_summary,
    contamination_status,
    known_contaminants,
    recovery_status,
    linked_country_resource_candidate_id,
    evidence_packet_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    COALESCE(( SELECT jsonb_agg(to_jsonb(rrp.*) ORDER BY rrp.created_at) AS jsonb_agg
           FROM agriculture.resource_recovery_pathway rrp
          WHERE rrp.resource_waste_stream_id = rws.resource_waste_stream_id AND rrp.lifecycle_status <> 'ARCHIVED'::text), '[]'::jsonb) AS recovery_pathways
   FROM agriculture.resource_waste_stream rws
  WHERE recovery_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_resource_safety_gate_latest AS
 SELECT DISTINCT ON (resource_discovery_run_id) resource_safety_ecology_gate_id,
    resource_discovery_run_id,
    contamination_status,
    toxicity_review_status,
    ecological_review_status,
    unknown_material_flag,
    traditional_knowledge_only_flag,
    supplier_claim_only_flag,
    gate_status,
    gate_reason,
    reviewed_by,
    reviewed_at,
    created_at
   FROM agriculture.resource_safety_ecology_gate
  ORDER BY resource_discovery_run_id, created_at DESC;

-- owner: postgres
CREATE VIEW agriculture.v_runtime_health AS
 SELECT ( SELECT count(*) AS count
           FROM agriculture.request_context
          WHERE request_context.request_status = 'FAILED'::text AND request_context.received_at >= (now() - '24:00:00'::interval)) AS failed_requests_24h,
    ( SELECT count(*) AS count
           FROM agriculture.operation_run
          WHERE operation_run.run_status = 'FAILED'::text AND operation_run.started_at >= (now() - '24:00:00'::interval)) AS failed_operations_24h,
    ( SELECT count(*) AS count
           FROM agriculture.operation_failure_event
          WHERE operation_failure_event.occurred_at >= (now() - '24:00:00'::interval)) AS failure_events_24h,
    ( SELECT count(*) AS count
           FROM agriculture.quarantined_record
          WHERE quarantined_record.quarantine_status = 'QUARANTINED'::text) AS quarantined_records,
    ( SELECT count(*) AS count
           FROM agriculture.data_quality_flag
          WHERE data_quality_flag.flag_status = 'OPEN'::text) AS open_data_quality_flags,
    ( SELECT count(*) AS count
           FROM agriculture.governance_review
          WHERE governance_review.review_status = ANY (ARRAY['PENDING'::text, 'IN_REVIEW'::text])) AS pending_governance_reviews;

-- owner: postgres
CREATE VIEW agriculture.v_scientific_memory_active AS
 SELECT m.scientific_memory_entry_id,
    m.memory_code,
    m.memory_type,
    m.memory_statement,
    m.context_scope,
    m.version_no,
    m.approved_learning_id,
    m.evidence_packet_id,
    m.governance_decision_id,
    m.created_by,
    m.created_at,
    al.learning_type,
    al.applicability_scope,
    al.limitation_summary,
    COALESCE(( SELECT count(*) AS count
           FROM agriculture.memory_evidence_link mel
          WHERE mel.scientific_memory_entry_id = m.scientific_memory_entry_id), 0::bigint) AS evidence_link_count,
    (EXISTS ( SELECT 1
           FROM agriculture.negative_learning_register nlr
          WHERE nlr.approved_learning_id = m.approved_learning_id AND nlr.lifecycle_status = 'ACTIVE'::text)) AS has_active_negative_learning
   FROM agriculture.scientific_memory_entry m
     JOIN agriculture.approved_learning al ON al.approved_learning_id = m.approved_learning_id
  WHERE m.lifecycle_status = 'ACTIVE'::text AND al.lifecycle_status = 'ACTIVE'::text;

-- owner: postgres
CREATE VIEW agriculture.v_scientific_uncertainty_register AS
 SELECT 'KNOWLEDGE_GAP'::text AS record_type,
    knowledge_gap.knowledge_gap_id AS record_id,
    knowledge_gap.gap_code AS record_code,
    knowledge_gap.subject_entity_type,
    knowledge_gap.subject_entity_id,
    knowledge_gap.gap_statement AS statement,
    knowledge_gap.priority_status AS significance,
    knowledge_gap.lifecycle_status,
    knowledge_gap.created_at
   FROM agriculture.knowledge_gap
  WHERE knowledge_gap.lifecycle_status <> 'ARCHIVED'::text
UNION ALL
 SELECT 'CONTRADICTION'::text AS record_type,
    contradiction_record.contradiction_record_id AS record_id,
    contradiction_record.contradiction_code AS record_code,
    contradiction_record.subject_entity_type,
    contradiction_record.subject_entity_id,
    contradiction_record.contradiction_summary AS statement,
    contradiction_record.severity AS significance,
    contradiction_record.lifecycle_status,
    contradiction_record.created_at
   FROM agriculture.contradiction_record
  WHERE contradiction_record.lifecycle_status <> 'ARCHIVED'::text
UNION ALL
 SELECT 'MECHANISM_HYPOTHESIS'::text AS record_type,
    mechanism_hypothesis.mechanism_hypothesis_id AS record_id,
    mechanism_hypothesis.mechanism_code AS record_code,
    mechanism_hypothesis.subject_entity_type,
    mechanism_hypothesis.subject_entity_id,
    mechanism_hypothesis.mechanism_statement AS statement,
    mechanism_hypothesis.confidence_status AS significance,
    mechanism_hypothesis.lifecycle_status,
    mechanism_hypothesis.created_at
   FROM agriculture.mechanism_hypothesis
  WHERE mechanism_hypothesis.lifecycle_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW agriculture.v_trial_learning_readiness AS
 SELECT t.trial_id,
    t.trial_code,
    t.trial_name,
    t.lifecycle_status,
    t.outcome_status,
    t.formulation_version_id,
    t.start_date,
    t.actual_end_date,
    count(DISTINCT p.plot_id) FILTER (WHERE p.lifecycle_status = 'ACTIVE'::text) AS active_plot_count,
    count(DISTINCT o.observation_id) FILTER (WHERE o.observation_status = 'VALIDATED'::text) AS validated_observation_count,
    count(DISTINCT o.observation_id) FILTER (WHERE o.observation_status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'UNDER_REVIEW'::text])) AS open_observation_count,
    count(DISTINCT oc.outcome_id) FILTER (WHERE oc.outcome_status = 'VALIDATED'::text) AS validated_outcome_count,
    count(DISTINCT lc.learning_candidate_id) FILTER (WHERE lc.candidate_status <> 'ARCHIVED'::text) AS learning_candidate_count,
        CASE
            WHEN t.lifecycle_status = 'COMPLETED'::text AND t.outcome_status = 'VALIDATED'::text AND count(DISTINCT oc.outcome_id) FILTER (WHERE oc.outcome_status = 'VALIDATED'::text) > 0 AND count(DISTINCT o.observation_id) FILTER (WHERE o.observation_status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'UNDER_REVIEW'::text])) = 0 THEN true
            ELSE false
        END AS structurally_ready_for_learning
   FROM agriculture.trial t
     LEFT JOIN agriculture.plot p ON p.trial_id = t.trial_id
     LEFT JOIN agriculture.observation o ON o.trial_id = t.trial_id
     LEFT JOIN agriculture.outcome oc ON oc.trial_id = t.trial_id
     LEFT JOIN agriculture.learning_candidate lc ON lc.subject_entity_type = 'TRIAL'::text AND lc.subject_entity_id = t.trial_id
  GROUP BY t.trial_id;

-- owner: postgres
CREATE VIEW agriculture.v_trial_progress AS
 SELECT t.trial_id,
    t.trial_code,
    t.trial_name,
    t.lifecycle_status,
    t.outcome_status,
    t.formulation_version_id,
    t.crop_id,
    t.variety_id,
    t.start_date,
    t.planned_end_date,
    t.actual_end_date,
    count(DISTINCT p.plot_id) FILTER (WHERE p.lifecycle_status <> 'ARCHIVED'::text) AS active_plot_count,
    count(DISTINCT o.observation_id) FILTER (WHERE o.observation_status <> 'ARCHIVED'::text) AS observation_count,
    count(DISTINCT oc.outcome_id) FILTER (WHERE oc.outcome_status <> 'ARCHIVED'::text) AS outcome_count
   FROM agriculture.trial t
     LEFT JOIN agriculture.plot p ON p.trial_id = t.trial_id
     LEFT JOIN agriculture.observation o ON o.trial_id = t.trial_id
     LEFT JOIN agriculture.outcome oc ON oc.trial_id = t.trial_id
  GROUP BY t.trial_id;

-- owner: postgres
CREATE VIEW agriculture.v_trial_workspace AS
 SELECT t.trial_id,
    t.trial_code,
    t.trial_name,
    t.trial_objective,
    t.protocol_summary,
    t.lifecycle_status,
    t.outcome_status,
    t.start_date,
    t.planned_end_date,
    t.actual_end_date,
    t.country_workspace_id,
    t.organization_id,
    t.farm_id,
    t.location_id,
    t.crop_id,
    t.variety_id,
    t.problem_id,
    t.formulation_version_id,
    fv.version_code AS formulation_version_code,
    fv.formulation_name,
    fv.version_number AS formulation_version_number,
    fv.formulation_type,
    fv.trial_readiness AS formulation_trial_readiness,
    fv.lifecycle_status AS formulation_lifecycle_status,
    COALESCE(p.active_plot_count, 0::bigint) AS active_plot_count,
    COALESCE(p.observation_count, 0::bigint) AS observation_count,
    COALESCE(p.outcome_count, 0::bigint) AS outcome_count,
    h.handed_off_by,
    h.handed_off_at,
    t.created_by,
    t.created_at,
    t.updated_at
   FROM agriculture.trial t
     LEFT JOIN agriculture.formulation_version fv ON fv.formulation_version_id = t.formulation_version_id
     LEFT JOIN agriculture.v_trial_progress p ON p.trial_id = t.trial_id
     LEFT JOIN agriculture.workbench_trial_handoff h ON h.trial_id = t.trial_id;

-- owner: postgres
CREATE VIEW agriculture.v_workbench_active_ingredients AS
 SELECT ingredient_id,
    ingredient_code,
    ingredient_name,
    material_class,
    preparation_class,
    data_class,
    country_code,
    current_version_no
   FROM agriculture.v_active_ingredients;

-- owner: postgres
CREATE VIEW agriculture.v_workbench_formulation_list AS
 SELECT fv.formulation_version_id,
    fv.version_code,
    fv.formulation_name,
    fv.version_number,
    fv.formulation_type,
    fv.data_class,
    fv.change_type,
    fv.change_rationale,
    fv.expected_outcomes,
    fv.derived_from_version_id,
    parent.version_code AS derived_from_version_code,
    fv.lifecycle_status,
    fv.trial_readiness,
    fv.formulation_candidate_id,
    fc.candidate_name,
    fc.candidate_status,
    fv.governance_decision_id,
    fv.created_by,
    fv.created_at,
    fv.approved_by,
    fv.approved_at,
    COALESCE(sum(vil.inclusion_rate_percent) FILTER (WHERE vil.is_active), 0::numeric) AS total_inclusion_percent,
    count(vil.formulation_version_ingredient_line_id) FILTER (WHERE vil.is_active) AS ingredient_count,
    count(t.trial_id) FILTER (WHERE t.lifecycle_status <> 'ARCHIVED'::text) AS linked_trial_count
   FROM agriculture.formulation_version fv
     LEFT JOIN agriculture.formulation_version parent ON parent.formulation_version_id = fv.derived_from_version_id
     LEFT JOIN agriculture.formulation_candidate fc ON fc.formulation_candidate_id = fv.formulation_candidate_id
     LEFT JOIN agriculture.formulation_version_ingredient_line vil ON vil.formulation_version_id = fv.formulation_version_id
     LEFT JOIN agriculture.trial t ON t.formulation_version_id = fv.formulation_version_id
  GROUP BY fv.formulation_version_id, parent.version_code, fc.candidate_name, fc.candidate_status;

-- owner: postgres
CREATE VIEW agriculture.v_workbench_selectable_ingredients AS
 SELECT i.ingredient_id,
    i.ingredient_code,
    i.ingredient_name,
    i.material_class,
    i.preparation_class,
    i.data_class,
    i.country_code,
    i.current_version_no,
    i.lifecycle_status,
    iv.ingredient_version_id AS current_ingredient_version_id,
    iv.review_status AS current_version_review_status,
    i.created_at,
    i.updated_at
   FROM agriculture.ingredient i
     JOIN agriculture.ingredient_version iv ON iv.ingredient_id = i.ingredient_id AND iv.version_no = i.current_version_no
  WHERE i.lifecycle_status = 'ACTIVE'::text AND iv.review_status = 'APPROVED'::text;
