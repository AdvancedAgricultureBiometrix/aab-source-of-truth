-- ============================================================================
-- AAB-PLATFORM-09 — Governed Public-Key Registry — table definitions
--
-- Implements the records from
--   governance/AAB-PLATFORM-09-GOVERNED-PUBLIC-KEY-REGISTRY-CANONICAL-CONTRACT-2026-09-28.md
-- with its amendments of 2026-09-28:
--
--   bootstrap ceremony (section 3a)       → scs.key_bootstrap_ceremony
--     pinned attestation keys (section 9)  → scs.pinned_attestation_key
--   registration challenge (section 3)    → scs.key_registration_challenge
--   KeyRegistration (section 3)           → scs.signing_key_registration
--   KeyEvent (section 4)                  → scs.signing_key_event
--   KeyCompromiseRecord (section 8)       → scs.signing_key_compromise
--     .evidence                           → scs.signing_key_compromise_evidence
--   KeyVerificationEvidence (section 9)   → scs.key_verification_evidence
--   compromise notices (section 9)        → scs.key_compromise_notice
--   compromise assessments (section 8)    → scs.key_compromise_assessment
--
-- Current-state reference for the registry tables. Migration 023 is generated
-- from this file (everything from the first statement onward) and must
-- produce exactly this definition. Requires platform.sql (scs.decision_receipt,
-- scs.reject_modification()) and roles-rls.sql (scs_api).
--
-- Platform tables, in the scs schema, which the naming rule keeps (dependency
-- audit, step 0). Every table is APPEND-ONLY for every role. A key's state,
-- a record's verification result and an exposure window are derived when
-- read, never stored. Public keys only: no column holds a private key.
-- ============================================================================

-- Receipts. Each record's receipt_id names its receipt, written in the same
-- transaction. It is not a foreign key: no record table holds one to
-- scs.decision_receipt (the receipt names the record, and the integrity
-- verifier checks both), and a foreign key would make TRUNCATE on the
-- receipt table fail before its append-only guard.

-- ── Helper: is this ActorReference the registered actor? ───────────────────
-- Compares an ActorReference (jsonb) with an issuer and actorId, as
-- AAB-PLATFORM-03's sameActor does: the actorId, and the issuer.
CREATE FUNCTION scs.is_registered_actor(actor jsonb, issuer_type text, issuer_country_code text, actor_id text)
  RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(actor ->> 'actorId' = actor_id
     AND actor -> 'issuer' ->> 'issuerType' = issuer_type
     AND (actor -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM issuer_country_code, false);
$$;

-- ── Helper: a named human, as every registry actor must be ──────────────────
CREATE FUNCTION scs.is_named_human(actor jsonb)
  RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_typeof(actor) = 'object'
     AND actor ->> 'actorType' = 'HUMAN'
     AND btrim(coalesce(actor ->> 'accountableName', '')) <> '', false);
$$;


