-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: manufacturing_core. Views: definitions, options and comments.
-- Catalog counts for manufacturing_core: functions 1, tables 4, views 1, sequences 0, rls_enabled_tables 0, constraints 29, triggers 0, policies 0, indexes 9.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW manufacturing_core.v_transfer_package_summary AS
 SELECT t.transfer_package_id,
    t.country_workspace_id,
    t.transfer_code,
    t.package_status,
    t.permitted_use,
    t.access_expires_at,
    t.generated_at,
    so.organization_name AS source_organization_name,
    dm.organization_name AS destination_manufacturer_name,
    fv.version_code,
    fv.formulation_name,
    fv.version_number,
    ( SELECT count(*) AS count
           FROM manufacturing_core.transfer_section s
          WHERE s.transfer_package_id = t.transfer_package_id) AS section_count
   FROM manufacturing_core.transfer_package t
     JOIN country_core.organization so ON so.organization_id = t.source_organization_id
     JOIN country_core.organization dm ON dm.organization_id = t.destination_manufacturer_id
     JOIN agriculture.formulation_version fv ON fv.formulation_version_id = t.formulation_version_id;
