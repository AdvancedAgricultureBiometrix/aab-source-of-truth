-- ============================================================================
-- Migration 021 — actor–party links (AAB-PLATFORM-04, SCS-CAP-02)
--
-- Creates scs.actor_party_link, scs.actor_party_link_evidence and
-- scs.actor_party_link_status, for the SCS-CAP-02 operations
-- createActorPartyLink, recordActorPartyLinkStatus and getActorPartyLink
-- (contracts: AAB-PLATFORM-04 and the SCS-CAP-02 amendments of 2026-09-27, as
-- fixed by PR #37). All three are append-only for every role, with scs_api
-- SELECT + INSERT grants and RLS policies (rule from migration 004).
--
-- Backstops in the database:
--   - the record equals its signed statement: actor and issuer, subject,
--     relation, validity, supersession, and evidence (exactly the statement's
--     authorisationEvidence, at least one stored object, checked at commit);
--   - the creator and status writers are named humans whose identity matches
--     their statement; neither is ever the linked actor;
--   - a status statement binds the link's own linkDigest;
--   - IS_SUBJECT only to a natural person, ACTS_FOR_SUBJECT only to an
--     organisation (the party's type when the link is written);
--   - a subject authority may only suspend; a link is revoked at most once;
--   - a link is superseded at most once, by a link for the same actor and
--     party; it is valid for at most 12 months.
-- The API verifies signatures and computes digests. "At most one active link"
-- depends on state derived when read, so the API enforces it.
--
-- Applied history. Committed migrations are immutable. The statements below
-- are identical to packages/db/schema/cap-02.sql. Requires migrations 001–020.
-- ============================================================================

BEGIN;

-- ── AAB-PLATFORM-04 ActorSubjectLink, for CAP-02 parties (migration 021) ────
-- A write-once record binding one AAB actor to one CAP-02 party, as the party
-- (IS_SUBJECT) or for it (ACTS_FOR_SUBJECT). Its state (ACTIVE, SUSPENDED,
-- REVOKED, EXPIRED) is derived when read, from the link and its status
-- records; it is never stored. "At most one active link per actor, party and
-- relation" depends on that derived state, so it is enforced by the API under
-- an advisory lock, not here.
CREATE TABLE scs.actor_party_link (
  link_id                           uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                    text        NOT NULL,

  -- who: the actor, as AAB-PLATFORM-03 identifies it
  actor_issuer_type                 text        NOT NULL,
  actor_issuer_country_code         text,                   -- required for COUNTRY_TENANCY
  actor_id                          text        NOT NULL,

  -- for whom: the subject, named generically; for SCS always a CAP-02 party
  subject_domain                    text        NOT NULL,
  subject_type                      text        NOT NULL,
  party_id                          uuid        NOT NULL,

  relation                          text        NOT NULL,
  valid_from                        timestamptz NOT NULL,
  valid_until                       timestamptz NOT NULL,   -- a link always expires
  supersedes_link_id                uuid,                   -- optional

  -- the creator's signed statement: the fields they decided, and their identity
  link_statement                    jsonb       NOT NULL,
  statement_signature               text        NOT NULL,   -- Ed25519, base64

  created_at                        timestamptz NOT NULL DEFAULT now(),
  created_by                        jsonb       NOT NULL,   -- ActorReference v2: HUMAN, accountableName
  link_digest                       text        NOT NULL,   -- sha256: over the whole record

  CONSTRAINT actor_party_link_pk PRIMARY KEY (link_id),
  CONSTRAINT actor_party_link_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the target of the supersession foreign key
  CONSTRAINT actor_party_link_actor_party_uq
    UNIQUE (link_id, party_id, actor_id),
  -- a link is superseded by a link for the same actor and party, at most once
  CONSTRAINT actor_party_link_supersedes_fk
    FOREIGN KEY (supersedes_link_id, party_id, actor_id)
    REFERENCES scs.actor_party_link (link_id, party_id, actor_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_supersedes_once_uq
    UNIQUE (supersedes_link_id),
  CONSTRAINT actor_party_link_not_self_superseding_ck
    CHECK (supersedes_link_id IS NULL OR supersedes_link_id <> link_id),
  CONSTRAINT actor_party_link_digest_uq
    UNIQUE (link_digest),

  CONSTRAINT actor_party_link_issuer_ck
    CHECK ((actor_issuer_type = 'PLATFORM_CONTROL_PLANE' AND actor_issuer_country_code IS NULL)
        OR (actor_issuer_type = 'COUNTRY_TENANCY' AND coalesce(actor_issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT actor_party_link_actor_id_not_blank_ck
    CHECK (btrim(actor_id) <> ''),
  CONSTRAINT actor_party_link_subject_ck
    CHECK (subject_domain = 'SCS' AND subject_type = 'PARTY'),
  CONSTRAINT actor_party_link_relation_ck
    CHECK (relation IN ('IS_SUBJECT', 'ACTS_FOR_SUBJECT')),
  -- SCS-CAP-02: at most 12 months, and always ending after it starts
  CONSTRAINT actor_party_link_validity_ck
    CHECK (valid_until > valid_from AND valid_until <= valid_from + interval '12 months'),
  CONSTRAINT actor_party_link_signature_format_ck
    CHECK (statement_signature ~ '^[A-Za-z0-9+/]{86}==$'),
  CONSTRAINT actor_party_link_digest_format_ck
    CHECK (link_digest ~ '^sha256:[0-9a-f]{64}$'),

  -- the record is the statement: what was signed is what is stored. Each
  -- JSON check is wrapped in coalesce(..., false): a missing key yields NULL,
  -- and a CHECK that is NULL passes.
  CONSTRAINT actor_party_link_statement_ck
    CHECK (coalesce(jsonb_typeof(link_statement) = 'object'
       AND link_statement ->> 'statementType' = 'ACTOR_SUBJECT_LINK'
       AND link_statement -> 'actor' -> 'issuer' ->> 'issuerType' = actor_issuer_type
       AND (link_statement -> 'actor' -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM actor_issuer_country_code
       AND link_statement -> 'actor' ->> 'actorId' = actor_id
       AND link_statement -> 'subject' ->> 'domain' = subject_domain
       AND link_statement -> 'subject' ->> 'subjectType' = subject_type
       AND link_statement -> 'subject' ->> 'subjectId' = party_id::text
       AND link_statement ->> 'relation' = relation
       AND (link_statement ->> 'supersedesLinkId') IS NOT DISTINCT FROM supersedes_link_id::text
       AND jsonb_typeof(link_statement -> 'authorisationEvidence') = 'array'
       AND jsonb_array_length(link_statement -> 'authorisationEvidence') >= 1
       -- the statement was signed by the recorded creator
       AND link_statement -> 'creator' ->> 'actorId' = created_by ->> 'actorId'
       AND link_statement -> 'creator' -> 'issuer' = created_by -> 'issuer', false)),
  -- the creator is a named human, and never the linked actor
  CONSTRAINT actor_party_link_creator_ck
    CHECK (coalesce(jsonb_typeof(created_by) = 'object'
       AND created_by ->> 'actorType' = 'HUMAN'
       AND btrim(coalesce(created_by ->> 'accountableName', '')) <> ''
       AND created_by ->> 'actorId' <> actor_id, false))
);

-- ── The link's evidence: stored objects that show the party authorised it ───
-- A child table, because an array cannot carry a foreign key. Every link has
-- at least one row (checked at commit, below).
CREATE TABLE scs.actor_party_link_evidence (
  link_id                           uuid        NOT NULL,
  evidence_object_sha256            text        NOT NULL,   -- AAB-PLATFORM-01 objectId
  description                       text        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT actor_party_link_evidence_pk PRIMARY KEY (link_id, evidence_object_sha256),
  CONSTRAINT actor_party_link_evidence_link_fk
    FOREIGN KEY (link_id) REFERENCES scs.actor_party_link (link_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_evidence_object_fk
    FOREIGN KEY (evidence_object_sha256) REFERENCES scs.evidence_object (content_sha256)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_evidence_description_ck
    CHECK (btrim(description) <> '')
);

-- ── AAB-PLATFORM-04 ActorSubjectLinkStatusRecord ────────────────────────────
CREATE TABLE scs.actor_party_link_status (
  status_record_id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  link_id                           uuid        NOT NULL,
  schema_version                    text        NOT NULL,

  action                            text        NOT NULL,
  reason                            text        NOT NULL,
  writer_capacity                   text        NOT NULL,

  -- the writer's signed statement
  status_statement                  jsonb       NOT NULL,
  statement_signature               text        NOT NULL,   -- Ed25519, base64

  recorded_at                       timestamptz NOT NULL DEFAULT now(),
  written_by                        jsonb       NOT NULL,   -- ActorReference v2: HUMAN, accountableName
  record_digest                     text        NOT NULL,   -- sha256: over the whole record

  CONSTRAINT actor_party_link_status_pk PRIMARY KEY (status_record_id),
  CONSTRAINT actor_party_link_status_link_fk
    FOREIGN KEY (link_id) REFERENCES scs.actor_party_link (link_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_status_digest_uq
    UNIQUE (record_digest),

  CONSTRAINT actor_party_link_status_action_ck
    CHECK (action IN ('SUSPEND', 'REINSTATE', 'REVOKE')),
  CONSTRAINT actor_party_link_status_reason_ck
    CHECK (btrim(reason) <> ''),
  -- a subject's authority may only suspend; reinstating and revoking need the creating role
  CONSTRAINT actor_party_link_status_capacity_ck
    CHECK (writer_capacity = 'CREATING_ROLE'
        OR (writer_capacity = 'SUBJECT_AUTHORITY' AND action = 'SUSPEND')),
  CONSTRAINT actor_party_link_status_signature_format_ck
    CHECK (statement_signature ~ '^[A-Za-z0-9+/]{86}==$'),
  CONSTRAINT actor_party_link_status_digest_format_ck
    CHECK (record_digest ~ '^sha256:[0-9a-f]{64}$'),
  -- the record is the statement
  CONSTRAINT actor_party_link_status_statement_ck
    CHECK (coalesce(jsonb_typeof(status_statement) = 'object'
       AND status_statement ->> 'statementType' = 'ACTOR_SUBJECT_LINK_STATUS'
       AND status_statement ->> 'linkId' = link_id::text
       AND status_statement ->> 'action' = action
       AND status_statement ->> 'reason' = reason
       AND status_statement ->> 'linkDigest' ~ '^sha256:[0-9a-f]{64}$'
       -- the statement was signed by the recorded writer
       AND status_statement -> 'writer' ->> 'actorId' = written_by ->> 'actorId'
       AND status_statement -> 'writer' -> 'issuer' = written_by -> 'issuer', false)),
  -- the writer is a named human
  CONSTRAINT actor_party_link_status_writer_ck
    CHECK (coalesce(jsonb_typeof(written_by) = 'object'
       AND written_by ->> 'actorType' = 'HUMAN'
       AND btrim(coalesce(written_by ->> 'accountableName', '')) <> ''
       AND btrim(coalesce(written_by ->> 'actorId', '')) <> '', false))
);

-- a link is revoked at most once
CREATE UNIQUE INDEX actor_party_link_status_revoked_once_uq
  ON scs.actor_party_link_status (link_id) WHERE action = 'REVOKE';


-- ── A status record binds its link, and is never written by the linked actor ─
CREATE FUNCTION scs.actor_party_link_status_binds_link() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  l scs.actor_party_link%ROWTYPE;
BEGIN
  SELECT * INTO l FROM scs.actor_party_link WHERE link_id = NEW.link_id;
  IF NOT FOUND OR NOT coalesce(NEW.status_statement ->> 'linkDigest' ~ '^sha256:[0-9a-f]{64}$', false) THEN
    RETURN NEW;  -- no such link, or no well-formed digest: the foreign key or actor_party_link_status_statement_ck refuses it
  END IF;
  IF NEW.status_statement ->> 'linkDigest' <> l.link_digest THEN
    RAISE EXCEPTION 'actor_party_link_status_binds_link_ck: the statement names digest %, not link %''s digest %',
      NEW.status_statement ->> 'linkDigest', NEW.link_id, l.link_digest
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.written_by ->> 'actorId' = l.actor_id THEN
    RAISE EXCEPTION 'actor_party_link_status_not_linked_actor_ck: actor % may not write a status record for their own link %',
      l.actor_id, NEW.link_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_status_binds_link
  BEFORE INSERT ON scs.actor_party_link_status
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_status_binds_link();


-- ── The link's validity is the statement's ──────────────────────────────────
-- A trigger, not a CHECK: the statement's timestamps are text, and a malformed
-- one must be refused as a violation, not fail as a cast error.
CREATE FUNCTION scs.actor_party_link_validity_matches_statement() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  from_ts timestamptz;
  until_ts timestamptz;
BEGIN
  IF jsonb_typeof(NEW.link_statement) IS DISTINCT FROM 'object' THEN
    RETURN NEW;  -- not a statement at all: actor_party_link_statement_ck refuses it
  END IF;
  BEGIN
    from_ts := (NEW.link_statement ->> 'validFrom')::timestamptz;
    until_ts := (NEW.link_statement ->> 'validUntil')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    from_ts := NULL;
  END;
  IF from_ts IS DISTINCT FROM NEW.valid_from OR until_ts IS DISTINCT FROM NEW.valid_until THEN
    RAISE EXCEPTION 'actor_party_link_validity_matches_statement_ck: link % is valid % to %, its statement says % to %',
      NEW.link_id, NEW.valid_from, NEW.valid_until,
      NEW.link_statement ->> 'validFrom', NEW.link_statement ->> 'validUntil'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_validity_matches_statement
  BEFORE INSERT ON scs.actor_party_link
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_validity_matches_statement();


-- ── The relation fits the party (SCS-CAP-02), when the link is written ──────
-- IS_SUBJECT only for a natural person; ACTS_FOR_SUBJECT only for an organisation.
CREATE FUNCTION scs.actor_party_link_relation_fits_party() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  kind text;
BEGIN
  SELECT party_type INTO kind FROM scs.party_identity WHERE party_id = NEW.party_id;
  IF kind IS NULL OR NEW.relation NOT IN ('IS_SUBJECT', 'ACTS_FOR_SUBJECT') THEN
    RETURN NEW;  -- no such party, or no such relation: the foreign key or actor_party_link_relation_ck refuses it
  END IF;
  IF (NEW.relation = 'IS_SUBJECT') <> (kind = 'NATURAL_PERSON') THEN
    RAISE EXCEPTION 'actor_party_link_relation_fits_party_ck: % is not a relation to party %, a %',
      NEW.relation, NEW.party_id, kind
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_relation_fits_party
  BEFORE INSERT ON scs.actor_party_link
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_relation_fits_party();


-- ── The link's evidence is exactly the statement's authorisationEvidence ────
-- Each row must be in the statement, when written ...
CREATE FUNCTION scs.actor_party_link_evidence_in_statement() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  statement jsonb;
BEGIN
  SELECT link_statement INTO statement FROM scs.actor_party_link WHERE link_id = NEW.link_id;
  IF statement IS NULL THEN
    RETURN NEW;  -- no such link: actor_party_link_evidence_link_fk refuses it
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(statement -> 'authorisationEvidence') e
                  WHERE e ->> 'evidenceObjectSha256' = NEW.evidence_object_sha256
                    AND e ->> 'description' = NEW.description) THEN
    RAISE EXCEPTION 'actor_party_link_evidence_in_statement_ck: evidence % (%) is not in link %''s signed statement',
      NEW.evidence_object_sha256, NEW.description, NEW.link_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_evidence_in_statement
  BEFORE INSERT ON scs.actor_party_link_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_evidence_in_statement();

-- ... and every item of the statement must have its row, by commit.
CREATE FUNCTION scs.actor_party_link_evidence_complete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  missing text;
BEGIN
  SELECT e ->> 'evidenceObjectSha256' INTO missing
    FROM jsonb_array_elements(NEW.link_statement -> 'authorisationEvidence') e
   WHERE NOT EXISTS (SELECT 1 FROM scs.actor_party_link_evidence v
                      WHERE v.link_id = NEW.link_id
                        AND v.evidence_object_sha256 = e ->> 'evidenceObjectSha256'
                        AND v.description = e ->> 'description')
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'actor_party_link_evidence_complete_ck: link % does not record statement evidence %', NEW.link_id, missing
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER actor_party_link_evidence_complete
  AFTER INSERT ON scs.actor_party_link
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_evidence_complete();


-- ── Indexes on foreign keys and lookups ─────────────────────────────────────
-- the use check: an actor's links to a party
CREATE INDEX actor_party_link_actor_idx ON scs.actor_party_link (actor_id, party_id);
CREATE INDEX actor_party_link_party_idx ON scs.actor_party_link (party_id);
CREATE INDEX actor_party_link_evidence_object_idx ON scs.actor_party_link_evidence (evidence_object_sha256);
CREATE INDEX actor_party_link_status_link_idx ON scs.actor_party_link_status (link_id, recorded_at);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER actor_party_link_append_only
  BEFORE UPDATE OR DELETE ON scs.actor_party_link
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_no_truncate
  BEFORE TRUNCATE ON scs.actor_party_link
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_evidence_append_only
  BEFORE UPDATE OR DELETE ON scs.actor_party_link_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_evidence_no_truncate
  BEFORE TRUNCATE ON scs.actor_party_link_evidence
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_status_append_only
  BEFORE UPDATE OR DELETE ON scs.actor_party_link_status
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_status_no_truncate
  BEFORE TRUNCATE ON scs.actor_party_link_status
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.actor_party_link IS
  'AAB-PLATFORM-04 ActorSubjectLink for CAP-02 parties (SCS-CAP-02). Binds an actor to a party, as or for it; grants no authority. Its state is derived when read. Append-only.';
COMMENT ON TABLE scs.actor_party_link_evidence IS
  'The stored objects (AAB-PLATFORM-01) showing that the party authorised the link. At least one per link. Append-only.';
COMMENT ON TABLE scs.actor_party_link_status IS
  'AAB-PLATFORM-04 ActorSubjectLinkStatusRecord: SUSPEND, REINSTATE or REVOKE, signed by a named human, never the linked actor. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.actor_party_link TO scs_api;
ALTER TABLE scs.actor_party_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_party_link_scs_api_select ON scs.actor_party_link
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY actor_party_link_scs_api_insert ON scs.actor_party_link
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.actor_party_link_evidence TO scs_api;
ALTER TABLE scs.actor_party_link_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_party_link_evidence_scs_api_select ON scs.actor_party_link_evidence
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY actor_party_link_evidence_scs_api_insert ON scs.actor_party_link_evidence
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.actor_party_link_status TO scs_api;
ALTER TABLE scs.actor_party_link_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_party_link_status_scs_api_select ON scs.actor_party_link_status
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY actor_party_link_status_scs_api_insert ON scs.actor_party_link_status
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
