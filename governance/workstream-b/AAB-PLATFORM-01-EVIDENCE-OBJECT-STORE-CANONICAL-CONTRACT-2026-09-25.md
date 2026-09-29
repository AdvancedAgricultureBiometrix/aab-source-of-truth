# AAB-PLATFORM-01 — Evidence Object Store — Canonical Contract — 2026-09-25

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Supply Chain Sovereignty (SCS). **Corrected on 2026-09-29:** a platform service, serving SCS and Agricultural Science (AGR), each under its own storage profile (amendment of 2026-09-29).
**Renamed:** from SCS-PLATFORM-01 on 2026-09-27. Platform contracts are numbered AAB-PLATFORM-NN (AAB-PLATFORM-03, decision 1).
**Amended:** 2026-09-28 (object store credentials, Object Lock and retention) and 2026-09-29 (storage profiles, and the AGR profile). Since 2026-09-29 it also serves Agricultural Science (AGR), under its own profile.
**Authority:** DEFINES THE CONTRACT FOR THE SCS EVIDENCE OBJECT STORE, A PLATFORM SERVICE SHARED BY ALL SCS CAPABILITIES (CORRECTED ON 2026-09-29: AND, UNDER ITS OWN STORAGE PROFILE, BY AGR). Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority. PROPOSED_NOT_ADMITTED. A pilot implementation exists in `scs-pilot/packages/api/src/platform/evidence-objects/`. The amendment of 2026-09-28 is built, and `behaviourally proven` for what its proof record covers (note of 2026-09-28, below).

## Amendment of 2026-09-28: object store credentials, Object Lock and retention

**Settled before build, to close `TODO(object-store-credentials)`.** The roadmap names it as the remaining blocker before real data is stored (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 6.1). The Platform Owner decided GOVERNANCE mode, six-year retention, accepting overwrites, and amending this contract before any code, on 2026-09-28. Every behaviour of the store that this amendment relies on was tested that day against the pinned store, SeaweedFS 4.47, in a throwaway instance. Section 7 records the results.

### 1. Three identities

The store has three identities, each with its own credentials, and no two share a credential.

| Identity | Allowed | Held by |
|---|---|---|
| **Admin** | Everything | The object store's own container, and the one-off setup step (section 5). **Never the API's environment** |
| **API** | Read and write on the evidence bucket, and nothing else. It cannot create a bucket, list objects or reach another bucket | The API's container |
| **Backup** | Read and list on the evidence bucket, and nothing else. It cannot write or delete | The backup tool, when it runs |

- **Setup refuses to start** when any credential is missing, is still a placeholder, is shorter than the store requires, or is the same as another identity's.
- **The store's write permission is broader than its name.** Read and write alone would let the API overwrite and delete objects and weaken the bucket's retention (section 7). The bucket policy (section 3) removes everything except writing new objects.

### 2. Object Lock and retention

- **The evidence bucket is created with Object Lock enabled.** Object Lock keeps every version of every object, and versioning cannot then be suspended.
- **Default retention is GOVERNANCE mode, for six years.** Every version is locked from the moment it is stored. It is configured as **2,192 days**, so that any six calendar years, which contain at most two leap days, are covered.
- **Why six years, when EUDR requires five.** EUDR requires due diligence information to be kept for five years **from the due diligence statement**, not from when the evidence was stored. Evidence is stored before the statement that cites it, sometimes long before. A five-year lock from storage could therefore expire before the statement's own five years end. **The sixth year is a buffer** against that gap, until a way to extend an object's retention from the date of the statement that cites it is defined (open items). It is the conservative, defensible position.
- **Why GOVERNANCE, not COMPLIANCE.** COMPLIANCE mode cannot be overridden by anyone, even to delete personal data when the law requires it. For a platform built on honest governance, being unable to erase personal data when legally required to is a worse failure than the protection COMPLIANCE adds. GOVERNANCE mode protects every version in the same way, except against a deliberate, separately authorised override (section 4).
- **What it means in practice.** A locked version cannot be deleted, and its retention cannot be shortened, by the API or the backup identity at all. **Even the admin cannot do either without explicitly overriding governance retention on that request** (section 7). An ordinary delete is refused for every identity.
- **Retention runs from when each version is stored,** not from the date of any due diligence statement that cites it (open items).

