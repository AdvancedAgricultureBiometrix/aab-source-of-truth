# AAB Private Preview Control Centre 02

## Purpose

Controlled full-file recovery of the deployed \`/aab-local/app/_rebuild/private-preview-admin.html\` page, which was live on AAB.AG but absent from the canonical repository.

## Defect corrected

When \`owner_dashboard\` returned \`aab_owner_login_required\`, the page displayed the internal error but left invitation, analytics, questions, access-request and SMTP controls visible. It also continued polling every 20 seconds and offered a misleading \`Claim owner control\` action without a sign-in path.

## Governed behaviour

- Signed-out state shows a dedicated owner-verification panel and a secure link to \`/enter-aab/\`.
- All privileged controls and summary data remain hidden until the server verifies owner authority.
- Automatic polling does not start while signed out.
- Internal error codes appear only under collapsed technical details.
- A verified owner receives the existing dashboard, invitation workflow and 20-second monitoring cycle.
- The PHP API and its server-side authority checks are unchanged.

## Deployment scope

Replace only these existing live files:

- \`public_html/aab-local/app/_rebuild/private-preview-admin.html\`
- \`public_html/aab-local/app/_rebuild/private-preview.css\`

Preserve \`pitch-api.php\`, all Supabase functions, credentials, server configuration and the accepted AAB Admin Dashboard.

## Validation completed

- Inline JavaScript parses successfully.
- Required authentication-state functions and sign-in route are present.
- HTML div structure is balanced.
- Signed-out state hides \`#appShell\` and stops polling.
- Authenticated success calls \`showOwnerDashboard()\` before rendering private data.
- Responsive layout rules cover desktop, tablet and mobile widths.

## Production verification required after upload

1. Open the page signed out: only the owner sign-in panel must be visible.
2. Confirm no 20-second owner-dashboard polling continues while signed out.
3. Sign in through the existing six-digit OTP gateway.
4. Return to the page and confirm the owner dashboard loads.
5. Confirm invitation creation, refresh, analytics and private feeds still use the existing server API.
