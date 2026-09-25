-- ============================================================================
-- Migration 018 — SCS-CAP-08 due diligence packages and SCS-PLATFORM-02
-- renditions
--
-- Creates scs.rendition (SCS-PLATFORM-02, governed document rendition, contract
-- commit 8e64e33), and scs.due_diligence_package and scs.package_compilation
-- for the pilot's requestCompilation, getPackage and verifyPackageIntegrity
-- (SCS-CAP-08, contract commit 4b1f05b), all append-only for every role, with
-- scs_api SELECT + INSERT grants and RLS policies (rule from migration 004),
-- the trigger that keeps the compiler independent of the decision's reviewer,
-- and the deferred constraint trigger that requires every package to have its
-- compilation record and receipt at commit. See packages/db/schema/cap-08.sql
-- for the mapping.
--
-- Also adds UNIQUE (decision_id, evaluation_id, operator_party_id,
-- framework_id, framework_version, commodity_code, decision_outcome) to
-- scs.regulatory_review_decision: the target of the package's decision foreign
-- key, so a package's scope is its decision's own and only a PROCEED decision
-- can be packaged. It cannot fail: decision_id is already unique.
--
-- Applied history. Committed migrations are immutable. The statements below
-- are identical to the schema files: the decision constraint to
-- schema/cap-09.sql, scs.rendition to its section and grants in
-- schema/platform.sql, and the CAP-08 statements to schema/cap-08.sql
-- (everything from the first statement onward). Requires migrations 001–017.
-- ============================================================================

BEGIN;

-- the target of scs.due_diligence_package's decision foreign key: a
-- package's scope is the decision's own, and only a PROCEED decision can be
-- packaged. Added by migration 018.
ALTER TABLE scs.regulatory_review_decision
  ADD CONSTRAINT regulatory_review_decision_package_context_uq
    UNIQUE (decision_id, evaluation_id, operator_party_id, framework_id, framework_version, commodity_code,
            decision_outcome);

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

GRANT SELECT, INSERT ON scs.rendition TO scs_api;
ALTER TABLE scs.rendition ENABLE ROW LEVEL SECURITY;
CREATE POLICY rendition_scs_api_select ON scs.rendition
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY rendition_scs_api_insert ON scs.rendition
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);


-- ── ScsDueDiligencePackageEnvelope ──────────────────────────────────────────
CREATE TABLE scs.due_diligence_package (
  package_id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                    text        NOT NULL,

  -- the scope: must be the decision's own (context foreign key)
  review_decision_id                uuid        NOT NULL,
  evaluation_id                     uuid        NOT NULL,
  operator_party_id                 uuid        NOT NULL,
  framework_id                      uuid        NOT NULL,
  framework_version                 text        NOT NULL,
  commodity_code                    text        NOT NULL,
  decision_outcome                  text        NOT NULL,

  -- the package content, and its digest: "sha256:" + SHA-256 of its canonical JSON
  package                           jsonb       NOT NULL,
  package_digest                    text        NOT NULL,

  -- compilation metadata: outside the digest
  compiled_at                       timestamptz NOT NULL,
  requested_by_actor_id             text        NOT NULL,
  compiled_by_service_identity      text        NOT NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT due_diligence_package_pk PRIMARY KEY (package_id),
  -- the target of scs.package_compilation's package foreign key
  CONSTRAINT due_diligence_package_binding_uq UNIQUE (package_id, package_digest, compiled_at),

  -- ── Foreign keys ──────────────────────────────────────────────────────────
  CONSTRAINT due_diligence_package_decision_fk
    FOREIGN KEY (review_decision_id, evaluation_id, operator_party_id, framework_id, framework_version,
                 commodity_code, decision_outcome)
    REFERENCES scs.regulatory_review_decision (decision_id, evaluation_id, operator_party_id, framework_id,
                 framework_version, commodity_code, decision_outcome)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- ── Rules ─────────────────────────────────────────────────────────────────
  -- only a PROCEED decision authorises compilation
  CONSTRAINT due_diligence_package_outcome_ck
    CHECK (decision_outcome = 'PROCEED_TO_PACKAGE_COMPILATION'),
  CONSTRAINT due_diligence_package_digest_ck
    CHECK (package_digest ~ '^sha256:[0-9a-f]{64}$'),
  -- the content names the same decision, evaluation, framework and operator.
  -- IS NOT DISTINCT FROM, not =: a missing field is NULL, and a CHECK passes
  -- on NULL
  CONSTRAINT due_diligence_package_content_ck
    CHECK (jsonb_typeof(package) = 'object'
       AND package -> 'compilationBasis' ->> 'reviewDecisionId' IS NOT DISTINCT FROM review_decision_id::text
       AND package -> 'compilationBasis' ->> 'evaluationId' IS NOT DISTINCT FROM evaluation_id::text
       AND package -> 'compilationBasis' ->> 'frameworkId' IS NOT DISTINCT FROM framework_id::text
       AND package -> 'compilationBasis' ->> 'frameworkVersion' IS NOT DISTINCT FROM framework_version
       AND package -> 'operator' ->> 'operatorId' IS NOT DISTINCT FROM operator_party_id::text),
  -- the authority boundary is on every package and cannot be removed or weakened
  CONSTRAINT due_diligence_package_authority_boundary_ck
    CHECK (package -> 'authorityBoundary' IS NOT DISTINCT FROM '{"compiledNotSubmitted": true, "operatorMustMakeDeclaration": true,
             "noComplianceDetermination": true, "doesNotGuaranteeRegulatoryAcceptance": true,
             "legalResponsibilityRemainsWithOperator": true, "sufficientEvidenceDoesNotMeanLegallyCompliant": true,
             "gapsDisclosedNotResolved": true}'::jsonb),
  CONSTRAINT due_diligence_package_text_ck
    CHECK (btrim(schema_version) <> '' AND btrim(requested_by_actor_id) <> '' AND btrim(compiled_by_service_identity) <> '')
);


