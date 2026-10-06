# AAB Country Discovery — Continuation Handover Post Version 90

**Handover date:** 19 August 2026  
**Mandatory first read:** `docs/AAB-COUNTRY-DISCOVERY-CANONICAL-ARCHITECTURE.md`  
**Sites project:** `appgprj_6a7fae1662248191a9d457fe7e112b9a`  
**Sites version:** 90  
**Sites commit:** `ed0400220b51116359888a0944167fc87c453d10`  
**Production workspace:** https://aab-wa-staging.david-gorey-9087.chatgpt.site  
**Custom domain:** https://wa-test.aab.ag  
**GitHub repository:** `AdvancedAgricultureBiometrix/aab-source-of-truth`  
**Older PR:** #8 — version-83 Thailand direction; do not treat it as the current canonical architecture

## Locked decisions

- One onboarded country equals one complete private Supabase.
- WA is the reusable workspace template; its facts are not copied into other countries.
- Registration, Platform Owner verification, accept/reject, access-code redemption and country entitlement precede the workspace.
- The authorised user deliberately runs the scan before results appear.
- The scan must be real or explicitly a stored governed snapshot; no simulated freshness.
- Country results are evidence-led and grouped into candidates detected, classification required, known types not detected, and coverage gaps.
- Weak signals stay internal.
- The country controls research-institution invitations.
- Accepted institutions receive governed dashboards and downloadable investigation packages.
- Stop and agree data capture after that milestone.
- Findings never enter protected AAB reasoning, formulations or trials without scientist, safety and governance approval.
- The page may reveal possible compatibility questions, but it must not expose protected AAB ingredients or formulation logic.

## Version 90 proof

The WA rehearsal Supabase contains one verified EMRC source, one completed governed WA snapshot and one quarantined Red Hill finding. The live Edge Function and Sites API return the canonical country-profile contract with brain, formulation and trial eligibility set to false.

The production API was browser-confirmed as HTTP 200 with `available: true`, `contract_version: AAB_COUNTRY_PROFILE_V1` and the Red Hill finding present.

## Known frontend defect

The WA cards are wrapped in `{complete && (...)}`. Therefore no cards exist in the DOM until the legacy interface scan sequence finishes, even though the governed API has loaded successfully.

Do not fix this by showing every result automatically. Preserve the user's intended scan-first journey. Replace the old interface-only scan with a genuine governed run/read operation, then reveal the governed results.

## Next-chat opening instruction

> Continue AAB Country Discovery from the Post-Version-90 handover. Read `docs/AAB-COUNTRY-DISCOVERY-CANONICAL-ARCHITECTURE.md` completely before acting. Confirm Sites, GitHub and the rehearsal Supabase. Preserve one country = one private Supabase and the registration → Platform Owner verification → access code → country entitlement → deliberate scan → evidence-backed cards → country invitations → institution dashboard → governed investigation download journey. Build only the next complete layer: replace the WA interface-only scan with a genuine governed country scan/read operation, using real controlled evidence, and render results only after the run completes. Do not expose protected AAB formulation logic and do not claim autonomy.

