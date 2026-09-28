-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: security_core. Grants: schema, table, sequence, column and function privileges, and default privileges.
-- Catalog counts for security_core: functions 1, tables 2, views 0, sequences 0, rls_enabled_tables 0, constraints 9, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema security_core owner: postgres
GRANT USAGE ON SCHEMA security_core TO authenticated;
GRANT CREATE ON SCHEMA security_core TO postgres;
GRANT USAGE ON SCHEMA security_core TO postgres;
-- security_core.security_alert: relacl is NULL (owner default privileges only)
-- security_core.security_brain_run: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION security_core.api_run_security_brain() TO postgres;
