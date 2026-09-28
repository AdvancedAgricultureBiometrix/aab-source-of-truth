-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: platform. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for platform: functions 6, tables 9, views 3, rls_enabled_tables 5, constraints 36, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION platform.api_admin_snapshot(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'platform', 'agriculture', 'public'
AS $function$
DECLARE is_admin boolean; result jsonb;
BEGIN
  is_admin := agriculture.api_actor_has_capability(p_actor_id,'administer',NULL);
  SELECT jsonb_build_object(
    'administer_allowed',is_admin,
    'domains',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.sort_order) FROM platform.v_domain_registry d),'[]'::jsonb),
    'countries',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.country_name) FROM agriculture.country_scope c),'[]'::jsonb),
    'actors',CASE WHEN is_admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC) FROM agriculture.actor a),'[]'::jsonb) ELSE '[]'::jsonb END,
    'access_profiles',CASE WHEN is_admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(ap) ORDER BY ap.access_profile_code) FROM agriculture.access_profile ap WHERE ap.active),'[]'::jsonb) ELSE '[]'::jsonb END,
    'authority_roles',CASE WHEN is_admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(ar) ORDER BY ar.role_code) FROM agriculture.authority_role ar WHERE ar.active),'[]'::jsonb) ELSE '[]'::jsonb END,
    'migration_count',(SELECT count(*) FROM agriculture.schema_migration),
    'latest_migration',(SELECT migration_code FROM agriculture.schema_migration ORDER BY applied_at DESC LIMIT 1),
    'runtime_health',(SELECT to_jsonb(h) FROM agriculture.v_runtime_health h LIMIT 1),
    'integrity_attestation',(SELECT to_jsonb(i) FROM agriculture.v_agriculture_integrity_attestation i LIMIT 1),
    'library_summary',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.library_name) FROM platform.v_library_summary l),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION platform.api_navigation_for_actor(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'platform', 'agriculture', 'country_core', 'public'
AS $function$
declare
 is_admin boolean;
 is_community boolean;
 is_country_member boolean;
 is_country_admin boolean;
 is_institution_member boolean;
 is_regulatory boolean;
 result jsonb;
begin
 is_admin:=agriculture.api_actor_has_capability(p_actor_id,'administer',null);
 is_community:=agriculture.api_actor_has_capability(p_actor_id,'community_capture',null) and not agriculture.api_actor_has_capability(p_actor_id,'read',null);
 select exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE') into is_country_member;
 select exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.membership_role in ('HEAD_ADMIN','COUNTRY_ADMIN')) into is_country_admin;
 select exists(select 1 from country_core.organization_membership om where om.actor_id=p_actor_id and om.membership_status='ACTIVE') into is_institution_member;
 select exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and (wm.membership_role in ('HEAD_ADMIN','REGULATORY_ADMIN') or wm.can_access_regulatory_gate)) into is_regulatory;
 select jsonb_build_object(
  'domains',case when is_community then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('domain_code',d.domain_code,'domain_name',d.domain_name,'lifecycle_status',d.lifecycle_status,'enabled',d.enabled) order by d.sort_order) from platform.domain_registry d),'[]'::jsonb) end,
  'sections',coalesce((select jsonb_agg(section_obj order by section_sort) from (
    select n.section_sort,n.section_code,n.section_label,
      jsonb_build_object('section_code',n.section_code,'section_label',n.section_label,'items',jsonb_agg(jsonb_build_object('item_code',n.item_code,'item_label',n.item_label,'href',n.href,'domain_code',n.domain_code,'required_capability',n.required_capability) order by n.item_sort)) section_obj
    from platform.v_navigation_registry n
    where (not n.section_admin_only or is_admin) and (not n.admin_only or is_admin)
      and ((is_community and n.item_code='community_capture') or (not is_community and (
        n.required_capability is null
        or n.required_capability='read' and agriculture.api_actor_has_capability(p_actor_id,'read',null)
        or n.required_capability='read_audit' and agriculture.api_actor_has_capability(p_actor_id,'read_audit',null)
        or n.required_capability='administer' and is_admin
        or n.required_capability='review' and agriculture.api_actor_has_capability(p_actor_id,'review',null)
        or n.required_capability='country_member' and is_country_member
        or n.required_capability='country_admin' and is_country_admin
        or n.required_capability='institution_member' and is_institution_member
        or n.required_capability='regulatory' and is_regulatory
      )))
    group by n.section_sort,n.section_code,n.section_label
  ) q),'[]'::jsonb),
  'administer_allowed',is_admin,
  'community_only',is_community,
  'country_member',is_country_member,
  'country_admin',is_country_admin,
  'institution_member',is_institution_member,
  'regulatory_allowed',is_regulatory
 ) into result;
 return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION platform.create_actor_for_current_user(p_actor_type text DEFAULT 'USER'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform', 'agriculture', 'auth'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_actor_id uuid;
  v_type text := upper(coalesce(p_actor_type,'USER'));
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATED_VERIFIED_EMAIL_REQUIRED' using errcode='28000';
  end if;
  select lower(btrim(u.email)) into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null
    and u.deleted_at is null
    and coalesce(u.is_anonymous, false) is false;
  if coalesce(v_email, '') = '' then
    raise exception 'VERIFIED_EMAIL_REQUIRED' using errcode='28000';
  end if;
  if v_type not in ('USER','SCIENTIST','ADMIN') then v_type := 'USER'; end if;

  select i.actor_id into v_actor_id
  from platform.auth_actor_identity i
  where i.auth_user_id=v_user_id and i.active;
  if v_actor_id is not null then return v_actor_id; end if;

  insert into agriculture.actor(external_subject,display_name,actor_type,active)
  values('supabase-auth:'||v_user_id::text,v_email,v_type,true)
  returning actor_id into v_actor_id;

  insert into platform.auth_actor_identity(auth_user_id,actor_id,link_reason)
  values(v_user_id,v_actor_id,'Created through governed AAB activation or invitation claim');
  return v_actor_id;
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION platform.current_actor_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform', 'agriculture', 'auth'
AS $function$
  select i.actor_id
  from platform.auth_actor_identity i
  join agriculture.actor a on a.actor_id = i.actor_id
  where i.auth_user_id = auth.uid() and i.active and a.active
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION platform.is_platform_admin(p_actor uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform'
AS $function$
  select exists(select 1 from platform.platform_role_assignment
    where actor_id=p_actor and active and role_code in ('AAB_PLATFORM_OWNER','AAB_PLATFORM_SUPPORT'))
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION platform.notify_participation_request_admins()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform', 'country_core', 'public'
AS $function$
declare v_actor uuid;
begin
  for v_actor in select actor_id from platform.platform_role_assignment
    where active and role_code in ('AAB_PLATFORM_OWNER','AAB_PLATFORM_SUPPORT') loop
    insert into country_core.action_item(assigned_actor_id,action_type,title,summary,source_entity_type,source_entity_id,priority)
    values(v_actor,'PARTICIPATION_REQUEST_REVIEW','Review '||new.reference,
      new.country_name||coalesce(' · '||new.jurisdiction_name,''),'AAB_COUNTRY_PARTICIPATION_REQUEST',new.id,'HIGH');
    insert into country_core.notification(actor_id,notification_type,title,message,severity,source_entity_type,source_entity_id)
    values(v_actor,'PARTICIPATION_REQUEST_RECEIVED','New AAB participation request',
      new.reference||' requires administrative review.','INFO','AAB_COUNTRY_PARTICIPATION_REQUEST',new.id);
  end loop;
  return new;
end $function$
;
