-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: presentation_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for presentation_core: functions 0, tables 8, views 0, sequences 1, rls_enabled_tables 0, constraints 28, triggers 0, policies 0, indexes 15.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE presentation_core.access_request (
  access_request_id uuid DEFAULT gen_random_uuid() NOT NULL,
  viewer_id uuid NOT NULL,
  requested_views integer DEFAULT 5 NOT NULL,
  request_note text,
  request_status text DEFAULT 'PENDING'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  decided_at timestamp with time zone,
  decided_by_actor_id uuid,
  CONSTRAINT access_request_request_status_check CHECK (request_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'DECLINED'::text])),
  CONSTRAINT access_request_decided_by_actor_id_fkey FOREIGN KEY (decided_by_actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT access_request_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES presentation_core.viewer(viewer_id),
  CONSTRAINT access_request_pkey PRIMARY KEY (access_request_id)
);

-- owner: postgres
CREATE TABLE presentation_core.activity_event (
  activity_event_id bigint DEFAULT nextval('presentation_core.activity_event_activity_event_id_seq'::regclass) NOT NULL,
  viewer_id uuid NOT NULL,
  viewer_session_id uuid,
  event_type text NOT NULL,
  section_code text,
  progress_percent numeric(5,2),
  event_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT activity_event_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES presentation_core.viewer(viewer_id),
  CONSTRAINT activity_event_viewer_session_id_fkey FOREIGN KEY (viewer_session_id) REFERENCES presentation_core.viewer_session(viewer_session_id),
  CONSTRAINT activity_event_pkey PRIMARY KEY (activity_event_id)
);
CREATE INDEX presentation_activity_viewer_time_idx ON presentation_core.activity_event USING btree (viewer_id, occurred_at DESC);

-- owner: postgres
CREATE TABLE presentation_core.invitation (
  invitation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  viewer_id uuid NOT NULL,
  token_hash text NOT NULL,
  issued_by_actor_id uuid NOT NULL,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  activated_at timestamp with time zone,
  revoked_at timestamp with time zone,
  CONSTRAINT invitation_issued_by_actor_id_fkey FOREIGN KEY (issued_by_actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT invitation_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES presentation_core.viewer(viewer_id),
  CONSTRAINT invitation_pkey PRIMARY KEY (invitation_id),
  CONSTRAINT invitation_token_hash_key UNIQUE (token_hash)
);

-- owner: postgres
CREATE TABLE presentation_core.password_reset_request (
  password_reset_request_id uuid DEFAULT gen_random_uuid() NOT NULL,
  viewer_id uuid NOT NULL,
  token_hash text NOT NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  request_ip_hash text,
  CONSTRAINT password_reset_request_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES presentation_core.viewer(viewer_id) ON DELETE CASCADE,
  CONSTRAINT password_reset_request_pkey PRIMARY KEY (password_reset_request_id),
  CONSTRAINT password_reset_request_token_hash_key UNIQUE (token_hash)
);
CREATE INDEX idx_password_reset_viewer_open ON presentation_core.password_reset_request USING btree (viewer_id, expires_at) WHERE ((used_at IS NULL) AND (revoked_at IS NULL));

-- owner: postgres
CREATE TABLE presentation_core.portal_owner (
  actor_id uuid NOT NULL,
  claimed_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT portal_owner_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES agriculture.actor(actor_id),
  CONSTRAINT portal_owner_pkey PRIMARY KEY (actor_id)
);

-- owner: postgres
CREATE TABLE presentation_core.viewer (
  viewer_id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  display_name text,
  country_code character(2) NOT NULL,
  language_code text DEFAULT 'en'::text NOT NULL,
  password_hash text,
  viewer_status text DEFAULT 'INVITED'::text NOT NULL,
  max_views integer DEFAULT 5 NOT NULL,
  views_used integer DEFAULT 0 NOT NULL,
  monitoring_consent_at timestamp with time zone,
  activated_at timestamp with time zone,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT viewer_max_views_check CHECK (max_views >= 1 AND max_views <= 100),
  CONSTRAINT viewer_viewer_status_check CHECK (viewer_status = ANY (ARRAY['INVITED'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text])),
  CONSTRAINT viewer_views_used_check CHECK (views_used >= 0),
  CONSTRAINT viewer_pkey PRIMARY KEY (viewer_id),
  CONSTRAINT viewer_email_key UNIQUE (email)
);

-- owner: postgres
CREATE TABLE presentation_core.viewer_question (
  viewer_question_id uuid DEFAULT gen_random_uuid() NOT NULL,
  viewer_id uuid NOT NULL,
  viewer_session_id uuid,
  question_text text NOT NULL,
  question_status text DEFAULT 'NEW'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT viewer_question_question_status_check CHECK (question_status = ANY (ARRAY['NEW'::text, 'REVIEWED'::text, 'ANSWERED'::text, 'ARCHIVED'::text])),
  CONSTRAINT viewer_question_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES presentation_core.viewer(viewer_id),
  CONSTRAINT viewer_question_viewer_session_id_fkey FOREIGN KEY (viewer_session_id) REFERENCES presentation_core.viewer_session(viewer_session_id),
  CONSTRAINT viewer_question_pkey PRIMARY KEY (viewer_question_id)
);

-- owner: postgres
CREATE TABLE presentation_core.viewer_session (
  viewer_session_id uuid DEFAULT gen_random_uuid() NOT NULL,
  viewer_id uuid NOT NULL,
  session_token_hash text NOT NULL,
  view_number integer NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at timestamp with time zone,
  ip_hash text,
  ip_country text,
  ip_region text,
  user_agent text,
  CONSTRAINT viewer_session_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES presentation_core.viewer(viewer_id),
  CONSTRAINT viewer_session_pkey PRIMARY KEY (viewer_session_id),
  CONSTRAINT viewer_session_session_token_hash_key UNIQUE (session_token_hash)
);
CREATE INDEX presentation_session_viewer_time_idx ON presentation_core.viewer_session USING btree (viewer_id, started_at DESC);
