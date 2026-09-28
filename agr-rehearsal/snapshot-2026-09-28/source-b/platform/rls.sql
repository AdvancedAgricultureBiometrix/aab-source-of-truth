-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: platform. Row level security: the enabled/forced setting of every table, and every policy.
-- Catalog counts for platform: functions 6, tables 9, views 3, rls_enabled_tables 5, constraints 36, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- platform.auth_actor_identity: row level security ENABLED
ALTER TABLE platform.auth_actor_identity ENABLE ROW LEVEL SECURITY;
-- platform.domain_registry: row level security DISABLED
-- platform.entry_audit_event: row level security ENABLED
ALTER TABLE platform.entry_audit_event ENABLE ROW LEVEL SECURITY;
-- platform.navigation_item: row level security DISABLED
-- platform.navigation_section: row level security DISABLED
-- platform.participation_request_decision: row level security DISABLED
-- platform.platform_role_assignment: row level security ENABLED
ALTER TABLE platform.platform_role_assignment ENABLE ROW LEVEL SECURITY;
-- platform.rehearsal_handoff_policy: row level security ENABLED
ALTER TABLE platform.rehearsal_handoff_policy ENABLE ROW LEVEL SECURITY;
-- platform.support_scope_session: row level security ENABLED
ALTER TABLE platform.support_scope_session ENABLE ROW LEVEL SECURITY;
