-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: regulatory_core. Grants: schema, table, sequence, column and function privileges, and default privileges.
-- Catalog counts for regulatory_core: functions 4, tables 9, views 1, sequences 0, rls_enabled_tables 0, constraints 40, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema regulatory_core owner: postgres
-- regulatory_core.dossier_evidence_link: relacl is NULL (owner default privileges only)
-- regulatory_core.dossier_passport: relacl is NULL (owner default privileges only)
-- regulatory_core.jurisdiction: relacl is NULL (owner default privileges only)
-- regulatory_core.regulatory_authority: relacl is NULL (owner default privileges only)
-- regulatory_core.regulatory_change_event: relacl is NULL (owner default privileges only)
-- regulatory_core.regulatory_requirement: relacl is NULL (owner default privileges only)
-- regulatory_core.regulatory_source: relacl is NULL (owner default privileges only)
-- regulatory_core.requirement_assessment: relacl is NULL (owner default privileges only)
-- regulatory_core.translation_run: relacl is NULL (owner default privileges only)
-- regulatory_core.v_dossier_passport_summary: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION regulatory_core.api_actor_can_access_regulatory(p_actor_id uuid, p_workspace_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION regulatory_core.api_actor_can_access_regulatory(p_actor_id uuid, p_workspace_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION regulatory_core.api_create_dossier_passport(p_workspace_id uuid, p_passport_name text, p_subject_type text, p_subject_id uuid, p_product_category text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION regulatory_core.api_create_dossier_passport(p_workspace_id uuid, p_passport_name text, p_subject_type text, p_subject_id uuid, p_product_category text, p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION regulatory_core.api_regulatory_context(p_actor_id uuid, p_workspace_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION regulatory_core.api_regulatory_context(p_actor_id uuid, p_workspace_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION regulatory_core.api_run_dossier_translation(p_passport_id uuid, p_destination_jurisdiction text, p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION regulatory_core.api_run_dossier_translation(p_passport_id uuid, p_destination_jurisdiction text, p_actor_id uuid) TO postgres;
