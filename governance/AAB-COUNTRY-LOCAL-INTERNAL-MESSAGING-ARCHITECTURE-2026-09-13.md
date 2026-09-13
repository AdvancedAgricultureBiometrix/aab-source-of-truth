# AAB Country-Local Internal Messaging Architecture

**Status:** Canonical planned architecture — not yet claimed as implemented  
**Recorded:** 2026-09-13  
**Purpose:** Keep collaboration about AAB scientific work inside the same sovereign country boundary as the underlying science and reduce unnecessary use of external email/messaging systems.

## Core principle

> **Scientific collaboration should stay inside the same sovereign country boundary as the science itself.**

AAB should provide country-local internal messaging so authorised users can discuss AAB-generated or AAB-held material without routinely copying scientific information into external email, consumer messaging, or unrelated collaboration platforms.

## Intended communication scope

Within a country tenancy, messaging is intended to support governed communication such as:

- Country Head / Country Head Admin ↔ authorised institutions;
- institution leadership/admin ↔ authorised scientists/researchers;
- scientists/researchers ↔ authorised members of their bounded team;
- reply chains associated with governed AAB work;
- screenshots where specifically permitted and stored within country-local storage.

General file attachments are not part of the initial requirement.

## Sovereignty requirements

Messaging is a country-tenancy capability, not a canonical shared messaging service.

Each country must keep its own:

- message records;
- conversation/thread records;
- recipient and membership resolution;
- message search/indexing where provided;
- screenshots and related storage;
- message audit metadata;
- retention/deletion state.

Message content must not be copied into canonical AAB, another country's tenancy, central product analytics, central AI training/fine-tuning, global embeddings, or a shared cross-country search index.

## Authority

Authentication alone does not grant messaging authority. Recipients and conversation access must be resolved from persisted country/institution/team authority.

The design must fail closed when:

- sender authority cannot be established;
- recipient authority cannot be established;
- sender and recipient are not within an allowed communication relationship;
- a cross-country recipient is requested;
- institution/team scope is ambiguous;
- required membership has been revoked or expired.

The AAB Platform Owner is not automatically a member of a country tenancy and must not receive implicit access to country messages merely by operating the platform.

## Privacy and audit

Audit records should record only what is required for security/governance, such as sender identity, recipient/thread identifiers, authority basis, action, country, timestamp, session assurance and correlation ID.

Central/platform audit must not duplicate country message bodies, screenshots, scientific content, passwords, OTPs, secrets or other protected payloads.

## Screenshots

Where screenshots are permitted:

- they remain in country-local authorised storage;
- access follows the message/thread authority boundary;
- they are not automatically copied to central support or analytics;
- external export is not implied by the ability to view the screenshot internally.

## External forwarding/export

Email forwarding, external recipient addressing, automatic transcript export and cross-country forwarding should be disabled by default.

Any future export/share capability must be separately governed under the AAB country scientific-data non-return and egress-control specifications.

## Security verification controls

The implementation must eventually prove at least:

- MSG-01: scientific discussion can remain inside the country tenancy;
- MSG-02: message bodies are stored only in the authorised country environment;
- MSG-03: recipients are bounded by persisted role/institution/team authority;
- MSG-04: cross-country recipients cannot be selected or addressed;
- MSG-05: screenshots remain in country-local authorised storage;
- MSG-06: general file attachments remain disabled unless separately governed;
- MSG-07: message content does not enter central analytics/logging;
- MSG-08: Platform Owner cannot silently read country messages;
- MSG-09: external forwarding/export is disabled by default;
- MSG-10: audit metadata does not duplicate protected message content centrally.

## Implementation status rule

This record defines intended architecture. It does not establish that messaging has been implemented or security-tested.

Until code, schema, RLS/authority controls, storage, UI and verification evidence exist, public/internal status must remain **PLANNED / NOT IMPLEMENTED** rather than proven.

## Permanent rule

> **Keep the conversation with the science: local authority, local storage, local scientific boundary.**
