-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: security_core. Tables: columns, defaults, NOT NULL, constraints, indexes not backing a constraint, table and column comments.
-- Catalog counts for security_core: functions 1, tables 2, views 0, sequences 0, rls_enabled_tables 0, constraints 9, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE TABLE security_core.security_alert (
  alert_id uuid DEFAULT gen_random_uuid() NOT NULL,
  alert_fingerprint text NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  confidence_status text NOT NULL,
  title text NOT NULL,
  explanation text NOT NULL,
  evidence_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  recommended_response text NOT NULL,
  authority_boundary text DEFAULT 'ADVISORY_ONLY_HUMAN_DECISION_REQUIRED'::text NOT NULL,
  alert_status text DEFAULT 'OPEN'::text NOT NULL,
  detected_at timestamp with time zone DEFAULT now() NOT NULL,
  acknowledged_at timestamp with time zone,
  acknowledged_by uuid,
  resolution_rationale text,
  CONSTRAINT security_alert_alert_status_check CHECK (alert_status = ANY (ARRAY['OPEN'::text, 'ACKNOWLEDGED'::text, 'RESOLVED'::text, 'DISMISSED'::text])),
  CONSTRAINT security_alert_confidence_status_check CHECK (confidence_status = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
  CONSTRAINT security_alert_severity_check CHECK (severity = ANY (ARRAY['INFORMATION'::text, 'LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
  CONSTRAINT security_alert_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT security_alert_pkey PRIMARY KEY (alert_id),
  CONSTRAINT security_alert_alert_fingerprint_key UNIQUE (alert_fingerprint)
);

-- owner: postgres
CREATE TABLE security_core.security_brain_run (
  run_id uuid DEFAULT gen_random_uuid() NOT NULL,
  initiated_by uuid NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  rules_evaluated integer DEFAULT 0 NOT NULL,
  alerts_created integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'RUNNING'::text NOT NULL,
  CONSTRAINT security_brain_run_status_check CHECK (status = ANY (ARRAY['RUNNING'::text, 'COMPLETED'::text, 'FAILED'::text])),
  CONSTRAINT security_brain_run_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES agriculture.actor(actor_id) ON DELETE RESTRICT,
  CONSTRAINT security_brain_run_pkey PRIMARY KEY (run_id)
);
