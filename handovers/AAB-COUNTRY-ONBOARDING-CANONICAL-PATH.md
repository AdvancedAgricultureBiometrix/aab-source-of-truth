# AAB Country Onboarding Path — Canonical Continuity Record

**Status:** CURRENT AND AUTHORITATIVE  
**Corrected:** 28 August 2026 (AWST)  
**Applies to:** Country Discovery, identity, participation approval, governed provisioning, country activation, institution onboarding, professional onboarding and role routing  
**Private controlled workspace:** https://wa-test.aab.ag  
**Current Sites checkpoint:** version 163

## Purpose

The current programme is a build-and-test programme.

Its purpose is to build every missing part of AAB's real onboarding journey and prove that the connected system behaves correctly before any country goes live. Rehearsal records are not government authority, production approval, legally operative acceptance or scientific authority.

Future chats must not stop all useful testing merely because the eventual path is operational. They must build and test the missing machinery within the controlled boundaries below. They must also stop before a test would contaminate operational main-system state without an expressly classified, isolated and auditable rehearsal mechanism.

## Authoritative architecture

The two Supabase projects are intentional layers, not automatically an architecture mismatch:

- **Main AAB Supabase — platform control plane:** identity, participation requests, Platform Owner decisions and governed provisioning decisions.
- **Country Supabase — isolated country tenancy:** country activation, country membership, country documents and receipts, Discovery state and, later, institution and professional records.
- **Provisioning bridge:** a protected server-to-server handoff that verifies the control-plane decision, records a correlation reference and provisions the approved artefacts into the country tenancy without making the Platform Owner a local tenancy member.

Do not consolidate the databases. Do not invent a replacement architecture. One real onboarded country will use one private, isolated country Supabase governed by the main control plane.

## The governing testing rule

> Build and validate the complete onboarding machinery now, while permanently separating rehearsal evidence from future production authority.

The following rules are mandatory:

1. Every test request, decision, document, acknowledgement, activation and membership must be explicitly classified as rehearsal where applicable.
2. Personal WA rehearsal records must remain visibly **non-government**, **non-production** and **no legal effect**.
3. A rehearsal acknowledgement must never satisfy a future operational-country legal gate.
4. Rehearsal membership must never create government representation, external invitation authority or scientific authority.
5. External institution invitations remain hard-locked throughout the personal WA rehearsal.
6. Discovery evidence remains experimental, quarantined and provenance-linked. Onboarding never grants Brain admission, ingredient status, formulation eligibility, trial eligibility or scientific approval.
7. If a proposed test would require ordinary or misleading test material in the main operational control plane, stop and design an isolated, reversible or permanently classified method before proceeding.
8. Do not manufacture, bypass or silently mark an earlier stage complete.
9. Preserve ID-09: email → Turnstile → six-digit OTP. Do not reintroduce passwords or a general Accept Invitation journey.
10. Sites owner access is recovery/testing access only. It must never masquerade as persisted Head Admin authority.

## Canonical operational journey

```text
Country requests access
→ Platform Owner approves
→ Country Head Admin signs in
→ Country Head Admin dashboard
→ Country Discovery workspace
→ Run and review the country scan
→ Return to Country Head Admin dashboard
→ Invite approved institutions
→ Institution Admin signs up
→ Institution dashboard
→ Configure access within the institution's approved scope
→ Invite scientists, agronomists and other professionals
→ Professionals sign up
→ Role-specific dashboards
→ Governed scientific work begins
```

Legal, identity and security controls are gates within this journey. They must not obscure or redefine the operational sequence. Country Discovery is a scientific discovery workspace, not a substitute for the permanent Country Head Admin dashboard.

## Current personal WA rehearsal sequence

The authorised narrow rehearsal path is:

```text
Approved demonstration request
→ personal rehearsal-provisioning decision
→ Platform Owner-controlled rehearsal-document publication
→ governed WA handoff
→ nominated test Head Admin invitation
→ verified identity and claim
→ profile completion
→ exact document display
→ versioned REHEARSAL_ACKNOWLEDGEMENT
→ single-use activation
→ HEAD_ADMIN membership
→ membership-resolved permanent dashboard
```

