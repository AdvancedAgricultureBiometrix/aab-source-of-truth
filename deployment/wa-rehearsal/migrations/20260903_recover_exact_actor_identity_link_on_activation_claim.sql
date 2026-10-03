-- WA clean-room activation-claim identity-link recovery, 2026-09-03.
-- Recovers only an exact active actor whose immutable external subject matches auth.uid().
-- Does not create or modify actors, roles, memberships, or authority.

create or replace function public.aab_claim_country_activation(
 p_activation_code text,
 p_workspace_name text default null::text,
 p_default_language text default 'en'::text,
 p_timezone_name text default 'UTC'::text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'platform', 'country_core', 'agriculture', 'extensions', 'auth'
as $function$
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
$function$;