-- Route the platform owner to the new consolidated dashboard and backfill the first notification.
update platform.navigation_item set href='/aab-local/app/_rebuild/aab-admin.html'
where item_code='aab_admin_dashboard';

create or replace function public.aab_resolve_entry()
returns jsonb language plpgsql security definer
set search_path='pg_catalog','public','platform','country_core','agriculture','auth' as $$
declare v_actor_id uuid; v_ws country_core.workspace_membership; v_org country_core.organization_membership; v_route text; v_route_code text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
 v_actor_id:=platform.current_actor_id();
 if v_actor_id is null then return jsonb_build_object('ok',false,'state','CLAIM_REQUIRED','route','/enter-aab'); end if;
 if platform.is_platform_admin(v_actor_id) then
   v_route:='/aab-local/app/_rebuild/aab-admin.html'; v_route_code:='AAB_PLATFORM_ADMIN_DASHBOARD';
 else
   select * into v_ws from country_core.workspace_membership m where m.actor_id=v_actor_id and m.membership_status='ACTIVE'
   order by case m.membership_role when 'HEAD_ADMIN' then 0 when 'COUNTRY_ADMIN' then 1 else 2 end,m.granted_at limit 1;
   if v_ws.workspace_membership_id is null then v_route:='/aab-local/app/_rebuild/my-dashboard.html';v_route_code:='PERSONAL_DASHBOARD';
   elsif v_ws.membership_role='HEAD_ADMIN' and exists(select 1 from country_core.country_workspace w where w.country_workspace_id=v_ws.country_workspace_id and w.lifecycle_status in ('PROVISIONED','SETUP_PENDING')) then v_route:='/aab-local/app/_rebuild/settings.html';v_route_code:='COUNTRY_SETTINGS';
   else
     select * into v_org from country_core.organization_membership o where o.actor_id=v_actor_id and o.membership_status='ACTIVE' order by o.granted_at limit 1;
     if v_org.organization_membership_id is not null and v_org.can_manage_organization and not exists(select 1 from country_core.institution_scientific_settings s where s.organization_id=v_org.organization_id and s.setup_status='CONFIGURED') then v_route:='/aab-local/app/_rebuild/institution-setup.html';v_route_code:='INSTITUTION_SETTINGS';
     elsif v_ws.membership_role in ('HEAD_ADMIN','COUNTRY_ADMIN') then v_route:='/aab-local/app/_rebuild/country-admin.html';v_route_code:='COUNTRY_DASHBOARD';
     else v_route:='/aab-local/app/_rebuild/my-dashboard.html';v_route_code:='ROLE_DASHBOARD'; end if;
   end if;
 end if;
 insert into platform.entry_audit_event(auth_user_id,actor_id,event_code,outcome_code,route_code,country_workspace_id,organization_id)
 values(auth.uid(),v_actor_id,'ENTRY_RESOLUTION','ALLOWED',v_route_code,v_ws.country_workspace_id,v_org.organization_id);
 return jsonb_build_object('ok',true,'state','ROUTE_APPROVED','route',v_route,'route_code',v_route_code);
end $$;

insert into country_core.notification(actor_id,notification_type,title,message,severity,source_entity_type,source_entity_id)
select pra.actor_id,'PARTICIPATION_REQUEST_RECEIVED','New AAB participation request',r.reference||' requires administrative review.','INFO','AAB_COUNTRY_PARTICIPATION_REQUEST',r.id
from public.aab_country_participation_requests r cross join platform.platform_role_assignment pra
where r.review_status='PENDING_REVIEW' and pra.active and pra.role_code='AAB_PLATFORM_OWNER'
and not exists(select 1 from country_core.notification n where n.actor_id=pra.actor_id and n.source_entity_type='AAB_COUNTRY_PARTICIPATION_REQUEST' and n.source_entity_id=r.id);