### 3. The bucket policy

The setup step attaches a bucket policy that **denies the API identity:**
- changing the bucket's Object Lock configuration, versioning or bucket policy;
- setting an object's retention or legal hold;
- deleting an object or an object version;
- overriding governance retention.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ApiMayNotChangeRetentionOrDelete",
    "Effect": "Deny",
    "Principal": { "AWS": ["arn:aws:iam::000000000000:user/<api identity name>"] },
    "Action": [
      "s3:PutBucketObjectLockConfiguration", "s3:PutBucketVersioning",
      "s3:PutBucketPolicy", "s3:DeleteBucketPolicy",
      "s3:PutObjectRetention", "s3:PutObjectLegalHold",
      "s3:DeleteObject", "s3:DeleteObjectVersion",
      "s3:BypassGovernanceRetention"
    ],
    "Resource": ["arn:aws:s3:::<evidence bucket>", "arn:aws:s3:::<evidence bucket>/*"]
  }]
}
```

- **The principal must be named by its ARN.** A policy that names the identity by its bare name is accepted by the store and then silently not enforced (section 7).
- **The build's tests prove the API is refused every denied action.** A policy that stops being enforced therefore fails CI, rather than failing silently.
- **Why it is needed.** Without it, the API's write permission would let it delete objects and weaken the bucket's default retention to one day. Objects stored after that could then be deleted a day later (section 7).

### 4. The override credential

- **A separate identity may override governance retention.** It has admin rights on the evidence bucket only.
- **It is held apart from the admin, API and backup credentials,** by a different custodian. It is in no container's environment in normal operation, and is brought in only for a use.
- **It may be used only** to delete, or shorten the retention of, a specific object version. That is permitted where the law requires erasure, or where an object was stored in error. **It is never used in normal operation, never by the API, and never to change what evidence says.**
- **Who holds it, what a use requires, and how each use is recorded are not yet defined** (open items).
- **In the pilot, it is created and held, and never used.** A live use before its governance is defined would itself be a governance failure.
- **Its governance must be defined before any real data is admitted.** Until then, the pilot cannot honour an erasure request. That is acceptable only because the pilot holds no real data.
- **Disclosed: the admin credential can also override.** Any identity with admin rights can override governance retention (section 7). So the separation between the admin and override credentials is a separation of custody, not of technical capability. The admin credential is as sensitive as the override credential, and is held accordingly.

### 5. Setup, and the API's startup checks

**A one-off setup step, run with the admin credential before the API starts, prepares the bucket.** It:
- creates the bucket with Object Lock and the default retention;
- attaches the bucket policy;
- reads all of it back and refuses to finish if anything differs.

It runs on every start of the stack, so the lock configuration and the policy are re-verified each time. It refuses an existing bucket without Object Lock: Object Lock is enabled when a bucket is created, and a bucket created without it is never used. **The API no longer creates the bucket.**

**The API refuses to start unless:**
- its own object store credentials are set. Its environment holds no admin or backup credential;
- the evidence bucket exists, with versioning enabled, Object Lock enabled, and a default retention of GOVERNANCE mode for at least 2,192 days;
- **its credential is the scoped one.** A listing of the bucket must be refused, because a credential that can list is not the API's.

### 6. Overwrites are accepted, versioned and detected

- **The service never overwrites.** It writes only when no object is stored under the digest (the conditional write, "Upload").
- **The store cannot stop the API's credential from overwriting, if the credential were used outside the service.**
- **Object Lock keeps the original version,** under its retention, and the overwrite becomes a new current version (section 7).
- **Every read re-hashes the bytes against their key.** Bytes that do not hash to their key are refused, and the operation that needed them fails closed and writes nothing. Renditions already do this (AAB-PLATFORM-02, `RENDITION_INTEGRITY_FAILED`). This amendment makes it a guarantee of every read from the store.
- **Disclosed: an overwrite is detected, not blocked.** For the pilot, a locked original version plus detection on every read is honest and auditable. Restoring the original version as the current one is not yet defined (open items).

**Backup and restore:**
- **Export** runs with the backup identity. Every exported object is checked against its key, and the set of exported objects against the database's record of stored objects. A missing, hidden or altered object fails the backup instead of being left out.
- **Restore** runs the setup step first, then imports with the API identity. A restored version's retention runs from the restore, so it is longer, never shorter.

### 7. Tested store behaviour (SeaweedFS 4.47, 2026-09-28)

| Tested | Result |
|---|---|
| The API identity (read and write on the evidence bucket) | Put, head and get: allowed. Creating a bucket, listing and other buckets: refused. **Overwriting and deleting objects: allowed** |
| The API identity against an Object Lock bucket, without the bucket policy | **It could weaken the default retention to one day** |
| The backup identity (read and list) | Listing, getting and reading the lock configuration: allowed. Every write and delete refused, including batch deletes, key by key |
| GOVERNANCE mode (tested with 1,825 days) | An ordinary delete of a locked version is refused for every identity. **Only an identity with admin rights that explicitly overrides governance retention deleted a locked version: the admin, or an admin of that bucket only** |
| COMPLIANCE mode | No identity could delete or shorten a locked version, the admin included |
| An overwrite on an Object Lock bucket (tested in COMPLIANCE mode) | A new current version. The original is kept under retention |
| The bucket policy naming the API by ARN | Enforced: the API could no longer change the lock or the policy, delete objects, or add delete markers. The admin was unaffected |
| The same policy naming the API by bare name | **Accepted by the store, and not enforced** |

## Note of 2026-09-28: built and proven

Recorded with the proof. **Not an amendment: nothing in this contract changes.**
- **The amendment of 2026-09-28 is built** in the SCS pilot (PR #65, merged as `dbb2408`), as planned in `scs-pilot/OBJECT-STORE-IDENTITIES-BUILD-PLAN.md` (PR #64). `TODO(object-store-credentials)` is gone from the code.
- **It is `behaviourally proven`** for what its proof record covers (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`), on CI run 36417985710 of the merge commit:
  - the three identities;
  - GOVERNANCE retention for 2,192 days;
  - the ARN policy, and a bare-name policy not enforced;
  - the override credential refused by the store;
  - the setup step and the API's startup checks;
  - overwrites versioned and detected;
  - backup and restore on the scoped identities.
