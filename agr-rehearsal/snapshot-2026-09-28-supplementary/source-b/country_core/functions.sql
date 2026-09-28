-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: country_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for country_core: functions 41, tables 72, views 9, sequences 0, rls_enabled_tables 71, constraints 427, triggers 0, policies 0, indexes 147.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.actor_can_manage_organization(p_actor_id uuid, p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
  select exists(
    select 1 from country_core.organization_membership om
    where om.organization_id=p_organization_id and om.actor_id=p_actor_id
      and om.membership_status='ACTIVE' and (om.can_manage_organization or om.organization_role in ('ORGANIZATION_HEAD','ADMIN'))
  ) or exists(
    select 1 from country_core.organization o
    join country_core.workspace_membership wm on wm.country_workspace_id=o.country_workspace_id
    where o.organization_id=p_organization_id and wm.actor_id=p_actor_id and wm.membership_status='ACTIVE'
      and wm.membership_role in ('HEAD_ADMIN','COUNTRY_ADMIN')
  );
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.actor_can_read_organization(p_actor_id uuid, p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
  select country_core.actor_can_manage_organization(p_actor_id,p_organization_id)
  or exists(select 1 from country_core.organization_membership om where om.organization_id=p_organization_id and om.actor_id=p_actor_id and om.membership_status='ACTIVE');
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_accept_invitation(p_plain_token text, p_actor_id uuid)
 RETURNS country_core.workspace_membership
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'extensions', 'public'
AS $function$
declare i country_core.country_invitation; m country_core.workspace_membership;
begin
 select * into i from country_core.country_invitation where invitation_status='ISSUED' and expires_at>now() and extensions.crypt(p_plain_token,invitation_token_hash)=invitation_token_hash order by invited_at desc limit 1 for update;
 if i.country_invitation_id is null then raise exception 'INVALID_OR_EXPIRED_INVITATION' using errcode='28000'; end if;
 insert into country_core.workspace_membership(country_workspace_id,actor_id,organization_id,membership_role,membership_status,can_invite_users,can_manage_roles,can_manage_country_settings,can_access_regulatory_gate,granted_by)
 values(i.country_workspace_id,p_actor_id,i.organization_id,i.proposed_role,'ACTIVE',i.proposed_role='COUNTRY_ADMIN',i.proposed_role='COUNTRY_ADMIN',i.proposed_role='COUNTRY_ADMIN',i.proposed_role='REGULATORY_ADMIN',i.invited_by)
 on conflict(country_workspace_id,actor_id) do update set organization_id=excluded.organization_id,membership_role=excluded.membership_role,membership_status='ACTIVE',can_invite_users=excluded.can_invite_users,can_manage_roles=excluded.can_manage_roles,can_manage_country_settings=excluded.can_manage_country_settings,can_access_regulatory_gate=excluded.can_access_regulatory_gate returning * into m;
 update country_core.country_invitation set invitation_status='ACCEPTED',accepted_by=p_actor_id,accepted_at=now() where country_invitation_id=i.country_invitation_id;
 return m;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_activate_country(p_country_code character, p_plain_activation_code text, p_head_admin_actor_id uuid, p_workspace_name text, p_default_language text, p_timezone_name text)
 RETURNS country_core.country_workspace
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'extensions', 'public'
AS $function$
declare
  a country_core.country_activation;
  w country_core.country_workspace;
  v_rehearsal boolean;
begin
  select * into a
  from country_core.country_activation
  where country_code=upper(p_country_code)
    and activation_status='ISSUED'
    and expires_at>now()
    and extensions.crypt(p_plain_activation_code,activation_code_hash)=activation_code_hash
  order by issued_at desc
  limit 1
  for update;

  if a.country_activation_id is null then
    raise exception 'INVALID_OR_EXPIRED_COUNTRY_ACTIVATION' using errcode='28000';
  end if;

  v_rehearsal:=a.provisioning_classification='PERSONAL_WA_REHEARSAL';

  if v_rehearsal and (
    a.government_authority_verified
    or a.production_authority
    or a.legal_effect<>'NONE_TEST_ONLY'
    or not a.external_invitations_locked
  ) then
    raise exception 'INVALID_REHEARSAL_CLASSIFICATION' using errcode='55000';
  end if;

  insert into agriculture.country_scope(
    country_code,country_name,is_operating_country,active
  ) values(
    a.country_code,a.country_name,true,true
  )
  on conflict(country_code) do update
  set country_name=excluded.country_name,
      is_operating_country=true,
      active=true;

  insert into country_core.country_workspace(
    workspace_code,country_code,country_name,workspace_name,
    lifecycle_status,default_language,timezone_name,activated_at,activated_by
  ) values(
    'AAB-'||a.country_code,a.country_code,a.country_name,
    coalesce(nullif(btrim(p_workspace_name),''),'AAB '||a.country_name),
    'SETUP_PENDING',
    coalesce(nullif(p_default_language,''),'en'),
    coalesce(nullif(p_timezone_name,''),'UTC'),
    now(),p_head_admin_actor_id
  )
  on conflict(country_code) do update
  set activated_at=coalesce(country_core.country_workspace.activated_at,now()),
      activated_by=excluded.activated_by,
      updated_at=now()
  returning * into w;

  insert into country_core.workspace_membership(
    country_workspace_id,actor_id,membership_role,membership_status,
    can_invite_users,can_manage_roles,can_manage_country_settings,
    can_access_regulatory_gate,granted_by
  ) values(
    w.country_workspace_id,p_head_admin_actor_id,'HEAD_ADMIN','ACTIVE',
    not v_rehearsal,not v_rehearsal,not v_rehearsal,not v_rehearsal,
    p_head_admin_actor_id
  )
  on conflict(country_workspace_id,actor_id) do update
  set membership_role='HEAD_ADMIN',
      membership_status='ACTIVE',
      can_invite_users=excluded.can_invite_users,
      can_manage_roles=excluded.can_manage_roles,
      can_manage_country_settings=excluded.can_manage_country_settings,
      can_access_regulatory_gate=excluded.can_access_regulatory_gate;

  insert into country_core.country_security_policy(
    country_workspace_id,updated_by
  ) values(
    w.country_workspace_id,p_head_admin_actor_id
  )
  on conflict(country_workspace_id) do nothing;

  insert into country_core.regulatory_security_gate(
    country_workspace_id,gate_status,configured_by,configured_at
  ) values(
    w.country_workspace_id,
    case when v_rehearsal then 'SUSPENDED' else 'SETUP_REQUIRED' end,
    p_head_admin_actor_id,now()
  )
  on conflict(country_workspace_id) do update
  set gate_status=excluded.gate_status,
      configured_by=excluded.configured_by,
      configured_at=excluded.configured_at;

  update country_core.country_activation
  set activation_status='USED',
      used_at=now(),
      used_by=p_head_admin_actor_id
  where country_activation_id=a.country_activation_id;

  return w;
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_actor_has_workspace_role(p_actor_id uuid, p_workspace_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
  select exists(
    select 1 from country_core.workspace_membership m
    where m.actor_id=p_actor_id and m.country_workspace_id=p_workspace_id
      and m.membership_status='ACTIVE' and m.membership_role=any(p_roles)
  );
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_add_recovery_contact(p_workspace_id uuid, p_name text, p_email text, p_priority integer, p_actor_id uuid)
 RETURNS country_core.country_recovery_contact
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.country_recovery_contact;
begin
 if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN']) then raise exception 'HEAD_ADMIN_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 insert into country_core.country_recovery_contact(country_workspace_id,contact_email,contact_name,priority_order,verified,active)
 values(p_workspace_id,lower(btrim(p_email)),btrim(p_name),p_priority,false,true)
 on conflict(country_workspace_id,priority_order) do update set contact_email=excluded.contact_email,contact_name=excluded.contact_name,verified=false,active=true returning * into r;
 return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_apply_personal_wa_rehearsal_handoff(p_handoff_correlation_id uuid, p_source_request_id uuid, p_source_decision_id uuid, p_nominated_email text, p_document_sha256 text, p_storage_path text, p_plain_activation_code text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'country_core', 'platform', 'agriculture', 'extensions', 'storage'
AS $function$
declare v_doc uuid; v_activation uuid;
begin
  if p_document_sha256 !~ '^[0-9a-f]{64}$' or length(coalesce(p_plain_activation_code,''))<32 or p_expires_at<=now() then
    raise exception 'VALID_REHEARSAL_HANDOFF_INPUT_REQUIRED' using errcode='23514';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='aab-rehearsal-legal' and name=p_storage_path) then
    raise exception 'VERIFIED_REHEARSAL_DOCUMENT_UPLOAD_REQUIRED' using errcode='55000';
  end if;
  if exists(select 1 from country_core.rehearsal_provisioning_handoff where handoff_correlation_id=p_handoff_correlation_id or source_control_plane_decision_id=p_source_decision_id) then
    raise exception 'REHEARSAL_HANDOFF_ALREADY_APPLIED' using errcode='23505';
  end if;
  if exists(select 1 from country_core.legal_document_version where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and coalesce(production_eligible,true)) then
    raise exception 'OPERATIONAL_PLATFORM_DOCUMENT_PRESENT_REHEARSAL_PUBLICATION_BLOCKED' using errcode='55000';
  end if;
  update country_core.legal_document_version set document_status='RETIRED',retired_at=now()
   where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and document_id='AAB-WA-TEST-TERMS-0001' and production_eligible=false;
  insert into country_core.legal_document_version(
   document_scope,document_id,title,version_label,language_code,document_status,storage_bucket,storage_path,document_sha256,effective_at,published_at,
   material_change,requires_reacceptance,environment_classification,legal_effect,production_eligible,government_authority_verified,acknowledgement_type,certification_statement
  ) values(
   'AAB_PLATFORM','AAB-WA-TEST-TERMS-0001','AAB Platform and Scientific Governance Terms - TEST ONLY','TEST-0.1','en-AU','PUBLISHED',
   'aab-rehearsal-legal',p_storage_path,lower(p_document_sha256),now(),now(),true,true,'WA_CLEAN_ROOM_TEST','NONE_TEST_ONLY',false,false,
   'REHEARSAL_ACKNOWLEDGEMENT','Server-to-server rehearsal publication. Non-government, non-production and no legal effect.'
  ) returning legal_document_version_id into v_doc;
  update country_core.country_activation set activation_status='REVOKED'
   where country_code='AU' and activation_status='ISSUED' and provisioning_classification='PERSONAL_WA_REHEARSAL';
  insert into country_core.country_activation(
   country_code,country_name,nominated_head_admin_email,activation_code_hash,activation_status,expires_at,
   handoff_correlation_id,source_participation_request_id,source_control_plane_decision_id,provisioning_classification,
   government_authority_verified,production_authority,legal_effect,external_invitations_locked,required_rehearsal_document_version_id
  ) values(
   'AU','Australia',lower(btrim(p_nominated_email)),extensions.crypt(p_plain_activation_code,extensions.gen_salt('bf')),'ISSUED',p_expires_at,
   p_handoff_correlation_id,p_source_request_id,p_source_decision_id,'PERSONAL_WA_REHEARSAL',false,false,'NONE_TEST_ONLY',true,v_doc
  ) returning country_activation_id into v_activation;
  insert into country_core.rehearsal_provisioning_handoff(
   handoff_correlation_id,source_participation_request_id,source_control_plane_decision_id,classification,nominated_test_head_admin_email,
   document_version_id,document_sha256,activation_id
  ) values(p_handoff_correlation_id,p_source_request_id,p_source_decision_id,'PERSONAL_WA_REHEARSAL',lower(btrim(p_nominated_email)),v_doc,lower(p_document_sha256),v_activation);
  return jsonb_build_object('ok',true,'activation_id',v_activation,'document_version_id',v_doc,'classification','PERSONAL_WA_REHEARSAL','external_invitations_locked',true);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_apply_personal_wa_rehearsal_handoff(p_handoff_correlation_id uuid, p_source_request_id uuid, p_source_internal_nomination_id uuid, p_source_decision_id uuid, p_nominated_email text, p_document_sha256 text, p_storage_path text, p_plain_activation_code text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'country_core', 'platform', 'agriculture', 'extensions', 'storage'
AS $function$
declare
  v_doc uuid;
  v_activation uuid;
  v_canonical_storage_path text;
begin
  if num_nonnulls(p_source_request_id,p_source_internal_nomination_id) <> 1 then
    raise exception 'EXACTLY_ONE_REHEARSAL_SOURCE_REQUIRED' using errcode='23514';
  end if;
  if p_document_sha256 !~ '^[0-9a-f]{64}$' or length(coalesce(p_plain_activation_code,''))<32 or p_expires_at<=now() then
    raise exception 'VALID_REHEARSAL_HANDOFF_INPUT_REQUIRED' using errcode='23514';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='aab-rehearsal-legal' and name=p_storage_path) then
    raise exception 'VERIFIED_REHEARSAL_DOCUMENT_UPLOAD_REQUIRED' using errcode='55000';
  end if;
  if exists(select 1 from country_core.rehearsal_provisioning_handoff
    where handoff_correlation_id=p_handoff_correlation_id or source_control_plane_decision_id=p_source_decision_id) then
    raise exception 'REHEARSAL_HANDOFF_ALREADY_APPLIED' using errcode='23505';
  end if;
  if exists(select 1 from country_core.legal_document_version
    where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and coalesce(production_eligible,true)) then
    raise exception 'OPERATIONAL_PLATFORM_DOCUMENT_PRESENT_REHEARSAL_PUBLICATION_BLOCKED' using errcode='55000';
  end if;

  select legal_document_version_id,storage_path
    into v_doc,v_canonical_storage_path
  from country_core.legal_document_version
  where document_scope='AAB_PLATFORM'
    and document_id='AAB-WA-TEST-TERMS-0001'
    and version_label='TEST-0.1'
    and document_sha256=lower(p_document_sha256)
    and production_eligible=false
    and government_authority_verified=false
    and legal_effect='NONE_TEST_ONLY'
    and environment_classification='WA_CLEAN_ROOM_TEST'
    and acknowledgement_type='REHEARSAL_ACKNOWLEDGEMENT'
    and document_status='PUBLISHED'
  limit 1;

  if v_doc is null then
    raise exception 'EXACT_PUBLISHED_REHEARSAL_DOCUMENT_REQUIRED' using errcode='23514';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='aab-rehearsal-legal' and name=v_canonical_storage_path) then
    raise exception 'CANONICAL_REHEARSAL_DOCUMENT_OBJECT_MISSING' using errcode='55000';
  end if;

  update country_core.country_activation
     set activation_status='REVOKED'
   where country_code='AU'
     and activation_status='ISSUED'
     and provisioning_classification='PERSONAL_WA_REHEARSAL'
     and nominated_head_admin_email=lower(btrim(p_nominated_email));

  insert into country_core.country_activation(
   country_code,country_name,nominated_head_admin_email,activation_code_hash,activation_status,expires_at,
   handoff_correlation_id,source_participation_request_id,source_internal_rehearsal_nomination_id,
   source_control_plane_decision_id,provisioning_classification,government_authority_verified,
   production_authority,legal_effect,external_invitations_locked,required_rehearsal_document_version_id
  ) values(
   'AU','Australia',lower(btrim(p_nominated_email)),extensions.crypt(p_plain_activation_code,extensions.gen_salt('bf')),
   'ISSUED',p_expires_at,p_handoff_correlation_id,p_source_request_id,p_source_internal_nomination_id,
   p_source_decision_id,'PERSONAL_WA_REHEARSAL',false,false,'NONE_TEST_ONLY',true,v_doc
  ) returning country_activation_id into v_activation;

  insert into country_core.rehearsal_provisioning_handoff(
   handoff_correlation_id,source_participation_request_id,source_internal_rehearsal_nomination_id,
   source_control_plane_decision_id,classification,nominated_test_head_admin_email,
   document_version_id,document_sha256,activation_id
  ) values(
   p_handoff_correlation_id,p_source_request_id,p_source_internal_nomination_id,p_source_decision_id,
   'PERSONAL_WA_REHEARSAL',lower(btrim(p_nominated_email)),v_doc,lower(p_document_sha256),v_activation
  );

  return jsonb_build_object(
    'ok',true,
    'activation_id',v_activation,
    'document_version_id',v_doc,
    'document_reused',true,
    'canonical_storage_path',v_canonical_storage_path,
    'source_type',case when p_source_internal_nomination_id is not null
      then 'INTERNAL_REHEARSAL_NOMINATION' else 'APPROVED_PARTICIPATION_REQUEST' end,
    'classification','PERSONAL_WA_REHEARSAL',
    'external_invitations_locked',true
  );
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_complete_country_setup(p_workspace_id uuid, p_actor_id uuid)
 RETURNS country_core.country_workspace
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare w country_core.country_workspace; required_n int; contacts_n int;
begin
 if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN']) then raise exception 'HEAD_ADMIN_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from country_core.organization where country_workspace_id=p_workspace_id and active) then raise exception 'PRIMARY_ORGANIZATION_REQUIRED' using errcode='23514'; end if;
 select minimum_recovery_contacts into required_n from country_core.country_security_policy where country_workspace_id=p_workspace_id;
 select count(*) into contacts_n from country_core.country_recovery_contact where country_workspace_id=p_workspace_id and active;
 if contacts_n<coalesce(required_n,2) then raise exception 'MINIMUM_RECOVERY_CONTACTS_REQUIRED' using errcode='23514'; end if;
 perform country_core.api_seed_default_national_objectives(p_workspace_id,p_actor_id);
 update country_core.regulatory_security_gate set gate_status='ACTIVE',configured_by=p_actor_id,configured_at=coalesce(configured_at,now()),updated_at=now() where country_workspace_id=p_workspace_id;
 update country_core.country_workspace set lifecycle_status='BOOTSTRAP_PENDING',updated_at=now() where country_workspace_id=p_workspace_id returning * into w;
 return w;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_country_admin_snapshot(p_actor_id uuid, p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'country_core', 'agriculture', 'regulatory_core', 'continuity_core', 'public'
AS $function$
declare result jsonb; allowed boolean;
begin
 allowed:=country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN']);
 if not allowed then raise exception 'COUNTRY_ADMIN_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 select jsonb_build_object(
  'workspace',to_jsonb(w),
  'team',coalesce((select jsonb_agg(to_jsonb(t) order by t.membership_role,t.display_name) from country_core.v_team_directory t where t.country_workspace_id=p_workspace_id),'[]'::jsonb),
  'organizations',coalesce((select jsonb_agg(to_jsonb(o) order by o.organization_name) from country_core.organization o where o.country_workspace_id=p_workspace_id and o.active),'[]'::jsonb),
  'recovery_contacts',coalesce((select jsonb_agg(to_jsonb(r) order by r.priority_order) from country_core.country_recovery_contact r where r.country_workspace_id=p_workspace_id and r.active),'[]'::jsonb),
  'security_policy',(select to_jsonb(s) from country_core.country_security_policy s where s.country_workspace_id=p_workspace_id),
  'regulatory_gate',(select to_jsonb(g) from country_core.regulatory_security_gate g where g.country_workspace_id=p_workspace_id),
  'objectives',coalesce((select jsonb_agg(to_jsonb(o) order by o.priority desc,o.objective_title) from country_core.national_objective o where o.country_workspace_id=p_workspace_id and o.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
  'latest_scan',(select to_jsonb(s) from country_core.bootstrap_scan_run s where s.country_workspace_id=p_workspace_id order by initiated_at desc limit 1),
  'latest_brief',(select to_jsonb(b) from country_core.country_intelligence_brief b where b.country_workspace_id=p_workspace_id order by brief_version desc limit 1),
  'impact',coalesce((select jsonb_agg(to_jsonb(i) order by i.metric_category,i.metric_name) from country_core.v_daily_country_impact i where i.country_workspace_id=p_workspace_id and i.snapshot_date=(select max(snapshot_date) from country_core.daily_impact_snapshot where country_workspace_id=p_workspace_id)),'[]'::jsonb),
  'backup_health',(select to_jsonb(h) from continuity_core.v_backup_health h limit 1)
 ) into result from country_core.country_workspace w where w.country_workspace_id=p_workspace_id;
 return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_country_collaboration_snapshot(p_actor_id uuid, p_country_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'manufacturing_core', 'public'
AS $function$
declare allowed boolean; outj jsonb;
begin
  select exists(select 1 from country_core.workspace_membership wm where wm.country_workspace_id=p_country_workspace_id and wm.actor_id=p_actor_id and wm.membership_status='ACTIVE') into allowed;
  if not allowed then raise exception 'COUNTRY_WORKSPACE_ACCESS_DENIED' using errcode='42501'; end if;
  select jsonb_build_object(
    'organizations',coalesce((select jsonb_agg(to_jsonb(o) order by o.organization_name) from country_core.organization o where o.country_workspace_id=p_country_workspace_id and o.active),'[]'::jsonb),
    'organization_workspaces',coalesce((select jsonb_agg(to_jsonb(w) order by w.workspace_name) from country_core.organization_workspace w where w.country_workspace_id=p_country_workspace_id and w.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'my_organization_memberships',coalesce((select jsonb_agg(to_jsonb(m)) from country_core.organization_membership m where m.country_workspace_id=p_country_workspace_id and m.actor_id=p_actor_id and m.membership_status='ACTIVE'),'[]'::jsonb),
    'sharing_classes',coalesce((select jsonb_agg(to_jsonb(s) order by s.sharing_classification_code) from country_core.sharing_classification s where s.active),'[]'::jsonb),
    'manufacturing_transfers',coalesce((select jsonb_agg(jsonb_build_object('transfer_package_id',t.transfer_package_id,'transfer_code',t.transfer_code,'package_status',t.package_status,'source_organization_id',t.source_organization_id,'destination_manufacturer_id',t.destination_manufacturer_id,'formulation_version_id',t.formulation_version_id,'generated_at',t.generated_at) order by t.generated_at desc) from manufacturing_core.transfer_package t where t.country_workspace_id=p_country_workspace_id),'[]'::jsonb)
  ) into outj;
  return outj;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_country_economic_context(p_actor_id uuid, p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare result jsonb;
begin
 if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN','SCIENTIST','RESEARCHER','AUDITOR','REGULATORY_ADMIN','VIEWER']) then raise exception 'COUNTRY_WORKSPACE_ACCESS_REQUIRED' using errcode='42501'; end if;
 select jsonb_build_object(
   'workspace',(select to_jsonb(w) from country_core.country_workspace w where w.country_workspace_id=p_workspace_id),
   'sources',coalesce((select jsonb_agg(to_jsonb(s) order by s.authority_tier,s.source_name) from country_core.country_source_registry s where s.active and (s.country_code is null or trim(s.country_code)=(select trim(country_code) from country_core.country_workspace where country_workspace_id=p_workspace_id))),'[]'::jsonb),
   'baseline',coalesce((select jsonb_agg(to_jsonb(b) order by b.metric_name) from country_core.country_economic_baseline b where b.country_workspace_id=p_workspace_id and b.bootstrap_scan_run_id=(select bootstrap_scan_run_id from country_core.bootstrap_scan_run where country_workspace_id=p_workspace_id order by initiated_at desc limit 1)),'[]'::jsonb),
   'facts',coalesce((select jsonb_agg(jsonb_build_object('metric_code',f.metric_code,'metric_name',f.metric_name,'numeric_value',f.numeric_value,'unit',f.unit,'period_label',f.period_label,'fact_status',f.fact_status,'confidence_status',f.confidence_status,'freshness_status',f.freshness_status,'source_code',f.source_code,'source_name',s.source_name,'authority_tier',s.authority_tier,'source_url',s.source_url,'source_note',f.source_note) order by f.metric_name) from country_core.country_economic_fact f join country_core.country_source_registry s on s.source_code=f.source_code where f.country_workspace_id=p_workspace_id and f.fact_status<>'SUPERSEDED'),'[]'::jsonb)
 ) into result; return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_country_first_page(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare ws jsonb; first_ws uuid; result jsonb;
begin
 ws:=country_core.api_workspace_for_actor(p_actor_id);
 select m.country_workspace_id into first_ws from country_core.workspace_membership m where m.actor_id=p_actor_id and m.membership_status='ACTIVE' order by case when m.membership_role='HEAD_ADMIN' then 0 else 1 end,m.granted_at limit 1;
 result:=jsonb_build_object('workspaces',ws,'has_workspace',first_ws is not null,'recommended_page',case when first_ws is null then 'PERSONAL_DASHBOARD' when exists(select 1 from country_core.country_workspace w where w.country_workspace_id=first_ws and w.lifecycle_status in ('SETUP_PENDING','BOOTSTRAP_PENDING','BOOTSTRAP_RUNNING')) then 'COUNTRY_SETUP' else 'PERSONAL_DASHBOARD' end,'recommended_workspace_id',first_ws);
 return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_country_onboarding_status(p_actor_id uuid, p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare w country_core.country_workspace; org_count int; recovery_count int; member_count int; scan_count int; source_count int; fact_count int;
begin
  select * into w from country_core.country_workspace where country_workspace_id=p_workspace_id;
  if w.country_workspace_id is null then raise exception 'COUNTRY_WORKSPACE_NOT_FOUND' using errcode='22023'; end if;
  if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN','SCIENTIST','REGULATORY_ADMIN','AUDITOR','VIEWER']) then raise exception 'COUNTRY_WORKSPACE_ACCESS_REQUIRED' using errcode='42501'; end if;
  select count(*) into org_count from country_core.organization where country_workspace_id=p_workspace_id and active;
  select count(*) into recovery_count from country_core.country_recovery_contact where country_workspace_id=p_workspace_id and active;
  select count(*) into member_count from country_core.workspace_membership where country_workspace_id=p_workspace_id and membership_status='ACTIVE';
  select count(*) into scan_count from country_core.bootstrap_scan_run where country_workspace_id=p_workspace_id;
  select count(*) into source_count from country_core.country_source_registry s where s.active and (s.country_code is null or trim(s.country_code)=trim(w.country_code));
  select count(*) into fact_count from country_core.country_economic_fact where country_workspace_id=p_workspace_id and fact_status<>'SUPERSEDED';
  return jsonb_build_object(
    'workspace',to_jsonb(w),
    'steps',jsonb_build_array(
      jsonb_build_object('step',1,'code','ACTIVATION','label','Activate country and Head User','status','COMPLETE'),
      jsonb_build_object('step',2,'code','SECURE_SETUP','label','Organisation, recovery and regulatory security','status',case when org_count>0 and recovery_count>=2 then 'COMPLETE' else 'ACTION_REQUIRED' end),
      jsonb_build_object('step',3,'code','TEAM_AND_INSTITUTIONS','label','Invite institutions and assign governed roles','status',case when member_count>1 then 'IN_PROGRESS' else 'READY' end),
      jsonb_build_object('step',4,'code','COUNTRY_SCAN','label','Run Country Intelligence Scan','status',case when scan_count>0 then 'COMPLETE_OR_RUNNING' else 'READY' end),
      jsonb_build_object('step',5,'code','SOURCE_AND_BASELINE_REVIEW','label','Review sources, facts, gaps and economic baseline','status',case when fact_count>0 then 'READY_FOR_REVIEW' else 'WAITING_FOR_SCAN' end),
      jsonb_build_object('step',6,'code','COUNTRY_BRIEF','label','Review Country Intelligence Brief and opportunity questions','status',case when scan_count>0 then 'READY' else 'WAITING_FOR_SCAN' end),
      jsonb_build_object('step',7,'code','AGRICULTURE_WORK','label','Begin governed Agriculture work','status',case when w.lifecycle_status in ('BOOTSTRAP_RUNNING','ACTIVE') then 'READY_WHEN_AUTHORISED' else 'WAITING' end)
    ),
    'counts',jsonb_build_object('organizations',org_count,'recovery_contacts',recovery_count,'active_members',member_count,'scan_runs',scan_count,'registered_sources',source_count,'country_facts',fact_count),
    'rule','AAB guides the sequence but does not bypass country, institution, scientist, regulatory or audit authority.'
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_country_scan_knowledge_definition()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'public'
AS $function$
select jsonb_build_object(
  'version','1.0.0',
  'principles',jsonb_build_array(
    'FACTS_AND_SCENARIOS_SEPARATE',
    'NO_SILENT_OVERWRITE',
    'MISSING_DATA_BECOMES_KNOWLEDGE_GAP',
    'WASTE_VOLUME_IS_NOT_RECOVERABLE_VOLUME',
    'SCIENTIFIC_POSSIBILITY_IS_NOT_SCIENTIFIC_TRUTH',
    'ECONOMIC_SCENARIO_IS_NOT_FORECAST',
    'COMPLIANCE_REQUIRES_EVIDENCE',
    'HUMAN_AUTHORITY_RETAINED'
  ),
  'definitions',coalesce((select jsonb_agg(to_jsonb(d) order by d.definition_group,d.definition_code) from country_core.country_scan_knowledge_definition d where d.active),'[]'::jsonb),
  'source_requirements',coalesce((select jsonb_agg(to_jsonb(s) order by s.authority_priority,s.requirement_code) from country_core.country_scan_source_requirement s where s.active),'[]'::jsonb)
);
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_create_institution_metric(p_actor_id uuid, p_organization_id uuid, p_metric_code text, p_metric_name text, p_description text, p_value_type text, p_source_unit_code text, p_global_metric_definition_id uuid, p_method_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare o country_core.organization%rowtype; r country_core.institution_metric_definition%rowtype; ns text;
begin
  if not country_core.actor_can_manage_organization(p_actor_id,p_organization_id) then raise exception 'INSTITUTION_MANAGE_DENIED' using errcode='42501'; end if;
  select * into o from country_core.organization where organization_id=p_organization_id;
  if o.organization_id is null then raise exception 'INSTITUTION_NOT_FOUND'; end if;
  if trim(coalesce(p_metric_code,''))='' or trim(coalesce(p_metric_name,''))='' or trim(coalesce(p_value_type,''))='' then raise exception 'INSTITUTION_METRIC_FIELDS_REQUIRED'; end if;
  ns:=case when p_global_metric_definition_id is null then 'LOCAL_ONLY' else 'MAPPED_TO_GLOBAL' end;
  insert into country_core.institution_metric_definition(country_workspace_id,organization_id,local_metric_code,local_metric_name,local_metric_description,value_type,source_unit_code,global_metric_definition_id,method_or_protocol_reference,normalization_status,created_by)
  values(o.country_workspace_id,o.organization_id,upper(trim(p_metric_code)),trim(p_metric_name),nullif(trim(p_description),''),upper(trim(p_value_type)),nullif(upper(trim(p_source_unit_code)),''),p_global_metric_definition_id,nullif(trim(p_method_reference),''),ns,p_actor_id)
  returning * into r;
  return to_jsonb(r);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_create_institution_unit(p_actor_id uuid, p_organization_id uuid, p_unit_code text, p_unit_name text, p_unit_symbol text, p_quantity_kind text, p_canonical_unit text, p_conversion_multiplier numeric, p_conversion_offset numeric, p_definition_summary text, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare o country_core.organization%rowtype; r country_core.institution_unit_definition%rowtype; ns text;
begin
  if not country_core.actor_can_manage_organization(p_actor_id,p_organization_id) then raise exception 'INSTITUTION_MANAGE_DENIED' using errcode='42501'; end if;
  select * into o from country_core.organization where organization_id=p_organization_id;
  if o.organization_id is null then raise exception 'INSTITUTION_NOT_FOUND'; end if;
  if trim(coalesce(p_unit_code,''))='' or trim(coalesce(p_unit_name,''))='' or trim(coalesce(p_unit_symbol,''))='' or trim(coalesce(p_quantity_kind,''))='' or trim(coalesce(p_definition_summary,''))='' then raise exception 'INSTITUTION_UNIT_FIELDS_REQUIRED'; end if;
  ns:=case when nullif(trim(coalesce(p_canonical_unit,'')),'') is null then 'NOT_NORMALISED' when p_conversion_multiplier is null then 'REVIEW_REQUIRED' else 'NORMALISED' end;
  insert into country_core.institution_unit_definition(country_workspace_id,organization_id,unit_code,unit_name,unit_symbol,quantity_kind,canonical_unit,conversion_multiplier,conversion_offset,normalization_status,definition_summary,evidence_or_standard_reference,created_by)
  values(o.country_workspace_id,o.organization_id,upper(trim(p_unit_code)),trim(p_unit_name),trim(p_unit_symbol),upper(trim(p_quantity_kind)),nullif(trim(p_canonical_unit),''),p_conversion_multiplier,coalesce(p_conversion_offset,0),ns,trim(p_definition_summary),nullif(trim(p_reference),''),p_actor_id)
  returning * into r;
  return to_jsonb(r);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_create_organization(p_actor_id uuid, p_country_workspace_id uuid, p_name text, p_type text)
 RETURNS country_core.organization
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.organization; can_manage boolean; code text;
begin
  select exists(select 1 from country_core.workspace_membership wm where wm.country_workspace_id=p_country_workspace_id and wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and (wm.membership_role='HEAD_ADMIN' or wm.can_manage_country_settings)) into can_manage;
  if not can_manage then raise exception 'COUNTRY_ADMIN_REQUIRED' using errcode='42501'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'ORGANIZATION_NAME_REQUIRED' using errcode='23514'; end if;
  code:=upper(regexp_replace(btrim(p_name),'[^A-Za-z0-9]+','_','g'))||'_'||substr(replace(gen_random_uuid()::text,'-',''),1,6);
  insert into country_core.organization(country_workspace_id,organization_code,organization_name,organization_type,active)
  values(p_country_workspace_id,code,btrim(p_name),upper(btrim(p_type)),true) returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_create_organization_workspace(p_actor_id uuid, p_organization_id uuid, p_name text, p_type text)
 RETURNS country_core.organization_workspace
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.organization_workspace; cw uuid; allowed boolean; code text;
begin
  select country_workspace_id into cw from country_core.organization where organization_id=p_organization_id and active;
  if cw is null then raise exception 'ORGANIZATION_NOT_FOUND' using errcode='P0002'; end if;
  select exists(select 1 from country_core.workspace_membership wm where wm.country_workspace_id=cw and wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.membership_role in ('HEAD_ADMIN','COUNTRY_ADMIN')) or exists(select 1 from country_core.organization_membership om where om.organization_id=p_organization_id and om.actor_id=p_actor_id and om.membership_status='ACTIVE' and om.can_manage_organization) into allowed;
  if not allowed then raise exception 'ORGANIZATION_ADMIN_REQUIRED' using errcode='42501'; end if;
  code:=upper(regexp_replace(btrim(p_name),'[^A-Za-z0-9]+','_','g'))||'_'||substr(replace(gen_random_uuid()::text,'-',''),1,6);
  insert into country_core.organization_workspace(country_workspace_id,organization_id,workspace_code,workspace_name,workspace_type,created_by)
  values(cw,p_organization_id,code,btrim(p_name),upper(btrim(p_type)),p_actor_id) returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_create_primary_organization(p_workspace_id uuid, p_name text, p_type text, p_actor_id uuid)
 RETURNS country_core.organization
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.organization;
begin
 if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN']) then raise exception 'COUNTRY_ADMIN_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 insert into country_core.organization(country_workspace_id,organization_code,organization_name,organization_type)
 values(p_workspace_id,'PRIMARY',btrim(p_name),p_type) on conflict(country_workspace_id,organization_code) do update set organization_name=excluded.organization_name,organization_type=excluded.organization_type,active=true returning * into r;
 update country_core.workspace_membership set organization_id=r.organization_id where country_workspace_id=p_workspace_id and actor_id=p_actor_id and organization_id is null;
 return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_generate_country_brief(p_scan_run_id uuid, p_actor_id uuid)
 RETURNS country_core.country_intelligence_brief
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.bootstrap_scan_run; w country_core.country_workspace; b country_core.country_intelligence_brief; v integer; ingredient_count integer; gap_count integer;
begin
 select * into r from country_core.bootstrap_scan_run where bootstrap_scan_run_id=p_scan_run_id; if r.bootstrap_scan_run_id is null then raise exception 'SCAN_RUN_NOT_FOUND'; end if;
 if not country_core.api_actor_has_workspace_role(p_actor_id,r.country_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN','SCIENTIST']) then raise exception 'COUNTRY_BRIEF_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 select * into w from country_core.country_workspace where country_workspace_id=r.country_workspace_id;
 select count(*) into ingredient_count from country_core.country_ingredient_availability where country_workspace_id=r.country_workspace_id;
 select count(*) into gap_count from country_core.bootstrap_scan_finding where bootstrap_scan_run_id=p_scan_run_id and finding_type='KNOWLEDGE_GAP';
 select coalesce(max(brief_version),0)+1 into v from country_core.country_intelligence_brief where country_workspace_id=r.country_workspace_id;
 insert into country_core.country_intelligence_brief(country_workspace_id,bootstrap_scan_run_id,brief_version,brief_status,executive_summary,resources_summary,waste_environment_summary,agriculture_summary,soil_water_climate_summary,regulatory_summary,knowledge_gap_summary,how_aab_can_help)
 values(r.country_workspace_id,p_scan_run_id,v,'READY','AAB '||w.country_name||' has completed its internal bootstrap and established the governed starting knowledge baseline. Country-specific external source ingestion is still required before local resource, waste/environment and regulatory findings can be treated as evidence.',
 'Country Resource Intelligence is ready to receive and classify local biological, mineral, agricultural, aquatic and underused resource evidence.',
 'Resource Recovery Intelligence is ready to identify waste, residue, burning, dumping and recovery opportunities once country data and observations are supplied.',
 ingredient_count||' starter ingredient knowledge records have been loaded for country availability and regulatory assessment. None are automatically approved for formulation use.',
 'Soil, Water, Climate and Environment adapters are ready for governed datasets, sensors, laboratories and community observations.',
 'Regulatory Intelligence is ready but authoritative jurisdictional sources must be loaded/versioned before Dossier Passport translation can calculate readiness.',
 gap_count||' initial knowledge gaps have been preserved explicitly rather than guessed.',
 jsonb_build_array('Build the country resource inventory','Map waste/residue and burning problems','Assess starter ingredient availability','Connect soil/water/climate evidence','Load regulatory requirements','Launch observation campaigns','Prioritise the first scientist-reviewed formulation request')) returning * into b;
 insert into country_core.country_recommendation(country_workspace_id,bootstrap_scan_run_id,recommendation_type,title,recommendation_summary,why,prefill_payload)
 values(r.country_workspace_id,p_scan_run_id,'FORMULATION_REQUEST','Suggested first formulation request','Ask AAB to propose a conservative research formulation using only scientist-approved known ingredients, aligned to the country’s highest-priority agricultural objective. Country-resource or recovered-resource candidates must remain excluded until separately reviewed and eligible.','Provides a safe first use of the formulation generator while the country-specific discovery scan continues to gather evidence.',jsonb_build_object('mode','REQUEST_AAB_FORMULATION','exclude_unverified_country_resources',true,'objective_priority','COUNTRY_HEAD_ADMIN_SELECT'));
 return b;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_ingest_bootstrap_finding(p_scan_run_id uuid, p_finding_type text, p_title text, p_summary text, p_source_adapter_code text, p_source_reference text, p_payload jsonb, p_confidence text DEFAULT 'UNASSESSED'::text)
 RETURNS country_core.bootstrap_scan_finding
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.bootstrap_scan_run; a country_core.bootstrap_source_adapter; f country_core.bootstrap_scan_finding; sys uuid; w country_core.country_workspace; cr agriculture.country_resource_candidate; ws agriculture.resource_waste_stream; source_type text;
begin
 select * into r from country_core.bootstrap_scan_run where bootstrap_scan_run_id=p_scan_run_id;
 if r.bootstrap_scan_run_id is null then raise exception 'SCAN_RUN_NOT_FOUND'; end if;
 select * into a from country_core.bootstrap_source_adapter where adapter_code=p_source_adapter_code and configuration_status='READY';
 if a.adapter_code is null then raise exception 'SCAN_SOURCE_ADAPTER_NOT_READY' using errcode='55000'; end if;
 select actor_id into sys from agriculture.actor where external_subject='aab-system:country-bootstrap-scan' and active limit 1;
 select * into w from country_core.country_workspace where country_workspace_id=r.country_workspace_id;
 source_type:=case a.adapter_type when 'GOVERNMENT_DATA' then 'EXTERNAL_AUTHORITATIVE_SOURCE' when 'AUTHORITATIVE_WEB' then 'EXTERNAL_AUTHORITATIVE_SOURCE' when 'REGULATORY_SOURCE' then 'EXTERNAL_AUTHORITATIVE_SOURCE' when 'COMMUNITY_EVIDENCE' then 'COMMUNITY_EVIDENCE' when 'LAB_RESEARCH' then 'RESEARCH_SOURCE' else 'AAB_INFERENCE' end;
 insert into country_core.bootstrap_scan_finding(bootstrap_scan_run_id,country_workspace_id,finding_type,finding_title,finding_summary,source_type,source_reference,confidence_status,evidence_status,review_status,finding_payload)
 values(p_scan_run_id,r.country_workspace_id,p_finding_type,btrim(p_title),btrim(p_summary),source_type,p_source_reference,p_confidence,case when a.adapter_type in ('GOVERNMENT_DATA','LAB_RESEARCH') then 'SOURCE_CAPTURED_UNREVIEWED' else 'UNASSESSED' end,'NOT_REVIEWED',coalesce(p_payload,'{}'::jsonb)) returning * into f;
 if a.automatic_candidate_capture_allowed and p_finding_type='COUNTRY_RESOURCE' then
   cr:=agriculture.api_create_country_resource_candidate(coalesce(p_payload->>'resource_code','SCAN-'||substr(f.bootstrap_scan_finding_id::text,1,8)),p_title,coalesce(p_payload->>'resource_class','DISCOVERY_CANDIDATE'),coalesce(p_payload->>'asset_type','DISCOVERY_CANDIDATE'),p_summary,coalesce(p_payload->>'uncertainty_summary','Automatically captured from a country bootstrap source; scientist review required.'),sys,w.country_code,p_payload->>'resource_origin',p_payload->>'current_known_use',coalesce((p_payload->>'traditional_knowledge_linked')::boolean,false),p_payload->>'traditional_knowledge_summary',coalesce(p_payload->>'composition_status','UNKNOWN'),coalesce(p_payload->>'mechanism_status','UNKNOWN'),coalesce(p_payload->>'evidence_status','LIMITED'),coalesce(p_payload->>'observation_status','NONE'),coalesce(p_payload->>'knowledge_gap_status','HIGH'),coalesce(p_payload->>'discovery_potential','HIGH'));
   update agriculture.country_resource_candidate set country_workspace_id=r.country_workspace_id where country_resource_candidate_id=cr.country_resource_candidate_id;
   update country_core.bootstrap_scan_finding set materialisation_status='CANDIDATE_CREATED',target_entity_type='COUNTRY_RESOURCE_CANDIDATE',target_entity_id=cr.country_resource_candidate_id where bootstrap_scan_finding_id=f.bootstrap_scan_finding_id returning * into f;
 elsif a.automatic_candidate_capture_allowed and p_finding_type='WASTE_STREAM' then
   ws:=agriculture.api_create_resource_waste_stream(coalesce(p_payload->>'waste_stream_code','WASTE-'||substr(f.bootstrap_scan_finding_id::text,1,8)),p_title,coalesce(p_payload->>'waste_stream_type','AGRICULTURAL_RESIDUE'),null,sys,w.country_code,p_payload->>'source_sector',p_payload->>'generation_context',p_payload->>'current_disposal_pathway',coalesce((p_payload->>'burning_involved')::boolean,false),coalesce((p_payload->>'dumping_involved')::boolean,false),coalesce((p_payload->>'landfill_involved')::boolean,false),p_payload->>'pollution_pathway',coalesce(p_payload->>'estimated_availability_status','UNASSESSED'),p_payload->>'seasonality_summary',coalesce(p_payload->>'contamination_status','UNKNOWN'),p_payload->>'known_contaminants');
   update agriculture.resource_waste_stream set country_workspace_id=r.country_workspace_id where resource_waste_stream_id=ws.resource_waste_stream_id;
   update country_core.bootstrap_scan_finding set materialisation_status='CANDIDATE_CREATED',target_entity_type='RESOURCE_WASTE_STREAM',target_entity_id=ws.resource_waste_stream_id where bootstrap_scan_finding_id=f.bootstrap_scan_finding_id returning * into f;
 end if;
 return f;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_institution_setup_context(p_actor_id uuid, p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare outj jsonb;
begin
  if not country_core.actor_can_read_organization(p_actor_id,p_organization_id) then
    raise exception 'INSTITUTION_ACCESS_DENIED' using errcode='42501';
  end if;
  select jsonb_build_object(
    'organization',to_jsonb(o),
    'can_manage',country_core.actor_can_manage_organization(p_actor_id,p_organization_id),
    'settings',coalesce((select to_jsonb(s) from country_core.institution_scientific_settings s where s.organization_id=o.organization_id),'{}'::jsonb),
    'global_metrics',coalesce((select jsonb_agg(jsonb_build_object('metric_definition_id',m.metric_definition_id,'metric_code',m.metric_code,'metric_name',m.metric_name,'value_type',m.value_type,'canonical_unit',m.canonical_unit,'lifecycle_status',m.lifecycle_status) order by m.metric_name) from agriculture.metric_definition m where m.lifecycle_status='ACTIVE'),'[]'::jsonb),
    'institution_units',coalesce((select jsonb_agg(to_jsonb(u) order by u.unit_name) from country_core.institution_unit_definition u where u.organization_id=o.organization_id and u.review_status<>'RETIRED'),'[]'::jsonb),
    'institution_metrics',coalesce((select jsonb_agg(to_jsonb(im) order by im.local_metric_name) from country_core.institution_metric_definition im where im.organization_id=o.organization_id and im.review_status<>'RETIRED'),'[]'::jsonb)
  ) into outj from country_core.organization o where o.organization_id=p_organization_id;
  return coalesce(outj,'{}'::jsonb);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_issue_country_activation(p_country_code character, p_country_name text, p_head_admin_email text, p_plain_activation_code text, p_expires_at timestamp with time zone, p_actor_id uuid)
 RETURNS country_core.country_activation
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'extensions', 'public'
AS $function$
declare r country_core.country_activation;
begin
  if not agriculture.api_actor_has_capability(p_actor_id,'administer',null) then raise exception 'GLOBAL_ADMIN_AUTHORITY_REQUIRED' using errcode='42501'; end if;
  if p_expires_at <= now() then raise exception 'ACTIVATION_EXPIRY_MUST_BE_FUTURE' using errcode='23514'; end if;
  update country_core.country_activation set activation_status='REVOKED' where country_code=upper(p_country_code) and activation_status='ISSUED';
  insert into country_core.country_activation(country_code,country_name,nominated_head_admin_email,activation_code_hash,expires_at,issued_by)
  values(upper(p_country_code),btrim(p_country_name),lower(btrim(p_head_admin_email)),extensions.crypt(p_plain_activation_code,extensions.gen_salt('bf')),p_expires_at,p_actor_id)
  returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_issue_invitation(p_workspace_id uuid, p_organization_id uuid, p_email text, p_role text, p_plain_token text, p_expires_at timestamp with time zone, p_actor_id uuid)
 RETURNS country_core.country_invitation
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'extensions', 'public'
AS $function$
declare r country_core.country_invitation;
begin
  if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN']) then raise exception 'COUNTRY_INVITE_AUTHORITY_REQUIRED' using errcode='42501'; end if;
  update country_core.country_invitation set invitation_status='REVOKED' where country_workspace_id=p_workspace_id and lower(invite_email)=lower(btrim(p_email)) and invitation_status='ISSUED';
  insert into country_core.country_invitation(country_workspace_id,organization_id,invite_email,proposed_role,invitation_token_hash,expires_at,invited_by)
  values(p_workspace_id,p_organization_id,lower(btrim(p_email)),p_role,extensions.crypt(p_plain_token,extensions.gen_salt('bf')),p_expires_at,p_actor_id) returning * into r;
  insert into country_core.email_outbox(country_workspace_id,recipient_email,email_type,subject_line,template_code,template_payload)
  values(p_workspace_id,lower(btrim(p_email)),'USER_INVITATION','You are invited to AAB','AAB_COUNTRY_INVITATION',jsonb_build_object('invitation_id',r.country_invitation_id,'role',p_role,'expires_at',p_expires_at));
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_materialise_country_resource_finding(p_finding_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare f country_core.bootstrap_scan_finding; w country_core.country_workspace; rec agriculture.country_resource_candidate; p jsonb;
begin
 select * into f from country_core.bootstrap_scan_finding where bootstrap_scan_finding_id=p_finding_id for update;
 if f.finding_type<>'COUNTRY_RESOURCE' then raise exception 'FINDING_NOT_COUNTRY_RESOURCE' using errcode='23514'; end if;
 if f.review_status not in ('ACCEPTED_AS_CANDIDATE','VERIFIED') then raise exception 'RESOURCE_FINDING_REQUIRES_REVIEW' using errcode='23514'; end if;
 select * into w from country_core.country_workspace where country_workspace_id=f.country_workspace_id; p:=f.finding_payload;
 rec:=agriculture.api_create_country_resource_candidate(coalesce(p->>'resource_code','SCAN-'||substr(f.bootstrap_scan_finding_id::text,1,8)),f.finding_title,coalesce(p->>'resource_class','DISCOVERY_CANDIDATE'),coalesce(p->>'asset_type','DISCOVERY_CANDIDATE'),f.finding_summary,coalesce(p->>'uncertainty_summary','Country scan-derived candidate; evidence remains incomplete.'),p_actor_id,w.country_code,p->>'resource_origin',p->>'current_known_use',coalesce((p->>'traditional_knowledge_linked')::boolean,false),p->>'traditional_knowledge_summary',coalesce(p->>'composition_status','UNKNOWN'),coalesce(p->>'mechanism_status','UNKNOWN'),coalesce(p->>'evidence_status','NONE'),coalesce(p->>'observation_status','NONE'),coalesce(p->>'knowledge_gap_status','HIGH'),coalesce(p->>'discovery_potential','HIGH'));
 update agriculture.country_resource_candidate set country_workspace_id=f.country_workspace_id where country_resource_candidate_id=rec.country_resource_candidate_id;
 update country_core.bootstrap_scan_finding set materialisation_status='CANDIDATE_CREATED',target_entity_type='COUNTRY_RESOURCE_CANDIDATE',target_entity_id=rec.country_resource_candidate_id where bootstrap_scan_finding_id=p_finding_id;
 return rec.country_resource_candidate_id;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_personal_dashboard(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare result jsonb;
begin
 select jsonb_build_object(
   'actor',jsonb_build_object('actor_id',a.actor_id,'display_name',a.display_name,'actor_type',a.actor_type),
   'memberships',coalesce((select jsonb_agg(jsonb_build_object('workspace_id',m.country_workspace_id,'workspace_name',w.workspace_name,'country_code',w.country_code,'country_name',w.country_name,'role',m.membership_role,'status',m.membership_status) order by w.country_name) from country_core.workspace_membership m join country_core.country_workspace w on w.country_workspace_id=m.country_workspace_id where m.actor_id=p_actor_id and m.membership_status='ACTIVE'),'[]'::jsonb),
   'actions',coalesce((select jsonb_agg(to_jsonb(x) order by x.priority desc,x.created_at desc) from (select action_item_id,country_workspace_id,action_type,title,summary,priority,action_status,due_at,created_at from country_core.action_item where assigned_actor_id=p_actor_id and action_status in ('OPEN','IN_PROGRESS') limit 50) x),'[]'::jsonb),
   'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (select notification_id,country_workspace_id,notification_type,title,message,severity,read_at,created_at from country_core.notification where actor_id=p_actor_id order by created_at desc limit 50) n),'[]'::jsonb),
   'security',jsonb_build_object('recent_events',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from (select event_type,event_summary,created_at from country_core.security_event where actor_id=p_actor_id order by created_at desc limit 20) s),'[]'::jsonb))
 ) into result
 from agriculture.actor a where a.actor_id=p_actor_id;
 return coalesce(result,'{}'::jsonb);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_refresh_all_daily_impact()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'public'
AS $function$
declare w record; n integer:=0;
begin
 for w in select country_workspace_id from country_core.country_workspace where lifecycle_status not in ('ARCHIVED') loop
   perform country_core.api_refresh_daily_impact(w.country_workspace_id); n:=n+1;
 end loop;
 return n;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_refresh_daily_impact(p_workspace_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'observation_core', 'public'
AS $function$
declare d date:=current_date; n integer:=0; c numeric;
begin
 select count(*) into c from agriculture.country_resource_candidate where country_workspace_id=p_workspace_id;
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary) values(p_workspace_id,d,'RESOURCES_IDENTIFIED',c,'count','COUNT','Governed country resource candidates currently recorded.') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,evidence_summary=excluded.evidence_summary,generated_at=now(); n:=n+1;
 select count(*) into c from agriculture.resource_waste_stream where country_workspace_id=p_workspace_id;
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary) values(p_workspace_id,d,'WASTE_STREAMS_IDENTIFIED',c,'count','COUNT','Governed waste/resource recovery streams currently recorded.') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,generated_at=now(); n:=n+1;
 select count(*) into c from agriculture.discovery_candidate where country_workspace_id=p_workspace_id;
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary) values(p_workspace_id,d,'DISCOVERY_CANDIDATES',c,'count','COUNT','Governed discovery candidates currently recorded.') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,generated_at=now(); n:=n+1;
 select count(*) into c from agriculture.formulation_version where country_workspace_id=p_workspace_id;
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary) values(p_workspace_id,d,'FORMULATIONS_CREATED',c,'count','COUNT','Formulation versions currently recorded for this country workspace.') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,generated_at=now(); n:=n+1;
 select count(*) into c from agriculture.trial where country_workspace_id=p_workspace_id and lifecycle_status='COMPLETED';
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary) values(p_workspace_id,d,'TRIALS_COMPLETED',c,'count','COUNT','Completed governed trials currently recorded.') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,generated_at=now(); n:=n+1;
 if to_regclass('observation_core.community_submission') is not null then execute 'select count(*) from observation_core.community_submission cs join observation_core.observation o on o.observation_id=cs.observation_id where o.country_code=(select country_code from country_core.country_workspace where country_workspace_id=$1)' into c using p_workspace_id; else c:=0; end if;
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary) values(p_workspace_id,d,'COMMUNITY_OBSERVATIONS',c,'count','COUNT','Community/citizen-science submissions currently recorded.') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,generated_at=now(); n:=n+1;
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary)
 select p_workspace_id,d,'WASTE_DIVERTED',sum(e.waste_diverted_quantity),coalesce(e.waste_diverted_unit,'UNSPECIFIED'),'VERIFIED','Sum of validated environmental recovery outcomes; no unit conversion is implied.' from agriculture.environmental_recovery_outcome e join agriculture.resource_waste_stream s on s.resource_waste_stream_id=e.resource_waste_stream_id where s.country_workspace_id=p_workspace_id and e.outcome_status='VALIDATED' and e.waste_diverted_quantity is not null group by coalesce(e.waste_diverted_unit,'UNSPECIFIED') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,evidence_summary=excluded.evidence_summary,generated_at=now();
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary)
 select p_workspace_id,d,'BURNING_AVOIDED',sum(e.burning_avoided_quantity),coalesce(e.burning_avoided_unit,'UNSPECIFIED'),'VERIFIED','Sum of validated burning-avoidance outcomes; no unit conversion is implied.' from agriculture.environmental_recovery_outcome e join agriculture.resource_waste_stream s on s.resource_waste_stream_id=e.resource_waste_stream_id where s.country_workspace_id=p_workspace_id and e.outcome_status='VALIDATED' and e.burning_avoided_quantity is not null group by coalesce(e.burning_avoided_unit,'UNSPECIFIED') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,evidence_summary=excluded.evidence_summary,generated_at=now();
 insert into country_core.daily_impact_snapshot(country_workspace_id,snapshot_date,metric_code,numeric_value,unit,value_class,evidence_summary)
 select p_workspace_id,d,'LANDFILL_AVOIDED',sum(e.landfill_avoided_quantity),coalesce(e.landfill_avoided_unit,'UNSPECIFIED'),'VERIFIED','Sum of validated landfill-avoidance outcomes; no unit conversion is implied.' from agriculture.environmental_recovery_outcome e join agriculture.resource_waste_stream s on s.resource_waste_stream_id=e.resource_waste_stream_id where s.country_workspace_id=p_workspace_id and e.outcome_status='VALIDATED' and e.landfill_avoided_quantity is not null group by coalesce(e.landfill_avoided_unit,'UNSPECIFIED') on conflict(country_workspace_id,snapshot_date,metric_code,unit) do update set numeric_value=excluded.numeric_value,evidence_summary=excluded.evidence_summary,generated_at=now();
 return n;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_reissue_expired_personal_wa_rehearsal(p_handoff_correlation_id uuid, p_plain_activation_code text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'country_core', 'extensions'
AS $function$
declare
  v_handoff country_core.rehearsal_provisioning_handoff;
  v_original country_core.country_activation;
  v_document country_core.legal_document_version;
  v_replacement_id uuid;
begin
  if length(coalesce(p_plain_activation_code, '')) < 32
     or p_expires_at <= now()
     or p_expires_at > now() + interval '48 hours' then
    raise exception 'VALID_REHEARSAL_REISSUE_INPUT_REQUIRED' using errcode = '23514';
  end if;

  select * into v_handoff
  from country_core.rehearsal_provisioning_handoff
  where handoff_correlation_id = p_handoff_correlation_id
    and classification = 'PERSONAL_WA_REHEARSAL'
    and handoff_status = 'READY'
    and external_invitations_locked
    and not government_authority_verified
    and not production_authority
    and legal_effect = 'NONE_TEST_ONLY'
  for update;

  if v_handoff.rehearsal_provisioning_handoff_id is null then
    raise exception 'VERIFIED_READY_REHEARSAL_HANDOFF_REQUIRED' using errcode = '55000';
  end if;

  select * into v_original
  from country_core.country_activation
  where country_activation_id = v_handoff.activation_id
  for update;

  if v_original.country_activation_id is null
     or v_original.activation_status <> 'ISSUED'
     or v_original.expires_at > now()
     or v_original.claimed_by is not null
     or v_original.used_by is not null
     or v_original.provisioning_classification <> 'PERSONAL_WA_REHEARSAL'
     or v_original.government_authority_verified
     or v_original.production_authority
     or v_original.legal_effect <> 'NONE_TEST_ONLY'
     or not v_original.external_invitations_locked then
    raise exception 'EXPIRED_UNCLAIMED_REHEARSAL_ACTIVATION_REQUIRED' using errcode = '55000';
  end if;

  if exists (
    select 1 from country_core.rehearsal_activation_reissue
    where original_activation_id = v_original.country_activation_id
  ) then
    raise exception 'REHEARSAL_ACTIVATION_ALREADY_REISSUED' using errcode = '23505';
  end if;

  select * into v_document
  from country_core.legal_document_version
  where legal_document_version_id = v_original.required_rehearsal_document_version_id
    and document_status = 'PUBLISHED'
    and document_id = 'AAB-WA-TEST-TERMS-0001'
    and version_label = 'TEST-0.1'
    and document_sha256 = v_handoff.document_sha256
    and environment_classification = 'WA_CLEAN_ROOM_TEST'
    and legal_effect = 'NONE_TEST_ONLY'
    and not production_eligible
    and not government_authority_verified;

  if v_document.legal_document_version_id is null then
    raise exception 'CURRENT_HASH_VERIFIED_REHEARSAL_DOCUMENT_REQUIRED' using errcode = '55000';
  end if;

  update country_core.country_activation
  set activation_status = 'REVOKED'
  where country_activation_id = v_original.country_activation_id;

  insert into country_core.country_activation (
    country_code, country_name, nominated_head_admin_email,
    activation_code_hash, activation_status, expires_at, issued_by,
    handoff_correlation_id, source_participation_request_id,
    source_control_plane_decision_id, provisioning_classification,
    government_authority_verified, production_authority, legal_effect,
    external_invitations_locked, required_rehearsal_document_version_id
  ) values (
    v_original.country_code, v_original.country_name,
    v_original.nominated_head_admin_email,
    extensions.crypt(p_plain_activation_code, extensions.gen_salt('bf')),
    'ISSUED', p_expires_at, v_original.issued_by,
    v_original.handoff_correlation_id,
    v_original.source_participation_request_id,
    v_original.source_control_plane_decision_id,
    'PERSONAL_WA_REHEARSAL', false, false, 'NONE_TEST_ONLY', true,
    v_document.legal_document_version_id
  ) returning country_activation_id into v_replacement_id;

  insert into country_core.rehearsal_activation_reissue (
    rehearsal_provisioning_handoff_id, original_activation_id,
    replacement_activation_id, reissue_reason, classification
  ) values (
    v_handoff.rehearsal_provisioning_handoff_id,
    v_original.country_activation_id, v_replacement_id,
    'EXPIRED_UNCLAIMED', 'PERSONAL_WA_REHEARSAL'
  );

  update country_core.rehearsal_provisioning_handoff
  set activation_id = v_replacement_id
  where rehearsal_provisioning_handoff_id = v_handoff.rehearsal_provisioning_handoff_id;

  return jsonb_build_object(
    'ok', true,
    'replacement_activation_id', v_replacement_id,
    'classification', 'PERSONAL_WA_REHEARSAL',
    'reissue_reason', 'EXPIRED_UNCLAIMED',
    'document_version_id', v_document.legal_document_version_id,
    'document_sha256', v_document.document_sha256,
    'expires_at', p_expires_at,
    'external_invitations_locked', true
  );
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_seed_country_economic_baseline(p_workspace_id uuid, p_scan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare
  w country_core.country_workspace;
  inserted_facts integer := 0;
  baseline_rows integer := 0;
begin
  select * into w from country_core.country_workspace where country_workspace_id=p_workspace_id;
  if w.country_workspace_id is null then raise exception 'COUNTRY_WORKSPACE_NOT_FOUND' using errcode='22023'; end if;
  if trim(w.country_code)='TH' then
    insert into country_core.country_economic_fact(country_workspace_id,source_code,metric_code,metric_name,numeric_value,unit,period_label,period_start,period_end,fact_status,confidence_status,freshness_status,source_note,raw_payload,effective_at)
    values
      (p_workspace_id,'TH_PCD_POLLUTION_REPORT_2024','MSW_GENERATED_TONNES','Municipal solid waste generated',27200000,'tonnes/year','2024','2024-01-01','2024-12-31','VERIFIED_SOURCE','VERIFIED','CURRENT','Official Thailand Pollution Control Department 2024 national total.',jsonb_build_object('reported_value','27.20 million tonnes','scope','municipal solid waste generated'),now()),
      (p_workspace_id,'TH_PCD_POLLUTION_REPORT_2024','FOOD_WASTE_TONNES','Food waste generated',10010000,'tonnes/year','2024','2024-01-01','2024-12-31','VERIFIED_SOURCE','VERIFIED','CURRENT','Official Thailand Pollution Control Department 2024 national total.',jsonb_build_object('reported_value','10.01 million tonnes','share_pct',36.79),now()),
      (p_workspace_id,'TH_PCD_POLLUTION_REPORT_2024','SINGLE_USE_PLASTIC_WASTE_TONNES','Single-use plastic waste generated',2880000,'tonnes/year','2024','2024-01-01','2024-12-31','VERIFIED_SOURCE','VERIFIED','CURRENT','Official Thailand Pollution Control Department 2024 national total.',jsonb_build_object('reported_value','2.88 million tonnes'),now()),
      (p_workspace_id,'TH_WB_PLASTIC_MFA','MISMANAGED_PLASTIC_WASTE_TONNES','Mismanaged plastic waste',428000,'tonnes/year','World Bank study baseline','2019-01-01','2019-12-31','AUTHORITATIVE_MODEL','HIGH','AGING','World Bank material-flow model; historical baseline, not current total plastic generation.',jsonb_build_object('reported_value','428 kton/year','model_scope','mismanaged plastic waste'),now()),
      (p_workspace_id,'TH_PCD_POLLUTION_REPORT_2024','WASTE_GLASS_RECOVERABLE_TONNES','Recoverable waste-glass volume',null,'tonnes/year','CURRENT_UNKNOWN',null,null,'KNOWLEDGE_GAP','UNASSESSED','UNKNOWN','Glass production/packaging volume must not be treated as recoverable waste volume without an authoritative material-flow source.',jsonb_build_object('next_action','VERIFY_RECOVERABLE_GLASS_WASTE_VOLUME'),now())
    on conflict(country_workspace_id,source_code,metric_code,period_label) do update set
      numeric_value=excluded.numeric_value,text_value=excluded.text_value,unit=excluded.unit,fact_status=excluded.fact_status,
      confidence_status=excluded.confidence_status,freshness_status=excluded.freshness_status,source_note=excluded.source_note,
      raw_payload=excluded.raw_payload,retrieved_at=now(),effective_at=excluded.effective_at;
    get diagnostics inserted_facts = row_count;
  end if;
  delete from country_core.country_economic_baseline where country_workspace_id=p_workspace_id and bootstrap_scan_run_id=p_scan_id;
  insert into country_core.country_economic_baseline(country_workspace_id,bootstrap_scan_run_id,metric_code,metric_name,numeric_value,text_value,unit,currency_code,baseline_status,confidence_status,freshness_status,source_fact_id,knowledge_gap_summary)
  select p_workspace_id,p_scan_id,f.metric_code,f.metric_name,f.numeric_value,f.text_value,f.unit,f.currency_code,
    case f.fact_status when 'VERIFIED_SOURCE' then 'VERIFIED' when 'AUTHORITATIVE_MODEL' then 'AUTHORITATIVE_MODEL' when 'KNOWLEDGE_GAP' then 'NOT_YET_ESTABLISHED' else 'PARTIAL' end,
    f.confidence_status,f.freshness_status,f.country_economic_fact_id,
    case when f.fact_status='KNOWLEDGE_GAP' then f.source_note else null end
  from country_core.country_economic_fact f
  where f.country_workspace_id=p_workspace_id and f.fact_status<>'SUPERSEDED'
    and f.country_economic_fact_id in (select distinct on(metric_code) country_economic_fact_id from country_core.country_economic_fact where country_workspace_id=p_workspace_id and fact_status<>'SUPERSEDED' order by metric_code,retrieved_at desc);
  get diagnostics baseline_rows = row_count;
  if p_scan_id is not null then
    insert into country_core.bootstrap_scan_finding(bootstrap_scan_run_id,country_workspace_id,finding_type,finding_title,finding_summary,source_type,source_reference,confidence_status,evidence_status,review_status,finding_payload)
    select p_scan_id,p_workspace_id,'OTHER',b.metric_name,
      case when b.baseline_status='NOT_YET_ESTABLISHED' then coalesce(b.knowledge_gap_summary,'Economic baseline not yet established.') else 'Country economic/resource baseline loaded from governed source registry.' end,
      case when b.baseline_status='NOT_YET_ESTABLISHED' then 'AAB_INFERENCE' else 'EXTERNAL_AUTHORITATIVE_SOURCE' end,s.source_url,
      case when b.confidence_status='VERIFIED' then 'VERIFIED' else b.confidence_status end,
      case when b.baseline_status='NOT_YET_ESTABLISHED' then 'NONE' else 'SOURCE_RECORDED' end,'NOT_REVIEWED',
      jsonb_build_object('metric_code',b.metric_code,'numeric_value',b.numeric_value,'unit',b.unit,'baseline_status',b.baseline_status,'freshness_status',b.freshness_status,'source_code',s.source_code,'authority_tier',s.authority_tier)
    from country_core.country_economic_baseline b join country_core.country_economic_fact f on f.country_economic_fact_id=b.source_fact_id join country_core.country_source_registry s on s.source_code=f.source_code
    where b.country_workspace_id=p_workspace_id and b.bootstrap_scan_run_id=p_scan_id;
  end if;
  return jsonb_build_object('country_code',trim(w.country_code),'facts_upserted',inserted_facts,'baseline_rows',baseline_rows,'scan_run_id',p_scan_id);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_seed_country_ingredient_availability(p_workspace_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'country_core', 'public'
AS $function$
declare n integer;
begin
 insert into country_core.country_ingredient_availability(country_workspace_id,global_ingredient_id)
 select p_workspace_id,g.global_ingredient_id from country_core.global_ingredient_knowledge g where g.starter_status<>'ARCHIVED'
 on conflict(country_workspace_id,global_ingredient_id) do nothing;
 get diagnostics n=row_count; return n;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_seed_default_national_objectives(p_workspace_id uuid, p_actor_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare n integer;
begin
 insert into country_core.national_objective(country_workspace_id,objective_code,objective_title,objective_description,priority,created_by) values
 (p_workspace_id,'REDUCE_CROP_RESIDUE_BURNING','Reduce crop-residue burning','Reduce harmful open burning by identifying safe, practical and evidence-backed recovery pathways for crop residues.','CRITICAL',p_actor_id),
 (p_workspace_id,'IMPROVE_FARMER_PROFITABILITY','Improve farmer profitability','Identify scientifically defensible ways to improve productivity, input efficiency, resilience and local value creation for farmers.','HIGH',p_actor_id),
 (p_workspace_id,'REDUCE_IMPORTED_FERTILIZER_DEPENDENCE','Reduce imported fertilizer dependence','Investigate safe local organic, biological, mineral and recovered resources that may reduce unnecessary dependence on imported inputs.','HIGH',p_actor_id),
 (p_workspace_id,'IMPROVE_DEGRADED_SOILS','Improve degraded soils','Build evidence around interventions that improve soil condition, biology, nutrient cycling, structure and resilience.','HIGH',p_actor_id),
 (p_workspace_id,'REDUCE_AGRICULTURAL_WATER_POLLUTION','Reduce agricultural water pollution','Identify and validate practices and materials that reduce harmful agricultural runoff and improve water outcomes.','HIGH',p_actor_id),
 (p_workspace_id,'IMPROVE_WASTE_AND_ENVIRONMENT','Improve waste and environmental outcomes','Turn suitable waste and underused resources into governed scientific opportunities while reducing dumping, landfill, burning and pollution.','CRITICAL',p_actor_id)
 on conflict(country_workspace_id,objective_code) do nothing;
 get diagnostics n=row_count; return n;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_set_entity_sharing(p_actor_id uuid, p_country_workspace_id uuid, p_owner_organization_id uuid, p_entity_type text, p_entity_id uuid, p_classification text, p_ip_owner text, p_confidentiality text, p_licence text)
 RETURNS country_core.entity_sharing_policy
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.entity_sharing_policy; allowed boolean;
begin
  select exists(select 1 from country_core.workspace_membership wm where wm.country_workspace_id=p_country_workspace_id and wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.membership_role in ('HEAD_ADMIN','COUNTRY_ADMIN')) or exists(select 1 from country_core.organization_membership om where om.organization_id=p_owner_organization_id and om.actor_id=p_actor_id and om.membership_status='ACTIVE' and om.can_share_records) into allowed;
  if not allowed then raise exception 'SHARING_AUTHORITY_REQUIRED' using errcode='42501'; end if;
  insert into country_core.entity_sharing_policy(country_workspace_id,owner_organization_id,entity_type,entity_id,sharing_classification_code,ip_owner_name,confidentiality_note,licence_summary,set_by)
  values(p_country_workspace_id,p_owner_organization_id,upper(btrim(p_entity_type)),p_entity_id,upper(btrim(p_classification)),nullif(btrim(p_ip_owner),''),nullif(btrim(p_confidentiality),''),nullif(btrim(p_licence),''),p_actor_id)
  on conflict(entity_type,entity_id) do update set sharing_classification_code=excluded.sharing_classification_code,ip_owner_name=excluded.ip_owner_name,confidentiality_note=excluded.confidentiality_note,licence_summary=excluded.licence_summary,set_by=excluded.set_by,set_at=now()
  returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_start_country_bootstrap(p_workspace_id uuid, p_actor_id uuid)
 RETURNS country_core.bootstrap_scan_run
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare w country_core.country_workspace; r country_core.bootstrap_scan_run; econ jsonb;
begin
 select * into w from country_core.country_workspace where country_workspace_id=p_workspace_id for update;
 if w.country_workspace_id is null then raise exception 'COUNTRY_WORKSPACE_NOT_FOUND' using errcode='22023'; end if;
 if not country_core.api_actor_has_workspace_role(p_actor_id,p_workspace_id,array['HEAD_ADMIN','COUNTRY_ADMIN','SCIENTIST']) then raise exception 'COUNTRY_BOOTSTRAP_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 perform country_core.api_seed_default_national_objectives(p_workspace_id,p_actor_id); perform country_core.api_seed_country_ingredient_availability(p_workspace_id);
 insert into country_core.country_brain_registry(country_workspace_id,brain_name,doctrine) values(p_workspace_id,'AAB '||w.country_name||' Country Brain','Country-specific governed intelligence context. It may discover and organise candidates, but cannot approve ingredients, formulations, regulatory claims or scientific truth autonomously.') on conflict(country_workspace_id) do nothing;
 insert into country_core.bootstrap_scan_run(country_workspace_id,run_code,run_status,initiated_by) values(p_workspace_id,'BOOT-'||trim(w.country_code)||'-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS'),'RUNNING',p_actor_id) returning * into r;
 econ := country_core.api_seed_country_economic_baseline(p_workspace_id,r.bootstrap_scan_run_id);
 insert into country_core.bootstrap_scan_brain_event(bootstrap_scan_run_id,event_order,brain_code,event_status,event_summary,handed_to_brain_code,event_payload) values
 (r.bootstrap_scan_run_id,10,'COUNTRY_BRAIN','COMPLETE','Loaded country workspace, national objectives and governance context.','INGREDIENT_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,20,'INGREDIENT_INTELLIGENCE','COMPLETE','Loaded the Global Starter Ingredient Library for country availability assessment.','COUNTRY_RESOURCE_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,30,'COUNTRY_RESOURCE_INTELLIGENCE','KNOWLEDGE_GAP','Country-specific resource discovery requires authoritative/local source ingestion before claims can be made.','COUNTRY_SOURCE_REGISTRY','{}'),
 (r.bootstrap_scan_run_id,35,'COUNTRY_SOURCE_REGISTRY','COMPLETE','Loaded registered authoritative country data sources and preserved source tier, period and freshness.','OPPORTUNITY_ECONOMICS',econ),
 (r.bootstrap_scan_run_id,40,'OPPORTUNITY_ECONOMICS','COMPLETE','Built the initial country economic/resource baseline from sourced facts. Missing values remain explicit knowledge gaps.','RESOURCE_RECOVERY_INTELLIGENCE',econ),
 (r.bootstrap_scan_run_id,50,'RESOURCE_RECOVERY_INTELLIGENCE','KNOWLEDGE_GAP','Waste, residue, burning, dumping and recovery opportunities require country source data or governed observations.','ENVIRONMENTAL_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,60,'ENVIRONMENTAL_INTELLIGENCE','KNOWLEDGE_GAP','Environmental priorities await country datasets and governed observations.','REGULATORY_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,70,'REGULATORY_INTELLIGENCE','KNOWLEDGE_GAP','Jurisdiction-specific regulatory sources must be loaded and versioned before dossier readiness can be assessed.','COMPLIANCE_AUDIT_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,75,'COMPLIANCE_AUDIT_INTELLIGENCE','COMPLETE','Compliance and audit gates are active. No opportunity may be represented as compliant or approved without evidence and human authority.','NATIONAL_OPPORTUNITY_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,80,'NATIONAL_OPPORTUNITY_INTELLIGENCE','COMPLETE','National benefit pathways may now be modelled as scenarios from governed facts; implementation authority remains external.','KNOWLEDGE_GAP_INTELLIGENCE','{}'),
 (r.bootstrap_scan_run_id,90,'KNOWLEDGE_GAP_INTELLIGENCE','COMPLETE','Converted missing country evidence into explicit knowledge gaps rather than assumptions.','COUNTRY_BRAIN','{}');
 insert into country_core.bootstrap_scan_finding(bootstrap_scan_run_id,country_workspace_id,finding_type,finding_title,finding_summary,source_type,confidence_status,evidence_status,review_status,finding_payload)
 select r.bootstrap_scan_run_id,p_workspace_id,'INGREDIENT_AVAILABILITY',g.ingredient_name,'Starter ingredient requires country availability, source and regulatory assessment.','GLOBAL_STARTER_LIBRARY','UNASSESSED','REFERENCE_UNREVIEWED','NOT_REVIEWED',jsonb_build_object('global_ingredient_id',g.global_ingredient_id,'ingredient_code',g.ingredient_code,'material_class',g.material_class) from country_core.global_ingredient_knowledge g where g.starter_status<>'ARCHIVED';
 insert into country_core.bootstrap_scan_finding(bootstrap_scan_run_id,country_workspace_id,finding_type,finding_title,finding_summary,source_type,confidence_status,evidence_status,review_status,finding_payload) values
 (r.bootstrap_scan_run_id,p_workspace_id,'KNOWLEDGE_GAP','Country resource inventory required','AAB requires authoritative/local evidence about biological, mineral, aquatic, agricultural and underused resources before country-specific resource candidates can be verified.','AAB_INFERENCE','HIGH','NONE','NOT_REVIEWED',jsonb_build_object('next_action','CONNECT_COUNTRY_RESOURCE_SOURCES')),
 (r.bootstrap_scan_run_id,p_workspace_id,'KNOWLEDGE_GAP','Waste and burning inventory required','AAB requires country waste/residue data and observations to identify recovery opportunities such as crop-residue burning alternatives.','AAB_INFERENCE','HIGH','NONE','NOT_REVIEWED',jsonb_build_object('next_action','CONNECT_WASTE_ENVIRONMENT_SOURCES')),
 (r.bootstrap_scan_run_id,p_workspace_id,'KNOWLEDGE_GAP','Regulatory source map required','AAB requires current authoritative regulatory sources before Cross-Border Dossier Passport translation can operate.','AAB_INFERENCE','HIGH','NONE','NOT_REVIEWED',jsonb_build_object('next_action','LOAD_REGULATORY_SOURCES'));
 update country_core.country_workspace set lifecycle_status='BOOTSTRAP_RUNNING',updated_at=now() where country_workspace_id=p_workspace_id;
 update country_core.bootstrap_scan_run set run_status='AWAITING_EXTERNAL_SOURCES',summary='Internal bootstrap completed. Starter ingredients, governed source registry, economic baseline, opportunity economics and compliance/audit gates loaded. Country-specific resource, environmental and regulatory evidence continues through authoritative source ingestion.' where bootstrap_scan_run_id=r.bootstrap_scan_run_id returning * into r;
 return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_update_user_preferences(p_actor_id uuid, p_language_code text, p_timezone_name text, p_default_landing_page text, p_dashboard_density text, p_preferred_country_workspace_id uuid, p_preferred_organization_id uuid, p_email_notifications boolean, p_in_app_notifications boolean, p_task_review_alerts boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.user_preference%rowtype;
begin
 insert into country_core.user_preference(actor_id,language_code,timezone_name,default_landing_page,dashboard_density,preferred_country_workspace_id,preferred_organization_id,email_notifications,in_app_notifications,task_review_alerts)
 values(p_actor_id,coalesce(nullif(trim(p_language_code),''),'en'),coalesce(nullif(trim(p_timezone_name),''),'UTC'),coalesce(nullif(trim(p_default_landing_page),''),'/aab-local/app/_rebuild/my-dashboard.html'),case when upper(coalesce(p_dashboard_density,'')) in ('COMPACT','COMFORTABLE','SPACIOUS') then upper(p_dashboard_density) else 'COMFORTABLE' end,p_preferred_country_workspace_id,p_preferred_organization_id,coalesce(p_email_notifications,true),coalesce(p_in_app_notifications,true),coalesce(p_task_review_alerts,true))
 on conflict(actor_id) do update set language_code=excluded.language_code,timezone_name=excluded.timezone_name,default_landing_page=excluded.default_landing_page,dashboard_density=excluded.dashboard_density,preferred_country_workspace_id=excluded.preferred_country_workspace_id,preferred_organization_id=excluded.preferred_organization_id,email_notifications=excluded.email_notifications,in_app_notifications=excluded.in_app_notifications,task_review_alerts=excluded.task_review_alerts,updated_at=now()
 returning * into r;
 return to_jsonb(r);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_upsert_institution_settings(p_actor_id uuid, p_organization_id uuid, p_default_language text, p_default_timezone text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare o country_core.organization%rowtype; r country_core.institution_scientific_settings%rowtype;
begin
  if not country_core.actor_can_manage_organization(p_actor_id,p_organization_id) then raise exception 'INSTITUTION_MANAGE_DENIED' using errcode='42501'; end if;
  select * into o from country_core.organization where organization_id=p_organization_id;
  if o.organization_id is null then raise exception 'INSTITUTION_NOT_FOUND'; end if;
  insert into country_core.institution_scientific_settings(country_workspace_id,organization_id,default_language,default_timezone,setup_status,notes,updated_by)
  values(o.country_workspace_id,o.organization_id,coalesce(nullif(trim(p_default_language),''),'en'),coalesce(nullif(trim(p_default_timezone),''),'UTC'),'CONFIGURED',nullif(trim(p_notes),''),p_actor_id)
  on conflict(organization_id) do update set default_language=excluded.default_language,default_timezone=excluded.default_timezone,setup_status='CONFIGURED',notes=excluded.notes,updated_by=p_actor_id,updated_at=now()
  returning * into r;
  return to_jsonb(r);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_user_preferences(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
declare r country_core.user_preference%rowtype;
begin
 insert into country_core.user_preference(actor_id) values(p_actor_id) on conflict(actor_id) do nothing;
 select * into r from country_core.user_preference where actor_id=p_actor_id;
 return to_jsonb(r);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_validate_collaboration_manufacturing_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'country_core', 'manufacturing_core', 'agriculture', 'public'
AS $function$
declare a uuid; w uuid; src uuid; dst uuid; ing uuid; fv uuid; gd uuid; tp manufacturing_core.transfer_package; result jsonb;
begin
  begin
    select actor_id into a from agriculture.actor where active order by created_at limit 1;
    if a is null then raise exception 'NO_ACTOR_FOR_E2E'; end if;
    insert into country_core.country_workspace(workspace_code,country_code,country_name,workspace_name,lifecycle_status,activated_at,activated_by) values('E2E-COLLAB-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),'ZZ','E2E Country','E2E Country','ACTIVE',now(),a) returning country_workspace_id into w;
    insert into country_core.workspace_membership(country_workspace_id,actor_id,membership_role,membership_status,can_invite_users,can_manage_roles,can_manage_country_settings,can_access_regulatory_gate,granted_by) values(w,a,'HEAD_ADMIN','ACTIVE',true,true,true,true,a);
    insert into country_core.organization(country_workspace_id,organization_code,organization_name,organization_type) values(w,'E2E-UNI','E2E University','UNIVERSITY') returning organization_id into src;
    insert into country_core.organization(country_workspace_id,organization_code,organization_name,organization_type) values(w,'E2E-MFG','E2E Manufacturer','MANUFACTURER') returning organization_id into dst;
    insert into country_core.organization_workspace(country_workspace_id,organization_id,workspace_code,workspace_name,workspace_type,created_by) values(w,src,'E2E-PROJECT','Private Research Project','PROJECT',a);
    insert into agriculture.ingredient(ingredient_code,ingredient_name,lifecycle_status,material_class,preparation_class,data_class,country_workspace_id,created_by) values('E2E-ING-'||substr(replace(gen_random_uuid()::text,'-',''),1,6),'E2E Ingredient','ACTIVE','PLANT_DERIVED','UNPROCESSED','SCIENTIST_APPROVED',w,a) returning ingredient_id into ing;
    insert into agriculture.formulation_version(version_code,formulation_name,version_number,formulation_type,change_type,change_rationale,data_class,trial_readiness,lifecycle_status,country_workspace_id,created_by) values('E2E-FV-'||substr(replace(gen_random_uuid()::text,'-',''),1,6),'E2E Formulation',1,'WET_GEL','INITIAL','E2E only','TEST','READY_FOR_TRIAL','DRAFT',w,a) returning formulation_version_id into fv;
    insert into agriculture.governance_decision(decision_code,decision_type,decision_status,subject_entity_type,subject_entity_id,rationale,created_by,decided_by,decided_at) values('E2E-GD-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),'APPROVE','APPROVED','FORMULATION_VERSION',fv,'E2E approval',a,a,now()) returning decision_id into gd;
    update agriculture.formulation_version set lifecycle_status='APPROVED',governance_decision_id=gd,approved_by=a,approved_at=now() where formulation_version_id=fv;
    insert into agriculture.formulation_version_ingredient_line(formulation_version_id,ingredient_id,inclusion_rate_percent,sequence_order,ingredient_role,data_class,is_active,created_by) values(fv,ing,100,1,'E2E role','TEST',true,a);
    select * into tp from manufacturing_core.api_generate_transfer_package(a,w,src,dst,fv,'MANUFACTURING_EVALUATION',null);
    result:=jsonb_build_object('ok',true,'status','PASS_ROLLBACK_ONLY','contract','AAB_COUNTRY_COLLAB_MANUFACTURING_E2E_112','institution_created',src is not null,'manufacturer_created',dst is not null,'private_workspace_default',(select default_sharing_classification='PRIVATE_TO_ORGANIZATION' from country_core.organization_workspace where country_workspace_id=w and organization_id=src limit 1),'transfer_created',tp.transfer_package_id is not null,'transfer_status',tp.package_status,'manufacturer_sections',(select count(*) from manufacturing_core.transfer_section where transfer_package_id=tp.transfer_package_id),'internal_research_withheld',(select count(*)>0 from manufacturing_core.transfer_section where transfer_package_id=tp.transfer_package_id and visibility='SOURCE_ONLY' and section_status='WITHHELD'),'approved_formulation_required',true,'scientist_authority_preserved',true,'all_validation_mutations_rolled_back',true);
    raise exception 'AAB_E2E_ROLLBACK';
  exception when others then
    if sqlerrm='AAB_E2E_ROLLBACK' then return result; end if;
    raise;
  end;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.api_workspace_for_actor(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('country_workspace_id',w.country_workspace_id,'workspace_code',w.workspace_code,'workspace_name',w.workspace_name,'country_code',w.country_code,'country_name',w.country_name,'lifecycle_status',w.lifecycle_status,'role',m.membership_role,'head_admin',m.membership_role='HEAD_ADMIN','regulatory_access',m.can_access_regulatory_gate) order by w.country_name),'[]'::jsonb)
 from country_core.workspace_membership m join country_core.country_workspace w on w.country_workspace_id=m.country_workspace_id where m.actor_id=p_actor_id and m.membership_status='ACTIVE';
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION country_core.current_rehearsal_head_admin_workspace()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform', 'country_core', 'auth'
AS $function$
  select m.country_workspace_id
  from country_core.workspace_membership m
  where m.actor_id=platform.current_actor_id() and m.membership_role='HEAD_ADMIN' and m.membership_status='ACTIVE'
    and exists(select 1 from country_core.country_activation a where a.used_by=m.actor_id and a.activation_status='USED'
      and a.provisioning_classification='PERSONAL_WA_REHEARSAL' and a.external_invitations_locked and not a.production_authority)
  order by m.granted_at desc limit 1
$function$
;
