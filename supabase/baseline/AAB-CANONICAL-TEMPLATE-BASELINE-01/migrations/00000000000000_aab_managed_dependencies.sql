-- AAB-CANONICAL-TEMPLATE-BASELINE-01
-- Apply first in an empty Supabase project after explicit approval.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise exception 'AAB_REQUIRES_SUPABASE_MANAGED_AUTH_SCHEMA';
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise exception 'AAB_REQUIRES_SUPABASE_MANAGED_STORAGE_SCHEMA';
  end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

do $$
begin
  if not exists (
    select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace
    where e.extname='pgcrypto' and n.nspname='extensions'
  ) then
    raise exception 'AAB_PGCRYPTO_DEPENDENCY_FAILED';
  end if;
  if not exists (select 1 from pg_extension where extname='pg_cron')
     or to_regclass('cron.job') is null then
    raise exception 'AAB_PG_CRON_DEPENDENCY_FAILED';
  end if;
end $$;

-- No cron jobs are scheduled by this baseline. Scheduling creates runtime
-- state and remains a separately approved operational action.
