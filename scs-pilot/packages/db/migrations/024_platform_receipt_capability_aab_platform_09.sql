-- ============================================================================
-- Migration 024 — receipts may carry the capability id AAB-PLATFORM-09
--
-- Migration 005 created decision_receipt_capability_id_ck listing only the
-- SCS capabilities (dependency audit, V5). The public-key registry's receipts
-- carry AAB-PLATFORM-09 (AAB-PLATFORM-09, second amendment of 2026-09-28).
-- This replaces the constraint, under the same name, adding that one id and
-- nothing else. Existing rows satisfy it, and adding it validates them.
--
-- Applied history. Committed migrations are immutable. The constraint below is
-- identical to schema/platform.sql. Requires migrations 001–023.
-- ============================================================================

BEGIN;

ALTER TABLE scs.decision_receipt
  DROP CONSTRAINT decision_receipt_capability_id_ck;

-- AAB-PLATFORM-09 added by migration 024 (the public-key registry)
ALTER TABLE scs.decision_receipt
  ADD CONSTRAINT decision_receipt_capability_id_ck
    CHECK (capability_id IN ('SCS-CAP-01', 'SCS-CAP-02', 'SCS-CAP-03', 'SCS-CAP-04',
                             'SCS-CAP-05', 'SCS-CAP-06', 'SCS-CAP-08', 'SCS-CAP-09',
                             'AAB-PLATFORM-09'));

COMMIT;
