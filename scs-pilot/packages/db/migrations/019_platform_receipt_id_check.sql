-- ============================================================================
-- Migration 019 — the receipt id check refuses a receipt with no receiptId
--
-- Migration 005 created decision_receipt_receipt_id_matches_ck as
--   CHECK (receipt ->> 'receiptId' = receipt_id::text)
-- A receipt document with no receiptId makes the comparison NULL, and a CHECK
-- passes on NULL, so such a receipt was accepted. This replaces the constraint,
-- under the same name, with IS NOT DISTINCT FROM, which is false when the field
-- is missing. Every receipt written by foundation/receipts.ts carries its
-- receiptId, so existing rows satisfy the new constraint, and adding it
-- validates them.
--
-- Applied history. Committed migrations are immutable. The constraint below is
-- identical to schema/platform.sql. Requires migrations 001–018.
-- ============================================================================

BEGIN;

ALTER TABLE scs.decision_receipt
  DROP CONSTRAINT decision_receipt_receipt_id_matches_ck;

-- IS NOT DISTINCT FROM, not =: a receipt with no receiptId gives NULL, and a
-- CHECK passes on NULL. Replaced by migration 019.
ALTER TABLE scs.decision_receipt
  ADD CONSTRAINT decision_receipt_receipt_id_matches_ck
    CHECK (receipt ->> 'receiptId' IS NOT DISTINCT FROM receipt_id::text);

COMMIT;
