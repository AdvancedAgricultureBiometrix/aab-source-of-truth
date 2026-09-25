-- ============================================================================
-- Roles and row-level security — current state
--
-- The application role scs_api and the row-level security on every scs table.
-- Migration 004 is generated from this file (everything from the first
-- statement onward) and must produce exactly this state.
--
-- Roles
--   * Owner / migration role: whoever runs the migrations (POSTGRES_USER in
--     the docker stack). Owns every object. Never used by the API.
--   * scs_api: the only role the API connects as. LOGIN, and nothing else:
--     NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS. It owns
--     nothing. No password is set here — passwords never live in migrations;
--     the migrate service (packages/api/src/migrations) sets it from
--     SCS_API_DB_PASSWORD. scs_api must never own objects or run migrations.
--
-- Privileges
--   * scs_api: CONNECT on the database, USAGE on schema scs, and exactly
--     SELECT + INSERT on each scs table — granted table by table, never through
--     default privileges. No UPDATE, DELETE, TRUNCATE, REFERENCES or TRIGGER.
--   * Operations that change existing rows (revokeMandate, relationship
--     supersession, framework status changes) each get their own later
--     migration granting UPDATE on only the columns that operation needs.
--     UPDATE is never granted on CAP-01 evidence-spec columns, which is how
--     "immutable after registration" is enforced.
--
-- Row-level security
--   * ENABLE (not FORCE) on every scs table. With RLS on, nothing is visible
--     or writable unless a policy permits it — that is the default deny. There
--     is deliberately no explicit USING (false) policy: RLS already denies by
--     default, and a RESTRICTIVE false policy would block even permitted
--     access.
--   * Two named PERMISSIVE policies per table, for scs_api only: SELECT all
--     rows, INSERT any row. Pilot scope: one country per deployment and
--     database (SCS sovereignty model), and no organisation/workspace column
--     exists yet to scope by. TODO(tenant-scope): when one exists, these
--     policies become USING (… = current_setting('scs.<scope>')::uuid).
--   * No UPDATE or DELETE policy: even if a privilege were granted by
--     mistake, RLS would still let no row be changed or removed.
--   * The owner is not subject to RLS (ENABLE, not FORCE). The API can never
--     be the owner: db.ts refuses to start if the connected role owns scs
--     objects, is a superuser, or can bypass RLS.
--
-- Every new scs table must get its own GRANT SELECT, INSERT, ENABLE ROW LEVEL
-- SECURITY and the two policies in the migration that creates it.
-- src/integration/db-security.test.ts fails if any table is missed.
-- ============================================================================

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
