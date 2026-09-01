# AAB WA Hostinger Rehearsal Continuation

**Status:** Mandatory new-chat handover  
**Recorded:** 2026-09-02  
**Repository workstream:** `agent/sovereign-country-runtime-cleanup-path` / draft PR #13  
**Runtime:** Western Australia internal rehearsal only

## Read first

Before changing code, databases, hosting or routing, read:

1. `README.md`
2. `handovers/AAB-CANONICAL-SYSTEM-DEFINITION.md`
3. `handovers/AAB-COUNTRY-ONBOARDING-CANONICAL-PATH.md`
4. `handovers/AAB-SOVEREIGN-COUNTRY-RUNTIME-AND-CLEANUP-PATH.md`
5. this handover
6. `governance/validations/AAB-CLEANUP-V20-AND-WA-HOSTINGER-CHECKPOINT.md`
7. `architecture/AAB-PERSISTENCE-MIGRATION-BOUNDARY.md`
8. `deployment/wa-rehearsal/WA-HOSTINGER-REHEARSAL-MANIFEST-v1.md`

## Architecture that must not drift

- `aab.ag` is the governed platform control plane, not the shared operational workspace for every country.
- Each country receives an isolated operational runtime and a separate Supabase project.
- Canonical code, cognitive contracts, governance contracts and domain-brain definitions may be distributed through versioned releases.
- Evidence, cognitive state, hypotheses, decisions, memberships, scientific work, trials, outcomes and learning remain country-local.
- No country runtime may contain credentials for the main control plane or another country.
- Cross-boundary provisioning and future scientific exchange require explicit, authenticated, auditable contracts; there is no automatic synchronisation or promotion.
- Authentication is not authority. Persisted protected membership and scope records determine routing and capability.

## Proven rehearsal state before the hosting move

The WA clean-room rehearsal proved persisted role resolution through the internal onboarding sequence, including Head Admin, institution/team activation and a role-specific research workspace. The displayed auditor workspace resolved from persisted `PERSISTED_REHEARSAL_TEAM_MEMBER` authority. This proof remains rehearsal-only and creates no government, legal, production, regulatory or scientific approval.

## Historical application cleanup state

The untouched source archive was independently backed up and checksum-verified before cleanup. Cleanup proceeded from a working copy using inventory, dependency mapping, quarantine and allowlist principles.

The latest general checkpoint is `AAB-cleanup-v20`:

- 34 central-control-plane candidate files;
- 755 country-runtime candidate files;
- 47 quarantined evidence files;
- 683 public JavaScript files, with 676 direct and 7 legitimate indirect references;
- 46 JavaScript files quarantined;
- JavaScript syntax checks passed;
- route/navigation manifests reported zero failures;
- executable Airtable and SQLite dependencies were removed from the runtime candidate;
- embedded historical Supabase project references were removed;
- dangerous historical absolute server-path database fallback was removed;
- Apache bearer-authorization forwarding was added;
- PHP CLI was unavailable, so no local PHP syntax-pass claim exists.

`AAB-cleanup-v20` is a general cleanup checkpoint, not a production deployment package.

## WA isolated Hostinger deployment

David created a separate Hostinger PHP/HTML site:

- hostname: `wa-rehearsal.nexiuma.ai`;
- separate hosting account/document root;
- PHP 8.2;
- required extensions confirmed: `curl`, `pdo`, `pdo_pgsql`, `pgsql`, `openssl`, `mbstring`;
- TLS/HTTPS active;
- Cloudflare Turnstile widget created and intended for the rehearsal hostname.

David reported that both the private database configuration and public WA package were uploaded on 2026-09-02. Upload completion is not runtime validation.

## WA Supabase boundary

The only permitted country database for this rehearsal is:

- project reference: `kdpcfbaeklkffozryjah`;
- project name: `AAB WA Clean-Room Rehearsal 20260815`;
- project region: `ap-southeast-2`;
- project URL: `https://kdpcfbaeklkffozryjah.supabase.co`.

The Hostinger PHP backend uses the WA Shared Pooler in **session mode** because Hostinger may be IPv4-only and the PHP/PDO code uses prepared statements:

- host: `aws-0-ap-southeast-2.pooler.supabase.com`;
- port: `5432`;
- database: `postgres`;
- user: `postgres.kdpcfbaeklkffozryjah`;
- SSL mode: `require`.

No password, secret key, service-role key or private configuration belongs in GitHub or `public_html`.

The historical/main Supabase project must never appear in or receive traffic from this WA runtime.

## Uploaded package contract

The site-specific package contains:

- a WA-only OTP entry page;
- Cloudflare Turnstile verification;
- returning-user OTP with account creation disabled;
- same-origin Supabase session storage;
- protected `aab_resolve_entry()` routing;
- route acceptance limited to `/aab-local/app/_rebuild/`;
- a country-runtime guard and WA runtime identity;
- protected-page redirects for unauthenticated access;
- private PostgreSQL configuration loaded from a sibling `_private` directory outside `public_html`.

The package contains no database password and no Supabase secret/service-role key.

## Immediate next action

Do not begin feature wiring yet. First validate the newly uploaded runtime in an incognito browser.

Expected first page: **Verify your approved email**.

Validation order:

1. confirm the hostname serves AAB rather than the Hostinger placeholder;
2. confirm PHP executes and source code is not exposed;
3. confirm the public config endpoint reports only the WA project and rehearsal identity;
4. confirm Turnstile completes on the approved hostname;
5. request an OTP for an already approved WA rehearsal account;
6. confirm unknown accounts are not created;
7. enter the newest numeric code;
8. confirm `aab_resolve_entry()` routes from persisted WA authority;
9. confirm a user cannot manually open a dashboard outside their persisted role;
10. inspect errors/logs for any reference to the main project, historical server paths, SQLite or Airtable;
11. record pass/fail evidence without committing personal data or tokens.

Stop immediately if the site shows a directory listing, PHP source, a database credential, the Hostinger placeholder, the main project reference, cross-country data, or a route granted without persisted WA membership.

## What follows a clean validation

After the entry and isolation gates pass:

1. validate Head Admin routing;
2. validate institution administration;
3. validate bounded invitation and OTP claim;
4. validate researcher and auditor role dashboards;
5. wire useful dashboard information only from approved WA persisted records;
6. replace remaining legacy persistence adapters with Supabase Auth and persisted memberships;
7. produce a signed reusable sovereign-country release profile;
8. automate future country provisioning rather than repeating manual setup.

Singapore must receive a new isolated hosting/runtime identity and its own Supabase project in an approved region. It must not reuse WA data, WA Auth users, WA secrets or mutable WA scientific state.

