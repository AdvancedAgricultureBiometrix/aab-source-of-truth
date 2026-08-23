# AAB Country Onboarding Path — Canonical Continuity Record

**Status:** CURRENT AND AUTHORITATIVE  
**Recorded:** 23 August 2026  
**Applies to:** Country Discovery, identity, participation approval, country activation, institution invitations and entry into AAB  
**Current controlled workspace:** https://wa-test.aab.ag  
**Current validated Sites checkpoint:** version 134

## Purpose

The Country Discovery workspace is not a separate promotional demonstration. It is the first operational stage of the AAB country-onboarding path.

The current work has two inseparable purposes:

1. show an authorised country representative how AAB discovers, separates and investigates country-specific evidence; and
2. build and validate the real governed path that future countries and their institutions will use to enter AAB.

Every stage is built with controlled test data, validated, and then retained as part of the canonical onboarding process. A completed test stage must not be discarded or rebuilt as a disconnected demonstration.

## Non-negotiable Supabase rule

### Current build-and-test stage

There must be **one controlled onboarding test Supabase** for the complete end-to-end process.

It must ultimately contain the connected test journey:

- Country Discovery jurisdiction and scan;
- controlled participation request;
- Platform Owner decision;
- terms and governance acceptance;
- country activation;
- Head Admin membership and dashboard;
- institution invitation;
- invited-user verification, membership and dashboard routing.

The single approved participation request currently present is **controlled test evidence for this build**. It is not an operational country approval.

Do not interpret the current Western Australia, Thailand, Vietnam, Philippines or China demonstration profiles as operational country tenancies.

### Future operational stage

After the entire onboarding journey is validated:

> One real onboarded country = one new, private and isolated Supabase provisioned from the validated canonical template.

Do not place multiple operational countries into the controlled test database. Do not clone the entire integration/test database into a country tenancy. Provision only the approved country template and that country's isolated records.

## Canonical onboarding sequence

1. **Country Discovery**
   - The authorised representative enters the selected country's governed Country Discovery workspace.
   - They run the multi-source country scan and review country-specific candidates, classification signals, known types not detected and evidence coverage gaps.
   - Every card uses the shared Western Australia-quality Candidate Investigation structure while retaining only the selected country's evidence.

2. **Continue with AAB**
   - The representative chooses to proceed from the completed discovery experience.
   - The selected jurisdiction and governed discovery-run identity are carried forward automatically.

3. **Verified participation request**
   - The representative supplies their name, official role, authorised organisation, official email and authority declaration.
   - Email verification proves control of the address; it does not by itself prove authority.

4. **Platform Owner review**
   - The Platform Owner may approve, request more information or decline with a recorded rationale.
   - The existing approved request is the controlled test of this stage.

5. **Terms and governance acceptance**
   - After approval, the representative must accept the current version of the AAB terms, privacy notice, country-sovereignty conditions, scientist-authority boundary and experimental/unverified discovery conditions.
   - Acceptance must be stored with user, country workspace, document version and timestamp.
   - A newer mandatory version requires fresh acceptance.

6. **Country activation**
   - A single-use governed activation creates the country workspace, country scope, security policy and the first `HEAD_ADMIN` membership.
   - Activation must not grant Domain Brain access, formulation eligibility, trial eligibility or automatic discovery promotion.

7. **Head Admin setup and dashboard**
   - The Head Admin completes country settings, language, timezone, recovery contacts, coordinating organisation and regulatory/security contacts.
   - The completed Country Discovery results remain available from the country workspace.

8. **Institution invitations**
   - The Head Admin invites approved institution leaders using official email addresses and assigns an initial governed role.
   - Only authorised `HEAD_ADMIN` or `COUNTRY_ADMIN` memberships may issue invitations.

9. **Institution-user onboarding**
   - The invitee opens a country-bound, expiring invitation.
   - They authenticate with and verify the invited email.
   - They create their profile, confirm institution and position, accept current terms, receive the approved membership and enter the correct role dashboard.

10. **Governed scientific investigation**
    - Approved scientists may investigate selected discoveries inside AAB.
    - Discovery evidence remains quarantined until separate scientific and governance gates are satisfied.
    - No discovery automatically becomes an ingredient, formulation, trial, verified benefit or Domain Brain memory.

## Current verified implementation state

| Stage | Current state |
|---|---|
| Shared Country Discovery workspace | Built and validated |
| Multi-source scan for newly added jurisdictions | Built and under continuing evidence-expansion validation |
| WA-quality investigation workspace for every generic country card | Built in Sites version 134 |
| Verified email participation request | Built and previously exercised |
| Platform Owner review | Built; one controlled request approved |
| Terms/version acceptance | Not yet built |
| Country activation function | Exists but has not been exercised for a country workspace |
| Head Admin role and route foundation | Exists but awaits controlled activation validation |
| Secure institution invitation and acceptance functions | Exist but have not been validated end to end |
| Automatic profile creation and terms-gated dashboard entry | Incomplete |
| Operational country tenancy | Not provisioned and must not be implied |

## Current architecture mismatch to resolve

Inspection on 23 August 2026 found the controlled path split across two Supabase projects:

- the main AAB Supabase holds identity, the verified user, the controlled approved participation request, role, invitation and dashboard-routing foundations;
- the WA clean-room rehearsal Supabase holds Country Discovery demonstration jurisdictions, scans and cards.

This split does not represent the approved final build-and-test architecture. The next database-design work must establish one controlled onboarding test Supabase for the connected end-to-end validation path without damaging the live AAB platform or falsely treating a test jurisdiction as operational.

No consolidation, migration, deletion or tenancy provisioning is authorised merely by this continuity record. Any data movement requires a separate inspected plan, safety review and explicit approval.

## Shared interface rule

Western Australia is the canonical visual and investigation template.

All countries must use:

- one shared country workspace renderer;
- one shared stylesheet contract;
- one shared six-stage scan journey;
- one shared AAB Governed Scientific Intelligence panel;
- one shared environmental framework or truthful unavailable state;
- the same four evidence-result groups;
- the full Candidate Investigation workspace;
- country-specific maps, evidence, sources, findings and governance scope.

Different evidence and card totals are valid. Different UI contracts are not valid.

Never fix a new country by manually hard-coding country-specific cards or creating another country-only page.

## Governance boundaries

- Platform Owner approval is required before controlled country activation.
- An account is not authority.
- Email verification is not authority verification.
- Scientist remains the scientific execution authority.
- Discovery cards are experimental/unverified investigation objects.
- No brain access, formulation eligibility, trial eligibility, taxonomy promotion or cross-country evidence sharing is granted by the discovery scan.
- Unknown or unregistered jurisdictions fail closed.
- Missing evidence is shown as a coverage gap, never copied from another country and never manufactured.

## Instruction to future chats

Before changing Country Discovery, onboarding, Supabase identity, country activation, invitations or dashboard routing:

1. Read this file completely.
2. Inspect the current Sites source and both current Supabase projects.
3. Preserve completed and validated stages.
4. Treat the single approved request as controlled build/test evidence.
5. Continue the connected onboarding chain from the last validated stage.
6. Do not create a real country tenancy during testing.
7. Do not claim the onboarding journey is complete until it has been proven end to end with controlled data.
