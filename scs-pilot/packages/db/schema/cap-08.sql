-- ============================================================================
-- SCS-CAP-08 — Due Diligence Package Compilation — table definitions
--
-- Implements the records from
--   governance/workstream-b/SCS-CAP-08-DUE-DILIGENCE-PACKAGE-COMPILATION-CANONICAL-CONTRACT-2026-09-22.md
-- as settled for the pilot (commit 4b1f05b, "The three artefacts" and
-- "Compilation rules for the pilot"):
--
--   ScsDueDiligencePackageEnvelope      → scs.due_diligence_package
--     .package (the digested content)   → .package (jsonb)
--     .packageDigest                    → .package_digest
--     .compilationMetadata              → .package_id, .compiled_at,
--                                         .requested_by_actor_id,
--                                         .compiled_by_service_identity
--   ScsPackageCompilationDecision       → scs.package_compilation
--     (governance evidence, not a distributable artefact)
--
-- The rendition (AAB-PLATFORM-02) is scs.rendition in platform.sql. The
-- evidence export bundle is specified but not implemented, and has no table.
--
-- Current-state reference for the CAP-08 tables. Migration 018 is generated
-- from this file (everything from the first statement onward). Requires
-- cap-02.sql (party_identity), cap-06.sql (sufficiency_evaluation), cap-09.sql
-- (regulatory_review_decision, with its package context key), platform.sql
-- (reject_modification, decision_receipt, rendition) and roles-rls.sql
-- (scs_api).
--
-- Both tables are APPEND-ONLY for every role. A package is never changed; a
-- decision compiled again produces a new package.
--
-- The database enforces: a package's decision, evaluation, operator,
-- framework, version and commodity are the decision's own, and the decision's
-- outcome is PROCEED_TO_PACKAGE_COMPILATION (context foreign key); the
-- package content names the same decision, evaluation, framework and operator;
-- the authority boundary is present, with every flag true; the digest's form;
-- one compilation record per package, bound to the package's digest and
-- compilation time, with all nine gate checks passed; the rendition presents
-- that package and that digest; the compiler is not the decision's reviewer;
-- and, at commit, every package has its compilation record and its
-- PACKAGE_COMPILATION receipt (deferred constraint trigger).
--
-- Checked by the application only: the compiler's role; the decision's
-- currency (derived, never stored); that the request matches the manifest and
-- the decision's plots; the records' and files' integrity; the digest itself
-- (computed over canonical JSON, which the database does not produce); and
-- the content of every section.
--
-- The package's evidence and plots are the evaluation's manifest and plots
-- exactly (contract rule), so they are not copied into rows of their own: the
-- evaluation's rows (scs.sufficiency_evaluation_evidence and _plot), reached
-- through evaluation_id, record what every package of it contains.
--
-- NOT YET IMPLEMENTED
--   TODO(actor-reference): ActorReference stored as a jsonb object.
-- ============================================================================


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
