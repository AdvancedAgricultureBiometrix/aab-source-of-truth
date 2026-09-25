-- ============================================================================
-- Migration 004 — roles and row-level security
--
-- Creates the restricted application role scs_api (no password: set outside
-- migrations from SCS_API_DB_PASSWORD), grants it SELECT + INSERT only on each
-- scs table, enables row-level security on every scs table and adds the
-- scs_api SELECT and INSERT policies. See packages/db/schema/roles-rls.sql for
-- the full rationale.
--
-- Applied history. Committed migrations are immutable. The statements below
-- are identical to packages/db/schema/roles-rls.sql at the time this migration
-- was written. Requires migrations 001–003. Must not be run as scs_api.
-- ============================================================================

BEGIN;

-- ── The application role (cluster-wide; created once, attributes enforced) ──
DO $$
BEGIN
  IF current_user = 'scs_api' THEN
    RAISE EXCEPTION 'migrations must not run as scs_api';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_api') THEN
    CREATE ROLE scs_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  ELSE
    ALTER ROLE scs_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'scs' AND pg_get_userbyid(nspowner) = 'scs_api') THEN
    RAISE EXCEPTION 'schema scs must not be owned by scs_api';
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO scs_api', current_database());
END
$$;

COMMENT ON ROLE scs_api IS
  'SCS API application role: SELECT + INSERT on scs tables only, row-level security applies, owns nothing. Never used for migrations.';

GRANT USAGE ON SCHEMA scs TO scs_api;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA scs TO scs_api;   -- none exist today (uuid keys)

-- ── scs.regulatory_framework (CAP-01) ──────────────────────────────────────
GRANT SELECT, INSERT ON scs.regulatory_framework TO scs_api;
ALTER TABLE scs.regulatory_framework ENABLE ROW LEVEL SECURITY;
CREATE POLICY regulatory_framework_scs_api_select ON scs.regulatory_framework
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY regulatory_framework_scs_api_insert ON scs.regulatory_framework
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

-- ── scs.party_identity (CAP-02) ────────────────────────────────────────────
GRANT SELECT, INSERT ON scs.party_identity TO scs_api;
ALTER TABLE scs.party_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_identity_scs_api_select ON scs.party_identity
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY party_identity_scs_api_insert ON scs.party_identity
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

-- ── scs.party_identity_evidence (CAP-02) ───────────────────────────────────
GRANT SELECT, INSERT ON scs.party_identity_evidence TO scs_api;
ALTER TABLE scs.party_identity_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_identity_evidence_scs_api_select ON scs.party_identity_evidence
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY party_identity_evidence_scs_api_insert ON scs.party_identity_evidence
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

-- ── scs.party_verification_assessment (CAP-02) ─────────────────────────────
GRANT SELECT, INSERT ON scs.party_verification_assessment TO scs_api;
ALTER TABLE scs.party_verification_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_verification_assessment_scs_api_select ON scs.party_verification_assessment
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY party_verification_assessment_scs_api_insert ON scs.party_verification_assessment
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

-- ── scs.party_role_claim (CAP-02) ──────────────────────────────────────────
GRANT SELECT, INSERT ON scs.party_role_claim TO scs_api;
ALTER TABLE scs.party_role_claim ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_role_claim_scs_api_select ON scs.party_role_claim
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY party_role_claim_scs_api_insert ON scs.party_role_claim
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

-- ── scs.supply_chain_relationship (CAP-02) ─────────────────────────────────
GRANT SELECT, INSERT ON scs.supply_chain_relationship TO scs_api;
ALTER TABLE scs.supply_chain_relationship ENABLE ROW LEVEL SECURITY;
CREATE POLICY supply_chain_relationship_scs_api_select ON scs.supply_chain_relationship
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY supply_chain_relationship_scs_api_insert ON scs.supply_chain_relationship
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

-- ── scs.representation_mandate (CAP-02) ────────────────────────────────────
GRANT SELECT, INSERT ON scs.representation_mandate TO scs_api;
ALTER TABLE scs.representation_mandate ENABLE ROW LEVEL SECURITY;
CREATE POLICY representation_mandate_scs_api_select ON scs.representation_mandate
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY representation_mandate_scs_api_insert ON scs.representation_mandate
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

COMMIT;
