-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: continuity_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for continuity_core: functions 1, tables 2, views 1, sequences 0, rls_enabled_tables 0, constraints 6, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION continuity_core.api_create_continuity_checkpoint(p_type text DEFAULT 'HOURLY_INTERNAL'::text)
 RETURNS continuity_core.continuity_checkpoint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'continuity_core', 'country_core', 'agriculture', 'observation_core', 'regulatory_core', 'extensions', 'public'
AS $function$
declare r continuity_core.continuity_checkpoint; schema_json jsonb; counts jsonb; h text; ext_status text; ext_ref text;
begin
 select jsonb_agg(jsonb_build_object('schema',n.nspname,'object_count',(select count(*) from pg_class c where c.relnamespace=n.oid and c.relkind in ('r','v','m'))) order by n.nspname)
 into schema_json from pg_namespace n where n.nspname in ('agriculture','country_core','observation_core','regulatory_core','platform');
 counts:=jsonb_build_object(
  'country_workspaces',(select count(*) from country_core.country_workspace),
  'actors',(select count(*) from agriculture.actor),
  'ingredients',(select count(*) from agriculture.ingredient),
  'starter_ingredients',(select count(*) from country_core.global_ingredient_knowledge),
  'formulation_versions',(select count(*) from agriculture.formulation_version),
  'trials',(select count(*) from agriculture.trial),
  'observations',(select count(*) from agriculture.observation),
  'community_observations',(select count(*) from observation_core.observation),
  'country_resources',(select count(*) from agriculture.country_resource_candidate),
  'waste_streams',(select count(*) from agriculture.resource_waste_stream),
  'dossier_passports',(select count(*) from regulatory_core.dossier_passport)
 );
 h:=encode(extensions.digest((coalesce(schema_json::text,'')||'|'||coalesce(counts::text,'')||'|'||(select coalesce(max(migration_code),'') from agriculture.schema_migration))::bytea,'sha256'),'hex');
 select case when not external_backup_enabled then 'NOT_CONFIGURED' when last_external_backup_status='PASS' and last_external_backup_at>now()-interval '2 hours' then 'VERIFIED_CURRENT' when last_external_backup_status='FAIL' then 'FAILED' else 'STALE' end,external_destination_reference into ext_status,ext_ref from continuity_core.backup_configuration where configuration_name='AAB_PRIMARY_CONTINUITY';
 insert into continuity_core.continuity_checkpoint(checkpoint_type,checkpoint_status,schema_manifest,row_count_manifest,critical_state_hash,external_backup_status,external_backup_reference)
 values(p_type,case when ext_status='FAILED' then 'WARNING' else 'PASS' end,coalesce(schema_json,'[]'::jsonb),counts,h,ext_status,ext_ref) returning * into r;
 return r;
end $function$
;