- **What still blocks real data is the override credential's governance** (section 4): who holds it, what a use requires, and how each use is recorded. It must be defined before any real data is admitted. Until then, the credential is never used.

## Amendment of 2026-09-29: storage profiles, and the AGR profile

**Settled before any AGR original is stored.** CAP-04 Governed Scientific Memory records the store's parameters for AGR content as a prerequisite before any code: "a deliberate platform decision … never an inheritance from EUDR's assumptions" (CAP-04, "Open gaps"). The Platform Owner decided the parameters below in review on 2026-09-29. Every behaviour of the store they rely on was tested that day against SeaweedFS 4.47, in a throwaway instance (section 10). **The SCS profile is unchanged:** everything this contract says of the evidence bucket, its identities, its six-year lock and its route stays as it is.

**Decisions recorded on 2026-09-29** (approved by the Platform Owner in review):
1. **Storage profiles, defined in this contract.** A domain's parameters are a profile here, never a domain annex: a profile can vary only what this contract allows to vary (section 1).
2. **The AGR profile has its own bucket, route and reference:** `agr-evidence`, `POST /agr/v1/evidence-objects`, and `agr-object:sha256:…`. The server takes the profile from the route, never from the request.
3. **The lock is protection, not expiry** (section 3).
4. **AGR retention:** GOVERNANCE mode, `Years: 100`. An object's lock may be lengthened later without the override. Renewing locks before they end is an open item.
5. **Legal hold is not a default.** It is kept for freezing specific objects during a dispute or investigation, under governance defined with the override credential's (section 4).
6. **Originals that are never admitted** are locked like any other, accepted and disclosed for now. Staging is an open item, not decided (section 8).
7. **The AGR media types** (section 5). Active content is excluded. `application/octet-stream` is accepted, and the admitting capability requires the record to state the actual format.
8. **AGR sizes:** 100 MB by standard upload; 50 GiB by the large upload route, with a declared digest; above that, not stored (section 6). The large route's rules are set now, and it is built when first needed.
9. **Uploading to the AGR profile requires `MEMORY_SUBMITTER`** (section 7). SCS keeps "any authenticated actor" for now.

