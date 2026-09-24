-- ============================================================================
-- Migration 003 — SCS-CAP-02 representation mandate: otherActionDescription
--
-- The CAP-02 canonical contract gained otherActionDescription on
-- ScsRepresentationMandate (commit 2ee4503): required when permittedActions
-- includes OTHER_EXPLICITLY_NAMED; a mandate using OTHER_EXPLICITLY_NAMED
-- without a description is incomplete and must be rejected.
--
-- Applied history. Committed migrations are immutable; 002 is not amended.
-- The column and constraint below are identical to
-- packages/db/schema/cap-02.sql (constraint text copied from it).
-- Requires migrations 001 and 002.
--
-- Fails closed: if any existing mandate already permits OTHER_EXPLICITLY_NAMED
-- (necessarily with no description), ADD CONSTRAINT fails and the whole
-- migration rolls back. Such rows must be corrected first, not bypassed.
-- ============================================================================

BEGIN;

ALTER TABLE scs.representation_mandate
  ADD COLUMN other_action_description text;

ALTER TABLE scs.representation_mandate
  ADD CONSTRAINT representation_mandate_other_action_description_ck
    CHECK (CASE WHEN 'OTHER_EXPLICITLY_NAMED' = ANY (permitted_actions)
                THEN other_action_description IS NOT NULL
                     AND btrim(other_action_description) <> ''
                ELSE other_action_description IS NULL
           END);

COMMENT ON COLUMN scs.representation_mandate.other_action_description IS
  'otherActionDescription — names the specific action; required exactly when permitted_actions includes OTHER_EXPLICITLY_NAMED.';

COMMIT;
