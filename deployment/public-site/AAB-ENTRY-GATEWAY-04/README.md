AAB ENTRY GATEWAY 04
====================

Purpose
-------
Updates /enter-aab/ to the approved two-path entry model:

1. Returning user — email OTP, then protected server-side dashboard resolution.
2. Country or jurisdiction request — official-email verification, then a pending
   administrative review record.

The public invitation panel, browser-side role selection, password form, public
account-creation button and Head-of-Country unlock-code claim have been removed.
Existing emailed invitation links remain separate and continue to use the existing
application invitation route.

Files to upload to public_html
-------------------------------
enter-aab/index.php
entry.js
site.css

Supabase migration
------------------
supabase/migrations/20260813_aab_country_participation_requests.sql

Apply this migration to the same Supabase project used by /api/aab-config before
testing country/jurisdiction request submission. The migration creates a private-by-
default pending request register and one authenticated RPC. It grants no country,
jurisdiction, role, dashboard or provisioning authority.

Important Supabase email template setting
-----------------------------------------
The email OTP template must display {{ .Token }} so users receive a six-digit code.
Returning-user OTP calls explicitly prevent unknown users from being created.

Rollback
--------
Restore the three previous public files. The new Supabase table can safely remain
unused during a UI rollback. Do not drop it if real applications have been received.

GitHub
------
Do not publish this release to GitHub until Dave has uploaded and browser-validated it.