### 1. Storage profiles

**The platform's guarantees are the same for every profile:**
- an object is stored under the SHA-256 the service computes, and never overwritten;
- its bucket is created with Object Lock, in GOVERNANCE mode, and never COMPLIANCE (amendment of 2026-09-28, section 2);
- three identities, admin, API and backup, with the bucket policy denying the API every change to retention, legal hold, the policy and deletion (sections 1 and 3 of that amendment);
- every read re-hashes the bytes against their key;
- **one override credential,** under one governance (section 4 of that amendment).

**What a profile sets, and nothing else:**

| Parameter | Varies by profile |
|---|---|
| The bucket | Yes: one bucket per profile. The lock period is a bucket's setting, and the API may not set an object's retention |
| The route, and the reference prefix | Yes |
| The default retention period | Yes, within GOVERNANCE mode |
| The accepted media types | Yes |
| The size limits, and the upload routes | Yes |
| Who may upload | Yes |

- **The profile is chosen by the route.** The service is the platform's; each domain mounts it under its own prefix. A request never names a profile, and a request that tries to is refused.
- **Each profile's API identity reaches its own bucket only.** The setup step prepares and reads back each profile's bucket and policy, and the API refuses to start unless the bucket of every profile it serves has its profile's lock (amendment of 2026-09-28, section 5).
- **An object is stored once per profile.** The same bytes uploaded under two profiles are two objects, each under its own profile's lock.
- **A new profile, or a change to a profile, is an amendment to this contract.**

| Profile | SCS (unchanged) | AGR (new) |
|---|---|---|
| Bucket | The evidence bucket (`scs-evidence` in the pilot) | `agr-evidence` |
| Route | `POST /scs/v1/evidence-objects` | `POST /agr/v1/evidence-objects` |
| Reference | `scs-object:sha256:…` | `agr-object:sha256:…` |
| Retention | GOVERNANCE, 2,192 days | **GOVERNANCE, `Years: 100`** |
| Media types | The six in "Upload" | Section 5 |
| Size | 50 MB | **100 MB standard; 50 GiB by the large upload route** (section 6) |
| Who may upload | Any authenticated actor | **`MEMORY_SUBMITTER`** (section 7) |

### 2. AGR retention

- **GOVERNANCE mode, `Years: 100`.** Every version is locked from the moment it is stored until the same calendar date a hundred years on. It is the longest default the store accepts (section 10).
- **Configured in years, not days.** The store refuses any default above 36,500 days, so the SCS profile's approach, a day count covering the leap days, is not available at this length. `Days: 36500` would end 24 days short of a hundred calendar years; `Years: 100` does not (section 10).
- **Why a century.** Scientific memory is relied on for as long as the science is: long-term field trials run for decades, and a record's value can grow with its age. The lock protects it for the longest the store allows.
- **An object's lock may be lengthened** beyond its default, without the override (section 10). Lengthening never shortens, and is never used to weaken anything.
- **Renewing locks before they end** is an open item. It is a century away, and it is written down so that it is not assumed.
- **Why GOVERNANCE, not COMPLIANCE,** is as for the SCS profile (amendment of 2026-09-28, section 2), and weighs more here: over a century, lawful erasure is likely to be needed, of personal information, or of traditional knowledge whose holders withdraw their consent.

