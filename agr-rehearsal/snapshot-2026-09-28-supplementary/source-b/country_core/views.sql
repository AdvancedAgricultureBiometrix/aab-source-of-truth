-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: country_core. Views: definitions, options and comments.
-- Catalog counts for country_core: functions 41, tables 72, views 9, sequences 0, rls_enabled_tables 71, constraints 427, triggers 0, policies 0, indexes 147.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW country_core.v_bootstrap_source_status AS
 SELECT adapter_code,
    adapter_name,
    adapter_type,
    configuration_status,
    automatic_candidate_capture_allowed,
    description,
    updated_at
   FROM country_core.bootstrap_source_adapter
  ORDER BY adapter_type, adapter_name;

-- owner: postgres
CREATE VIEW country_core.v_country_activation_status AS
 SELECT country_activation_id,
    country_code,
    country_name,
    nominated_head_admin_email,
    activation_status,
    expires_at,
    issued_at,
    used_at
   FROM country_core.country_activation
  ORDER BY issued_at DESC;

-- owner: postgres
CREATE VIEW country_core.v_country_foundation_integrity AS
 SELECT 'AAB_COUNTRY_FOUNDATION_099'::text AS contract,
    to_regclass('country_core.country_workspace'::text) IS NOT NULL AS tenant_foundation_present,
    to_regclass('country_core.workspace_membership'::text) IS NOT NULL AS team_model_present,
    to_regclass('country_core.national_objective'::text) IS NOT NULL AS national_objectives_present,
    to_regclass('country_core.bootstrap_scan_run'::text) IS NOT NULL AS bootstrap_scan_present,
    to_regclass('country_core.global_ingredient_knowledge'::text) IS NOT NULL AS global_ingredient_library_present,
    to_regclass('regulatory_core.dossier_passport'::text) IS NOT NULL AS dossier_passport_present,
    to_regclass('continuity_core.continuity_checkpoint'::text) IS NOT NULL AS continuity_present,
    ( SELECT count(*) AS count
           FROM country_core.global_ingredient_knowledge) AS starter_ingredient_count,
    true AS scientist_authority_preserved,
    true AS automatic_country_resource_approval_disabled,
    true AS automatic_formulation_generation_disabled,
    now() AS attested_at;

-- owner: postgres
CREATE VIEW country_core.v_country_foundation_seal AS
 SELECT contract,
    tenant_foundation_present,
    team_model_present,
    national_objectives_present,
    bootstrap_scan_present,
    global_ingredient_library_present,
    dossier_passport_present,
    continuity_present,
    starter_ingredient_count,
    scientist_authority_preserved,
    automatic_country_resource_approval_disabled,
    automatic_formulation_generation_disabled,
    attested_at,
    ( SELECT count(*) AS count
           FROM country_core.global_ingredient_knowledge
          WHERE global_ingredient_knowledge.starter_status <> 'ARCHIVED'::text) AS active_starter_ingredients,
    ( SELECT count(*) AS count
           FROM country_core.bootstrap_source_adapter
          WHERE bootstrap_source_adapter.configuration_status = 'READY'::text) AS ready_scan_sources,
    (( SELECT count(*) AS count
           FROM cron.job
          WHERE job.jobname = 'aab-hourly-continuity'::text AND job.active)) = 1 AS hourly_continuity_scheduled,
    (( SELECT count(*) AS count
           FROM cron.job
          WHERE job.jobname = 'aab-daily-impact'::text AND job.active)) = 1 AS daily_impact_scheduled,
    ( SELECT v_backup_health.continuity_status
           FROM continuity_core.v_backup_health
         LIMIT 1) AS continuity_status
   FROM country_core.v_country_foundation_integrity i;

-- owner: postgres
CREATE VIEW country_core.v_country_institution_summary AS
 SELECT o.country_workspace_id,
    o.organization_id,
    o.organization_code,
    o.organization_name,
    o.organization_type,
    o.active,
    count(DISTINCT ow.organization_workspace_id) AS internal_workspace_count,
    count(DISTINCT om.actor_id) FILTER (WHERE om.membership_status = 'ACTIVE'::text) AS member_count
   FROM country_core.organization o
     LEFT JOIN country_core.organization_workspace ow ON ow.organization_id = o.organization_id AND ow.lifecycle_status <> 'ARCHIVED'::text
     LEFT JOIN country_core.organization_membership om ON om.organization_id = o.organization_id AND om.membership_status = 'ACTIVE'::text
  GROUP BY o.country_workspace_id, o.organization_id, o.organization_code, o.organization_name, o.organization_type, o.active;

-- owner: postgres
CREATE VIEW country_core.v_daily_country_impact AS
 SELECT s.country_workspace_id,
    w.country_code,
    w.country_name,
    s.snapshot_date,
    s.metric_code,
    m.metric_name,
    m.metric_category,
    s.numeric_value,
    s.text_value,
    s.unit,
    s.value_class,
    s.evidence_summary,
    s.generated_at
   FROM country_core.daily_impact_snapshot s
     JOIN country_core.impact_metric_definition m ON m.metric_code = s.metric_code
     JOIN country_core.country_workspace w ON w.country_workspace_id = s.country_workspace_id;

-- owner: postgres
CREATE VIEW country_core.v_global_starter_ingredients AS
 SELECT global_ingredient_id,
    ingredient_code,
    ingredient_name,
    knowledge_category,
    material_class,
    source_origin,
    starter_status,
    scientific_note,
    universal_availability_claimed,
    universal_regulatory_approval_claimed
   FROM country_core.global_ingredient_knowledge
  WHERE starter_status <> 'ARCHIVED'::text;

-- owner: postgres
CREATE VIEW country_core.v_team_directory AS
 SELECT m.country_workspace_id,
    m.actor_id,
    a.display_name,
    a.actor_type,
    m.membership_role,
    m.membership_status,
    m.organization_id,
    o.organization_name,
    m.can_invite_users,
    m.can_manage_roles,
    m.can_manage_country_settings,
    m.can_access_regulatory_gate,
    m.granted_at
   FROM country_core.workspace_membership m
     JOIN agriculture.actor a ON a.actor_id = m.actor_id
     LEFT JOIN country_core.organization o ON o.organization_id = m.organization_id;

-- owner: postgres
CREATE VIEW country_core.v_workspace_summary AS
 SELECT w.country_workspace_id,
    w.workspace_code,
    w.country_code,
    w.country_name,
    w.workspace_name,
    w.lifecycle_status,
    w.default_language,
    w.timezone_name,
    w.data_residency_note,
    w.activated_at,
    w.activated_by,
    w.created_at,
    w.updated_at,
    count(m.workspace_membership_id) FILTER (WHERE m.membership_status = 'ACTIVE'::text) AS active_members,
    count(o.organization_id) FILTER (WHERE o.active) AS active_organizations
   FROM country_core.country_workspace w
     LEFT JOIN country_core.workspace_membership m ON m.country_workspace_id = w.country_workspace_id
     LEFT JOIN country_core.organization o ON o.country_workspace_id = w.country_workspace_id
  GROUP BY w.country_workspace_id;
