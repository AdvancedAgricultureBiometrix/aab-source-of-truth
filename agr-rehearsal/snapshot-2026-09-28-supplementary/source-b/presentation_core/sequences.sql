-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: presentation_core. Sequences: definitions and ownership.
-- Catalog counts for presentation_core: functions 0, tables 8, views 0, sequences 1, rls_enabled_tables 0, constraints 28, triggers 0, policies 0, indexes 15.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE SEQUENCE presentation_core.activity_event_activity_event_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;
ALTER SEQUENCE presentation_core.activity_event_activity_event_id_seq OWNED BY presentation_core.activity_event.activity_event_id;
