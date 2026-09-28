-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Database-level objects, read from the system catalogs.
-- Evidence of what exists, not governed code. Never edited after commit.

-- Every non-system schema in the database, its owner, and where its schema is recorded.
-- Schemas owned by supabase_admin or pgbouncer belong to the Supabase platform and are not recorded.
--   agriculture            owner postgres           snapshot-2026-09-28
--   auth                   owner supabase_admin     not recorded: Supabase-managed
--   cognitive_core         owner postgres           this supplement
--   continuity_core        owner postgres           this supplement
--   country_core           owner postgres           this supplement
--   cron                   owner supabase_admin     not recorded: Supabase-managed
--   extensions             owner postgres           not recorded: extension objects and Supabase helper functions only; the extensions are listed below
--   graphql                owner supabase_admin     not recorded: Supabase-managed
--   graphql_public         owner supabase_admin     not recorded: Supabase-managed
--   manufacturing_core     owner postgres           this supplement
--   observation_core       owner postgres           this supplement
--   pgbouncer              owner pgbouncer          not recorded: Supabase-managed
--   platform               owner postgres           snapshot-2026-09-28
--   presentation_core      owner postgres           this supplement
--   public                 owner pg_database_owner  snapshot-2026-09-28
--   realtime               owner supabase_admin     not recorded: Supabase-managed
--   regulatory_core        owner postgres           this supplement
--   security_core          owner postgres           this supplement
--   storage                owner supabase_admin     not recorded: Supabase-managed
--   supabase_migrations    owner postgres           the migration list: snapshot-2026-09-28/source-b/migrations.sql (no rows here)
--   vault                  owner supabase_admin     not recorded: Supabase-managed

-- Installed extensions.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog VERSION '1.6.4';
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions VERSION '1.11';
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions VERSION '1.3';
CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog VERSION '1.0';
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault VERSION '0.3.1';
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions VERSION '1.1';

-- Event triggers. ensure_rls (owner postgres) is the rehearsal's; its function public.rls_auto_enable() is in snapshot-2026-09-28/source-b/public/functions.sql.
-- The others are owned by supabase_admin and are part of the Supabase platform.
-- owner: postgres
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION rls_auto_enable();

-- owner: supabase_admin
CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
  WHEN TAG IN ('DROP EXTENSION')
  EXECUTE FUNCTION set_graphql_placeholder();

-- owner: supabase_admin
CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
  WHEN TAG IN ('CREATE EXTENSION')
  EXECUTE FUNCTION grant_pg_cron_access();

-- owner: supabase_admin
CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
  WHEN TAG IN ('CREATE EXTENSION')
  EXECUTE FUNCTION grant_pg_graphql_access();

-- owner: supabase_admin
CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
  WHEN TAG IN ('CREATE EXTENSION')
  EXECUTE FUNCTION grant_pg_net_access();

-- owner: supabase_admin
CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
  EXECUTE FUNCTION pgrst_ddl_watch();

-- owner: supabase_admin
CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
  EXECUTE FUNCTION pgrst_drop_watch();
