# AAB Public Launch Experience — Launch-03 Final

**Release date:** 13 August 2026 (Australia/Perth)  
**Live site:** https://aab.ag/  
**Status:** Deployed, browser-console validated, desktop reviewed and mobile approved by the platform owner.

## Chapter outcome

Launch-03 establishes AAB's public launch foundation while preserving the existing AAB.AG typography and visual language.

The live experience now includes:

- Current-stage proof that distinguishes built capability from partner establishment.
- A five-step governed scientific journey.
- Founder introduction and dedicated Founder page.
- Founding Partners page with a controlled-pilot pathway.
- Practical Trust page.
- Insights foundation.
- Updated About page and public navigation.
- Search sitemap entries for the new public routes.
- The retained 23-scene public AAB presentation.
- A keyboard-accessible **Close presentation** control that closes the separate presentation tab when possible and otherwise returns to `/about/#experience`.

## Validation evidence

The deployed Launch-03 browser-console validation returned **PASS — 15/15 checks passed**:

- `/`
- `/about/`
- `/partners/`
- `/founder/`
- `/trust/`
- `/insights/`
- `/enter-aab`
- Current-stage proof
- Five-step scientific journey
- Founder pathway
- Founding Partners pathway
- Shared `site.css`
- Scoped `launch.css`
- Heading scale
- Protected entry separation

The platform owner subsequently confirmed that mobile layout and behaviour look good and that the presentation close journey works as intended.

## Design boundary

`/site.css` remains the shared design authority for AAB fonts, heading sizes, body typography, buttons, spacing tokens and public-page rhythm. `/launch.css` styles only the new launch sections and does not replace the shared typography system.

## Operational boundary

This public release does not alter:

- Supabase schema or data
- Supabase Auth or RLS
- Protected role routing
- AAB dashboards
- Scientific execution authority
- Protected runtime contracts

The public site remains distinct from `/enter-aab`. Scientists and authorised institutions retain authority.

## Deployment root

The files under `public_html/` preserve their Hostinger-relative deployment paths. Back up the live site before any future replacement.
