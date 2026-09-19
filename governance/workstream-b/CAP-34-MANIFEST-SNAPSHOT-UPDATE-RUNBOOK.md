# CAP-34 Manifest Snapshot Update Runbook

**Status:** CONTROLLED REVIEW REQUIREMENT  
**Authority:** Procedure only — no production, scientific, regulatory, sovereignty or commissioning authority

## Purpose

This runbook preserves the rule that evidence belongs to the exact state that produced it. A future manifest snapshot is not trusted merely because its internal digest is valid or because it appears in a locally edited registry.

## Required sequence

1. Verify the capability change against real implementation and evidence.
2. Update only affected capability representation versions and fidelity fields.
3. Create a new immutable `manifestSnapshotId` and `manifestVersion`.
4. Compute the canonical manifest-entry digest.
5. Append the snapshot record to the historical snapshot registry; never replace an earlier record.
6. Add the reviewed snapshot identity, version and digest to `TRUSTED_SNAPSHOTS` in the canonical disclosure-receipt validator.
7. Bump the disclosure-receipt validator version.
8. Run the complete manifest-validator matrix.
9. Run the complete canonical receipt-validator matrix.
10. Prove that receipts created against every retained historical snapshot still validate against the snapshot that produced them.
11. Prove that a historical receipt fails closed when evaluated against a different snapshot.
12. Record exact Git blob SHAs for the contract, schema, matrix and validator tested.

## Stop conditions

Stop and fail closed if:

- the source Capability Landscape or identity roster is unavailable;
- the proposed snapshot is derived only from the manifest it is meant to check;
- a snapshot ID is reused;
- an earlier registry entry is changed or removed;
- `TRUSTED_SNAPSHOTS` is not updated through review;
- contract-byte binding fails;
- any manifest, receipt or integration fixture fails;
- an older valid receipt ceases to validate against its original archived snapshot.

## Non-implication

Completing this procedure validates snapshot and receipt integrity only. It does not establish capability implementation, scientific correctness, production readiness, sovereignty, commissioning, Gate D satisfaction or WP05 commencement.
