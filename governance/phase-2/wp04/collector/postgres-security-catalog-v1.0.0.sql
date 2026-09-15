-- AAB PostgreSQL Security Catalogue Collector v1.0.0 (read-only)
-- Set the two psql variables or replace their quoted values when executed by an API.
-- No function bodies, ACLs, table contents, or secret values are returned.
WITH target_functions AS (
  SELECT p.oid, n.nspname AS schema_name, p.proname AS function_name,
         pg_get_function_identity_arguments(p.oid) AS arguments,
         r.rolname AS owner,
         CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security_mode,
         md5(pg_get_functiondef(p.oid)) AS definition_md5,
         p.proacl
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_roles r ON r.oid=p.proowner
  WHERE n.nspname='public' AND p.proname LIKE 'aab\_%' ESCAPE '\'
), roles AS (SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','postgres'))
SELECT :'environment_id' AS environment_id, :'baseline_reference' AS baseline_reference,
       '1.0.0' AS collector_version, clock_timestamp() AS collected_at,
       :'correlation_id' AS correlation_id,
       format('%I.%I(%s)',t.schema_name,t.function_name,t.arguments) AS identity,
       t.owner,t.security_mode,t.definition_md5,
       ARRAY(SELECT rolname FROM roles WHERE has_schema_privilege(rolname,t.schema_name,'USAGE') ORDER BY 1) AS schema_roles_with_usage,
       ARRAY(SELECT rolname FROM roles WHERE has_function_privilege(rolname,t.oid,'EXECUTE') ORDER BY 1) AS execute_roles
FROM target_functions t ORDER BY identity;
