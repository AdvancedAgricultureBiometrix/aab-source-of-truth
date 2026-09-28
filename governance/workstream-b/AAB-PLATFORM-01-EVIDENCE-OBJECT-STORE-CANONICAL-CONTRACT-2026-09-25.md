# AAB-PLATFORM-01 — Evidence Object Store — Canonical Contract — 2026-09-25

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Supply Chain Sovereignty (SCS)
**Renamed:** from SCS-PLATFORM-01 on 2026-09-27. Platform contracts are numbered AAB-PLATFORM-NN (AAB-PLATFORM-03, decision 1).
**Authority:** DEFINES THE CONTRACT FOR THE SCS EVIDENCE OBJECT STORE, A PLATFORM SERVICE SHARED BY ALL SCS CAPABILITIES. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority. PROPOSED_NOT_ADMITTED. A pilot implementation exists in `scs-pilot/packages/api/src/platform/evidence-objects/`.

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

`POST /scs/v1/evidence-objects` stores one file.

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

A stored object is never modified. **No operation of the service deletes one.** Every version is kept under Object Lock, in GOVERNANCE mode, for six years. It can be deleted only by the separately held override credential, and only as the amendment of 2026-09-28 (section 4) allows.

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
should require a role that can submit evidence to some capability is not decided.

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
