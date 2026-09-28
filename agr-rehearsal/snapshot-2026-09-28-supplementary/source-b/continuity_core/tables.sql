-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: continuity_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for continuity_core: functions 1, tables 2, views 1, sequences 0, rls_enabled_tables 0, constraints 6, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE continuity_core.backup_configuration (
  backup_configuration_id uuid DEFAULT gen_random_uuid() NOT NULL,
  configuration_name text NOT NULL,
  backup_scope text DEFAULT 'FULL_AAB_DATABASE'::text NOT NULL,
  schedule_description text DEFAULT 'Hourly continuity checkpoint; external disaster backup separately configured.'::text NOT NULL,
  internal_checkpoint_enabled boolean DEFAULT true NOT NULL,
  external_backup_enabled boolean DEFAULT false NOT NULL,
  external_destination_type text,
  external_destination_reference text,
  last_external_backup_at timestamp with time zone,
  last_external_backup_status text,
  retention_policy text DEFAULT 'External retention not configured'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT backup_configuration_pkey PRIMARY KEY (backup_configuration_id),
  CONSTRAINT backup_configuration_configuration_name_key UNIQUE (configuration_name)
);

-- owner: postgres
CREATE TABLE continuity_core.continuity_checkpoint (
  continuity_checkpoint_id uuid DEFAULT gen_random_uuid() NOT NULL,
  checkpoint_type text NOT NULL,
  checkpoint_status text NOT NULL,
  database_timestamp timestamp with time zone DEFAULT now() NOT NULL,
  schema_manifest jsonb NOT NULL,
  row_count_manifest jsonb NOT NULL,
  critical_state_hash text NOT NULL,
  external_backup_status text NOT NULL,
  external_backup_reference text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT continuity_checkpoint_checkpoint_status_check CHECK (checkpoint_status = ANY (ARRAY['PASS'::text, 'WARNING'::text, 'FAIL'::text])),
  CONSTRAINT continuity_checkpoint_checkpoint_type_check CHECK (checkpoint_type = ANY (ARRAY['HOURLY_INTERNAL'::text, 'MANUAL'::text, 'PRE_MIGRATION'::text, 'POST_MIGRATION'::text])),
  CONSTRAINT continuity_checkpoint_external_backup_status_check CHECK (external_backup_status = ANY (ARRAY['NOT_CONFIGURED'::text, 'CONFIGURED_UNVERIFIED'::text, 'VERIFIED_CURRENT'::text, 'STALE'::text, 'FAILED'::text])),
  CONSTRAINT continuity_checkpoint_pkey PRIMARY KEY (continuity_checkpoint_id)
);