### 3. The governing principle: the lock is protection, not expiry

> **The lock sets how long the store protects an object; it is not an expiry date. The platform never deletes on a schedule. When a lock ends, nothing is deleted automatically.**

- **Keeping is the default, for every profile.** No operation of the service deletes an object, and the platform defines no deletion schedule. An object whose lock has ended stays exactly as it was.
- **What the lock decides** is how long deletion is impossible except through the governed override. After it ends, deletion still requires a governed act, which this contract does not define and does not authorise.
- **So indefinite keeping does not need an indefinite lock.** A record kept for ever is an object that nothing deletes. The lock is a protection against deletion, not a promise of it.

### 4. Legal hold

- **Legal hold freezes one object version,** with no end date. While it is on, **not even the override can delete the version** (section 10).
- **It is not a default,** for any profile. It adds nothing a long lock does not already give, and it is made for a different purpose.
- **Its purpose:** freezing specific objects during a dispute or investigation, so that even a governed erasure cannot touch them until it is resolved.
- **Who may place and remove it, on what grounds, and how each use is recorded** are not defined. They are defined with the override credential's governance, and **both must be defined before any real data is admitted** (open items). The API may not set it (amendment of 2026-09-28, section 3).

### 5. AGR media types

| Group | Accepted |
|---|---|
| Documents | `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.oasis.opendocument.text` |
| Tables and structured data | `text/csv`, `text/tab-separated-values`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `application/vnd.oasis.opendocument.spreadsheet`, `application/json`, `application/geo+json` |
| Images | `image/jpeg`, `image/png`, `image/tiff` (including GeoTIFF and OME-TIFF), `image/heic`, `image/webp` |
| Audio | `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/flac`, `audio/ogg` |
| Video | `video/mp4`, `video/quicktime`, `video/webm` |
| Archives | `application/zip`, `application/gzip` |
| Any other format | `application/octet-stream`: for formats with no registered media type, such as FASTA, FASTQ, BAM, CRAM, VCF, HDF5, netCDF, hyperspectral cubes and raw microscopy formats |

- **Excluded: types that carry active content,** such as HTML, SVG, JavaScript, macro-enabled office documents and executables. Any type not listed is refused (`EVIDENCE_OBJECT_TYPE_UNSUPPORTED`).
- **`application/octet-stream` is accepted,** and **the admitting capability requires the record citing it to state the actual format.** For CAP-04, a record that cites such an original without stating its format is admitted with the limitation `FORMAT_NOT_DECLARED` (CAP-04, amendment of 2026-09-29, the AGR storage profile).
- **Disclosed: the list labels content; it does not make it safe.** The declared type is not checked against the bytes (open gaps), and `application/octet-stream` accepts any bytes.
- **The safety rule belongs to retrieval,** and is a requirement on it when it is defined: a stored object is always served as a download, with its declared type and no content sniffing, and never rendered in a browser.

### 6. AGR sizes, and the large upload route

**Two routes, limited by route, not by type.** The declared type is not verified, so a limit by type could be avoided by declaring another type.

| Route | Limit | How |
|---|---|---|
| **Standard upload** | **100 MB** (104,857,600 bytes), every accepted type | One request, as the SCS profile's upload |
| **Large upload** | **50 GiB** (53,687,091,200 bytes), every accepted type | In parts, with the digest declared first (below) |
| **Larger** | Not stored | Cited where it is held: `original.externalReference` with its `declaredDigest` (AAB-PLATFORM-05), `integrityStatus` `UNVERIFIED`, disclosed |

