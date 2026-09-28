-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: regulatory_core. Views: definitions, options and comments.
-- Catalog counts for regulatory_core: functions 4, tables 9, views 1, sequences 0, rls_enabled_tables 0, constraints 40, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW regulatory_core.v_dossier_passport_summary AS
 SELECT p.dossier_passport_id,
    p.country_workspace_id,
    p.passport_code,
    p.passport_name,
    p.subject_entity_type,
    p.subject_entity_id,
    p.product_category,
    p.passport_status,
    p.ownership_summary,
    p.created_by,
    p.created_at,
    p.updated_at,
    w.country_code,
    w.country_name,
    ( SELECT count(*) AS count
           FROM regulatory_core.dossier_evidence_link e
          WHERE e.dossier_passport_id = p.dossier_passport_id) AS evidence_link_count,
    ( SELECT count(*) AS count
           FROM regulatory_core.translation_run t
          WHERE t.dossier_passport_id = p.dossier_passport_id) AS translation_run_count
   FROM regulatory_core.dossier_passport p
     JOIN country_core.country_workspace w ON w.country_workspace_id = p.country_workspace_id;
