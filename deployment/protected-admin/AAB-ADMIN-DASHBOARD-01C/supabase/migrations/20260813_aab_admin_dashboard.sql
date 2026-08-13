-- AAB-ADMIN-DASHBOARD-01
-- Platform-owner-only participation review. Approval never provisions a country.

create table if not exists platform.participation_request_decision (
  decision_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.aab_country_participation_requests(id) on delete restrict,
  previous_status text not null,
  decision_status text not null,
  rationale text not null,
  decided_by uuid not null references agriculture.actor(actor_id) on delete restrict,
  decided_at timestamptz not null default now()
);

revoke all on platform.participation_request_decision from public, anon, authenticated;

do $$
declare v_user uuid; v_actor uuid;
begin
  select id into v_user from auth.users where lower(email)='david.gorey4@icloud.com' limit 1;
  select actor_id into v_actor from agriculture.actor where lower(display_name)='david@aab.ag' limit 1;
  if v_user is null or v_actor is null then
    raise exception 'AAB_PLATFORM_OWNER_IDENTITY_NOT_FOUND';
  end if;
  insert into platform.auth_actor_identity(auth_user_id,actor_id,linked_by,link_reason,active)
  values(v_user,v_actor,v_actor,'Initial AAB platform-owner Supabase identity bridge',true)
  on conflict (auth_user_id) do update set actor_id=excluded.actor_id,active=true,link_reason=excluded.link_reason;
  insert into platform.platform_role_assignment(actor_id,role_code,active,granted_by,grant_reason)
  values(v_actor,'AAB_PLATFORM_OWNER',true,v_actor,'Initial AAB platform owner')
  on conflict(actor_id,role_code) do update set active=true,revoked_at=null,revoked_by=null;
end $$;

create or replace function platform.is_platform_admin(p_actor uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,platform as $$
  select exists(select 1 from platform.platform_role_assignment
    where actor_id=p_actor and active and role_code in ('AAB_PLATFORM_OWNER','AAB_PLATFORM_SUPPORT'))
$$;

create or replace function public.aab_admin_dashboard_snapshot()
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public,platform,country_core,agriculture as $$
declare v_actor uuid; v_result jsonb;
begin
  v_actor:=platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode='42501';
  end if;
  select jsonb_build_object(
    'actor',jsonb_build_object('actor_id',a.actor_id,'display_name',a.display_name),
    'counts',jsonb_build_object(
      'pending_requests',(select count(*) from public.aab_country_participation_requests where review_status='PENDING_REVIEW'),
      'information_required',(select count(*) from public.aab_country_participation_requests where review_status='MORE_INFORMATION_REQUIRED'),
      'approved_unprovisioned',(select count(*) from public.aab_country_participation_requests where review_status='APPROVED'),
      'countries',(select count(*) from country_core.country_workspace)
    ),
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at desc)
      from public.aab_country_participation_requests r),'[]'::jsonb),
    'countries',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at desc)
      from country_core.country_workspace w),'[]'::jsonb),
    'recent_decisions',coalesce((select jsonb_agg(to_jsonb(d) order by d.decided_at desc)
      from (select * from platform.participation_request_decision order by decided_at desc limit 50) d),'[]'::jsonb),
    'guardrails',jsonb_build_object(
      'approval_provisions_country',false,
      'separate_provisioning_confirmation_required',true,
      'browser_role_assignment_allowed',false
    )
  ) into v_result from agriculture.actor a where a.actor_id=v_actor;
  return coalesce(v_result,'{}'::jsonb);
end $$;

create or replace function public.aab_admin_review_participation_request(
  p_request_id uuid,p_decision text,p_rationale text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,platform,country_core,agriculture as $$
declare v_actor uuid; v_old text; v_new text; v_reference text;
begin
  v_actor:=platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode='42501';
  end if;
  v_new:=upper(btrim(coalesce(p_decision,'')));
  if v_new not in ('MORE_INFORMATION_REQUIRED','APPROVED','DECLINED') then raise exception 'INVALID_REVIEW_DECISION'; end if;
  if length(btrim(coalesce(p_rationale,'')))<12 then raise exception 'MEANINGFUL_REVIEW_RATIONALE_REQUIRED'; end if;
  select review_status,reference into v_old,v_reference
  from public.aab_country_participation_requests where id=p_request_id for update;
  if v_old is null then raise exception 'PARTICIPATION_REQUEST_NOT_FOUND'; end if;
  if v_old not in ('PENDING_REVIEW','MORE_INFORMATION_REQUIRED') then raise exception 'REQUEST_ALREADY_DECIDED'; end if;
  update public.aab_country_participation_requests set review_status=v_new,reviewed_at=now(),
    reviewed_by=auth.uid(),review_notes=btrim(p_rationale) where id=p_request_id;
  insert into platform.participation_request_decision(request_id,previous_status,decision_status,rationale,decided_by)
  values(p_request_id,v_old,v_new,btrim(p_rationale),v_actor);
  update country_core.action_item set action_status='DONE',completed_at=now()
    where assigned_actor_id=v_actor and source_entity_type='AAB_COUNTRY_PARTICIPATION_REQUEST'
      and source_entity_id=p_request_id and action_status in ('OPEN','IN_PROGRESS');
  return jsonb_build_object('ok',true,'reference',v_reference,'status',v_new,
    'country_provisioned',false,'provisioning_confirmation_required',v_new='APPROVED');
end $$;

create or replace function platform.notify_participation_request_admins()
returns trigger language plpgsql security definer
set search_path=pg_catalog,platform,country_core,public as $$
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
end $$;

drop trigger if exists aab_notify_participation_request_admins on public.aab_country_participation_requests;
create trigger aab_notify_participation_request_admins after insert on public.aab_country_participation_requests
for each row execute function platform.notify_participation_request_admins();

-- Backfill the already-submitted request into the owner's action centre.
insert into country_core.action_item(assigned_actor_id,action_type,title,summary,source_entity_type,source_entity_id,priority)
select pra.actor_id,'PARTICIPATION_REQUEST_REVIEW','Review '||r.reference,
 r.country_name||coalesce(' · '||r.jurisdiction_name,''),'AAB_COUNTRY_PARTICIPATION_REQUEST',r.id,'HIGH'
from public.aab_country_participation_requests r
cross join platform.platform_role_assignment pra
where r.review_status='PENDING_REVIEW' and pra.active and pra.role_code='AAB_PLATFORM_OWNER'
and not exists(select 1 from country_core.action_item ai where ai.assigned_actor_id=pra.actor_id
 and ai.source_entity_type='AAB_COUNTRY_PARTICIPATION_REQUEST' and ai.source_entity_id=r.id);

insert into platform.navigation_section(section_code,section_label,sort_order,admin_only,active)
values('AAB_ADMIN','AAB Administration',5,true,true)
on conflict(section_code) do update set section_label=excluded.section_label,admin_only=true,active=true;
insert into platform.navigation_item(item_code,section_code,item_label,href,required_capability,admin_only,sort_order,active)
values('aab_admin_dashboard','AAB_ADMIN','AAB Admin Dashboard','/aab-local/app/_rebuild/aab-admin.html',null,true,1,true)
on conflict(item_code) do update set href=excluded.href,item_label=excluded.item_label,admin_only=true,active=true;

revoke all on function public.aab_admin_dashboard_snapshot() from public,anon;
revoke all on function public.aab_admin_review_participation_request(uuid,text,text) from public,anon;
grant execute on function public.aab_admin_dashboard_snapshot() to authenticated;
grant execute on function public.aab_admin_review_participation_request(uuid,text,text) to authenticated;
