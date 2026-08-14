begin;

-- WHY: Supabase schema dumps intentionally omit event triggers. Reproduce only
-- the verified AAB fail-closed trigger; Supabase-managed event triggers remain
-- the responsibility of the target project.
drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- WHY: new public objects must never inherit browser table, sequence or
-- function authority merely because a migration omitted an explicit grant.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

commit;
