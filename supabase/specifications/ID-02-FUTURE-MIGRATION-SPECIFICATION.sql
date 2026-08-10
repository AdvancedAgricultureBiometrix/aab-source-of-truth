-- AAB ID-02 future migration specification
-- STATUS: UNAPPLIED DESIGN ARTIFACT. DO NOT RUN AGAINST PRODUCTION.
-- Apply only to a future Supabase Pro development branch after security review.

begin;

create schema if not exists identity_core;

create table identity_core.account_actor_links (
  link_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  actor_id uuid not null,
  verified_email text not null,
  link_state text not null default 'PENDING'
    check (link_state in ('PENDING', 'LINKED', 'SUSPENDED', 'REVOKED')),
  linked_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_actor_id uuid,
  change_reason text not null,
  constraint account_actor_links_one_auth_account unique (auth_user_id),
  constraint account_actor_links_one_actor unique (actor_id),
  constraint account_actor_links_email_normalised check (verified_email = lower(trim(verified_email))),
  constraint account_actor_links_linked_state_complete check (
    link_state <> 'LINKED' or linked_at is not null
  )
);

comment on table identity_core.account_actor_links is
  'Immutable Supabase Auth UUID to existing canonical AAB actor mapping. This table grants no authority.';

alter table identity_core.account_actor_links enable row level security;
revoke all on schema identity_core from anon, authenticated;
revoke all on identity_core.account_actor_links from anon, authenticated;

-- No browser-facing RLS policies are intentionally created.
-- Future server access must use a reviewed private gateway and existing memberships.
-- Do not store roles, countries, institutions, or scientific authority in this table.

rollback;
