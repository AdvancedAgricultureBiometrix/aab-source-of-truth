-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: platform. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for platform: functions 6, tables 9, views 3, rls_enabled_tables 5, constraints 36, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE platform.auth_actor_identity (
  auth_user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  linked_at timestamp with time zone DEFAULT now() NOT NULL,
  linked_by uuid,
  link_reason text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT auth_actor_identity_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT auth_actor_identity_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT auth_actor_identity_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT auth_actor_identity_pkey PRIMARY KEY (auth_user_id),
  CONSTRAINT auth_actor_identity_actor_id_key UNIQUE (actor_id)
);

-- owner: postgres
CREATE TABLE platform.domain_registry (
  domain_code text NOT NULL,
  domain_name text NOT NULL,
  database_schema_name text NOT NULL,
  lifecycle_status text DEFAULT 'REGISTERED'::text NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  sort_order integer DEFAULT 100 NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT domain_registry_lifecycle_status_check CHECK (lifecycle_status = ANY (ARRAY['REGISTERED'::text, 'MIGRATING'::text, 'ACTIVE'::text, 'SUSPENDED'::text])),
  CONSTRAINT domain_registry_pkey PRIMARY KEY (domain_code),
  CONSTRAINT domain_registry_database_schema_name_key UNIQUE (database_schema_name)
);

-- owner: postgres
CREATE TABLE platform.entry_audit_event (
  entry_audit_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  actor_id uuid,
  event_code text NOT NULL,
  outcome_code text NOT NULL,
  route_code text,
  country_workspace_id uuid,
  organization_id uuid,
  reason text,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT entry_audit_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT entry_audit_event_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id) ON DELETE RESTRICT,
  CONSTRAINT entry_audit_event_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id) ON DELETE RESTRICT,
  CONSTRAINT entry_audit_event_pkey PRIMARY KEY (entry_audit_event_id)
);

-- owner: postgres
CREATE TABLE platform.navigation_item (
  item_code text NOT NULL,
  section_code text NOT NULL,
  item_label text NOT NULL,
  href text NOT NULL,
  domain_code text,
  required_capability text,
  admin_only boolean DEFAULT false NOT NULL,
  sort_order integer DEFAULT 100 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT navigation_item_domain_code_fkey FOREIGN KEY (domain_code) REFERENCES platform.domain_registry(domain_code),
  CONSTRAINT navigation_item_section_code_fkey FOREIGN KEY (section_code) REFERENCES platform.navigation_section(section_code),
  CONSTRAINT navigation_item_pkey PRIMARY KEY (item_code)
);

-- owner: postgres
CREATE TABLE platform.navigation_section (
  section_code text NOT NULL,
  section_label text NOT NULL,
  sort_order integer NOT NULL,
  admin_only boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT navigation_section_pkey PRIMARY KEY (section_code)
);

-- owner: postgres
CREATE TABLE platform.participation_request_decision (
  decision_id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  previous_status text NOT NULL,
  decision_status text NOT NULL,
  rationale text NOT NULL,
  decided_by uuid NOT NULL,
  decided_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT participation_request_decision_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT participation_request_decision_request_id_fkey FOREIGN KEY (request_id) REFERENCES aab_country_participation_requests(id) ON DELETE RESTRICT,
  CONSTRAINT participation_request_decision_pkey PRIMARY KEY (decision_id)
);

-- owner: postgres
CREATE TABLE platform.platform_role_assignment (
  platform_role_assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid NOT NULL,
  role_code text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  granted_by uuid,
  grant_reason text NOT NULL,
  revoked_at timestamp with time zone,
  revoked_by uuid,
  CONSTRAINT platform_role_assignment_role_code_check CHECK (role_code = ANY (ARRAY['AAB_PLATFORM_OWNER'::text, 'AAB_PLATFORM_SUPPORT'::text])),
  CONSTRAINT platform_role_assignment_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT platform_role_assignment_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT platform_role_assignment_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT platform_role_assignment_pkey PRIMARY KEY (platform_role_assignment_id),
  CONSTRAINT platform_role_assignment_actor_id_role_code_key UNIQUE (actor_id, role_code)
);
COMMENT ON TABLE platform.platform_role_assignment IS 'Direct governed AAB platform authority. AAB_PLATFORM_OWNER is global support authority, not scientific approval authority.';

-- owner: postgres
CREATE TABLE platform.rehearsal_handoff_policy (
  policy_code text NOT NULL,
  shared_secret_sha256 text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rehearsal_handoff_policy_policy_code_check CHECK (policy_code = 'MAIN_AAB_TO_WA_REHEARSAL'::text),
  CONSTRAINT rehearsal_handoff_policy_shared_secret_sha256_check CHECK (shared_secret_sha256 ~ '^[0-9a-f]{64}$'::text),
  CONSTRAINT rehearsal_handoff_policy_pkey PRIMARY KEY (policy_code)
);

-- owner: postgres
CREATE TABLE platform.support_scope_session (
  support_scope_session_id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_actor_id uuid NOT NULL,
  country_workspace_id uuid,
  organization_id uuid,
  target_actor_id uuid,
  support_reason text NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  CONSTRAINT support_scope_session_check CHECK (expires_at > started_at),
  CONSTRAINT support_scope_session_check1 CHECK (country_workspace_id IS NOT NULL OR organization_id IS NOT NULL OR target_actor_id IS NOT NULL),
  CONSTRAINT support_scope_session_support_reason_check CHECK (length(btrim(support_reason)) >= 12),
  CONSTRAINT support_scope_session_country_workspace_id_fkey FOREIGN KEY (country_workspace_id) REFERENCES country_core.country_workspace(country_workspace_id) ON DELETE RESTRICT,
  CONSTRAINT support_scope_session_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES country_core.organization(organization_id) ON DELETE RESTRICT,
  CONSTRAINT support_scope_session_owner_actor_id_fkey FOREIGN KEY (owner_actor_id) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT support_scope_session_target_actor_id_fkey FOREIGN KEY (target_actor_id) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT support_scope_session_pkey PRIMARY KEY (support_scope_session_id)
);