**The large upload route's rules, set now; the route is built when first needed:**
- **The uploader declares the SHA-256, the size and the media type before sending any bytes.** A declared digest already stored under the profile returns the stored object, and nothing is uploaded.
- **The service stores under the declared digest** as an upload in parts, hashing every byte as it arrives. It completes the upload **only if the computed digest and size equal the declared ones,** and only if no object is stored under that digest (the conditional write, as in "Upload"). The store refuses a conditional completion when the key exists (section 10).
- **A mismatch, or an upload never completed, is cancelled.** A cancelled upload leaves nothing stored and nothing locked (section 10). An upload not completed within 7 days is cancelled. **Seven days is the pilot value,** confirmed in review on 2026-09-29, and may need adjusting when the first large uploads are made in practice.
- **Parts,** apart from the last, are at least 5 MiB, as the store requires.
- **What the route brings with it,** recorded as open items: the time the backup takes, since it re-hashes every object; storage capacity in each country environment; and quotas per uploader.

**Above 50 GiB, a record cites the original where it is held,** for example a sequencing run in an international archive, cited by its accession. Where a country's environment is to hold larger originals, raising its limit is a change to its profile, by amendment.

### 7. Who may upload to the AGR profile

- **An actor holding `MEMORY_SUBMITTER`** (CAP-04), through a scoped grant covering the country workspace. Any other actor is refused (`ROLE_NOT_AUTHORISED`, 403).
- **Why:** an object stored under a hundred-year lock can be removed only by the governed override. Who may store one is not a minor question.
- **SCS keeps "any authenticated actor" for now.** Tightening it is a candidate for a later amendment (open gaps).

### 8. Originals that are never admitted

- **An original is stored before the record that cites it is decided** (CAP-04, decision 3). A rejected record's original, or an original no record ever cites, **is locked like any other, for a hundred years,** and only the override can remove it, on the ground that it was stored in error.
- **Accepted and disclosed for now.** It weighs on originals holding personal information or traditional knowledge, whose erasure the law or their holders may require.
- **Staging, an open item, not decided.** Originals would be stored first in a staging bucket with a short lock, and copied into the profile's bucket, re-hashed, only when a record citing them is admitted. Unadmitted originals would then expire from staging. **It would change:** CAP-04's decision 3, since the original would not be in the profile's bucket at submission; the integrity check at admission, which would verify the copy; a held record's original, which would stay in staging for as long as the record is held; and this contract's upload routes.

### 9. Failure contract additions

| Code | HTTP | Meaning |
|---|---:|---|
| `ROLE_NOT_AUTHORISED` | 403 | An upload to the AGR profile by an actor without `MEMORY_SUBMITTER` |
| `EVIDENCE_OBJECT_TOO_LARGE` | 413 | Over the route's limit. Above 50 GiB, the reasons say that the original is cited where it is held |
| `EVIDENCE_OBJECT_DIGEST_MISMATCH` | 422 | A large upload whose bytes do not match its declared digest or size. Nothing is stored |

### 10. Tested store behaviour (SeaweedFS 4.47, 2026-09-29)

| Tested | Result |
|---|---|
| Default retention of 36,525 days | **Refused:** "The retention period specified is invalid" |
| The longest default retention accepted | **36,500 days, or `Years: 100`.** 36,501 days and 101 years are refused |
| `Years: 100` and `Days: 36500`, for an object stored on 2026-09-29 | Locked until 2126-09-29, and until 2126-09-05: the day count ends 24 days short |
| Lengthening one object's lock, to 2176, without the override | **Allowed** |
| Shortening one object's lock, without the override | Refused, the admin included |
| Legal hold on | **An admin delete with the governance override is refused.** The version stays |
| Legal hold off | A delete without the override is still refused under retention; with the override, the version is deleted |
| An upload in parts, to an Object Lock bucket | Completed, and given the bucket's default lock |
| Completing an upload in parts, conditionally, when the key exists | **Refused** (412). One version remains |
| Cancelling an upload in parts | Nothing stored: no version, and nothing locked |

## Plain-English boundary statement

The evidence object store keeps the files that evidence records point to: satellite images,
analysis reports, certificates, scanned documents. It stores the exact bytes it receives,
computes their SHA-256 digest itself, and never overwrites a stored file. It deletes one only
through the governed override of the amendment of 2026-09-28, never in normal operation. It does
not read, interpret or judge a file's content. Storing a file does not admit it as evidence:
a file becomes evidence only when a capability, such as SCS-CAP-04, admits a record that
cites it.

