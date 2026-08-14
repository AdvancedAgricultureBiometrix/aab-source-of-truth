# Clean-room rehearsal and rollback

## Preconditions

- Explicit Platform Owner approval for a temporary project, organisation, Sydney region and quoted cost.
- New project-specific credentials; no live credentials copied.
- `pgcrypto` and `pg_cron` enabled in their Supabase-managed schemas.
- Outbound cron schedules, webhooks and external integrations remain disabled.

## Apply and prove

1. Apply the canonical schema migration.
2. Apply the post-baseline security migration.
3. Apply the checksummed generic reference seed.
4. Run clean-template validation.
5. Run authority/RLS validation as database administrator.
6. Verify zero Auth users, sessions, identity links, role assignments, countries, jurisdictions, organisations, trials, observations, evidence, audit, continuity, security and generated cognitive rows.
7. Verify Agriculture is the only enabled domain and adapter.
8. Verify every brain remains advisory-only, scientist-authority-required and unable to approve autonomously.
9. Recreate Auth/SMTP/Turnstile/redirect settings without committing values, then repeat the protected Entry Gateway tests.
10. Record outputs, catalog counts and checksums. Do not provision Western Australia.

## Rollback

Do not reverse or delete evidence inside the live project. If rehearsal fails, export its validation logs, unlink local CLI state, and—only after explicit approval—delete the temporary project from Supabase Dashboard: Project Settings → General → Delete project → enter the requested confirmation. Project deletion is destructive and unrecoverable on the Free plan; confirm the exact project reference first.

Local working export cleanup after repository publication and checksum verification:

```powershell
& "C:\Program Files\nodejs\npx.cmd" supabase unlink
& "C:\Program Files\nodejs\npx.cmd" supabase logout
Remove-Item -LiteralPath "C:\Users\david\Downloads\AAB-CANONICAL-TEMPLATE-BASELINE-01\20260814_aab_canonical_present_state_schema.sql"
```

Do not run the `Remove-Item` command until the repository package and checksums have been independently verified.