-- ── AAB-PLATFORM-09 bootstrap ceremony (section 3a; second amendment) ───────
-- The record of how a registry's first key was registered: self-attested by
-- its holder, and for a country co-signed by the Platform Owner. One per
-- registry, and accepted only while the registry is empty (trigger below).
CREATE TABLE scs.key_bootstrap_ceremony (
  ceremony_id                       uuid        NOT NULL,
  issuer_type                       text        NOT NULL,
  issuer_country_code               text,                   -- required for COUNTRY_TENANCY
  first_key_id                      uuid        NOT NULL,   -- the registration it creates

  ceremony_record                   jsonb       NOT NULL,   -- who was present, what was done, when
  holder                            jsonb       NOT NULL,   -- ActorReference: the first key's holder
  holder_signature                  text        NOT NULL,   -- with the key being registered

  -- the Platform Owner's co-signature: a country registry only
  cosigner                          jsonb,
  cosigner_key_id                   text,                   -- a control-plane key (see key_verification_evidence)
  cosignature                       text,

  -- the control plane's attestation key, declared: the Platform Owner's ceremony only
  declared_attestation_key_id       text,
  declared_attestation_public_key   text,                   -- Ed25519, SPKI DER, base64

  recorded_at                       timestamptz NOT NULL,
  ceremony_digest                   text        NOT NULL,
  receipt_id                        uuid        NOT NULL,

  CONSTRAINT key_bootstrap_ceremony_pk PRIMARY KEY (ceremony_id),
  CONSTRAINT key_bootstrap_ceremony_digest_uq UNIQUE (ceremony_digest),
  CONSTRAINT key_bootstrap_ceremony_first_key_uq UNIQUE (first_key_id),
  CONSTRAINT key_bootstrap_ceremony_issuer_ck
    CHECK ((issuer_type = 'PLATFORM_CONTROL_PLANE' AND issuer_country_code IS NULL)
        OR (issuer_type = 'COUNTRY_TENANCY' AND coalesce(issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT key_bootstrap_ceremony_holder_ck
    CHECK (scs.is_named_human(holder)
       AND coalesce(holder -> 'issuer' ->> 'issuerType' = issuer_type
       AND (holder -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM issuer_country_code, false)),
  CONSTRAINT key_bootstrap_ceremony_record_ck
    CHECK (jsonb_typeof(ceremony_record) = 'object'),
  -- the Platform Owner's ceremony declares the attestation key and has no co-signer;
  -- a country's is co-signed by a control-plane actor and declares none
  CONSTRAINT key_bootstrap_ceremony_kind_ck
    CHECK ((issuer_type = 'PLATFORM_CONTROL_PLANE'
            AND cosigner IS NULL AND cosigner_key_id IS NULL AND cosignature IS NULL
            AND declared_attestation_key_id IS NOT NULL AND btrim(declared_attestation_key_id) <> ''
            AND declared_attestation_public_key IS NOT NULL)
        OR (issuer_type = 'COUNTRY_TENANCY'
            AND scs.is_named_human(cosigner)
            AND coalesce(cosigner -> 'issuer' ->> 'issuerType' = 'PLATFORM_CONTROL_PLANE', false)
            AND cosigner_key_id IS NOT NULL AND btrim(cosigner_key_id) <> ''
            AND cosignature IS NOT NULL
            AND declared_attestation_key_id IS NULL AND declared_attestation_public_key IS NULL)),
  CONSTRAINT key_bootstrap_ceremony_signatures_ck
    CHECK (holder_signature ~ '^[A-Za-z0-9+/]{86}==$'
       AND (cosignature IS NULL OR cosignature ~ '^[A-Za-z0-9+/]{86}==$')),
  CONSTRAINT key_bootstrap_ceremony_digest_format_ck
    CHECK (ceremony_digest ~ '^sha256:[0-9a-f]{64}$')
);

-- one ceremony per registry: a registry has one first key
CREATE UNIQUE INDEX key_bootstrap_ceremony_one_per_registry_uq
  ON scs.key_bootstrap_ceremony (issuer_type, coalesce(issuer_country_code, ''));


-- ── Pinned attestation keys (section 9; second amendment) ───────────────────
-- Another issuer's registry attestation key, pinned in this registry by its
-- bootstrap ceremony. Verification evidence and compromise notices from that
-- issuer are accepted only against a pinned key.
CREATE TABLE scs.pinned_attestation_key (
  attested_issuer_type              text        NOT NULL,
  attested_issuer_country_code      text,
  attestation_key_id                text        NOT NULL,
  algorithm                         text        NOT NULL,
  public_key                        text        NOT NULL,   -- SPKI DER, base64
  public_key_digest                 text        NOT NULL,
  pinned_by_ceremony_id             uuid        NOT NULL,
  pinned_at                         timestamptz NOT NULL,

  CONSTRAINT pinned_attestation_key_pk PRIMARY KEY (attestation_key_id),
  CONSTRAINT pinned_attestation_key_ceremony_fk
    FOREIGN KEY (pinned_by_ceremony_id) REFERENCES scs.key_bootstrap_ceremony (ceremony_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT pinned_attestation_key_digest_uq UNIQUE (public_key_digest),
  CONSTRAINT pinned_attestation_key_issuer_ck
    CHECK ((attested_issuer_type = 'PLATFORM_CONTROL_PLANE' AND attested_issuer_country_code IS NULL)
        OR (attested_issuer_type = 'COUNTRY_TENANCY' AND coalesce(attested_issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT pinned_attestation_key_algorithm_ck CHECK (algorithm = 'Ed25519'),
  CONSTRAINT pinned_attestation_key_id_not_blank_ck CHECK (btrim(attestation_key_id) <> ''),
  CONSTRAINT pinned_attestation_key_digest_format_ck
    CHECK (public_key_digest ~ '^sha256:[0-9a-f]{64}$')
);


-- ── Registration challenges (section 3; second amendment) ───────────────────
-- Issued for a named actor, single use, valid for 30 minutes. The challenge
-- also reserves the keyId, so that both the proof of possession and the
-- registration statement can name it. Its use is recorded by the registration
-- that consumes it (unique challenge_id there), never by changing this row.
CREATE TABLE scs.key_registration_challenge (
  challenge_id                      uuid        NOT NULL,
  purpose                           text        NOT NULL,   -- BOOTSTRAP or REGISTRATION
  issuer_type                       text        NOT NULL,
  issuer_country_code               text,
  actor_id                          text        NOT NULL,   -- whose key it is for
  key_id                            uuid        NOT NULL,   -- reserved for that key
  nonce                             text        NOT NULL,   -- base64 of 32 random bytes
  requested_by                      jsonb       NOT NULL,   -- ActorReference
  issued_at                         timestamptz NOT NULL,
  expires_at                        timestamptz NOT NULL,

  CONSTRAINT key_registration_challenge_pk PRIMARY KEY (challenge_id),
  CONSTRAINT key_registration_challenge_key_uq UNIQUE (key_id),
  CONSTRAINT key_registration_challenge_nonce_uq UNIQUE (nonce),
  -- the target of the registration's foreign key
  CONSTRAINT key_registration_challenge_consumer_uq UNIQUE (challenge_id, key_id),
  CONSTRAINT key_registration_challenge_purpose_ck CHECK (purpose IN ('BOOTSTRAP', 'REGISTRATION')),
  CONSTRAINT key_registration_challenge_issuer_ck
    CHECK ((issuer_type = 'PLATFORM_CONTROL_PLANE' AND issuer_country_code IS NULL)
        OR (issuer_type = 'COUNTRY_TENANCY' AND coalesce(issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT key_registration_challenge_actor_id_not_blank_ck CHECK (btrim(actor_id) <> ''),
  CONSTRAINT key_registration_challenge_nonce_format_ck CHECK (nonce ~ '^[A-Za-z0-9+/]{43}=$'),
  CONSTRAINT key_registration_challenge_expiry_ck CHECK (expires_at = issued_at + interval '30 minutes'),
  -- a bootstrap challenge is requested by the first key's own holder; any
  -- other by a registration authority for someone else
  CONSTRAINT key_registration_challenge_requester_ck
    CHECK (scs.is_named_human(requested_by)
       AND (purpose = 'BOOTSTRAP') = scs.is_registered_actor(requested_by, issuer_type, issuer_country_code, actor_id))
);


-- ── AAB-PLATFORM-09 KeyRegistration (section 3) ─────────────────────────────
-- A public key, registered for one actor, written once. What happens to the
-- key afterwards is an event, a compromise record or a notice; its state is
-- derived when read and never stored. "One active key per actor" depends on
-- that derived state, so the API enforces it under an advisory lock.
CREATE TABLE scs.signing_key_registration (
  key_id                            uuid        NOT NULL,
  issuer_type                       text        NOT NULL,
  issuer_country_code               text,
  actor_id                          text        NOT NULL,

  algorithm                         text        NOT NULL,
  public_key                        text        NOT NULL,   -- SPKI DER, base64
  public_key_digest                 text        NOT NULL,   -- sha256: over the DER bytes

  active_from                       timestamptz NOT NULL,
  registered_at                     timestamptz NOT NULL,   -- acceptedAt: the database clock after the lock

  -- how it became trusted
  challenge_id                      uuid        NOT NULL,
  possession_statement              jsonb       NOT NULL,   -- signed with this key
  possession_signature              text        NOT NULL,
  registration_authority            jsonb       NOT NULL,   -- ActorReference
  registration_statement            jsonb       NOT NULL,   -- signed by the authority
  registration_signature            text        NOT NULL,
  registration_signer_key_id        uuid        NOT NULL,   -- the authority's key; this key itself for a bootstrap
  replaces_key_id                   uuid,
  bootstrap_ceremony_id             uuid,

  registration_digest               text        NOT NULL,
  receipt_id                        uuid        NOT NULL,

  CONSTRAINT signing_key_registration_pk PRIMARY KEY (key_id),
  CONSTRAINT signing_key_registration_public_key_uq UNIQUE (public_key_digest),
  CONSTRAINT signing_key_registration_digest_uq UNIQUE (registration_digest),
  -- each challenge is used once, for the key it reserved
  CONSTRAINT signing_key_registration_challenge_uq UNIQUE (challenge_id),
  CONSTRAINT signing_key_registration_challenge_fk
    FOREIGN KEY (challenge_id, key_id) REFERENCES scs.key_registration_challenge (challenge_id, key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_registration_signer_fk
    FOREIGN KEY (registration_signer_key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- a key is replaced at most once
  CONSTRAINT signing_key_registration_replaces_fk
    FOREIGN KEY (replaces_key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_registration_replaces_once_uq UNIQUE (replaces_key_id),
  CONSTRAINT signing_key_registration_ceremony_fk
    FOREIGN KEY (bootstrap_ceremony_id) REFERENCES scs.key_bootstrap_ceremony (ceremony_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_registration_ceremony_uq UNIQUE (bootstrap_ceremony_id),

  CONSTRAINT signing_key_registration_issuer_ck
    CHECK ((issuer_type = 'PLATFORM_CONTROL_PLANE' AND issuer_country_code IS NULL)
        OR (issuer_type = 'COUNTRY_TENANCY' AND coalesce(issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT signing_key_registration_actor_id_not_blank_ck CHECK (btrim(actor_id) <> ''),
  CONSTRAINT signing_key_registration_algorithm_ck CHECK (algorithm = 'Ed25519'),
  CONSTRAINT signing_key_registration_formats_ck
    CHECK (public_key ~ '^[A-Za-z0-9+/]+={0,2}$'
       AND public_key_digest ~ '^sha256:[0-9a-f]{64}$'
       AND registration_digest ~ '^sha256:[0-9a-f]{64}$'
       AND possession_signature ~ '^[A-Za-z0-9+/]{86}==$'
       AND registration_signature ~ '^[A-Za-z0-9+/]{86}==$'),
  -- a key is never active before it is registered
  CONSTRAINT signing_key_registration_active_from_ck CHECK (active_from >= registered_at),
  CONSTRAINT signing_key_registration_not_self_replacing_ck
    CHECK (replaces_key_id IS NULL OR replaces_key_id <> key_id),
  CONSTRAINT signing_key_registration_authority_human_ck
    CHECK (scs.is_named_human(registration_authority)),
  -- a bootstrap registration is the only one signed by the key it registers,
  -- by its own holder; every other is signed by a registration authority who
  -- is not the key holder (the one exception to separation, section 3a)
  CONSTRAINT signing_key_registration_separation_ck
    CHECK ((bootstrap_ceremony_id IS NOT NULL
            AND registration_signer_key_id = key_id
            AND replaces_key_id IS NULL
            AND scs.is_registered_actor(registration_authority, issuer_type, issuer_country_code, actor_id))
        OR (bootstrap_ceremony_id IS NULL
            AND registration_signer_key_id <> key_id
            AND NOT scs.is_registered_actor(registration_authority, issuer_type, issuer_country_code, actor_id))),
  -- the statements name this key: what was signed is what is stored
  CONSTRAINT signing_key_registration_possession_statement_ck
    CHECK (coalesce(jsonb_typeof(possession_statement) = 'object'
       AND possession_statement ->> 'statementType' = 'SIGNING_KEY_POSSESSION'
       AND possession_statement ->> 'keyId' = key_id::text
       AND possession_statement ->> 'actorId' = actor_id
       AND possession_statement -> 'issuer' ->> 'issuerType' = issuer_type
       AND (possession_statement -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM issuer_country_code
       AND possession_statement ->> 'publicKeyDigest' = public_key_digest, false)),
  CONSTRAINT signing_key_registration_statement_ck
    CHECK (coalesce(jsonb_typeof(registration_statement) = 'object'
       AND registration_statement ->> 'statementType' = 'SIGNING_KEY_REGISTRATION'
       AND registration_statement ->> 'keyId' = key_id::text
       AND registration_statement ->> 'actorId' = actor_id
       AND registration_statement -> 'issuer' ->> 'issuerType' = issuer_type
       AND (registration_statement -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM issuer_country_code
       AND registration_statement ->> 'publicKeyDigest' = public_key_digest
       AND registration_statement ->> 'algorithm' = algorithm
       AND registration_statement ->> 'challengeId' = challenge_id::text
       AND registration_statement ->> 'signingKeyId' = registration_signer_key_id::text
       AND (registration_statement ->> 'replacesKeyId') IS NOT DISTINCT FROM replaces_key_id::text
       AND registration_statement -> 'registrationAuthority' ->> 'actorId' = registration_authority ->> 'actorId'
       AND registration_statement -> 'registrationAuthority' -> 'issuer' = registration_authority -> 'issuer', false))
);

-- Checks that need other rows: the challenge was for this actor, of the right
-- kind, and not expired; a replaced key belongs to the same actor; a
-- registration signed by another key is signed by a key of a different actor.
CREATE FUNCTION scs.signing_key_registration_check()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c scs.key_registration_challenge%ROWTYPE;
  r scs.signing_key_registration%ROWTYPE;
BEGIN
  SELECT * INTO c FROM scs.key_registration_challenge WHERE challenge_id = NEW.challenge_id;
  IF c.issuer_type <> NEW.issuer_type OR c.issuer_country_code IS DISTINCT FROM NEW.issuer_country_code
     OR c.actor_id <> NEW.actor_id THEN
    RAISE EXCEPTION 'signing_key_registration_challenge_ck: challenge % was issued for another actor', NEW.challenge_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF (c.purpose = 'BOOTSTRAP') <> (NEW.bootstrap_ceremony_id IS NOT NULL) THEN
    RAISE EXCEPTION 'signing_key_registration_challenge_ck: challenge % is a % challenge', NEW.challenge_id, c.purpose
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.registered_at < c.issued_at OR NEW.registered_at > c.expires_at THEN
    RAISE EXCEPTION 'signing_key_registration_challenge_ck: challenge % was not valid at %', NEW.challenge_id, NEW.registered_at
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.replaces_key_id IS NOT NULL THEN
    SELECT * INTO r FROM scs.signing_key_registration WHERE key_id = NEW.replaces_key_id;
    IF r.issuer_type <> NEW.issuer_type OR r.issuer_country_code IS DISTINCT FROM NEW.issuer_country_code
       OR r.actor_id <> NEW.actor_id THEN
      RAISE EXCEPTION 'signing_key_registration_replaces_ck: key % belongs to another actor', NEW.replaces_key_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  -- (a registration whose authority is the key holder is refused by
  -- signing_key_registration_separation_ck, not here)
  IF NEW.bootstrap_ceremony_id IS NULL
     AND NOT scs.is_registered_actor(NEW.registration_authority, NEW.issuer_type, NEW.issuer_country_code, NEW.actor_id) THEN
    SELECT * INTO r FROM scs.signing_key_registration WHERE key_id = NEW.registration_signer_key_id;
    IF NOT scs.is_registered_actor(NEW.registration_authority, r.issuer_type, r.issuer_country_code, r.actor_id) THEN
      RAISE EXCEPTION 'signing_key_registration_signer_ck: key % is not the registration authority''s', NEW.registration_signer_key_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER signing_key_registration_check
  BEFORE INSERT ON scs.signing_key_registration
  FOR EACH ROW EXECUTE FUNCTION scs.signing_key_registration_check();

-- A bootstrap ceremony is accepted only into an empty registry, and a
-- bootstrap challenge is issued only then; a registration challenge only once
-- the registry has started.
CREATE FUNCTION scs.key_registry_started(issuer_type text, issuer_country_code text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM scs.key_bootstrap_ceremony b
                  WHERE b.issuer_type = key_registry_started.issuer_type
                    AND b.issuer_country_code IS NOT DISTINCT FROM key_registry_started.issuer_country_code)
      OR EXISTS (SELECT 1 FROM scs.signing_key_registration k
                  WHERE k.issuer_type = key_registry_started.issuer_type
                    AND k.issuer_country_code IS NOT DISTINCT FROM key_registry_started.issuer_country_code);
$$;

CREATE FUNCTION scs.key_bootstrap_ceremony_registry_empty()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF scs.key_registry_started(NEW.issuer_type, NEW.issuer_country_code) THEN
    RAISE EXCEPTION 'key_bootstrap_registry_empty_ck: the % registry has already started', NEW.issuer_type
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION scs.key_registration_challenge_registry_state()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.purpose = 'BOOTSTRAP' AND scs.key_registry_started(NEW.issuer_type, NEW.issuer_country_code) THEN
    RAISE EXCEPTION 'key_bootstrap_registry_empty_ck: the % registry has already started', NEW.issuer_type
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.purpose = 'REGISTRATION' AND NOT scs.key_registry_started(NEW.issuer_type, NEW.issuer_country_code) THEN
    RAISE EXCEPTION 'key_registry_started_ck: the % registry has no first key yet', NEW.issuer_type
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER key_bootstrap_ceremony_registry_empty
  BEFORE INSERT ON scs.key_bootstrap_ceremony
  FOR EACH ROW EXECUTE FUNCTION scs.key_bootstrap_ceremony_registry_empty();
CREATE TRIGGER key_registration_challenge_registry_state
  BEFORE INSERT ON scs.key_registration_challenge
  FOR EACH ROW EXECUTE FUNCTION scs.key_registration_challenge_registry_state();

-- the ceremony's first key is registered in the same transaction
ALTER TABLE scs.key_bootstrap_ceremony
  ADD CONSTRAINT key_bootstrap_ceremony_first_key_fk
    FOREIGN KEY (first_key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;


-- ── Key events: SUSPENDED, REINSTATED, RETIRED (section 4) ──────────────────
CREATE TABLE scs.signing_key_event (
  event_id                          uuid        NOT NULL,
  key_id                            uuid        NOT NULL,
  event_type                        text        NOT NULL,
  effective_at                      timestamptz NOT NULL,
  reason                            text        NOT NULL,
  recorded_by                       jsonb       NOT NULL,   -- ActorReference
  recorded_at                       timestamptz NOT NULL,   -- acceptedAt
  event_statement                   jsonb       NOT NULL,
  statement_signature               text        NOT NULL,
  signer_key_id                     uuid        NOT NULL,   -- the recorder's own key
  event_digest                      text        NOT NULL,
  receipt_id                        uuid        NOT NULL,

  CONSTRAINT signing_key_event_pk PRIMARY KEY (event_id),
  CONSTRAINT signing_key_event_key_fk
    FOREIGN KEY (key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_event_signer_fk
    FOREIGN KEY (signer_key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_event_digest_uq UNIQUE (event_digest),
  CONSTRAINT signing_key_event_type_ck CHECK (event_type IN ('SUSPENDED', 'REINSTATED', 'RETIRED')),
  CONSTRAINT signing_key_event_effective_ck CHECK (effective_at >= recorded_at),
  CONSTRAINT signing_key_event_reason_not_blank_ck CHECK (btrim(reason) <> ''),
  CONSTRAINT signing_key_event_recorder_human_ck CHECK (scs.is_named_human(recorded_by)),
  CONSTRAINT signing_key_event_formats_ck
    CHECK (statement_signature ~ '^[A-Za-z0-9+/]{86}==$' AND event_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT signing_key_event_statement_ck
    CHECK (coalesce(jsonb_typeof(event_statement) = 'object'
       AND event_statement ->> 'statementType' = 'SIGNING_KEY_EVENT'
       AND event_statement ->> 'keyId' = key_id::text
       AND event_statement ->> 'eventType' = event_type
       AND event_statement ->> 'reason' = reason
       AND event_statement ->> 'signingKeyId' = signer_key_id::text
       AND event_statement -> 'recordedBy' ->> 'actorId' = recorded_by ->> 'actorId'
       AND event_statement -> 'recordedBy' -> 'issuer' = recorded_by -> 'issuer', false))
);

-- a key is retired at most once
CREATE UNIQUE INDEX signing_key_event_retired_once_uq
  ON scs.signing_key_event (key_id) WHERE event_type = 'RETIRED';

-- Checks that need the registration: the signer's key is the recorder's; the
-- key holder may retire their own key but never suspends or reinstates it.
-- Who else may record each event (the registration authority) is the API's.
CREATE FUNCTION scs.signing_key_event_check()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  k scs.signing_key_registration%ROWTYPE;
  s scs.signing_key_registration%ROWTYPE;
BEGIN
  SELECT * INTO k FROM scs.signing_key_registration WHERE key_id = NEW.key_id;
  SELECT * INTO s FROM scs.signing_key_registration WHERE key_id = NEW.signer_key_id;
  IF NOT scs.is_registered_actor(NEW.recorded_by, s.issuer_type, s.issuer_country_code, s.actor_id) THEN
    RAISE EXCEPTION 'signing_key_event_signer_ck: key % is not the recorder''s', NEW.signer_key_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.event_type IN ('SUSPENDED', 'REINSTATED')
     AND scs.is_registered_actor(NEW.recorded_by, k.issuer_type, k.issuer_country_code, k.actor_id) THEN
    RAISE EXCEPTION 'signing_key_event_holder_ck: a key holder never records % on their own key', NEW.event_type
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER signing_key_event_check
  BEFORE INSERT ON scs.signing_key_event
  FOR EACH ROW EXECUTE FUNCTION scs.signing_key_event_check();


-- ── AAB-PLATFORM-09 KeyCompromiseRecord (section 8) ─────────────────────────
-- A different kind of record from an event, with different consequences:
-- final, with a suspected exposure window, and every record accepted inside
-- the window assessed by a person. A later record for the same key may set an
-- earlier start; the window runs from the earliest, and nothing narrows it.
CREATE TABLE scs.signing_key_compromise (
  compromise_id                     uuid        NOT NULL,
  key_id                            uuid        NOT NULL,
  suspected_exposure_from           timestamptz NOT NULL,   -- the key's activeFrom when the basis is UNKNOWN
  exposure_basis                    text        NOT NULL,
  declared_by                       jsonb       NOT NULL,   -- ActorReference
  -- a key holder's own declaration is unsigned (second amendment); any other is signed
  declaration_signed                boolean     NOT NULL,
  declaration_statement             jsonb,
  statement_signature               text,
  signer_key_id                     uuid,                   -- never the compromised key
  recorded_at                       timestamptz NOT NULL,
  compromise_digest                 text        NOT NULL,
  receipt_id                        uuid        NOT NULL,

  CONSTRAINT signing_key_compromise_pk PRIMARY KEY (compromise_id),
  CONSTRAINT signing_key_compromise_key_fk
    FOREIGN KEY (key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_compromise_signer_fk
    FOREIGN KEY (signer_key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_compromise_digest_uq UNIQUE (compromise_digest),
  CONSTRAINT signing_key_compromise_window_ck CHECK (suspected_exposure_from <= recorded_at),
  CONSTRAINT signing_key_compromise_basis_not_blank_ck CHECK (btrim(exposure_basis) <> ''),
  CONSTRAINT signing_key_compromise_declarer_human_ck CHECK (scs.is_named_human(declared_by)),
  CONSTRAINT signing_key_compromise_digest_format_ck CHECK (compromise_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT signing_key_compromise_signed_ck
    CHECK ((declaration_signed
            AND declaration_statement IS NOT NULL
            AND statement_signature ~ '^[A-Za-z0-9+/]{86}==$'
            AND signer_key_id IS NOT NULL AND signer_key_id <> key_id
            AND coalesce(declaration_statement ->> 'statementType' = 'SIGNING_KEY_COMPROMISE'
                AND declaration_statement ->> 'keyId' = key_id::text
                AND declaration_statement ->> 'signingKeyId' = signer_key_id::text, false))
        OR (NOT declaration_signed
            AND declaration_statement IS NULL AND statement_signature IS NULL AND signer_key_id IS NULL))
);

-- The evidence, preserved by digest, never altered.
CREATE TABLE scs.signing_key_compromise_evidence (
  compromise_id                     uuid        NOT NULL,
  evidence_digest                   text        NOT NULL,
  description                       text        NOT NULL,

  CONSTRAINT signing_key_compromise_evidence_pk PRIMARY KEY (compromise_id, evidence_digest),
  CONSTRAINT signing_key_compromise_evidence_fk
    FOREIGN KEY (compromise_id) REFERENCES scs.signing_key_compromise (compromise_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT signing_key_compromise_evidence_digest_ck CHECK (evidence_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT signing_key_compromise_evidence_description_ck CHECK (btrim(description) <> '')
);

-- Only the key holder declares unsigned; a signed declaration is signed with
-- the declarer's own key. Which roles may declare is the API's.
CREATE FUNCTION scs.signing_key_compromise_check()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  k scs.signing_key_registration%ROWTYPE;
  s scs.signing_key_registration%ROWTYPE;
BEGIN
  SELECT * INTO k FROM scs.signing_key_registration WHERE key_id = NEW.key_id;
  IF NOT NEW.declaration_signed
     AND NOT scs.is_registered_actor(NEW.declared_by, k.issuer_type, k.issuer_country_code, k.actor_id) THEN
    RAISE EXCEPTION 'signing_key_compromise_unsigned_ck: only the key holder declares a compromise unsigned'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.declaration_signed THEN
    SELECT * INTO s FROM scs.signing_key_registration WHERE key_id = NEW.signer_key_id;
    IF NOT scs.is_registered_actor(NEW.declared_by, s.issuer_type, s.issuer_country_code, s.actor_id) THEN
      RAISE EXCEPTION 'signing_key_compromise_signer_ck: key % is not the declarer''s', NEW.signer_key_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.suspected_exposure_from < k.active_from THEN
    RAISE EXCEPTION 'signing_key_compromise_window_ck: the window starts before key % was active', NEW.key_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER signing_key_compromise_check
  BEFORE INSERT ON scs.signing_key_compromise
  FOR EACH ROW EXECUTE FUNCTION scs.signing_key_compromise_check();


-- ── AAB-PLATFORM-09 KeyVerificationEvidence (section 9) ─────────────────────
-- Another issuer's key registration and events, attested by that issuer's
-- registry, stored with the record that needed it, so that the record can be
-- verified with no call across the boundary. Accepted only against a pinned
-- attestation key.
CREATE TABLE scs.key_verification_evidence (
  evidence_id                       uuid        NOT NULL,
  key_issuer_type                   text        NOT NULL,
  key_issuer_country_code           text,
  actor_id                          text        NOT NULL,
  key_id                            text        NOT NULL,   -- the other registry's keyId
  evidence                          jsonb       NOT NULL,   -- the KeyVerificationEvidence, as attested
  attestation                       text        NOT NULL,
  attestation_key_id                text        NOT NULL,
  attested_at                       timestamptz NOT NULL,
  -- the record that needed it
  record_table                      text        NOT NULL,
  record_id                         uuid        NOT NULL,
  stored_at                         timestamptz NOT NULL,
  evidence_digest                   text        NOT NULL,

  CONSTRAINT key_verification_evidence_pk PRIMARY KEY (evidence_id),
  CONSTRAINT key_verification_evidence_pin_fk
    FOREIGN KEY (attestation_key_id) REFERENCES scs.pinned_attestation_key (attestation_key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT key_verification_evidence_record_uq UNIQUE (record_table, record_id, key_id),
  CONSTRAINT key_verification_evidence_digest_uq UNIQUE (evidence_digest),
  CONSTRAINT key_verification_evidence_issuer_ck
    CHECK ((key_issuer_type = 'PLATFORM_CONTROL_PLANE' AND key_issuer_country_code IS NULL)
        OR (key_issuer_type = 'COUNTRY_TENANCY' AND coalesce(key_issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT key_verification_evidence_record_table_ck
    CHECK (record_table IN ('key_bootstrap_ceremony', 'actor_party_link', 'actor_party_link_status')),
  CONSTRAINT key_verification_evidence_formats_ck
    CHECK (attestation ~ '^[A-Za-z0-9+/]{86}==$' AND evidence_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT key_verification_evidence_attested_ck CHECK (attested_at <= stored_at),
  -- the stored copy is the evidence: its key, and never a compromised one
  CONSTRAINT key_verification_evidence_shape_ck
    CHECK (coalesce(jsonb_typeof(evidence) = 'object'
       AND evidence ->> 'keyId' = key_id
       AND evidence -> 'issuer' ->> 'issuerType' = key_issuer_type
       AND (evidence -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM key_issuer_country_code
       AND evidence -> 'registration' ->> 'actorId' = actor_id
       AND evidence ->> 'attestationKeyId' = attestation_key_id
       AND evidence -> 'compromisedAtAcceptance' = 'false'::jsonb, false))
);


-- ── Compromise notices from another issuer (section 9) ──────────────────────
CREATE TABLE scs.key_compromise_notice (
  notice_id                         uuid        NOT NULL,
  key_issuer_type                   text        NOT NULL,
  key_issuer_country_code           text,
  actor_id                          text        NOT NULL,
  key_id                            text        NOT NULL,   -- the other registry's keyId
  suspected_exposure_from           timestamptz NOT NULL,
  notice                            jsonb       NOT NULL,   -- the other registry's compromise record, as attested
  attestation                       text        NOT NULL,
  attestation_key_id                text        NOT NULL,
  recorded_by                       jsonb       NOT NULL,   -- ActorReference
  recorded_at                       timestamptz NOT NULL,
  notice_digest                     text        NOT NULL,
  receipt_id                        uuid        NOT NULL,

  CONSTRAINT key_compromise_notice_pk PRIMARY KEY (notice_id),
  CONSTRAINT key_compromise_notice_pin_fk
    FOREIGN KEY (attestation_key_id) REFERENCES scs.pinned_attestation_key (attestation_key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT key_compromise_notice_digest_uq UNIQUE (notice_digest),
  CONSTRAINT key_compromise_notice_issuer_ck
    CHECK ((key_issuer_type = 'PLATFORM_CONTROL_PLANE' AND key_issuer_country_code IS NULL)
        OR (key_issuer_type = 'COUNTRY_TENANCY' AND coalesce(key_issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT key_compromise_notice_recorder_human_ck CHECK (scs.is_named_human(recorded_by)),
  CONSTRAINT key_compromise_notice_formats_ck
    CHECK (attestation ~ '^[A-Za-z0-9+/]{86}==$' AND notice_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT key_compromise_notice_shape_ck
    CHECK (coalesce(jsonb_typeof(notice) = 'object'
       AND notice ->> 'keyId' = key_id
       AND notice -> 'issuer' ->> 'issuerType' = key_issuer_type
       AND (notice -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM key_issuer_country_code
       AND notice ->> 'actorId' = actor_id, false))
);


-- ── Compromise assessments (section 8; second amendment) ────────────────────
-- One per affected record: AFFIRM or REPUDIATE, signed by a person who is not
-- the key holder. A repudiated record stays; nothing is deleted.
CREATE TABLE scs.key_compromise_assessment (
  assessment_id                     uuid        NOT NULL,
  -- the compromise that placed the record under review: this registry's, or another issuer's notice
  compromise_id                     uuid,
  notice_id                         uuid,
  -- the record assessed
  record_table                      text        NOT NULL,
  record_id                         uuid        NOT NULL,
  -- the holder of the compromised key, as recorded
  key_holder_issuer_type            text        NOT NULL,
  key_holder_issuer_country_code    text,
  key_holder_actor_id               text        NOT NULL,

  outcome                           text        NOT NULL,
  reasons                           text        NOT NULL,
  evidence_considered               jsonb       NOT NULL,   -- array of { description, digest }
  assessed_by                       jsonb       NOT NULL,   -- ActorReference
  assessment_statement              jsonb       NOT NULL,
  statement_signature               text        NOT NULL,
  signer_key_id                     uuid        NOT NULL,
  assessed_at                       timestamptz NOT NULL,
  assessment_digest                 text        NOT NULL,
  receipt_id                        uuid        NOT NULL,

  CONSTRAINT key_compromise_assessment_pk PRIMARY KEY (assessment_id),
  -- one assessment per record
  CONSTRAINT key_compromise_assessment_record_uq UNIQUE (record_table, record_id),
  CONSTRAINT key_compromise_assessment_compromise_fk
    FOREIGN KEY (compromise_id) REFERENCES scs.signing_key_compromise (compromise_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT key_compromise_assessment_notice_fk
    FOREIGN KEY (notice_id) REFERENCES scs.key_compromise_notice (notice_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT key_compromise_assessment_signer_fk
    FOREIGN KEY (signer_key_id) REFERENCES scs.signing_key_registration (key_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT key_compromise_assessment_digest_uq UNIQUE (assessment_digest),
  CONSTRAINT key_compromise_assessment_source_ck
    CHECK ((compromise_id IS NULL) <> (notice_id IS NULL)),
  CONSTRAINT key_compromise_assessment_record_table_ck
    CHECK (record_table IN ('actor_party_link', 'actor_party_link_status',
                            'signing_key_registration', 'signing_key_event', 'signing_key_compromise',
                            'key_bootstrap_ceremony', 'key_compromise_assessment')),
  CONSTRAINT key_compromise_assessment_outcome_ck CHECK (outcome IN ('AFFIRM', 'REPUDIATE')),
  CONSTRAINT key_compromise_assessment_reasons_not_blank_ck CHECK (btrim(reasons) <> ''),
  CONSTRAINT key_compromise_assessment_evidence_ck CHECK (jsonb_typeof(evidence_considered) = 'array'),
  CONSTRAINT key_compromise_assessment_holder_issuer_ck
    CHECK ((key_holder_issuer_type = 'PLATFORM_CONTROL_PLANE' AND key_holder_issuer_country_code IS NULL)
        OR (key_holder_issuer_type = 'COUNTRY_TENANCY' AND coalesce(key_holder_issuer_country_code ~ '^[A-Z]{2}$', false))),
  -- the assessor is a named human, and never the key holder
  CONSTRAINT key_compromise_assessment_assessor_ck
    CHECK (scs.is_named_human(assessed_by)
       AND NOT scs.is_registered_actor(assessed_by, key_holder_issuer_type, key_holder_issuer_country_code, key_holder_actor_id)),
  CONSTRAINT key_compromise_assessment_formats_ck
    CHECK (statement_signature ~ '^[A-Za-z0-9+/]{86}==$' AND assessment_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT key_compromise_assessment_statement_ck
    CHECK (coalesce(jsonb_typeof(assessment_statement) = 'object'
       AND assessment_statement ->> 'statementType' = 'KEY_COMPROMISE_ASSESSMENT'
       AND assessment_statement ->> 'recordTable' = record_table
       AND assessment_statement ->> 'recordId' = record_id::text
       AND assessment_statement ->> 'outcome' = outcome
       AND assessment_statement ->> 'signingKeyId' = signer_key_id::text
       AND assessment_statement -> 'assessedBy' ->> 'actorId' = assessed_by ->> 'actorId'
       AND assessment_statement -> 'assessedBy' -> 'issuer' = assessed_by -> 'issuer', false))
);

-- The assessor signs with their own key; for this registry's compromise, the
-- recorded key holder is the compromised key's holder.
CREATE FUNCTION scs.key_compromise_assessment_check()
  RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  s scs.signing_key_registration%ROWTYPE;
  k scs.signing_key_registration%ROWTYPE;
BEGIN
  SELECT * INTO s FROM scs.signing_key_registration WHERE key_id = NEW.signer_key_id;
  IF NOT scs.is_registered_actor(NEW.assessed_by, s.issuer_type, s.issuer_country_code, s.actor_id) THEN
    RAISE EXCEPTION 'key_compromise_assessment_signer_ck: key % is not the assessor''s', NEW.signer_key_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.compromise_id IS NOT NULL THEN
    SELECT r.* INTO k FROM scs.signing_key_registration r
      JOIN scs.signing_key_compromise c ON c.key_id = r.key_id WHERE c.compromise_id = NEW.compromise_id;
    IF k.issuer_type <> NEW.key_holder_issuer_type OR k.issuer_country_code IS DISTINCT FROM NEW.key_holder_issuer_country_code
       OR k.actor_id <> NEW.key_holder_actor_id THEN
      RAISE EXCEPTION 'key_compromise_assessment_holder_ck: the recorded key holder is not the compromised key''s'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER key_compromise_assessment_check
  BEFORE INSERT ON scs.key_compromise_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.key_compromise_assessment_check();


-- ── Indexes on foreign keys and lookups ─────────────────────────────────────
-- verification: an actor's keys, and a key's history
CREATE INDEX signing_key_registration_actor_idx
  ON scs.signing_key_registration (issuer_type, issuer_country_code, actor_id);
CREATE INDEX signing_key_registration_signer_idx ON scs.signing_key_registration (registration_signer_key_id);
CREATE INDEX signing_key_event_key_idx ON scs.signing_key_event (key_id, effective_at);
CREATE INDEX signing_key_event_signer_idx ON scs.signing_key_event (signer_key_id);
CREATE INDEX signing_key_compromise_key_idx ON scs.signing_key_compromise (key_id);
CREATE INDEX signing_key_compromise_signer_idx ON scs.signing_key_compromise (signer_key_id);
CREATE INDEX pinned_attestation_key_ceremony_idx ON scs.pinned_attestation_key (pinned_by_ceremony_id);
CREATE INDEX key_verification_evidence_pin_idx ON scs.key_verification_evidence (attestation_key_id);
CREATE INDEX key_verification_evidence_key_idx ON scs.key_verification_evidence (key_issuer_type, key_id);
CREATE INDEX key_compromise_notice_key_idx ON scs.key_compromise_notice (key_issuer_type, key_id);
CREATE INDEX key_compromise_notice_pin_idx ON scs.key_compromise_notice (attestation_key_id);
CREATE INDEX key_compromise_assessment_compromise_idx ON scs.key_compromise_assessment (compromise_id);
CREATE INDEX key_compromise_assessment_notice_idx ON scs.key_compromise_assessment (notice_id);
CREATE INDEX key_compromise_assessment_signer_idx ON scs.key_compromise_assessment (signer_key_id);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER key_bootstrap_ceremony_append_only
  BEFORE UPDATE OR DELETE ON scs.key_bootstrap_ceremony
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_bootstrap_ceremony_no_truncate
  BEFORE TRUNCATE ON scs.key_bootstrap_ceremony
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER pinned_attestation_key_append_only
  BEFORE UPDATE OR DELETE ON scs.pinned_attestation_key
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER pinned_attestation_key_no_truncate
  BEFORE TRUNCATE ON scs.pinned_attestation_key
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_registration_challenge_append_only
  BEFORE UPDATE OR DELETE ON scs.key_registration_challenge
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_registration_challenge_no_truncate
  BEFORE TRUNCATE ON scs.key_registration_challenge
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_registration_append_only
  BEFORE UPDATE OR DELETE ON scs.signing_key_registration
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_registration_no_truncate
  BEFORE TRUNCATE ON scs.signing_key_registration
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_event_append_only
  BEFORE UPDATE OR DELETE ON scs.signing_key_event
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_event_no_truncate
  BEFORE TRUNCATE ON scs.signing_key_event
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_compromise_append_only
  BEFORE UPDATE OR DELETE ON scs.signing_key_compromise
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_compromise_no_truncate
  BEFORE TRUNCATE ON scs.signing_key_compromise
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_compromise_evidence_append_only
  BEFORE UPDATE OR DELETE ON scs.signing_key_compromise_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER signing_key_compromise_evidence_no_truncate
  BEFORE TRUNCATE ON scs.signing_key_compromise_evidence
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_verification_evidence_append_only
  BEFORE UPDATE OR DELETE ON scs.key_verification_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_verification_evidence_no_truncate
  BEFORE TRUNCATE ON scs.key_verification_evidence
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_compromise_notice_append_only
  BEFORE UPDATE OR DELETE ON scs.key_compromise_notice
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_compromise_notice_no_truncate
  BEFORE TRUNCATE ON scs.key_compromise_notice
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_compromise_assessment_append_only
  BEFORE UPDATE OR DELETE ON scs.key_compromise_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER key_compromise_assessment_no_truncate
  BEFORE TRUNCATE ON scs.key_compromise_assessment
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.key_bootstrap_ceremony IS
  'AAB-PLATFORM-09 bootstrap ceremony: how a registry''s first key was registered, self-attested, and for a country co-signed by the Platform Owner. One per registry, only into an empty registry. Append-only.';
COMMENT ON TABLE scs.pinned_attestation_key IS
  'AAB-PLATFORM-09: another issuer''s registry attestation key, pinned by this registry''s bootstrap ceremony. Append-only.';
COMMENT ON TABLE scs.key_registration_challenge IS
  'AAB-PLATFORM-09 registration challenge: single use, 30 minutes, reserving the keyId. Append-only.';
COMMENT ON TABLE scs.signing_key_registration IS
  'AAB-PLATFORM-09 KeyRegistration: a public key registered for one actor, never the private key. Its state is derived when read. Append-only.';
COMMENT ON TABLE scs.signing_key_event IS
  'AAB-PLATFORM-09 key events: SUSPENDED, REINSTATED, RETIRED. Append-only.';
COMMENT ON TABLE scs.signing_key_compromise IS
  'AAB-PLATFORM-09 KeyCompromiseRecord: final, with a suspected exposure window that can be widened, never narrowed. Append-only.';
COMMENT ON TABLE scs.signing_key_compromise_evidence IS
  'The evidence of a compromise, preserved by digest. Append-only.';
COMMENT ON TABLE scs.key_verification_evidence IS
  'AAB-PLATFORM-09 KeyVerificationEvidence: another issuer''s key, attested, stored with the record that needed it. Append-only.';
COMMENT ON TABLE scs.key_compromise_notice IS
  'AAB-PLATFORM-09: another issuer''s attested compromise notice. Append-only.';
COMMENT ON TABLE scs.key_compromise_assessment IS
  'AAB-PLATFORM-09 compromise assessment: AFFIRM or REPUDIATE one record inside an exposure window, by a person who is not the key holder. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.key_bootstrap_ceremony TO scs_api;
ALTER TABLE scs.key_bootstrap_ceremony ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_bootstrap_ceremony_scs_api_select ON scs.key_bootstrap_ceremony
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY key_bootstrap_ceremony_scs_api_insert ON scs.key_bootstrap_ceremony
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.pinned_attestation_key TO scs_api;
ALTER TABLE scs.pinned_attestation_key ENABLE ROW LEVEL SECURITY;
CREATE POLICY pinned_attestation_key_scs_api_select ON scs.pinned_attestation_key
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY pinned_attestation_key_scs_api_insert ON scs.pinned_attestation_key
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.key_registration_challenge TO scs_api;
ALTER TABLE scs.key_registration_challenge ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_registration_challenge_scs_api_select ON scs.key_registration_challenge
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY key_registration_challenge_scs_api_insert ON scs.key_registration_challenge
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.signing_key_registration TO scs_api;
ALTER TABLE scs.signing_key_registration ENABLE ROW LEVEL SECURITY;
CREATE POLICY signing_key_registration_scs_api_select ON scs.signing_key_registration
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY signing_key_registration_scs_api_insert ON scs.signing_key_registration
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.signing_key_event TO scs_api;
ALTER TABLE scs.signing_key_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY signing_key_event_scs_api_select ON scs.signing_key_event
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY signing_key_event_scs_api_insert ON scs.signing_key_event
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.signing_key_compromise TO scs_api;
ALTER TABLE scs.signing_key_compromise ENABLE ROW LEVEL SECURITY;
CREATE POLICY signing_key_compromise_scs_api_select ON scs.signing_key_compromise
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY signing_key_compromise_scs_api_insert ON scs.signing_key_compromise
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.signing_key_compromise_evidence TO scs_api;
ALTER TABLE scs.signing_key_compromise_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY signing_key_compromise_evidence_scs_api_select ON scs.signing_key_compromise_evidence
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY signing_key_compromise_evidence_scs_api_insert ON scs.signing_key_compromise_evidence
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.key_verification_evidence TO scs_api;
ALTER TABLE scs.key_verification_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_verification_evidence_scs_api_select ON scs.key_verification_evidence
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY key_verification_evidence_scs_api_insert ON scs.key_verification_evidence
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.key_compromise_notice TO scs_api;
ALTER TABLE scs.key_compromise_notice ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_compromise_notice_scs_api_select ON scs.key_compromise_notice
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY key_compromise_notice_scs_api_insert ON scs.key_compromise_notice
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.key_compromise_assessment TO scs_api;
ALTER TABLE scs.key_compromise_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY key_compromise_assessment_scs_api_select ON scs.key_compromise_assessment
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY key_compromise_assessment_scs_api_insert ON scs.key_compromise_assessment
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