## The governing rule

> The store vouches for bytes, not for meaning. SCS computes the digest of every file it
> stores, so an evidence record that cites a stored file can prove that the file is exactly
> the one submitted. What the file says is judged by the capability that admits it.

## Why it is a platform service

Every SCS capability that admits evidence needs the same guarantee: the file cited by a record
is the file that was submitted, unchanged. The store is therefore not part of any one
capability. SCS-CAP-04 is its first user. The evidence identifiers already recorded by
SCS-CAP-02 (identity, role and relationship evidence) and SCS-CAP-03 (plot and tenure
evidence) are not stored files today; they can be linked to stored files later without
changing this contract.

## Upload

`POST /scs/v1/evidence-objects` stores one file, under the SCS profile. The AGR profile's routes, types and limits are in the amendment of 2026-09-29.

- **Body.** The raw bytes of the file. The `Content-Type` header declares its media type.
- **Authentication.** Required. The upload is not specific to any capability: any
  authenticated actor may upload.
- **Idempotency.** An `Idempotency-Key` header is required, as for every SCS write.
- **Size.** At most 50 MB (52,428,800 bytes). Otherwise `EVIDENCE_OBJECT_TOO_LARGE`. An
  empty body is a request error.
- **Media types.** The declared type must be one of `image/tiff`, `image/png`, `image/jpeg`,
  `application/pdf`, `application/zip` or `application/octet-stream`. Otherwise
  `EVIDENCE_OBJECT_TYPE_UNSUPPORTED`. The declared type is recorded as declared; the store
  does not inspect the bytes to confirm it.
- **Digest.** SCS computes the SHA-256 of the bytes as received. The digest identifies the
  object: the file is stored under it.
- **Never overwritten.** If an object with the same digest is already stored, the bytes are
  identical by definition. Nothing is written again; the existing object is returned, with the
  media type and time recorded at its first upload.

```typescript
interface ScsEvidenceObject {
  // Lowercase hexadecimal SHA-256 of the stored bytes, computed by SCS
  objectId: string;
  // The reference a capability cites: "scs-object:sha256:" followed by objectId
  objectReference: string;

  contentDigest: {
    algorithm: "SHA-256";
    value: string;
  };
  sizeBytes: number;
  // As declared at the first upload; not confirmed from the bytes
  mediaType: string;

  storedAt: string;
  storedBy: ActorReference;
}
```

The response is the `ScsEvidenceObject`: `201` when the file was stored, `200` when an identical
file was already stored.

## Retrieval and deletion

A stored object is never modified. **No operation of the service deletes one.** Every version is kept under Object Lock, in GOVERNANCE mode, for its profile's period: six years for SCS, a hundred for AGR (amendment of 2026-09-29). When a lock ends, nothing is deleted. It can be deleted only by the separately held override credential, and only as the amendment of 2026-09-28 (section 4) allows.

**Every read from the store re-hashes the bytes against their key and refuses a mismatch** (amendment, section 6).

A retrieval endpoint for evidence objects is not yet defined. Capabilities verify a cited object through its recorded digest.

## Failure contract

Errors from this service are still attributed `capabilityId: "SCS-PLATFORM"`. That value is part of the SCS naming the platform code carries, which the platform–domain separation decision leaves to extraction, after the independent dependency audit. It changes then, not with this contract's identifier.

```typescript
interface ScsEvidenceObjectFailure {
  ok: false;
  capabilityId: "SCS-PLATFORM";
  result: "FAIL_CLOSED";

  error:
    | "UNAUTHENTICATED"
    | "EVIDENCE_OBJECT_TOO_LARGE"
    | "EVIDENCE_OBJECT_TYPE_UNSUPPORTED"
    | "REQUEST_VALIDATION_FAILED"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  noWrites: true;
}
```

