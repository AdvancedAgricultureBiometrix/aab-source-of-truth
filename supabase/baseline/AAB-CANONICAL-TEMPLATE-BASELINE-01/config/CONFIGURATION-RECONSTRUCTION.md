# Configuration reconstruction boundary

Database schema export does not reproduce Supabase dashboard or external-provider settings.

| Area | Rehearsal action | Secret rule |
|---|---|---|
| Auth | Recreate the approved Site URL, exact redirect allowlist, unknown-user rejection, six-digit email OTP expiry and rate limits | Record names and validation evidence only |
| SMTP | Configure the AAB sender, provider host, port, username and password; verify SPF, DKIM and DMARC | Credentials stay in protected provider/dashboard storage |
| Turnstile | Configure the public site key and server-side secret; repeat positive and negative Entry Gateway tests | Site key may be public; secret never enters GitHub or browser code |
| Storage | Create no bucket during baseline apply. Before evidence capture, separately approve private country/organisation-scoped buckets, MIME/size limits and RLS | No service-role key in browser |
| Redirects | Allow only approved AAB origins and exact callbacks | No wildcard production redirects |
| Environment | Issue new project-specific publishable and server credentials | Never copy current project keys into the rehearsal or repository |
| Platform Owner | Bootstrap through a separate one-time governed server-side procedure after clean zero-state proof | No email or actor UUID in reusable migration |
| Backup | Export encrypted logical backup and checksums; test restore; export Storage objects separately when they exist | Backup keys and destinations remain protected |

The live values are not committed. Each value must be recreated and independently revalidated in the temporary clean-room project after explicit approval.
