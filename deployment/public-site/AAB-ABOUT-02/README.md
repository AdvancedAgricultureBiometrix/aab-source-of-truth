# AAB About Public Experience — Release 02

**Release date:** 12 August 2026 (Australia/Perth)  
**Live route:** https://aab.ag/about/  
**Deployment root:** `public_html/`

## Purpose

This governed deployment snapshot records the public AAB About experience that was deployed and visually confirmed working on AAB.AG.

## Included

- Public `/about/` editorial page with crawlable HTML and structured metadata.
- Embedded 23-scene AAB public presentation.
- Corrected AAB typography scale and mobile heading treatment.
- Compact presentation control placed directly above the animation.
- Public navigation updates across existing public routes.
- Sitemap entry for `/about/`.
- Legacy `/private-preview/` redirect to `/about/`.
- Standalone animation marked `noindex` so search engines prefer the complete About page.

## Boundaries

- The protected `/enter-aab` pathway remains separate.
- No Supabase schema, data, Auth, RLS or database mutation is included.
- No credentials, environment files, logs or local databases are included.
- This release does not grant operational authority or autonomous capability.

## Validation evidence

- User confirmed the deployed About page works.
- Exactly 23 presentation scenes were retained.
- ZIP integrity checks passed.
- Static references, SEO metadata, redirect intent and removal of legacy pitch authentication were checked during package preparation.
- Local PHP CLI and browser rendering were unavailable in the preparation environment; no claim of local PHP execution or screenshot validation is made.

## Deployment

Upload the contents of `public_html/` into the live Hostinger `public_html/` directory using merge and overwrite, after taking a backup.
