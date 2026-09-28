-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: manufacturing_core. Grants: schema, table, sequence, column and function privileges, and default privileges.
-- Catalog counts for manufacturing_core: functions 1, tables 4, views 1, sequences 0, rls_enabled_tables 0, constraints 29, triggers 0, policies 0, indexes 9.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema manufacturing_core owner: postgres
-- manufacturing_core.manufacturer_access_grant: relacl is NULL (owner default privileges only)
-- manufacturing_core.manufacturing_batch: relacl is NULL (owner default privileges only)
-- manufacturing_core.transfer_package: relacl is NULL (owner default privileges only)
-- manufacturing_core.transfer_section: relacl is NULL (owner default privileges only)
-- manufacturing_core.v_transfer_package_summary: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION manufacturing_core.api_generate_transfer_package(p_actor_id uuid, p_country_workspace_id uuid, p_source_organization_id uuid, p_destination_manufacturer_id uuid, p_formulation_version_id uuid, p_permitted_use text, p_access_expires_at timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION manufacturing_core.api_generate_transfer_package(p_actor_id uuid, p_country_workspace_id uuid, p_source_organization_id uuid, p_destination_manufacturer_id uuid, p_formulation_version_id uuid, p_permitted_use text, p_access_expires_at timestamp with time zone) TO postgres;
