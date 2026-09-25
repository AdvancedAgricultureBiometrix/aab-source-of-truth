# SCS-PLATFORM-01 — Evidence Object Store — Canonical Contract — 2026-09-25

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Supply Chain Sovereignty (SCS)
**Authority:** DEFINES THE CONTRACT FOR THE SCS EVIDENCE OBJECT STORE, A PLATFORM SERVICE SHARED BY ALL SCS CAPABILITIES. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority. PROPOSED_NOT_ADMITTED. No implementation exists.

## Plain-English boundary statement

The evidence object store keeps the files that evidence records point to: satellite images,
analysis reports, certificates, scanned documents. It stores the exact bytes it receives,
computes their SHA-256 digest itself, and never overwrites or deletes a stored file. It does
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

A stored object is never modified. It is not deleted by any operation in this contract.
Retrieval is not yet defined; capabilities verify a cited object through its recorded digest.

## Failure contract

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

**Contract gap: retrieval, retention and access.** Retrieval, retention periods and who may
read a stored file are not yet defined.

## What this document does not establish

- It does not admit any evidence: admission belongs to the capability that cites a stored file
- It does not confirm what a stored file shows, who produced it, or that its declared media
  type is correct
- It does not implement, deploy or migrate anything
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production
  or commissioning authority
