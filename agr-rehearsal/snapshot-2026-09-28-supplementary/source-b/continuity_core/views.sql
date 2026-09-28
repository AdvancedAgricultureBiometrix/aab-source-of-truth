-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: continuity_core. Views: definitions, options and comments.
-- Catalog counts for continuity_core: functions 1, tables 2, views 1, sequences 0, rls_enabled_tables 0, constraints 6, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW continuity_core.v_backup_health AS
 SELECT c.configuration_name,
    c.internal_checkpoint_enabled,
    c.external_backup_enabled,
    c.external_destination_type,
    c.external_destination_reference,
    c.last_external_backup_at,
    c.last_external_backup_status,
    c.retention_policy,
    x.created_at AS last_internal_checkpoint_at,
    x.checkpoint_status AS last_internal_checkpoint_status,
    x.external_backup_status,
    x.critical_state_hash,
        CASE
            WHEN c.external_backup_enabled AND x.external_backup_status = 'VERIFIED_CURRENT'::text THEN 'FULL_CONTINUITY_CONFIGURED'::text
            WHEN c.internal_checkpoint_enabled THEN 'INTERNAL_CHECKPOINT_ONLY'::text
            ELSE 'BACKUP_NOT_CONFIGURED'::text
        END AS continuity_status
   FROM continuity_core.backup_configuration c
     LEFT JOIN LATERAL ( SELECT continuity_checkpoint.continuity_checkpoint_id,
            continuity_checkpoint.checkpoint_type,
            continuity_checkpoint.checkpoint_status,
            continuity_checkpoint.database_timestamp,
            continuity_checkpoint.schema_manifest,
            continuity_checkpoint.row_count_manifest,
            continuity_checkpoint.critical_state_hash,
            continuity_checkpoint.external_backup_status,
            continuity_checkpoint.external_backup_reference,
            continuity_checkpoint.created_at
           FROM continuity_core.continuity_checkpoint
          ORDER BY continuity_checkpoint.created_at DESC
         LIMIT 1) x ON true;
