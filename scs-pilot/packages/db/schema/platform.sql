-- ============================================================================
-- Platform tables — decision receipts, idempotency records, evidence objects
-- and renditions (current state)
--
-- Shared by every capability, owned by no capability contract. Migration 005
-- was generated from this file (receipts and idempotency records); migration
-- 012 added scs.evidence_object (SCS-PLATFORM-01); migration 018 added
-- scs.rendition (SCS-PLATFORM-02). Requires 001–004 (schema scs, role
-- scs_api).
--
-- Both tables are INSERT-ONLY for everyone:
--   * scs_api gets SELECT + INSERT only (as every scs table, migration 004).
--   * A trigger rejects UPDATE, DELETE and TRUNCATE for every role, the owner
--     included. A receipt or idempotency record, once written, is never
--     changed or removed. (The owner could drop the trigger; that would be a
--     visible, reviewed migration — not something the API can do.)
--
-- Receipts (scs.decision_receipt)
--   Every registration or admission decision produces a receipt, written in
--   the same transaction as the decision (foundation/receipts.ts). If the
--   receipt cannot be written, the transaction — decision included — rolls
--   back. `receipt` holds the receipt document exactly as returned to the
--   caller; `receipt_digest` is the SHA-256 of its canonical JSON.
--
-- Idempotency (scs.idempotency_record)
--   Written in the same transaction as the operation it records, with the
--   final response. A replay returns the stored response; the same key with a
--   different request fingerprint is a conflict. Keys are scoped per actor.
--   Only successful (2xx) outcomes are recorded: a failed request made no
--   writes (fail closed), so retrying it simply runs it again.
--   TODO(idempotency-retention): no expiry yet — records are kept.
--
-- Identifier rules as elsewhere: uuid primary keys, ≤ 63-character names.
-- ============================================================================

-- ── Append-only guard (shared by both tables) ─────────────────────────────
CREATE FUNCTION scs.reject_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on %.% is not allowed: records are append-only',
    TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;


