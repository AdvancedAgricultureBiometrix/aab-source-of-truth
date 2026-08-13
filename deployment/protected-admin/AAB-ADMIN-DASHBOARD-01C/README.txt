AAB ADMIN DASHBOARD 01

Upload the contents of public_html to the matching public_html paths.
Apply the Supabase migration before opening the page.

Dashboard route:
https://aab.ag/aab-local/app/_rebuild/aab-admin.html

Important: aab-admin.js expects window.AAB_SUPABASE_ANON_KEY to be supplied by the existing protected runtime. Never put a service-role key in browser code.

Security boundaries:
- platform role is server-resolved
- applicants receive no admin access
- review rationale is mandatory
- approval does not provision a country
- provisioning remains a separate governed action
