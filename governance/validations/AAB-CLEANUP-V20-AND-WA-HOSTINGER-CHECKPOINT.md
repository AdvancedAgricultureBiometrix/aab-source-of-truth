# AAB Cleanup v20 and WA Hostinger Checkpoint

**Status:** Evidence and validation register  
**Recorded:** 2026-09-02  
**Authority:** Internal build/rehearsal only

## Source protection

| Item | Recorded value |
| --- | --- |
| Untouched source archive | `public_html (45)(1).zip` |
| Size | `32,497,220` bytes |
| SHA-256 | `c6956161186b14785214a2c3ef2d88f2fd6da4399b5d00eb11ec562901fda817` |
| Independent backup | Confirmed by David before cleanup |
| Backup checksum | Matched the source archive |

The source archive remains evidence. Cleanup operated on derived working copies.

## General cleanup checkpoint

| Item | Recorded value |
| --- | --- |
| Checkpoint | `AAB-cleanup-v20` |
| Short archive name | `AAB-v20.zip` |
| SHA-256 | `b7c66e7d305e467b926eb4e8f845397743cc1d5768cd23752c80d715f6ec7f36` |
| Central candidate | 34 files |
| Country runtime candidate | 755 files |
| Quarantine | 47 files |
| Public JavaScript | 683 files |
| Direct references | 676 |
| Legitimate indirect references | 7 |
| Quarantined JavaScript | 46 files |

## Checks completed

- JavaScript syntax validation passed.
- Route and navigation manifests reported zero failures.
- ZIP integrity passed.
- No executable Airtable or SQLite dependency remained in the runtime candidate.
- No embedded historical Supabase project reference remained in the runtime candidate.
- The historical absolute `/home/.../aab.ag` database-config fallback was removed.
- Apache bearer-authorization forwarding was added.
- Removal candidates were quarantined rather than erased from the protected source archive.

## Checks not yet proven

- PHP syntax was not checked with a local PHP CLI because PHP CLI was unavailable.
- Browser/runtime behavior on Hostinger was not yet proven when this record was written.
- End-to-end OTP and role routing on `wa-rehearsal.nexiuma.ai` were not yet proven.
- Isolation from the main AAB project must be confirmed through runtime evidence.
- The general v20 checkpoint must not be described as production-ready.

## WA site-specific package

| Artifact | SHA-256 | Purpose |
| --- | --- | --- |
| `WA-PUBLIC-HTML.zip` | `be1d13353a5b0b830cb3ba327f23028ac1c8c05a43d7531a9f391cb630d5eb6e` | Public WA rehearsal runtime uploaded into the isolated Hostinger document root |
| `WA-PRIVATE-TEMPLATE.zip` | `195bbe0558e95e6eccc1e5532f617346cb0a5ffa929e78784f85a314cd32d035` | Credential-free private configuration template |
| `UPLOAD-INSTRUCTIONS.txt` | `dd28aacbff3d63f3b1b997c7064732d6262aa48204ea3ef9465de7c9bb90c0c0` | Controlled upload instructions |

These hashes identify the locally prepared artifacts. The archives are not committed by this checkpoint. No populated private configuration is permitted in source control.

## Capability classification

| Capability | Current state |
| --- | --- |
| Sovereign runtime architecture | Canonically recorded |
| Historical source backup | Verified |
| Cleanup and allowlist candidate | Built and statically checked |
| WA Hostinger account and TLS | Configured by David |
| WA public/private upload | Reported complete by David |
| WA runtime identity | Implemented in the site-specific package |
| Live Hostinger execution | Awaiting validation |
| OTP delivery and verification | Awaiting validation on the new host |
| Persisted role routing | Previously proven in WA rehearsal; must be re-proven on the new host |
| Production authorization | Not granted |

## Evidence rule

Future records must distinguish user-reported configuration, static inspection, successful runtime testing and live authorization. None may be silently treated as another.

