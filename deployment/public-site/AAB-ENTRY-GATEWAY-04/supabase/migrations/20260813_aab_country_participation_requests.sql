create table if not exists public.aab_country_participation_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  country_name text not null,
  jurisdiction_level text not null,
  jurisdiction_name text,
  organisation_name text not null,
  applicant_name text not null,
  official_position text not null,
  official_email text not null,
  official_website text,
  applicant_capacity text not null,
  domains text[] not null,
  proposed_purpose text not null,
  supporting_information text,
  authority_declared boolean not null,
  email_verified boolean not null default false,
  review_status text not null default 'PENDING_REVIEW',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete restrict,
  review_notes text,
  constraint aab_country_request_status_check check (review_status in ('PENDING_REVIEW','MORE_INFORMATION_REQUIRED','APPROVED','DECLINED','WITHDRAWN')),
  constraint aab_country_request_level_check check (jurisdiction_level in ('National','State','Province','Territory','Other government jurisdiction')),
  constraint aab_country_request_domains_check check (cardinality(domains) between 1 and 7),
  constraint aab_country_request_authority_check check (authority_declared is true)
);

alter table public.aab_country_participation_requests enable row level security;
revoke all on public.aab_country_participation_requests from anon, authenticated;

create index if not exists aab_country_participation_requests_status_idx
  on public.aab_country_participation_requests (review_status, submitted_at desc);
create index if not exists aab_country_participation_requests_user_idx
  on public.aab_country_participation_requests (applicant_user_id, submitted_at desc);

create or replace function public.aab_submit_country_participation_request(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user auth.users%rowtype;
  v_id uuid;
  v_reference text;
  v_domains text[];
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;
  if lower(coalesce(p_request->>'official_email','')) <> lower(coalesce(v_user.email,'')) then raise exception 'EMAIL_MISMATCH'; end if;
  if coalesce((p_request->>'authority_declared')::boolean, false) is not true then raise exception 'AUTHORITY_DECLARATION_REQUIRED'; end if;
  select coalesce(array_agg(value), array[]::text[]) into v_domains
    from jsonb_array_elements_text(coalesce(p_request->'domains','[]'::jsonb));
  if cardinality(v_domains) < 1 or cardinality(v_domains) > 7 then raise exception 'INVALID_DOMAINS'; end if;

  v_id := gen_random_uuid();
  v_reference := 'AAB-REQ-' || upper(substr(replace(v_id::text,'-',''),1,10));
  insert into public.aab_country_participation_requests (
    id, reference, applicant_user_id, country_name, jurisdiction_level, jurisdiction_name,
    organisation_name, applicant_name, official_position, official_email, official_website,
    applicant_capacity, domains, proposed_purpose, supporting_information,
    authority_declared, email_verified
  ) values (
    v_id, v_reference, auth.uid(), left(trim(p_request->>'country_name'),120),
    p_request->>'jurisdiction_level', nullif(left(trim(p_request->>'jurisdiction_name'),160),''),
    left(trim(p_request->>'organisation_name'),200), left(trim(p_request->>'applicant_name'),160),
    left(trim(p_request->>'official_position'),160), lower(v_user.email),
    nullif(left(trim(p_request->>'official_website'),500),''), left(trim(p_request->>'applicant_capacity'),160),
    v_domains, left(trim(p_request->>'proposed_purpose'),4000),
    nullif(left(trim(p_request->>'supporting_information'),4000),''), true, true
  );
  return jsonb_build_object('ok',true,'reference',v_reference,'status','PENDING_REVIEW');
exception when unique_violation then
  raise exception 'REQUEST_REFERENCE_COLLISION';
end;
$$;

revoke all on function public.aab_submit_country_participation_request(jsonb) from public, anon;
grant execute on function public.aab_submit_country_participation_request(jsonb) to authenticated;

comment on table public.aab_country_participation_requests is
  'Verified applications only. Records requests for AAB administrative review; creates no role, country, jurisdiction or provisioning authority.';
