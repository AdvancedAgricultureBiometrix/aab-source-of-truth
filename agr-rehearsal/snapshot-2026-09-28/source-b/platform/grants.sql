-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: platform. Grants: schema, table, column and function privileges, and default privileges.
-- Catalog counts for platform: functions 6, tables 9, views 3, rls_enabled_tables 5, constraints 36, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- schema platform owner: postgres
-- platform.auth_actor_identity: relacl is NULL (owner default privileges only)
-- platform.domain_registry: relacl is NULL (owner default privileges only)
-- platform.entry_audit_event: relacl is NULL (owner default privileges only)
-- platform.navigation_item: relacl is NULL (owner default privileges only)
-- platform.navigation_section: relacl is NULL (owner default privileges only)
-- platform.participation_request_decision: relacl is NULL (owner default privileges only)
-- platform.platform_role_assignment: relacl is NULL (owner default privileges only)
GRANT DELETE ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT INSERT ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT MAINTAIN ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT REFERENCES ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT SELECT ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT TRIGGER ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT TRUNCATE ON TABLE platform.rehearsal_handoff_policy TO postgres;
GRANT UPDATE ON TABLE platform.rehearsal_handoff_policy TO postgres;
-- platform.support_scope_session: relacl is NULL (owner default privileges only)
-- platform.v_domain_registry: relacl is NULL (owner default privileges only)
-- platform.v_library_summary: relacl is NULL (owner default privileges only)
-- platform.v_navigation_registry: relacl is NULL (owner default privileges only)
GRANT EXECUTE ON FUNCTION platform.api_admin_snapshot(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION platform.api_admin_snapshot(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform.api_navigation_for_actor(p_actor_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION platform.api_navigation_for_actor(p_actor_id uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform.create_actor_for_current_user(p_actor_type text) TO postgres;
GRANT EXECUTE ON FUNCTION platform.current_actor_id() TO postgres;
GRANT EXECUTE ON FUNCTION platform.is_platform_admin(p_actor uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION platform.is_platform_admin(p_actor uuid) TO postgres;
GRANT EXECUTE ON FUNCTION platform.notify_participation_request_admins() TO PUBLIC;
GRANT EXECUTE ON FUNCTION platform.notify_participation_request_admins() TO postgres;
