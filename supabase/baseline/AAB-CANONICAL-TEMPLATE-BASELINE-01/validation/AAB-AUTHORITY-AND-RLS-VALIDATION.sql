-- Run only in the temporary clean-room project. Never run against the live
-- integration/control project. These checks are read-only except for local
-- transaction state and SET ROLE.

do $$
declare
  f record;
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef
      and n.nspname in (
        'public','agriculture','cognitive_core','continuity_core','country_core',
        'manufacturing_core','observation_core','platform','presentation_core',
        'regulatory_core','security_core'
      )
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
  ) then
    raise exception 'SECURITY_DEFINER_WITHOUT_FIXED_CONFIGURATION';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where grantee in ('anon','authenticated')
      and table_schema in (
        'public','agriculture','cognitive_core','continuity_core','country_core',
        'manufacturing_core','observation_core','platform','presentation_core',
        'regulatory_core','security_core'
      )
  ) then
    raise exception 'BROWSER_DIRECT_TABLE_GRANT_PRESENT';
  end if;

  if has_function_privilege('anon', 'public.aab_admin_dashboard_snapshot()', 'EXECUTE') then
    raise exception 'ANON_ADMIN_SNAPSHOT_EXECUTE_PRESENT';
  end if;
end $$;

begin;
set local role anon;
do $$
begin
  begin
    perform * from public.aab_country_participation_requests limit 1;
    raise exception 'ANON_DIRECT_PARTICIPATION_READ_UNEXPECTEDLY_SUCCEEDED';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
do $$
begin
  begin
    perform * from platform.platform_role_assignment limit 1;
    raise exception 'AUTHENTICATED_DIRECT_ROLE_READ_UNEXPECTEDLY_SUCCEEDED';
  exception when insufficient_privilege then null;
  end;

  begin
    update platform.platform_role_assignment set active = active;
    raise exception 'AUTHENTICATED_DIRECT_ROLE_UPDATE_UNEXPECTEDLY_SUCCEEDED';
  exception when insufficient_privilege then null;
  end;

  begin
    update security_core.security_alert set status = status;
    raise exception 'AUTHENTICATED_DIRECT_ALERT_RESOLUTION_UNEXPECTEDLY_SUCCEEDED';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

select 'AAB-AUTHORITY-AND-RLS-VALIDATION: PASS' as result;
