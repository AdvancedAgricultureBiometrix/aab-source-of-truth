-- ============================================================================
-- Migration 025 — receipts may carry AAB landscape and platform contract ids
--
-- decision_receipt_capability_id_ck lists SCS capabilities and AAB-PLATFORM-09
-- (migrations 005 and 024; dependency audit, V5). CAP-04 Governed Scientific
-- Memory, the first AGR capability with a canonical contract, needs receipts
-- before any of its endpoints is built (its amendment of 2026-09-29: a
-- prerequisite before any code). This replaces the constraint, under the same
-- name, as migration 024 did. It is purely additive: every value valid before
-- is valid after, and adding it validates the existing rows.
--
-- What it adds, by pattern, so that no future capability needs a migration:
--   - AAB landscape capabilities, CAP-01 to CAP-99, except CAP-29, which is
--     retired. The landscape namespace is AGR's (its capabilities carry no
--     prefix: CAP-04's decision 1) and the platform-wide capabilities', such as
--     CAP-20 and CAP-21. It is not an AGR-only namespace;
--   - platform contracts, AAB-PLATFORM-01 to AAB-PLATFORM-99.
-- The SCS capabilities stay an explicit list, unchanged. Freeing this platform
-- table from SCS identifiers is the extraction's step 5, not this migration.
--
-- THIS CHECK GOVERNS FORMAT ONLY. IT MAKES NO CAPABILITY CANONICAL. It admits
-- any identifier of the right form, including CAP-36, which is proposed and
-- not canonical (governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-
-- 2026-09-29.md). A capability's canonical status is governed by the ten-point
-- identity checklist, the capability registry, the CAP-34 fidelity manifest
-- and the validators (governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-
-- DEFINITION-2026-09-27.md, section 2.2), never by this constraint. That a
-- receipt can carry an identifier establishes nothing about the capability.
--
-- The application's capability types are unchanged (dependency audit, V3):
-- they open in the extraction's step 2, before any AGR capability code.
--
-- Applied history. Committed migrations are immutable. The constraint below is
-- identical to schema/platform.sql. Requires migrations 001–024.
-- ============================================================================

BEGIN;

ALTER TABLE scs.decision_receipt
  DROP CONSTRAINT decision_receipt_capability_id_ck;

-- AAB-PLATFORM-09 added by migration 024 (the public-key registry); AAB
-- landscape capabilities and platform contracts, by pattern, by migration 025.
-- Format only: this makes no capability canonical.
ALTER TABLE scs.decision_receipt
  ADD CONSTRAINT decision_receipt_capability_id_ck
    CHECK (capability_id IN ('SCS-CAP-01', 'SCS-CAP-02', 'SCS-CAP-03', 'SCS-CAP-04',
                             'SCS-CAP-05', 'SCS-CAP-06', 'SCS-CAP-08', 'SCS-CAP-09',
                             'AAB-PLATFORM-09')
           OR (capability_id ~ '^CAP-(0[1-9]|[1-9][0-9])$' AND capability_id <> 'CAP-29')
           OR capability_id ~ '^AAB-PLATFORM-(0[1-9]|[1-9][0-9])$');

COMMIT;
