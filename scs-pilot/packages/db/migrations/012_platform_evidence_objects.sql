-- ============================================================================
-- Migration 012 — SCS-PLATFORM-01 evidence object store
--
-- scs.evidence_object: one row per evidence file stored in the object store
-- (MinIO / S3) under its SHA-256, computed by SCS (contract commit 288bfd7).
-- Content-addressed: the same bytes are stored once, never overwritten, never
-- deleted. Append-only for every role (scs.reject_modification(), migration
-- 005). scs_api: SELECT + INSERT and RLS policies (rule from 004).
--
-- Applied history. Committed migrations are immutable. The statements below
-- are identical to packages/db/schema/platform.sql at the time this migration
-- was written. Requires migrations 001–011.
-- ============================================================================

BEGIN;

-- ── scs.evidence_object (SCS-PLATFORM-01, migration 012) ───────────────────
-- One row per stored evidence file. The bytes live in the object store
-- (MinIO / S3) under their SHA-256; this row records what was stored, when
-- and by whom. The file's identity is its digest: the same bytes are stored
-- once, never overwritten, never deleted. The uuid key follows the rule for
-- every governed record; the API's objectId is content_sha256.
CREATE TABLE scs.evidence_object (
  evidence_object_id  uuid        NOT NULL DEFAULT gen_random_uuid(),
  content_sha256      text        NOT NULL,   -- lowercase hex, computed by SCS
  size_bytes          bigint      NOT NULL,
  media_type          text        NOT NULL,   -- as declared at first upload; not confirmed from the bytes
  storage_bucket      text        NOT NULL,
  storage_key         text        NOT NULL,
  stored_at           timestamptz NOT NULL DEFAULT now(),
  stored_by           jsonb       NOT NULL,   -- ActorReference
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT evidence_object_pk PRIMARY KEY (evidence_object_id),
  CONSTRAINT evidence_object_sha256_uq UNIQUE (content_sha256),
  CONSTRAINT evidence_object_sha256_ck CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  -- 1 byte to 50 MB (52,428,800 bytes)
  CONSTRAINT evidence_object_size_ck CHECK (size_bytes BETWEEN 1 AND 52428800),
  CONSTRAINT evidence_object_media_type_ck
    CHECK (media_type IN ('image/tiff', 'image/png', 'image/jpeg', 'application/pdf',
                          'application/zip', 'application/octet-stream')),
  -- the file is stored under its digest
  CONSTRAINT evidence_object_storage_key_ck CHECK (storage_key = content_sha256),
  CONSTRAINT evidence_object_bucket_not_blank_ck CHECK (btrim(storage_bucket) <> ''),
  CONSTRAINT evidence_object_actor_object_ck CHECK (jsonb_typeof(stored_by) = 'object')
);

CREATE TRIGGER evidence_object_append_only
  BEFORE UPDATE OR DELETE ON scs.evidence_object
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER evidence_object_no_truncate
  BEFORE TRUNCATE ON scs.evidence_object
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

COMMENT ON TABLE scs.evidence_object IS
  'SCS-PLATFORM-01 evidence object store: one row per stored file, identified by its SHA-256. Storing a file does not admit it as evidence. Append-only for every role.';

GRANT SELECT, INSERT ON scs.evidence_object TO scs_api;
ALTER TABLE scs.evidence_object ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_object_scs_api_select ON scs.evidence_object
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY evidence_object_scs_api_insert ON scs.evidence_object
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
