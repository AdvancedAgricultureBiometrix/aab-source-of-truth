-- ============================================================================
-- Migration 020 — table comments name AAB-PLATFORM-01 and AAB-PLATFORM-02
--
-- The platform contracts SCS-PLATFORM-01 (evidence object store) and
-- SCS-PLATFORM-02 (governed document rendition) were renamed AAB-PLATFORM-01
-- and AAB-PLATFORM-02: platform contracts are numbered AAB-PLATFORM-NN
-- (AAB-PLATFORM-03 ActorReference, decision 1). Migrations 012 and 018 wrote
-- the old names into the table comments of scs.evidence_object and
-- scs.rendition, and committed migrations are immutable, so this reissues the
-- two comments. Nothing else changes: no column, constraint, grant or row.
--
-- Applied history. Committed migrations are immutable. The comments below are
-- identical to schema/platform.sql. Requires migrations 001–019.
-- ============================================================================

BEGIN;

COMMENT ON TABLE scs.evidence_object IS
  'AAB-PLATFORM-01 evidence object store: one row per stored file, identified by its SHA-256. Storing a file does not admit it as evidence. Append-only for every role.';

COMMENT ON TABLE scs.rendition IS
  'AAB-PLATFORM-02 governed document rendition: one row per PDF presenting a governed record, identified by its SHA-256. Never the record, never evidence. Append-only for every role.';

COMMIT;
