-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: continuity_core. Grants: schema, table, sequence, column and function privileges, and default privileges.
-- Catalog counts for continuity_core: functions 1, tables 2, views 1, sequences 0, rls_enabled_tables 0, constraints 6, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema continuity_core owner: postgres
-- continuity_core.backup_configuration: relacl is NULL (owner default privileges only)
-- continuity_core.continuity_checkpoint: relacl is NULL (owner default privileges only)
-- continuity_core.v_backup_health: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION continuity_core.api_create_continuity_checkpoint(p_type text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION continuity_core.api_create_continuity_checkpoint(p_type text) TO postgres;