-- ── ScsPackageCompilationDecision (governance evidence) ─────────────────────
CREATE TABLE scs.package_compilation (
  compilation_id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  package_id                        uuid        NOT NULL,
  package_digest                    text        NOT NULL,
  compiled_at                       timestamptz NOT NULL,
  request_id                        uuid        NOT NULL,
  compiled_by                       jsonb       NOT NULL,   -- ActorReference: the compiler
  gate_checks                       jsonb       NOT NULL,
  rendition_id                      uuid        NOT NULL,   -- the rendition made at compilation
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT package_compilation_pk PRIMARY KEY (compilation_id),
  -- one compilation record per package, one package per rendition
  CONSTRAINT package_compilation_package_uq UNIQUE (package_id),
  CONSTRAINT package_compilation_rendition_uq UNIQUE (rendition_id),

  -- ── Foreign keys ──────────────────────────────────────────────────────────
  -- bound to the package's digest and compilation time
  CONSTRAINT package_compilation_package_fk
    FOREIGN KEY (package_id, package_digest, compiled_at)
    REFERENCES scs.due_diligence_package (package_id, package_digest, compiled_at)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the rendition presents this package and this digest
  CONSTRAINT package_compilation_rendition_fk
    FOREIGN KEY (rendition_id, package_id, package_digest)
    REFERENCES scs.rendition (rendition_id, source_record_id, source_digest)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- ── Rules ─────────────────────────────────────────────────────────────────
  -- only COMPILED is recorded: every gate check passed
  CONSTRAINT package_compilation_gate_checks_ck
    CHECK (gate_checks = '{"reviewDecisionFound": true, "outcomePermitsCompilation": true, "recordIsValid": true,
             "currencyIsCurrent": true, "evaluationIdMatches": true, "frameworkVersionMatches": true,
             "plotIdsMatch": true, "operatorIdMatches": true, "commodityCodeMatches": true}'::jsonb),
  CONSTRAINT package_compilation_compiled_by_ck
    CHECK (jsonb_typeof(compiled_by) = 'object' AND (compiled_by ->> 'actorId') IS NOT NULL)
);


-- ── The compiler is not the decision's reviewer ─────────────────────────────
CREATE FUNCTION scs.package_compilation_independent() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM scs.due_diligence_package p
      JOIN scs.regulatory_review_decision d ON d.decision_id = p.review_decision_id
     WHERE p.package_id = NEW.package_id AND d.reviewer ->> 'actorId' = NEW.compiled_by ->> 'actorId'
  ) THEN
    RAISE EXCEPTION 'package_compilation_independent_ck: actor % made the decision packaged by %',
      NEW.compiled_by ->> 'actorId', NEW.package_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER package_compilation_independent
  BEFORE INSERT ON scs.package_compilation
  FOR EACH ROW EXECUTE FUNCTION scs.package_compilation_independent();


-- ── Every package has its compilation record and receipt (checked at commit) ─
CREATE FUNCTION scs.due_diligence_package_compiled() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM scs.package_compilation c WHERE c.package_id = NEW.package_id) THEN
    RAISE EXCEPTION 'due_diligence_package_compiled_ck: package % has no compilation record', NEW.package_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM scs.decision_receipt r
     WHERE r.capability_id = 'SCS-CAP-08' AND r.decision_type = 'PACKAGE_COMPILATION' AND r.subject_id = NEW.package_id
  ) THEN
    RAISE EXCEPTION 'due_diligence_package_compiled_ck: package % has no PACKAGE_COMPILATION receipt', NEW.package_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER due_diligence_package_compiled
  AFTER INSERT ON scs.due_diligence_package
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION scs.due_diligence_package_compiled();


-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX due_diligence_package_decision_idx ON scs.due_diligence_package (review_decision_id);
CREATE INDEX due_diligence_package_evaluation_idx ON scs.due_diligence_package (evaluation_id);
CREATE INDEX due_diligence_package_operator_idx ON scs.due_diligence_package (operator_party_id, framework_id);
CREATE INDEX due_diligence_package_digest_idx ON scs.due_diligence_package (package_digest);


-- ── Append-only (every role, the owner included) ────────────────────────────
CREATE TRIGGER due_diligence_package_append_only
  BEFORE UPDATE OR DELETE ON scs.due_diligence_package
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER due_diligence_package_no_truncate
  BEFORE TRUNCATE ON scs.due_diligence_package
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER package_compilation_append_only
  BEFORE UPDATE OR DELETE ON scs.package_compilation
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER package_compilation_no_truncate
  BEFORE TRUNCATE ON scs.package_compilation
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();

COMMENT ON TABLE scs.due_diligence_package IS
  'SCS-CAP-08 ScsDueDiligencePackageEnvelope: the package content (digested) and its compilation metadata (not digested). The governed record an operator presents; never a compliance determination. Append-only.';
COMMENT ON TABLE scs.package_compilation IS
  'SCS-CAP-08 ScsPackageCompilationDecision: governance evidence that a package was compiled through the gate, by whom and with which rendition. Not a distributable artefact. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.due_diligence_package TO scs_api;
ALTER TABLE scs.due_diligence_package ENABLE ROW LEVEL SECURITY;
CREATE POLICY due_diligence_package_scs_api_select ON scs.due_diligence_package
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY due_diligence_package_scs_api_insert ON scs.due_diligence_package
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.package_compilation TO scs_api;
ALTER TABLE scs.package_compilation ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_compilation_scs_api_select ON scs.package_compilation
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY package_compilation_scs_api_insert ON scs.package_compilation
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
