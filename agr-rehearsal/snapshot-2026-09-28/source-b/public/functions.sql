-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: public. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for public: functions 35, tables 3, views 0, rls_enabled_tables 3, constraints 23, triggers 1, policies 0, indexes 10.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_accept_invitation(p_invitation_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare v_email text; v_inv country_core.country_invitation; v_actor uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATED_VERIFIED_EMAIL_REQUIRED' using errcode='28000'; end if;
  select lower(btrim(email)) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null and deleted_at is null and coalesce(is_anonymous,false)=false;
  if coalesce(v_email,'')='' then raise exception 'AUTHENTICATED_VERIFIED_EMAIL_REQUIRED' using errcode='28000'; end if;
  select * into v_inv from country_core.country_invitation where invitation_status='ISSUED' and expires_at>now() and lower(invite_email)=v_email and extensions.crypt(p_invitation_token,invitation_token_hash)=invitation_token_hash order by invited_at desc limit 1 for update;
  if v_inv.country_invitation_id is null then raise exception 'INVALID_OR_EXPIRED_INVITATION' using errcode='28000'; end if;
  v_actor:=platform.create_actor_for_current_user(case when v_inv.proposed_role in ('SCIENTIST','RESEARCHER') then 'SCIENTIST' when v_inv.proposed_role in ('COUNTRY_ADMIN','REGULATORY_ADMIN') then 'ADMIN' else 'USER' end);
  update country_core.country_invitation set invitation_status='CLAIMED',claimed_by=v_actor,claimed_at=now() where country_invitation_id=v_inv.country_invitation_id;
  return jsonb_build_object('ok',true,'route_code','PROFILE_AND_TERMS','route','/onboarding/profile-and-terms','country_workspace_id',v_inv.country_workspace_id,'institution_name',v_inv.institution_name,'proposed_role',v_inv.proposed_role,'email_locked',v_email);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_accept_legal_document(p_document_version_id uuid, p_acceptance_statement text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_doc country_core.legal_document_version; v_role text:='USER'; v_invite uuid; v_workspace uuid;
begin
  if auth.uid() is null or v_actor is null then raise exception 'PROFILE_REQUIRED' using errcode='28000'; end if;
  select * into v_doc from country_core.legal_document_version where legal_document_version_id=p_document_version_id and document_status='PUBLISHED' and effective_at<=now();
  if v_doc.legal_document_version_id is null then raise exception 'PUBLISHED_TERMS_REQUIRED' using errcode='22023'; end if;
  select i.country_invitation_id,i.country_workspace_id,i.proposed_role into v_invite,v_workspace,v_role from country_core.country_invitation i where i.claimed_by=v_actor and i.invitation_status='CLAIMED' order by i.claimed_at desc limit 1;
  if v_invite is null then select m.country_workspace_id,m.membership_role into v_workspace,v_role from country_core.workspace_membership m where m.actor_id=v_actor and m.membership_status='ACTIVE' order by m.granted_at desc limit 1; end if;
  if v_doc.document_scope='COUNTRY' and v_doc.country_workspace_id is distinct from v_workspace then raise exception 'COUNTRY_TERMS_SCOPE_MISMATCH' using errcode='42501'; end if;
  insert into country_core.legal_acceptance_receipt(legal_document_version_id,auth_user_id,actor_id,country_workspace_id,country_invitation_id,role_at_acceptance,acceptance_statement,document_sha256)
  values(v_doc.legal_document_version_id,auth.uid(),v_actor,v_workspace,v_invite,coalesce(v_role,'USER'),btrim(p_acceptance_statement),v_doc.document_sha256)
  on conflict(auth_user_id,legal_document_version_id) do nothing;
  return public.aab_legal_onboarding_state();
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_acknowledge_rehearsal_document(p_acknowledgement_statement text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_activation country_core.country_activation; v_doc country_core.legal_document_version;
begin
  if auth.uid() is null or v_actor is null then raise exception 'CLAIMED_REHEARSAL_IDENTITY_REQUIRED' using errcode='28000'; end if;
  select * into v_activation from country_core.country_activation where claimed_by=v_actor and provisioning_classification='PERSONAL_WA_REHEARSAL' and activation_status='ISSUED' and expires_at>now() order by claimed_at desc limit 1 for update;
  if v_activation.country_activation_id is null then raise exception 'CLAIMED_REHEARSAL_ACTIVATION_REQUIRED' using errcode='55000'; end if;
  select * into v_doc from country_core.legal_document_version where legal_document_version_id=v_activation.required_rehearsal_document_version_id and document_status='PUBLISHED' and environment_classification='WA_CLEAN_ROOM_TEST' and legal_effect='NONE_TEST_ONLY' and production_eligible=false;
  if v_doc.legal_document_version_id is null then raise exception 'PUBLISHED_REHEARSAL_DOCUMENT_REQUIRED' using errcode='55000'; end if;
  if btrim(coalesce(p_acknowledgement_statement,''))<>'I acknowledge this test-only document for the sole purpose of rehearsing the AAB WA onboarding workflow.' then raise exception 'EXACT_REHEARSAL_ACKNOWLEDGEMENT_REQUIRED' using errcode='23514'; end if;
  insert into country_core.rehearsal_acknowledgement_receipt(
   acknowledgement_type,legal_document_version_id,country_activation_id,auth_user_id,actor_id,document_sha256,acknowledgement_statement,environment_classification,legal_effect
  ) values('REHEARSAL_ACKNOWLEDGEMENT',v_doc.legal_document_version_id,v_activation.country_activation_id,auth.uid(),v_actor,v_doc.document_sha256,btrim(p_acknowledgement_statement),'WA_CLEAN_ROOM_TEST','NONE_TEST_ONLY')
  on conflict(auth_user_id,legal_document_version_id,country_activation_id) do nothing;
  return public.aab_rehearsal_onboarding_state();
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_acknowledge_rehearsal_participant(p_invitation_token text, p_acknowledgement_statement text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'extensions', 'auth'
AS $function$
declare v country_core.rehearsal_participant_invitation; v_actor uuid:=platform.current_actor_id();
begin
 if auth.uid() is null or v_actor is null then raise exception 'CLAIMED_REHEARSAL_IDENTITY_REQUIRED' using errcode='28000'; end if;
 select * into v from country_core.rehearsal_participant_invitation where claimed_by=v_actor and claimed_auth_user_id=auth.uid() and invitation_status='CLAIMED' and expires_at>now() and extensions.crypt(p_invitation_token,invitation_token_hash)=invitation_token_hash for update;
 if v.rehearsal_participant_invitation_id is null then raise exception 'CLAIMED_REHEARSAL_INVITATION_REQUIRED' using errcode='42501'; end if;
 if btrim(coalesce(p_acknowledgement_statement,''))<>'I acknowledge this internal test-only participation for the sole purpose of rehearsing AAB institution onboarding.' then raise exception 'EXACT_REHEARSAL_ACKNOWLEDGEMENT_REQUIRED' using errcode='23514'; end if;
 if not exists(select 1 from country_core.onboarding_profile p where p.actor_id=v_actor) then raise exception 'PROFILE_REQUIRED' using errcode='55000'; end if;
 insert into country_core.rehearsal_participant_acknowledgement(rehearsal_participant_invitation_id,auth_user_id,actor_id,acknowledgement_type,acknowledgement_statement)
 values(v.rehearsal_participant_invitation_id,auth.uid(),v_actor,'INTERNAL_INSTITUTION_REHEARSAL_ACKNOWLEDGEMENT',btrim(p_acknowledgement_statement)) on conflict(rehearsal_participant_invitation_id) do nothing;
 return public.aab_rehearsal_participant_state(p_invitation_token);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_admin_dashboard_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture'
AS $function$
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
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_admin_review_participation_request(p_request_id uuid, p_decision text, p_rationale text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'security_core'
AS $function$
declare
  v_actor uuid;
  v_old text;
  v_new text;
  v_reference text;
  v_security_result jsonb;
begin
  v_actor := platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_new := upper(btrim(coalesce(p_decision, '')));
  if v_new not in ('MORE_INFORMATION_REQUIRED', 'APPROVED', 'DECLINED') then
    raise exception 'INVALID_REVIEW_DECISION';
  end if;

  if length(btrim(coalesce(p_rationale, ''))) < 12 then
    raise exception 'MEANINGFUL_REVIEW_RATIONALE_REQUIRED';
  end if;

  select review_status, reference
  into v_old, v_reference
  from public.aab_country_participation_requests
  where id = p_request_id
  for update;

  if v_old is null then
    raise exception 'PARTICIPATION_REQUEST_NOT_FOUND';
  end if;

  if v_old not in ('PENDING_REVIEW', 'MORE_INFORMATION_REQUIRED') then
    raise exception 'REQUEST_ALREADY_DECIDED';
  end if;

  update public.aab_country_participation_requests
  set review_status = v_new,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_notes = btrim(p_rationale)
  where id = p_request_id;

  insert into platform.participation_request_decision(
    request_id,
    previous_status,
    decision_status,
    rationale,
    decided_by
  )
  values (
    p_request_id,
    v_old,
    v_new,
    btrim(p_rationale),
    v_actor
  );

  update country_core.action_item
  set action_status = 'DONE',
      completed_at = now()
  where assigned_actor_id = v_actor
    and source_entity_type = 'AAB_COUNTRY_PARTICIPATION_REQUEST'
    and source_entity_id = p_request_id
    and action_status in ('OPEN', 'IN_PROGRESS');

  v_security_result := security_core.api_run_security_brain();

  return jsonb_build_object(
    'ok', true,
    'reference', v_reference,
    'status', v_new,
    'country_provisioned', false,
    'provisioning_confirmation_required', v_new = 'APPROVED',
    'security_reconciliation', v_security_result
  );
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_admin_review_security_alert(p_alert_id uuid, p_status text, p_rationale text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'security_core', 'platform', 'agriculture', 'public'
AS $function$
declare v_actor uuid;v_status text;
begin
 v_actor:=platform.current_actor_id();
 if v_actor is null or not platform.is_platform_admin(v_actor) then raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode='42501';end if;
 v_status:=upper(btrim(coalesce(p_status,'')));
 if v_status not in ('ACKNOWLEDGED','RESOLVED','DISMISSED') then raise exception 'INVALID_ALERT_REVIEW_STATUS';end if;
 if length(btrim(coalesce(p_rationale,'')))<12 then raise exception 'MEANINGFUL_SECURITY_RATIONALE_REQUIRED';end if;
 update security_core.security_alert set alert_status=v_status,acknowledged_at=now(),acknowledged_by=v_actor,resolution_rationale=btrim(p_rationale) where alert_id=p_alert_id and alert_status in ('OPEN','ACKNOWLEDGED');
 if not found then raise exception 'SECURITY_ALERT_NOT_REVIEWABLE';end if;
 return jsonb_build_object('ok',true,'alert_id',p_alert_id,'status',v_status,'authority_action_taken',false);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_admin_run_security_brain()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'security_core', 'public'
AS $function$select security_core.api_run_security_brain()$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_admin_security_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'security_core', 'platform', 'agriculture', 'public'
AS $function$
declare
  v_actor uuid;
begin
  v_actor := platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'open', (
        select count(*)
        from security_core.security_alert
        where alert_status = 'OPEN'
      ),
      'high_or_critical', (
        select count(*)
        from security_core.security_alert
        where alert_status = 'OPEN'
          and severity in ('HIGH', 'CRITICAL')
      )
    ),
    'alerts', coalesce((
      select jsonb_agg(to_jsonb(alert_row) order by alert_row.detected_at desc)
      from (
        select *
        from security_core.security_alert
        where alert_status = 'OPEN'
        order by detected_at desc
        limit 100
      ) alert_row
    ), '[]'::jsonb),
    'latest_run', (
      select to_jsonb(run_row)
      from security_core.security_brain_run run_row
      order by started_at desc
      limit 1
    ),
    'authority_boundary', 'ADVISORY_ONLY_HUMAN_DECISION_REQUIRED'
  );
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_apply_personal_wa_rehearsal_handoff(p_handoff_correlation_id uuid, p_source_request_id uuid, p_source_decision_id uuid, p_nominated_email text, p_document_sha256 text, p_storage_path text, p_plain_activation_code text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'country_core'
AS $function$ select country_core.api_apply_personal_wa_rehearsal_handoff(p_handoff_correlation_id,p_source_request_id,p_source_decision_id,p_nominated_email,p_document_sha256,p_storage_path,p_plain_activation_code,p_expires_at) $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_apply_personal_wa_rehearsal_handoff(p_handoff_correlation_id uuid, p_source_request_id uuid, p_source_internal_nomination_id uuid, p_source_decision_id uuid, p_nominated_email text, p_document_sha256 text, p_storage_path text, p_plain_activation_code text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'country_core'
AS $function$
 select country_core.api_apply_personal_wa_rehearsal_handoff(
  p_handoff_correlation_id,p_source_request_id,p_source_internal_nomination_id,p_source_decision_id,
  p_nominated_email,p_document_sha256,p_storage_path,p_plain_activation_code,p_expires_at
 )
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_claim_country_activation(p_activation_code text, p_workspace_name text DEFAULT NULL::text, p_default_language text DEFAULT 'en'::text, p_timezone_name text DEFAULT 'UTC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_activation country_core.country_activation;
  v_actor uuid;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATED_VERIFIED_EMAIL_REQUIRED' using errcode='28000';
  end if;

  select lower(btrim(email)) into v_email
  from auth.users
  where id=v_user_id
    and email_confirmed_at is not null
    and deleted_at is null
    and coalesce(is_anonymous,false)=false;

  if coalesce(v_email,'')='' then
    raise exception 'AUTHENTICATED_VERIFIED_EMAIL_REQUIRED' using errcode='28000';
  end if;

  select * into v_activation
  from country_core.country_activation
  where activation_status='ISSUED'
    and expires_at>now()
    and lower(nominated_head_admin_email)=v_email
    and extensions.crypt(p_activation_code,activation_code_hash)=activation_code_hash
  order by issued_at desc
  limit 1
  for update;

  if v_activation.country_activation_id is null then
    raise exception 'INVALID_OR_EXPIRED_COUNTRY_ACTIVATION' using errcode='28000';
  end if;

  select i.actor_id into v_actor
  from platform.auth_actor_identity i
  join agriculture.actor a on a.actor_id=i.actor_id
  where i.auth_user_id=v_user_id
    and i.active
    and a.active
    and a.external_subject='supabase-auth:'||v_user_id::text
  limit 1;

  if v_actor is null then
    select a.actor_id into v_actor
    from agriculture.actor a
    where a.external_subject='supabase-auth:'||v_user_id::text
      and a.active
    limit 1
    for update;

    if v_actor is null then
      raise exception 'EXACT_EXISTING_ACTOR_REQUIRED_FOR_RELINK' using errcode='28000';
    end if;

    insert into platform.auth_actor_identity(auth_user_id,actor_id,link_reason,active)
    values(v_user_id,v_actor,'Recovered exact immutable external-subject link during governed country activation claim',true);
  end if;

  update country_core.country_activation
  set claimed_by=v_actor,
      claimed_at=now(),
      pending_workspace_name=p_workspace_name,
      pending_default_language=coalesce(nullif(p_default_language,''),'en'),
      pending_timezone_name=coalesce(nullif(p_timezone_name,''),'UTC')
  where country_activation_id=v_activation.country_activation_id;

  return jsonb_build_object(
    'ok',true,
    'route','/onboarding/head-admin-profile-and-aab-terms',
    'route_code','HEAD_ADMIN_PROFILE_AND_AAB_TERMS',
    'country_code',v_activation.country_code,
    'country_name',v_activation.country_name,
    'email_locked',v_email
  );
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_claim_rehearsal_participant_invitation(p_invitation_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare v country_core.rehearsal_participant_invitation; v_actor uuid; v_email text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into v from country_core.rehearsal_participant_invitation where lower(invite_email)=v_email and invitation_status in ('ISSUED','CLAIMED') and expires_at>now() and extensions.crypt(p_invitation_token,invitation_token_hash)=invitation_token_hash order by issued_at desc limit 1 for update;
 if v.rehearsal_participant_invitation_id is null then raise exception 'CONTROLLED_REHEARSAL_INVITATION_REQUIRED' using errcode='42501'; end if;
 v_actor:=platform.create_actor_for_current_user('USER');
 if v.claimed_by is not null and v.claimed_by<>v_actor then raise exception 'INVITATION_ALREADY_CLAIMED' using errcode='42501'; end if;
 update country_core.rehearsal_participant_invitation set invitation_status='CLAIMED',claimed_by=v_actor,claimed_auth_user_id=auth.uid(),claimed_at=coalesce(claimed_at,now()) where rehearsal_participant_invitation_id=v.rehearsal_participant_invitation_id;
 return public.aab_rehearsal_participant_state(p_invitation_token);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_finalize_country_activation(p_activation_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_activation country_core.country_activation; v_aab uuid; v_workspace country_core.country_workspace;
begin
  if auth.uid() is null or v_actor is null then raise exception 'AUTHENTICATED_PROFILE_REQUIRED' using errcode='28000'; end if;
  select * into v_activation from country_core.country_activation
   where activation_status='ISSUED' and expires_at>now() and claimed_by=v_actor
     and extensions.crypt(p_activation_code,activation_code_hash)=activation_code_hash
   order by claimed_at desc limit 1 for update;
  if v_activation.country_activation_id is null then raise exception 'CLAIMED_ACTIVATION_REQUIRED' using errcode='28000'; end if;
  if not exists(select 1 from country_core.onboarding_profile where actor_id=v_actor) then raise exception 'PROFILE_REQUIRED' using errcode='55000'; end if;
  if v_activation.provisioning_classification='PERSONAL_WA_REHEARSAL' then
    if v_activation.government_authority_verified or v_activation.production_authority or v_activation.legal_effect<>'NONE_TEST_ONLY' or not v_activation.external_invitations_locked then
      raise exception 'INVALID_REHEARSAL_CLASSIFICATION' using errcode='55000';
    end if;
    if not exists(select 1 from country_core.rehearsal_acknowledgement_receipt r where r.auth_user_id=auth.uid() and r.actor_id=v_actor and r.country_activation_id=v_activation.country_activation_id and r.acknowledgement_type='REHEARSAL_ACKNOWLEDGEMENT' and r.production_eligible=false and r.legal_effect='NONE_TEST_ONLY') then
      raise exception 'REHEARSAL_ACKNOWLEDGEMENT_REQUIRED' using errcode='55000';
    end if;
  else
    select legal_document_version_id into v_aab from country_core.legal_document_version where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and effective_at<=now() and production_eligible=true;
    if v_aab is null or not exists(select 1 from country_core.legal_acceptance_receipt where auth_user_id=auth.uid() and legal_document_version_id=v_aab) then raise exception 'CURRENT_OPERATIONAL_AAB_TERMS_ACCEPTANCE_REQUIRED' using errcode='55000'; end if;
  end if;
  v_workspace:=country_core.api_activate_country(v_activation.country_code,p_activation_code,v_actor,v_activation.pending_workspace_name,v_activation.pending_default_language,v_activation.pending_timezone_name);
  update country_core.onboarding_profile set country_workspace_id=v_workspace.country_workspace_id,profile_status='ACTIVE',completed_at=now(),updated_at=now() where actor_id=v_actor;
  update country_core.rehearsal_provisioning_handoff set handoff_status='ACTIVATED' where activation_id=v_activation.country_activation_id;
  return jsonb_build_object('ok',true,'route','/head-admin','route_code','COUNTRY_HEAD_ADMIN_DASHBOARD','country_workspace_id',v_workspace.country_workspace_id,'classification',v_activation.provisioning_classification,'external_invitations_locked',v_activation.external_invitations_locked);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_finalize_invited_membership()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_inv country_core.country_invitation; v_membership country_core.workspace_membership;
begin
  select * into v_inv from country_core.country_invitation where claimed_by=v_actor and invitation_status='CLAIMED' and expires_at>now() order by claimed_at desc limit 1 for update;
  if v_inv.country_invitation_id is null then raise exception 'CLAIMED_INVITATION_REQUIRED' using errcode='28000'; end if;
  if not exists(select 1 from country_core.onboarding_profile p where p.actor_id=v_actor) then raise exception 'PROFILE_REQUIRED' using errcode='55000'; end if;
  if not exists(select 1 from country_core.legal_acceptance_receipt where auth_user_id=auth.uid() and legal_document_version_id=v_inv.required_aab_terms_version_id) or not exists(select 1 from country_core.legal_acceptance_receipt where auth_user_id=auth.uid() and legal_document_version_id=v_inv.required_country_terms_version_id) then raise exception 'BOTH_TERMS_ACCEPTANCES_REQUIRED' using errcode='55000'; end if;
  insert into country_core.workspace_membership(country_workspace_id,actor_id,organization_id,membership_role,membership_status,can_invite_users,can_manage_roles,can_manage_country_settings,can_access_regulatory_gate,granted_by)
  values(v_inv.country_workspace_id,v_actor,v_inv.organization_id,v_inv.proposed_role,'ACTIVE',false,false,false,v_inv.proposed_role='REGULATORY_ADMIN',v_inv.invited_by)
  on conflict(country_workspace_id,actor_id) do update set organization_id=excluded.organization_id,membership_role=excluded.membership_role,membership_status='ACTIVE',can_access_regulatory_gate=excluded.can_access_regulatory_gate returning * into v_membership;
  update country_core.country_invitation set invitation_status='ACCEPTED',accepted_by=v_actor,accepted_at=now() where country_invitation_id=v_inv.country_invitation_id;
  update country_core.onboarding_profile set profile_status='ACTIVE',completed_at=now(),updated_at=now() where actor_id=v_actor;
  return public.aab_resolve_entry();
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_finalize_rehearsal_participant(p_invitation_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare v country_core.rehearsal_participant_invitation; v_actor uuid:=platform.current_actor_id(); v_org uuid; v_org_role text; v_code text;
begin
 if auth.uid() is null or v_actor is null then raise exception 'AUTHENTICATED_PROFILE_REQUIRED' using errcode='28000'; end if;
 select * into v from country_core.rehearsal_participant_invitation where claimed_by=v_actor and claimed_auth_user_id=auth.uid() and invitation_status='CLAIMED' and expires_at>now() and extensions.crypt(p_invitation_token,invitation_token_hash)=invitation_token_hash for update;
 if v.rehearsal_participant_invitation_id is null then raise exception 'CLAIMED_REHEARSAL_INVITATION_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from country_core.rehearsal_participant_acknowledgement r where r.rehearsal_participant_invitation_id=v.rehearsal_participant_invitation_id and r.auth_user_id=auth.uid() and not r.production_eligible and not r.scientific_approval_authority and not r.external_invitation_authority) then raise exception 'REHEARSAL_ACKNOWLEDGEMENT_REQUIRED' using errcode='55000'; end if;
 if v.invitation_kind='INSTITUTION_ADMIN' then
   v_code:='REH-'||upper(substr(replace(v.rehearsal_participant_invitation_id::text,'-',''),1,12));
   insert into country_core.organization(country_workspace_id,organization_code,organization_name,organization_type,active)
   values(v.country_workspace_id,v_code,v.institution_name,v.institution_type,true) returning organization_id into v_org;
   insert into country_core.organization_membership(country_workspace_id,organization_id,actor_id,organization_role,membership_status,can_manage_organization,can_share_records,can_receive_manufacturing_transfers,granted_by)
   values(v.country_workspace_id,v_org,v_actor,'ADMIN','ACTIVE',true,false,false,v.issued_by);
   insert into country_core.workspace_membership(country_workspace_id,actor_id,organization_id,membership_role,membership_status,can_invite_users,can_manage_roles,can_manage_country_settings,can_access_regulatory_gate,granted_by)
   values(v.country_workspace_id,v_actor,v_org,'VIEWER','ACTIVE',false,false,false,false,v.issued_by)
   on conflict(country_workspace_id,actor_id) do update set organization_id=excluded.organization_id,membership_status='ACTIVE',revoked_at=null;
 else
   v_org:=v.organization_id;
   if exists(select 1 from country_core.organization_membership m where m.organization_id=v_org and m.actor_id=v_actor and m.membership_status='ACTIVE') then raise exception 'EXISTING_ORGANIZATION_MEMBER_CANNOT_BE_REINVITED' using errcode='23505'; end if;
   select organization_role into v_org_role from country_core.rehearsal_role_catalog where role_code=v.proposed_role and active;
   if v_org_role is null then raise exception 'GOVERNED_REHEARSAL_ROLE_REQUIRED' using errcode='55000'; end if;
   insert into country_core.organization_membership(country_workspace_id,organization_id,actor_id,organization_role,membership_status,can_manage_organization,can_share_records,can_receive_manufacturing_transfers,granted_by)
   values(v.country_workspace_id,v_org,v_actor,v_org_role,'ACTIVE',false,false,false,v.issued_by);
   insert into country_core.workspace_membership(country_workspace_id,actor_id,organization_id,membership_role,membership_status,can_invite_users,can_manage_roles,can_manage_country_settings,can_access_regulatory_gate,granted_by)
   values(v.country_workspace_id,v_actor,v_org,case when v.proposed_role in ('SCIENTIST','RESEARCHER','AUDITOR','VIEWER') then v.proposed_role else 'VIEWER' end,'ACTIVE',false,false,false,false,v.issued_by)
   on conflict(country_workspace_id,actor_id) do update set organization_id=excluded.organization_id,membership_role=excluded.membership_role,membership_status='ACTIVE',can_invite_users=false,can_manage_roles=false,can_manage_country_settings=false,can_access_regulatory_gate=false,revoked_at=null;
 end if;
 update country_core.rehearsal_participant_invitation set organization_id=v_org,invitation_status='ACCEPTED',accepted_at=now() where rehearsal_participant_invitation_id=v.rehearsal_participant_invitation_id;
 update country_core.onboarding_profile set country_workspace_id=v.country_workspace_id,profile_status='ACTIVE',completed_at=now(),updated_at=now() where actor_id=v_actor;
 return jsonb_build_object('ok',true,'route',case when v.invitation_kind='INSTITUTION_ADMIN' then '/institution-admin' else '/institution-workspace' end,'authority',case when v.invitation_kind='INSTITUTION_ADMIN' then 'PERSISTED_REHEARSAL_INSTITUTION_ADMIN' else 'PERSISTED_REHEARSAL_TEAM_MEMBER' end,'organization_id',v_org,'role',v.proposed_role,'classification',v.classification);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_issue_country_invitation(p_country_workspace_id uuid, p_organization_id uuid, p_invitee_name text, p_invite_email text, p_official_position text, p_proposed_role text, p_plain_token text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_aab uuid; v_country uuid; v_id uuid; v_org text;
begin
  if v_actor is null or not exists(select 1 from country_core.workspace_membership m where m.actor_id=v_actor and m.country_workspace_id=p_country_workspace_id and m.membership_status='ACTIVE' and m.can_invite_users) then raise exception 'INVITATION_AUTHORITY_REQUIRED' using errcode='42501'; end if;
  select legal_document_version_id into v_aab from country_core.legal_document_version where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and effective_at<=now();
  select legal_document_version_id into v_country from country_core.legal_document_version where document_scope='COUNTRY' and country_workspace_id=p_country_workspace_id and document_status='PUBLISHED' and effective_at<=now();
  if v_aab is null or v_country is null then raise exception 'PUBLISHED_AAB_AND_COUNTRY_TERMS_REQUIRED' using errcode='55000'; end if;
  if p_expires_at<=now() or length(coalesce(p_plain_token,''))<24 then raise exception 'VALID_INVITATION_TOKEN_AND_EXPIRY_REQUIRED' using errcode='23514'; end if;
  select organization_name into v_org from country_core.organization where organization_id=p_organization_id and country_workspace_id=p_country_workspace_id and active;
  if v_org is null then raise exception 'VALID_COUNTRY_ORGANIZATION_REQUIRED' using errcode='23503'; end if;
  insert into country_core.country_invitation(country_workspace_id,organization_id,invite_email,proposed_role,invitation_token_hash,expires_at,invited_by,invitee_name,institution_name,official_position,required_aab_terms_version_id,required_country_terms_version_id)
  values(p_country_workspace_id,p_organization_id,lower(btrim(p_invite_email)),p_proposed_role,extensions.crypt(p_plain_token,extensions.gen_salt('bf')),p_expires_at,v_actor,btrim(p_invitee_name),v_org,btrim(p_official_position),v_aab,v_country) returning country_invitation_id into v_id;
  return jsonb_build_object('ok',true,'invitation_id',v_id,'expires_at',p_expires_at,'single_use',true);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_issue_rehearsal_institution_invitation(p_institution_name text, p_institution_type text, p_invitee_name text, p_invite_email text, p_official_position text, p_plain_token text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_workspace uuid:=country_core.current_rehearsal_head_admin_workspace(); v_id uuid;
begin
 if auth.uid() is null or v_actor is null or v_workspace is null then raise exception 'PERSISTED_REHEARSAL_HEAD_ADMIN_REQUIRED' using errcode='42501'; end if;
 if length(btrim(coalesce(p_plain_token,'')))<32 or p_expires_at<=now() or p_expires_at>now()+interval '7 days' then raise exception 'VALID_SINGLE_USE_INVITATION_REQUIRED' using errcode='23514'; end if;
 if upper(btrim(p_institution_type)) not in ('UNIVERSITY','RESEARCH_INSTITUTE','LABORATORY','OTHER') then raise exception 'INSTITUTION_TYPE_NOT_PERMITTED' using errcode='23514'; end if;
 update country_core.rehearsal_participant_invitation set invitation_status='EXPIRED' where invitation_status='ISSUED' and expires_at<=now();
 if exists(select 1 from country_core.rehearsal_participant_invitation where country_workspace_id=v_workspace and lower(invite_email)=lower(btrim(p_invite_email)) and invitation_kind='INSTITUTION_ADMIN' and invitation_status in ('ISSUED','CLAIMED')) then raise exception 'OPEN_REHEARSAL_INVITATION_ALREADY_EXISTS' using errcode='23505'; end if;
 insert into country_core.rehearsal_participant_invitation(country_workspace_id,invitation_kind,institution_name,institution_type,invitee_name,invite_email,official_position,proposed_role,invitation_token_hash,expires_at,issued_by)
 values(v_workspace,'INSTITUTION_ADMIN',btrim(p_institution_name),upper(btrim(p_institution_type)),btrim(p_invitee_name),lower(btrim(p_invite_email)),btrim(p_official_position),'INSTITUTION_ADMIN',extensions.crypt(p_plain_token,extensions.gen_salt('bf')),p_expires_at,v_actor)
 returning rehearsal_participant_invitation_id into v_id;
 return jsonb_build_object('ok',true,'invitation_id',v_id,'email',lower(btrim(p_invite_email)),'expires_at',p_expires_at,'classification','INTERNAL_INSTITUTION_REHEARSAL');
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_issue_rehearsal_team_invitation(p_invitee_name text, p_invite_email text, p_official_position text, p_role_code text, p_plain_token text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'extensions', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_auth jsonb:=public.aab_rehearsal_institution_authority(); v_org uuid; v_workspace uuid; v_name text; v_type text; v_id uuid;
begin
 if coalesce((v_auth->>'ok')::boolean,false)=false then raise exception 'PERSISTED_REHEARSAL_INSTITUTION_ADMIN_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from country_core.rehearsal_role_catalog where role_code=upper(btrim(p_role_code)) and active) then raise exception 'GOVERNED_REHEARSAL_ROLE_REQUIRED' using errcode='23514'; end if;
 if length(btrim(coalesce(p_plain_token,'')))<32 or p_expires_at<=now() or p_expires_at>now()+interval '7 days' then raise exception 'VALID_SINGLE_USE_INVITATION_REQUIRED' using errcode='23514'; end if;
 v_org:=(v_auth->>'organization_id')::uuid; v_workspace:=(v_auth->>'country_workspace_id')::uuid;
 select organization_name,organization_type into v_name,v_type from country_core.organization where organization_id=v_org;
 if exists(
   select 1
   from auth.users u
   join platform.auth_actor_identity ai on ai.auth_user_id=u.id and ai.active
   join country_core.organization_membership m on m.actor_id=ai.actor_id
   where lower(u.email)=lower(btrim(p_invite_email))
     and m.organization_id=v_org
     and m.membership_status='ACTIVE'
 ) then raise exception 'EXISTING_ORGANIZATION_MEMBER_CANNOT_BE_REINVITED' using errcode='23505'; end if;
 if exists(select 1 from country_core.rehearsal_participant_invitation where organization_id=v_org and lower(invite_email)=lower(btrim(p_invite_email)) and invitation_kind='TEAM_MEMBER' and invitation_status in ('ISSUED','CLAIMED')) then raise exception 'OPEN_REHEARSAL_INVITATION_ALREADY_EXISTS' using errcode='23505'; end if;
 insert into country_core.rehearsal_participant_invitation(country_workspace_id,organization_id,invitation_kind,institution_name,institution_type,invitee_name,invite_email,official_position,proposed_role,invitation_token_hash,expires_at,issued_by)
 values(v_workspace,v_org,'TEAM_MEMBER',v_name,case when v_type in ('UNIVERSITY','RESEARCH_INSTITUTE','LABORATORY','OTHER') then v_type else 'OTHER' end,btrim(p_invitee_name),lower(btrim(p_invite_email)),btrim(p_official_position),upper(btrim(p_role_code)),extensions.crypt(p_plain_token,extensions.gen_salt('bf')),p_expires_at,v_actor)
 returning rehearsal_participant_invitation_id into v_id;
 return jsonb_build_object('ok',true,'invitation_id',v_id,'email',lower(btrim(p_invite_email)),'role',upper(btrim(p_role_code)),'expires_at',p_expires_at,'classification','INTERNAL_INSTITUTION_REHEARSAL');
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_legal_onboarding_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare
  v_actor uuid := platform.current_actor_id();
  v_workspace uuid;
  v_role text;
  v_aab country_core.legal_document_version;
  v_country country_core.legal_document_version;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  select m.country_workspace_id,m.membership_role into v_workspace,v_role
  from country_core.workspace_membership m
  where m.actor_id=v_actor and m.membership_status='ACTIVE'
  order by (m.membership_role='HEAD_ADMIN') desc,m.granted_at desc limit 1;
  select * into v_aab from country_core.legal_document_version
    where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and effective_at<=now();
  if v_workspace is not null then
    select * into v_country from country_core.legal_document_version
      where document_scope='COUNTRY' and country_workspace_id=v_workspace and document_status='PUBLISHED' and effective_at<=now();
  end if;
  return jsonb_build_object(
    'authenticated',true,'actor_id',v_actor,'workspace_id',v_workspace,'role',v_role,
    'aab_terms',case when v_aab.legal_document_version_id is null then jsonb_build_object('available',false) else jsonb_build_object('available',true,'id',v_aab.legal_document_version_id,'title',v_aab.title,'version',v_aab.version_label,'sha256',v_aab.document_sha256,'bucket',v_aab.storage_bucket,'path',v_aab.storage_path) end,
    'country_terms',case when v_country.legal_document_version_id is null then jsonb_build_object('available',false) else jsonb_build_object('available',true,'id',v_country.legal_document_version_id,'title',v_country.title,'version',v_country.version_label,'sha256',v_country.document_sha256,'bucket',v_country.storage_bucket,'path',v_country.storage_path) end,
    'aab_accepted',v_aab.legal_document_version_id is not null and exists(select 1 from country_core.legal_acceptance_receipt r where r.auth_user_id=auth.uid() and r.legal_document_version_id=v_aab.legal_document_version_id),
    'country_accepted',v_country.legal_document_version_id is not null and exists(select 1 from country_core.legal_acceptance_receipt r where r.auth_user_id=auth.uid() and r.legal_document_version_id=v_country.legal_document_version_id)
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_publish_country_terms(p_country_workspace_id uuid, p_title text, p_version_label text, p_language_code text, p_storage_bucket text, p_storage_path text, p_document_sha256 text, p_effective_at timestamp with time zone, p_certification_statement text, p_material_change boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_doc uuid;
begin
  if v_actor is null or not exists(select 1 from country_core.workspace_membership m where m.actor_id=v_actor and m.country_workspace_id=p_country_workspace_id and m.membership_status='ACTIVE' and m.membership_role='HEAD_ADMIN' and m.can_manage_country_settings) then raise exception 'HEAD_ADMIN_AUTHORITY_REQUIRED' using errcode='42501'; end if;
  if p_document_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'VALID_DOCUMENT_SHA256_REQUIRED' using errcode='23514'; end if;
  update country_core.legal_document_version set document_status='RETIRED',retired_at=now() where document_scope='COUNTRY' and country_workspace_id=p_country_workspace_id and document_status='PUBLISHED';
  insert into country_core.legal_document_version(document_scope,country_workspace_id,title,version_label,language_code,document_status,storage_bucket,storage_path,document_sha256,effective_at,published_at,material_change,requires_reacceptance,uploaded_by,certified_by,certification_statement)
  values('COUNTRY',p_country_workspace_id,btrim(p_title),btrim(p_version_label),coalesce(nullif(btrim(p_language_code),''),'en'), 'PUBLISHED',p_storage_bucket,p_storage_path,lower(p_document_sha256),greatest(p_effective_at,now()),now(),p_material_change,p_material_change,v_actor,v_actor,btrim(p_certification_statement)) returning legal_document_version_id into v_doc;
  return jsonb_build_object('ok',true,'legal_document_version_id',v_doc,'invitations_enabled',exists(select 1 from country_core.legal_document_version where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and effective_at<=now()));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_document_locator()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'auth'
AS $function$
declare v_state jsonb; v_doc country_core.legal_document_version;
begin
 v_state:=public.aab_rehearsal_onboarding_state();
 if coalesce((v_state->>'eligible')::boolean,false)=false then raise exception 'CONTROLLED_REHEARSAL_INVITATION_REQUIRED' using errcode='42501'; end if;
 select * into v_doc from country_core.legal_document_version where document_id='AAB-WA-TEST-TERMS-0001' and version_label='TEST-0.1' and document_status='PUBLISHED';
 return jsonb_build_object('bucket',v_doc.storage_bucket,'path',v_doc.storage_path,'sha256',v_doc.document_sha256);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_head_admin_authority()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_workspace uuid;
begin
 if auth.uid() is null or v_actor is null then return jsonb_build_object('ok',false,'authority','NONE'); end if;
 select m.country_workspace_id into v_workspace from country_core.workspace_membership m
 where m.actor_id=v_actor and m.membership_role='HEAD_ADMIN' and m.membership_status='ACTIVE'
   and exists(select 1 from country_core.country_activation a where a.used_by=v_actor and a.activation_status='USED' and a.provisioning_classification='PERSONAL_WA_REHEARSAL' and a.external_invitations_locked and not a.production_authority)
 order by m.granted_at desc limit 1;
 if v_workspace is null then return jsonb_build_object('ok',false,'authority','NONE'); end if;
 return jsonb_build_object('ok',true,'authority','PERSISTED_WA_HEAD_ADMIN','route','/head-admin','route_code','COUNTRY_HEAD_ADMIN_DASHBOARD','country_workspace_id',v_workspace,'classification','PERSONAL_WA_REHEARSAL','external_invitations_locked',true);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_institution_authority()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform', 'country_core', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_m country_core.organization_membership; v_name text;
begin
 if auth.uid() is null or v_actor is null then return jsonb_build_object('ok',false,'authority','NONE'); end if;
 select * into v_m from country_core.organization_membership m where m.actor_id=v_actor and m.organization_role='ADMIN' and m.membership_status='ACTIVE' and m.can_manage_organization and not m.can_share_records and not m.can_receive_manufacturing_transfers and exists(select 1 from country_core.rehearsal_participant_invitation i where i.claimed_by=v_actor and i.organization_id=m.organization_id and i.invitation_kind='INSTITUTION_ADMIN' and i.invitation_status='ACCEPTED' and i.classification='INTERNAL_INSTITUTION_REHEARSAL') order by m.granted_at desc limit 1;
 if v_m.organization_membership_id is null then return jsonb_build_object('ok',false,'authority','NONE'); end if;
 select organization_name into v_name from country_core.organization where organization_id=v_m.organization_id;
 return jsonb_build_object('ok',true,'authority','PERSISTED_REHEARSAL_INSTITUTION_ADMIN','route','/institution-admin','route_code','INSTITUTION_ADMIN_DASHBOARD','organization_id',v_m.organization_id,'organization_name',v_name,'country_workspace_id',v_m.country_workspace_id,'classification','INTERNAL_INSTITUTION_REHEARSAL','external_participation',false,'scientific_approval_authority',false);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_institution_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'auth'
AS $function$
declare v_auth jsonb:=public.aab_rehearsal_institution_authority(); v_org uuid;
begin
 if coalesce((v_auth->>'ok')::boolean,false)=false then raise exception 'PERSISTED_REHEARSAL_INSTITUTION_ADMIN_REQUIRED' using errcode='42501'; end if;
 v_org:=(v_auth->>'organization_id')::uuid;
 return v_auth || jsonb_build_object(
  'active_team_members',(select count(*) from country_core.organization_membership where organization_id=v_org and membership_status='ACTIVE' and organization_role<>'ADMIN'),
  'open_team_invitations',(select count(*) from country_core.rehearsal_participant_invitation where organization_id=v_org and invitation_kind='TEAM_MEMBER' and invitation_status in ('ISSUED','CLAIMED') and expires_at>now()),
  'roles',(select coalesce(jsonb_agg(jsonb_build_object('code',role_code,'name',role_name,'description',description,'can_prepare_research',can_prepare_research,'can_record_observations',can_record_observations,'can_review_quality',can_review_quality,'can_approve_science',can_approve_science) order by role_name),'[]'::jsonb) from country_core.rehearsal_role_catalog where active),
  'team',(select coalesce(jsonb_agg(jsonb_build_object('role',m.organization_role,'status',m.membership_status,'granted_at',m.granted_at) order by m.granted_at desc),'[]'::jsonb) from country_core.organization_membership m where m.organization_id=v_org and m.organization_role<>'ADMIN')
 );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_onboarding_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_activation country_core.country_activation; v_doc country_core.legal_document_version;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  select * into v_activation from country_core.country_activation
   where lower(nominated_head_admin_email)=(select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null)
     and provisioning_classification='PERSONAL_WA_REHEARSAL' and activation_status='ISSUED' and expires_at>now()
   order by issued_at desc limit 1;
  if v_activation.country_activation_id is null then return jsonb_build_object('eligible',false,'reason','CONTROLLED_REHEARSAL_INVITATION_REQUIRED'); end if;
  select * into v_doc from country_core.legal_document_version where legal_document_version_id=v_activation.required_rehearsal_document_version_id;
  return jsonb_build_object(
   'eligible',true,'classification','PERSONAL_WA_REHEARSAL','email_locked',v_activation.nominated_head_admin_email,
   'claimed',v_activation.claimed_by is not null,'profile_complete',v_actor is not null and exists(select 1 from country_core.onboarding_profile where actor_id=v_actor),
   'acknowledged',v_actor is not null and exists(select 1 from country_core.rehearsal_acknowledgement_receipt where actor_id=v_actor and country_activation_id=v_activation.country_activation_id),
   'document',jsonb_build_object('id',v_doc.document_id,'title',v_doc.title,'version',v_doc.version_label,'sha256',v_doc.document_sha256,'status',v_doc.document_status,'environment',v_doc.environment_classification,'legal_effect',v_doc.legal_effect,'production_eligible',v_doc.production_eligible),
   'boundaries',jsonb_build_object('government_authority',false,'production',false,'legal_effect','NONE_TEST_ONLY','external_invitations',false,'scientific_authority',false,'automatic_promotion',false)
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_participant_invitation_preview(p_invitation_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'country_core', 'extensions'
AS $function$
declare v country_core.rehearsal_participant_invitation;
begin
 select * into v from country_core.rehearsal_participant_invitation where invitation_status in ('ISSUED','CLAIMED') and expires_at>now() and extensions.crypt(p_invitation_token,invitation_token_hash)=invitation_token_hash order by issued_at desc limit 1;
 if v.rehearsal_participant_invitation_id is null then return jsonb_build_object('eligible',false); end if;
 return jsonb_build_object('eligible',true,'email',v.invite_email,'invitee_name',v.invitee_name,'institution_name',v.institution_name,'institution_type',v.institution_type,'kind',v.invitation_kind,'role',v.proposed_role,'classification',v.classification,'expires_at',v.expires_at);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_participant_state(p_invitation_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'extensions', 'auth'
AS $function$
declare v country_core.rehearsal_participant_invitation; v_actor uuid:=platform.current_actor_id(); v_email text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into v from country_core.rehearsal_participant_invitation where lower(invite_email)=v_email and invitation_status in ('ISSUED','CLAIMED','ACCEPTED') and extensions.crypt(p_invitation_token,invitation_token_hash)=invitation_token_hash order by issued_at desc limit 1;
 if v.rehearsal_participant_invitation_id is null then return jsonb_build_object('eligible',false,'reason','CONTROLLED_REHEARSAL_INVITATION_REQUIRED'); end if;
 return jsonb_build_object('eligible',true,'invitation_id',v.rehearsal_participant_invitation_id,'kind',v.invitation_kind,'email',v.invite_email,'invitee_name',v.invitee_name,'institution_name',v.institution_name,'institution_type',v.institution_type,'role',v.proposed_role,'status',v.invitation_status,
  'claimed',v.claimed_by is not null,'profile_complete',v_actor is not null and exists(select 1 from country_core.onboarding_profile p where p.actor_id=v_actor),
  'acknowledged',exists(select 1 from country_core.rehearsal_participant_acknowledgement r where r.rehearsal_participant_invitation_id=v.rehearsal_participant_invitation_id and r.auth_user_id=auth.uid()),
  'classification',v.classification,'legal_effect',v.legal_effect,'authority',jsonb_build_object('production',false,'government',false,'scientific_approval',false,'external_participation',false));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_rehearsal_team_authority()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform', 'country_core', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_m country_core.organization_membership; v_name text; v_role_code text; v_role country_core.rehearsal_role_catalog;
begin
 if auth.uid() is null or v_actor is null then return jsonb_build_object('ok',false,'authority','NONE'); end if;
 select * into v_m from country_core.organization_membership m where m.actor_id=v_actor and m.membership_status='ACTIVE' and m.organization_role<>'ADMIN' and not m.can_manage_organization and not m.can_share_records and not m.can_receive_manufacturing_transfers and exists(select 1 from country_core.rehearsal_participant_invitation i where i.claimed_by=v_actor and i.organization_id=m.organization_id and i.invitation_kind='TEAM_MEMBER' and i.invitation_status='ACCEPTED' and i.classification='INTERNAL_INSTITUTION_REHEARSAL') order by m.granted_at desc limit 1;
 if v_m.organization_membership_id is null then return jsonb_build_object('ok',false,'authority','NONE'); end if;
 select i.proposed_role into v_role_code from country_core.rehearsal_participant_invitation i where i.claimed_by=v_actor and i.organization_id=v_m.organization_id and i.invitation_kind='TEAM_MEMBER' and i.invitation_status='ACCEPTED' order by i.accepted_at desc limit 1;
 select * into v_role from country_core.rehearsal_role_catalog where role_code=v_role_code and active;
 select organization_name into v_name from country_core.organization where organization_id=v_m.organization_id;
 return jsonb_build_object('ok',true,'authority','PERSISTED_REHEARSAL_TEAM_MEMBER','route','/institution-workspace','route_code','INSTITUTION_WORKSPACE','organization_id',v_m.organization_id,'organization_name',v_name,'country_workspace_id',v_m.country_workspace_id,'role',v_role.role_code,'classification','INTERNAL_INSTITUTION_REHEARSAL','permissions',jsonb_build_object('can_prepare_research',v_role.can_prepare_research,'can_record_observations',v_role.can_record_observations,'can_review_quality',v_role.can_review_quality,'can_approve_science',false,'can_invite',false));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_replace_pending_rehearsal_institution_invitation(p_invite_email text, p_plain_token text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'extensions', 'auth'
AS $function$
declare v_actor uuid:=platform.current_actor_id(); v_workspace uuid:=country_core.current_rehearsal_head_admin_workspace(); v_invitation country_core.rehearsal_participant_invitation;
begin
 if auth.uid() is null or v_actor is null or v_workspace is null then raise exception 'PERSISTED_REHEARSAL_HEAD_ADMIN_REQUIRED' using errcode='42501'; end if;
 if length(btrim(coalesce(p_plain_token,'')))<32 or p_expires_at<=now() or p_expires_at>now()+interval '7 days' then raise exception 'VALID_SINGLE_USE_INVITATION_REQUIRED' using errcode='23514'; end if;
 select * into v_invitation from country_core.rehearsal_participant_invitation
 where country_workspace_id=v_workspace and invitation_kind='INSTITUTION_ADMIN'
 and lower(invite_email)=lower(btrim(p_invite_email)) and invitation_status='ISSUED'
 and claimed_by is null and claimed_auth_user_id is null
 order by issued_at desc limit 1 for update;
 if v_invitation.rehearsal_participant_invitation_id is null then raise exception 'REPLACEABLE_PENDING_REHEARSAL_INVITATION_NOT_FOUND' using errcode='P0002'; end if;
 update country_core.rehearsal_participant_invitation
 set invitation_token_hash=extensions.crypt(p_plain_token,extensions.gen_salt('bf')),expires_at=p_expires_at,issued_at=now(),issued_by=v_actor
 where rehearsal_participant_invitation_id=v_invitation.rehearsal_participant_invitation_id;
 return jsonb_build_object('ok',true,'replaced',true,'invitation_id',v_invitation.rehearsal_participant_invitation_id,'email',lower(v_invitation.invite_email),'expires_at',p_expires_at,'classification',v_invitation.classification);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_resolve_entry()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
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
end $function$
;
COMMENT ON FUNCTION public.aab_resolve_entry() IS 'Returns only a server-approved relative entry route derived from protected identity and membership records.';

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_save_onboarding_profile(p_full_name text, p_official_position text, p_institution_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'auth'
AS $function$
declare
  v_actor uuid;
  v_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000';
  end if;
  if length(btrim(coalesce(p_full_name,'')))<2
     or length(btrim(coalesce(p_official_position,'')))<2 then
    raise exception 'PROFILE_FIELDS_REQUIRED' using errcode='23514';
  end if;

  v_actor:=platform.create_actor_for_current_user('USER');

  select candidate.country_workspace_id
    into v_workspace
  from (
    select i.country_workspace_id, i.claimed_at as resolved_at
    from country_core.country_invitation i
    where i.claimed_by=v_actor
      and i.invitation_status='CLAIMED'
    union all
    select m.country_workspace_id, m.granted_at as resolved_at
    from country_core.workspace_membership m
    where m.actor_id=v_actor
      and m.membership_status='ACTIVE'
  ) candidate
  order by candidate.resolved_at desc nulls last
  limit 1;

  insert into country_core.onboarding_profile(
    actor_id,auth_user_id,full_name,official_position,
    institution_name,country_workspace_id
  ) values(
    v_actor,auth.uid(),btrim(p_full_name),btrim(p_official_position),
    nullif(btrim(coalesce(p_institution_name,'')),''),
    v_workspace
  )
  on conflict(actor_id) do update
  set full_name=excluded.full_name,
      official_position=excluded.official_position,
      institution_name=excluded.institution_name,
      country_workspace_id=coalesce(
        excluded.country_workspace_id,
        country_core.onboarding_profile.country_workspace_id
      ),
      updated_at=now();

  return jsonb_build_object(
    'ok',true,
    'actor_id',v_actor,
    'status','LEGAL_PENDING'
  );
end
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_submit_country_participation_request(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
declare v_user auth.users%rowtype; v_id uuid; v_reference text; v_domains text[];
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;
  if lower(coalesce(p_request->>'official_email','')) <> lower(coalesce(v_user.email,'')) then raise exception 'EMAIL_MISMATCH'; end if;
  if coalesce((p_request->>'authority_declared')::boolean,false) is not true then raise exception 'AUTHORITY_DECLARATION_REQUIRED'; end if;
  select coalesce(array_agg(value),array[]::text[]) into v_domains from jsonb_array_elements_text(coalesce(p_request->'domains','[]'::jsonb));
  if cardinality(v_domains) < 1 or cardinality(v_domains) > 7 then raise exception 'INVALID_DOMAINS'; end if;
  if coalesce(p_request->>'organisation_type','') = '' or coalesce(p_request->>'position_category','') = '' then raise exception 'CONTROLLED_FIELDS_REQUIRED'; end if;
  v_id := gen_random_uuid(); v_reference := 'AAB-REQ-' || upper(substr(replace(v_id::text,'-',''),1,10));
  insert into public.aab_country_participation_requests (
    id,reference,applicant_user_id,country_name,jurisdiction_level,jurisdiction_name,organisation_name,
    organisation_type,applicant_name,official_position,position_category,official_email,official_website,
    applicant_capacity,domains,proposed_purpose,supporting_information,authority_declared,email_verified
  ) values (
    v_id,v_reference,auth.uid(),left(trim(p_request->>'country_name'),120),p_request->>'jurisdiction_level',
    nullif(left(trim(p_request->>'jurisdiction_name'),160),''),left(trim(p_request->>'organisation_name'),200),
    left(trim(p_request->>'organisation_type'),120),left(trim(p_request->>'applicant_name'),160),
    left(trim(p_request->>'official_position'),160),left(trim(p_request->>'position_category'),120),lower(v_user.email),
    nullif(left(trim(p_request->>'official_website'),500),''),left(trim(p_request->>'applicant_capacity'),160),v_domains,
    left(trim(p_request->>'proposed_purpose'),4000),nullif(left(trim(p_request->>'supporting_information'),4000),''),true,true
  );
  return jsonb_build_object('ok',true,'reference',v_reference,'status','PENDING_REVIEW');
exception when unique_violation then raise exception 'REQUEST_REFERENCE_COLLISION'; end;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.aab_verify_rehearsal_handoff_secret(p_supplied_sha256 text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'platform'
AS $function$ select exists(select 1 from platform.rehearsal_handoff_policy where policy_code='MAIN_AAB_TO_WA_REHEARSAL' and enabled and shared_secret_sha256=p_supplied_sha256) $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