`EVIDENCE_OBJECT_TOO_LARGE` is 413, `EVIDENCE_OBJECT_TYPE_UNSUPPORTED` is 415, and an
unavailable object store is `DEPENDENCY_UNAVAILABLE` (503). A failed upload stores nothing.

## Open gaps

**Contract gap: who may upload.** Any authenticated actor may upload. Whether uploading
should require a role that can submit evidence to some capability is not decided. **Decided for the AGR profile** (amendment of 2026-09-29): `MEMORY_SUBMITTER`. For SCS, it is a candidate for a later tightening.

**Contract gap: media type confirmation.** The declared media type is not checked against
the bytes.

**Contract gap: linking existing evidence identifiers.** The evidence identifiers recorded by
SCS-CAP-02 and SCS-CAP-03 are UUIDs with no stored file behind them. How they are linked to
stored objects is not yet defined.

**Contract gap: retrieval and read access.** No retrieval endpoint for evidence objects is defined, and who may read a stored file is not decided. Retrieval of renditions is defined by AAB-PLATFORM-02. **Retention is now defined** (amendment of 2026-09-28, section 2).

**Contract gap: retention governance.** Open since the amendment of 2026-09-28:
- **the override credential:** who holds it; what a use requires, such as a recorded, attributable decision (AAB-PLATFORM-08) and which legal grounds qualify; and how each use is recorded. Until this is defined, the credential is held and never used. **It must be closed before any real data is admitted;**
- **what an erasure leaves behind:** what becomes of a record that cites an erased object, and how an erasure reaches the backups, which hold copies outside Object Lock;
- **packages that cite an erased object:** a compiled due diligence package (SCS-CAP-08) records the SHA-256 of every object it cites. If one of those objects is erased, every package that cites it can no longer be verified against its evidence. **This is a question of governed record integrity.** It needs its own answer before erasure governance is defined: what a package's verification reports when an object it cites has been lawfully erased, and how that is told apart from tampering;
- **when retention starts:** retention runs from storage, not from the date of a due diligence statement that cites the object. The six-year default is a buffer (amendment, section 2). A statement made more than a year after its evidence was stored could still outlive that evidence's retention. Extending retention from the statement's date, by the override credential or by legal hold, is not yet defined;
- **recovering from an overwrite:** an overwrite is detected on every read, and the original version is kept. Restoring that version as the current one is not yet defined.
- **legal hold** (amendment of 2026-09-29, section 4): who may place and remove it, on what grounds, and how each use is recorded. Defined with the override credential's governance, **before any real data is admitted;**
- **renewing locks before they end:** how an object's lock is lengthened before its profile's period ends, so that nothing relied on is left unprotected. For the AGR profile, before 2126;
- **staging for originals never admitted** (amendment of 2026-09-29, section 8): not decided. What it would change is recorded there.

**Contract gap: the large upload route's operations** (amendment of 2026-09-29, section 6). Its rules are set; its routes, and the backup time, country capacity and per-uploader quotas it brings, are defined when it is built.

**Future requirement: retrieval serves objects as downloads.** When retrieval is defined, a stored object is always served as a download, with its declared type and no content sniffing, and never rendered in a browser (amendment of 2026-09-29, section 5).

**Disclosed limits of the amendment of 2026-09-28:**
- **The admin credential can also override governance retention.** The admin and override credentials are separated by custody, not by technical capability (section 4).
- **The API and backup identities can list the store's bucket names.** They cannot list or reach the contents of any other bucket.
- **The tested behaviour is that of SeaweedFS 4.47.** The build's tests assert it, so a store upgrade that changes it fails CI.

## What this document does not establish

- It does not admit any evidence: admission belongs to the capability that cites a stored file
- It does not confirm what a stored file shows, who produced it, or that its declared media
  type is correct
- It does not implement, deploy or migrate anything
- It does not appoint the holder of the override credential, or authorise any use of it
  (amendment of 2026-09-28)
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production
  or commissioning authority
