# AAB Trust, Access, Compliance and Conversation Intelligence

**Status:** CANONICAL DESIGN BOUNDARY — IMPLEMENTATION NOT YET PROVEN  
**Recorded:** 2 September 2026 (AWST)  
**Applies to:** entry pathways, authentication assurance, dashboards, audit, internal communications, screenshots, privacy, security and future conversation intelligence

## Why this record exists

A controlled WA rehearsal submission entered `Test` while the public form required the applicant to choose genuine government capacity. The form therefore produced an internally inconsistent request: test purpose combined with a claim of government authority.

The system correctly stopped before approval. The event exposed a general design rule:

> AAB interfaces must guide people into valid governed pathways and make invalid authority combinations impossible. A user may state an intended pathway, but the browser must never create or self-assign authority.

The malformed request remains evidence of the gap. It must not be approved, provisioned or represented as government participation.

## Guided-pathway contract

Entry and dashboard interfaces must use controlled, role-relevant choices for consequential actions. Critical classification must not depend on ambiguous free text.

Permitted high-level pathways include:

- genuine country or jurisdiction participation;
- government evaluation or demonstration, where expressly available;
- institution participation through a controlled invitation;
- returning authorised user; and
- internal AAB rehearsal, available only through protected Platform Owner controls.

Every pathway must:

1. explain what it can and cannot create;
2. collect only relevant information;
3. validate eligibility on the server;
4. resolve authority from persisted protected records;
5. show a plain-language confirmation before commitment;
6. fail closed when classification, authority or prerequisites conflict; and
7. record the reason, actor, authority source and correlation reference.

`TEST_ONLY`, `NON_GOVERNMENT`, `NON_PRODUCTION` and `NO_LEGAL_EFFECT` are permanent classifications. They cannot satisfy later live gates.

## AAB Trust Gate

AAB may provide a distinctive Trust Gate experience, but it must use established authentication standards rather than proprietary cryptography.

The Trust Gate should show:

- verified identity;
- persisted country, institution and role;
- who or what authorised that role;
- current authentication assurance;
- current session and relevant device information;
- the action being requested and its effect;
- whether fresh authentication or a second approver is required; and
- the correlation reference for the governed sequence.

Authentication, membership, authority and action approval remain separate facts.

## Authentication-assurance direction

- Email OTP continues to verify address control and establish the initial session.
- Email verification alone never grants a role, membership or dashboard.
- Governed roles must enroll an approved second factor before privileged dashboard access.
- Platform Owner, Country Head Admin and Institution Admin sessions require `aal2` before privileged actions.
- Sensitive actions require step-up authentication even when a dashboard session is active.
- Passwords are not introduced as the default public entry path merely to appear stronger.
- TOTP is the first controlled rehearsal factor because Supabase supports enrollment, challenge, verification and `aal2` enforcement.
- Phishing-resistant passkeys or hardware security keys remain the preferred future direction after controlled evaluation and suitable product maturity.
- AAB must never build its own cryptographic authenticator protocol.
- Recovery for privileged accounts must not rely on email alone.

## Privacy-minimised audit contract

Every consequential event should record only the information required to prove the governed sequence:

- actor identifier;
- persisted role and authority source;
- country, institution, team and project scope where applicable;
- action and governed target;
- previous and resulting state or their protected hashes;
- human reason;
- timestamp;
- session assurance and authentication method;
- approval, invitation or decision reference; and
- correlation ID connecting the end-to-end operation.

Audit must never record passwords, OTPs, authenticator secrets, recovery secrets, access tokens, private keys or unnecessary personal content.

Audit visibility is scoped rather than universal:

- Country Heads see country governance and compliance events, not unrestricted scientific content or private conversations.
- Institution Admins see institution membership, assignments, access and compliance obligations.
- Scientific Leads see authorised project and team scientific activity.
- Team members see their own activity and shared activity within their assigned scope.
- Platform Owners see platform health, provisioning and security evidence without becoming members of country scientific workspaces.

Exceptional access to protected content requires an explicit purpose, authority and audit event.

## Self-auditing controls

AAB should automatically identify and surface:

- expired, orphaned or conflicting memberships;
- cross-country access attempts;
- roles without a valid authority source;
- privileged sessions below required assurance;
- overdue access reviews and acknowledgements;
- unauthorised export or bulk-access attempts;
- missing reasons, approvals or correlation references;
- changes that bypass the intended state transition; and
- unusual administrative or security activity requiring human review.

Detection creates a reviewable signal or alert. It does not automatically convict a user, revoke scientific authority or alter scientific records.

## Sovereign internal communications

Each country tenancy may provide private internal communication within persisted scope:

- Country Head to institution administrators;
- institution administrators to authorised scientists;
- Scientific Leads to their authorised teams; and
- replies by intended recipients within the same governed thread.

Three communication classes are anticipated:

1. official notices with acknowledgement receipts;
2. governed work threads connected to a project, evidence object, review or decision; and
3. ordinary team conversations within authorised scope.

Messaging must not create scientific evidence, scientific approval, a governance decision or a role. Message content is not automatically visible to administrators merely because they administer membership. Exceptional content access requires a recorded purpose and authority.

## Screenshot-only media boundary

General file attachments are excluded from the initial messaging scope. Controlled screenshot support may accept only decoded and re-encoded PNG, JPEG or WebP images.

The service must:

- verify actual image content rather than trust the extension;
- reject malformed, disguised and oversized files;
- remove EXIF, location, device and identity metadata;
- scan and warn for likely passwords, keys, OTPs or sensitive personal information;
- store media in a private country-specific storage boundary;
- use short-lived authorised access rather than public URLs; and
- record relevant creation, redaction and exceptional-access events without logging image content unnecessarily.

## Conversation-intelligence boundary

Country communication is not a global training corpus. Nothing may train a global model without a separate, explicit and governed agreement.

Conversation intelligence must be deliberately invoked through actions such as:

- **Summarise this thread**;
- **Find unresolved questions**;
- **Check for contradictions**;
- **Prepare an investigation note**; and
- **Flag a compliance concern**.

Every result must be labelled `AI-GENERATED INTERPRETATION` and include:

- source message and screenshot identifiers;
- requesting person;
- country, institution, project and permitted scope;
- purpose;
- model and version;
- time and correlation ID;
- limitations and unresolved questions; and
- a statement that it is not scientific evidence, an approved finding or authority.

The governed progression is:

```text
private conversation
→ authorised AI analysis
→ labelled interpretation draft
→ human review
→ optional governed investigation note
→ separate scientific review
```

No stage may be skipped. `Prepare an investigation note` creates a draft only. The brain cannot grant authority, approve science, alter membership, submit evidence or take operational action.

Country messages and derived interpretations remain country-local. They do not leak into another country's retrieval, reasoning, model context or mutable state.

## Implementation sequence

1. Preserve this design in the canonical repository.
2. Repair the internal-rehearsal pathway before approving the malformed test request.
3. Define and rehearsal-test the authentication-assurance contract.
4. Add Trust Gate enrollment, challenge and step-up interfaces.
5. Enforce assurance at server, API and database boundaries.
6. Add privacy-minimised audit receipts and role-scoped activity views.
7. Add sovereign internal messaging without general attachments.
8. Add controlled screenshot processing and private storage.
9. Add conversation-intelligence actions only after their governance and isolation tests pass.

## Capability-state warning

This record establishes the approved direction. It does not prove that MFA, messaging, screenshot processing, self-audit or conversation intelligence is implemented, populated, rehearsal-tested or authorised for live operation.

