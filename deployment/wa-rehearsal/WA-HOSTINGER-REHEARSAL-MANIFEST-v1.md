# WA Hostinger Rehearsal Manifest v1

**Status:** Uploaded; live validation pending  
**Environment:** Internal rehearsal  
**Authority:** Non-government, non-production, no legal effect, no scientific approval

## Runtime identity

| Field | Required value |
| --- | --- |
| Hostname | `wa-rehearsal.nexiuma.ai` |
| Country/jurisdiction | Western Australia rehearsal |
| Runtime kind | Isolated country runtime |
| PHP | 8.2 |
| Document root | Separate Hostinger `public_html` |
| Private configuration | Sibling `_private` directory outside `public_html` |

## Required PHP extensions

`curl`, `pdo`, `pdo_pgsql`, `pgsql`, `openssl`, `mbstring`

David confirmed these extensions before upload.

## Permitted Supabase identity

| Field | Required value |
| --- | --- |
| Project reference | `kdpcfbaeklkffozryjah` |
| Project URL | `https://kdpcfbaeklkffozryjah.supabase.co` |
| Region | `ap-southeast-2` |
| Shared pooler host | `aws-0-ap-southeast-2.pooler.supabase.com` |
| Pooler mode | Session |
| Port | `5432` |
| Database | `postgres` |
| User | `postgres.kdpcfbaeklkffozryjah` |
| SSL mode | `require` |

Only a publishable browser key may be present in public configuration. A database password, secret key or service-role key must never appear in `public_html`, logs, screenshots or source control.

## Package identity

| Artifact | SHA-256 |
| --- | --- |
| `WA-PUBLIC-HTML.zip` | `be1d13353a5b0b830cb3ba327f23028ac1c8c05a43d7531a9f391cb630d5eb6e` |
| `WA-PRIVATE-TEMPLATE.zip` | `195bbe0558e95e6eccc1e5532f617346cb0a5ffa929e78784f85a314cd32d035` |

## Runtime controls

- Email → Turnstile → numeric OTP remains the entry sequence.
- OTP issuance uses `create_user:false` for returning users.
- The runtime accepts routing only from protected `aab_resolve_entry()` results.
- Browser routing is restricted to the approved country-runtime path.
- Protected pages redirect unauthenticated users to entry.
- The private PostgreSQL configuration is loaded only from outside the public document root.
- The runtime must fail closed when its hostname, project identity or environment classification is wrong.

## Prohibited connections

- main AAB Supabase operational data;
- another country's Supabase project;
- historical absolute server database paths;
- SQLite operational databases;
- Airtable operational bases;
- central or another-country service credentials.

## Validation gate

Upload is not approval. Mark this manifest `VALIDATED` only after incognito browser testing proves:

1. correct AAB entry page;
2. PHP execution without source exposure;
3. WA-only public configuration;
4. Turnstile success on the exact hostname;
5. OTP delivery for an approved account;
6. no unknown-account creation;
7. OTP verification;
8. persisted WA role routing;
9. denial of unauthorized dashboard paths;
10. no evidence of cross-project or legacy persistence access.

Record failures exactly. Do not bypass a failed gate.