-- ── scs.decision_receipt ────────────────────────────────────────────────────
CREATE TABLE scs.decision_receipt (
  receipt_id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  capability_id       text        NOT NULL,
  decision_type       text        NOT NULL,
  decision            text        NOT NULL,
  subject_id          uuid,                   -- the record decided on, if one exists
  actor               jsonb       NOT NULL,   -- ActorReference
  correlation_id      text        NOT NULL,
  idempotency_key     text,
  request_digest      text        NOT NULL,   -- SHA-256 hex of the canonical request
  receipt             jsonb       NOT NULL,   -- the receipt document as returned
  receipt_digest      text        NOT NULL,   -- SHA-256 hex of canonical `receipt`
  issued_at           timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT decision_receipt_pk PRIMARY KEY (receipt_id),
  CONSTRAINT decision_receipt_capability_id_ck
    CHECK (capability_id IN ('SCS-CAP-01', 'SCS-CAP-02', 'SCS-CAP-03', 'SCS-CAP-04',
                             'SCS-CAP-05', 'SCS-CAP-06', 'SCS-CAP-08', 'SCS-CAP-09')),
  CONSTRAINT decision_receipt_text_not_blank_ck
    CHECK (btrim(decision_type) <> '' AND btrim(decision) <> ''),
  CONSTRAINT decision_receipt_correlation_id_ck
    CHECK (correlation_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  CONSTRAINT decision_receipt_idempotency_key_ck
    CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
  CONSTRAINT decision_receipt_digests_ck
    CHECK (request_digest ~ '^[0-9a-f]{64}$' AND receipt_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT decision_receipt_json_shape_ck
    CHECK (jsonb_typeof(actor) = 'object' AND jsonb_typeof(receipt) = 'object'),
  -- IS NOT DISTINCT FROM, not =: a receipt with no receiptId gives NULL, and a
  -- CHECK passes on NULL. Replaced by migration 019.
  CONSTRAINT decision_receipt_receipt_id_matches_ck
    CHECK (receipt ->> 'receiptId' IS NOT DISTINCT FROM receipt_id::text)
);

CREATE INDEX decision_receipt_subject_idx ON scs.decision_receipt (capability_id, subject_id);

CREATE TRIGGER decision_receipt_append_only
  BEFORE UPDATE OR DELETE ON scs.decision_receipt
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER decision_receipt_no_truncate
  BEFORE TRUNCATE ON scs.decision_receipt
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

COMMENT ON TABLE scs.decision_receipt IS
  'Immutable receipt for every registration or admission decision, written in the decision''s transaction. Append-only for every role.';


-- ── scs.idempotency_record ──────────────────────────────────────────────────
CREATE TABLE scs.idempotency_record (
  idempotency_record_id uuid      NOT NULL DEFAULT gen_random_uuid(),
  actor_id            text        NOT NULL,   -- ActorReference.actorId; keys are per actor
  idempotency_key     text        NOT NULL,
  request_fingerprint text        NOT NULL,   -- SHA-256 hex of method + route + canonical body
  response_status     integer     NOT NULL,
  response_body       jsonb       NOT NULL,
  correlation_id      text        NOT NULL,   -- of the original request
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT idempotency_record_pk PRIMARY KEY (idempotency_record_id),
  CONSTRAINT idempotency_record_actor_key_uq UNIQUE (actor_id, idempotency_key),
  CONSTRAINT idempotency_record_actor_id_ck CHECK (btrim(actor_id) <> ''),
  CONSTRAINT idempotency_record_key_ck
    CHECK (idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
  CONSTRAINT idempotency_record_fingerprint_ck
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT idempotency_record_status_ck
    CHECK (response_status BETWEEN 200 AND 299),
  CONSTRAINT idempotency_record_correlation_id_ck
    CHECK (correlation_id ~ '^[A-Za-z0-9._:-]{8,128}$')
);

CREATE TRIGGER idempotency_record_append_only
  BEFORE UPDATE OR DELETE ON scs.idempotency_record
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER idempotency_record_no_truncate
  BEFORE TRUNCATE ON scs.idempotency_record
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

COMMENT ON TABLE scs.idempotency_record IS
  'Successful response per (actor, idempotency key), written in the operation''s transaction. Append-only for every role.';


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

-- ── scs.rendition (SCS-PLATFORM-02, migration 018) ─────────────────────────
-- One row per rendition: a PDF presenting one governed record. The bytes live
-- in the object store under their SHA-256; this row records which record they
-- present (by its id and digest), with which renderer, when and for whom. A
-- rendition is never evidence: it has no row in scs.evidence_object, so it
-- cannot be cited as one. Rendering again adds a row and never replaces one.
CREATE TABLE scs.rendition (
  rendition_id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  source_capability_id     text        NOT NULL,   -- the capability whose record is rendered
  source_record_id         uuid        NOT NULL,   -- e.g. a packageId
  source_digest            text        NOT NULL,   -- the record's digest, shown on every page
  source_digest_algorithm  text        NOT NULL,
  renderer_version         text        NOT NULL,   -- renderer library and version, template and version
  media_type               text        NOT NULL,
  byte_length              bigint      NOT NULL,
  sha256                   text        NOT NULL,   -- lowercase hex of the rendered bytes, computed by SCS
  storage_bucket           text        NOT NULL,
  storage_key              text        NOT NULL,
  rendered_at              timestamptz NOT NULL,
  rendered_for             jsonb       NOT NULL,   -- ActorReference
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rendition_pk PRIMARY KEY (rendition_id),
  -- the target of a capability's binding foreign key (SCS-CAP-08: package_compilation)
  CONSTRAINT rendition_binding_uq UNIQUE (rendition_id, source_record_id, source_digest),
  -- extended when another capability renders its records
  CONSTRAINT rendition_source_ck CHECK (source_capability_id IN ('SCS-CAP-08')),
  CONSTRAINT rendition_media_type_ck CHECK (media_type = 'application/pdf'),
  CONSTRAINT rendition_sha256_ck CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT rendition_size_ck CHECK (byte_length >= 1),
  -- the file is stored under its digest
  CONSTRAINT rendition_storage_key_ck CHECK (storage_key = sha256),
  CONSTRAINT rendition_text_ck
    CHECK (btrim(source_digest) <> '' AND btrim(source_digest_algorithm) <> '' AND btrim(renderer_version) <> ''
       AND btrim(storage_bucket) <> ''),
  CONSTRAINT rendition_actor_ck
    CHECK (jsonb_typeof(rendered_for) = 'object' AND (rendered_for ->> 'actorId') IS NOT NULL)
);

CREATE INDEX rendition_source_idx ON scs.rendition (source_capability_id, source_record_id);

CREATE TRIGGER rendition_append_only
  BEFORE UPDATE OR DELETE ON scs.rendition
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER rendition_no_truncate
  BEFORE TRUNCATE ON scs.rendition
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

COMMENT ON TABLE scs.rendition IS
  'SCS-PLATFORM-02 governed document rendition: one row per PDF presenting a governed record, identified by its SHA-256. Never the record, never evidence. Append-only for every role.';

-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.decision_receipt TO scs_api;
ALTER TABLE scs.decision_receipt ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_receipt_scs_api_select ON scs.decision_receipt
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY decision_receipt_scs_api_insert ON scs.decision_receipt
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.idempotency_record TO scs_api;
ALTER TABLE scs.idempotency_record ENABLE ROW LEVEL SECURITY;
CREATE POLICY idempotency_record_scs_api_select ON scs.idempotency_record
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY idempotency_record_scs_api_insert ON scs.idempotency_record
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.evidence_object TO scs_api;
ALTER TABLE scs.evidence_object ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_object_scs_api_select ON scs.evidence_object
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY evidence_object_scs_api_insert ON scs.evidence_object
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.rendition TO scs_api;
ALTER TABLE scs.rendition ENABLE ROW LEVEL SECURITY;
CREATE POLICY rendition_scs_api_select ON scs.rendition
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY rendition_scs_api_insert ON scs.rendition
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