This path tests the machinery that a genuine onboarding will later use. It does not claim that Western Australia, the WA Government or any external institution has authorised AAB.

## Document ownership

There are two distinct document stages:

1. **Pre-activation control-plane documents:** If required for activation, the Platform Owner publishes them through the governed server-to-server handoff. The nominated Head Admin cannot publish the terms governing their own activation.
2. **Post-activation country/institution documents:** These are managed later under the authorised country governance model and must be current before the relevant invitations or role activations proceed.

The present PDF is test-only rehearsal material. It produces a `REHEARSAL_ACKNOWLEDGEMENT`, not a legally operative acceptance.

Provisioning must fail closed unless document upload, SHA-256 verification and version publication all succeed.

## Authority boundaries

Authentication is not authority. Email verification proves control of an address only.

Protected server-side records determine:

- platform authority;
- country tenancy;
- country and institution membership;
- role;
- capability envelope;
- dashboard routing;
- invitation authority;
- legal or rehearsal receipt eligibility.

The Platform Owner does not become a WA tenancy member merely to provision a document. The Platform Owner controls the main decision; the protected bridge performs the country handoff.

An Institution Admin may eventually assign access only within the institution's Country Head Admin-approved envelope. Institution and professional onboarding are not part of the current narrow bridge and must not begin until the personal Head Admin activation path is proven and separately authorised to continue.

## Current verified implementation state

| Stage | State at Sites v163 |
|---|---|
| Main approved demonstration request | Present; demonstration-stage only |
| Personal WA rehearsal-provisioning decision | Present and permanently classified |
| Governed control-plane → WA handoff | Built and correlated |
| Test PDF | Uploaded to private WA storage, SHA-256 verified and published as test-only |
| Test Head Admin activation | Issued, single-use and unclaimed at checkpoint |
| Rehearsal acknowledgements | Zero before user exercises the journey |
| Production legal acceptances | Zero |
| WA memberships | Zero before activation |
| External institution invitations | Zero and hard-locked |
| ID-09 OTP experience | Preserved |
| Minimal activation UI | Deployed privately in Sites v163 |
| Institution/professional onboarding | Not begun |
| Operational WA government tenancy | Does not exist and must not be implied |

## What may be tested next

Subject to explicit confirmation of direction, the next controlled steps may:

1. exercise the nominated personal WA Head Admin OTP, claim, profile, exact-document acknowledgement and single-use activation;
2. verify that the permanent dashboard resolves from persisted WA membership rather than Sites ownership;
3. verify Dashboard → Country Discovery → Dashboard continuity;
4. validate fail-closed replay, expiry, wrong-email, missing-document and missing-acknowledgement cases without creating production authority;
5. later build institution and professional onboarding using internal rehearsal identities only, after separate approval.

## Mandatory stop conditions

Stop and report before proceeding if:

- a test would create or imply WA Government authority;
- a rehearsal receipt could satisfy a production legal gate;
- external invitations would be enabled;
- an ordinary test record would enter operational main-system state without permanent rehearsal classification;
- the Platform Owner would need local country membership solely to provision;
- ID-09 would need to be replaced or weakened;
- scientific quarantine or human scientific authority would be weakened;
- database consolidation or a new architecture appears necessary;
- persisted state contradicts this record.

## Instruction to future chats

Before changing Country Discovery, onboarding, Supabase identity, provisioning, activation, invitations, documents or dashboards:

1. Read this file completely and read every canonical document linked from the repository README.
2. Retrieve the existing Sites-managed source; do not reconstruct it.
3. Inspect both Supabase projects read-only before proposing mutations.
4. Treat the main project as the control plane and the country project as the isolated tenancy unless existing source proves otherwise.
5. State whether the proposed action is build, rehearsal testing or production work.
6. Map the action to its persisted classification and authority boundary.
7. Preserve all completed stages and do not manufacture missing prerequisites.
8. Keep external institution invitations locked during the personal WA rehearsal.
9. Report any divergence before changing the sequence.
10. Continue building what is missing, but obey the mandatory stop conditions above.

This record supersedes the earlier statement that the main and WA Supabase split was itself an architecture mismatch.
