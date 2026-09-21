# CAP-34 Disclosure Receipt Contract

**Contract version:** 1.0.0  
**Status:** CONTROLLED SIMULATION DISCLOSURE RECEIPT CONTRACT  
**Authority:** Disclosure acknowledgement only — no legal, commercial, scientific, regulatory, production or commissioning authority

> **Capability truth → Fidelity Manifest → Immutable Manifest Snapshot → Disclosure Receipt. Never the reverse.**

## Purpose

The CAP-34 Disclosure Receipt records that a particular evaluator was shown a particular simulator disclosure state and explicitly acknowledged the distinction between implemented simulation and Roadmap Preview.

The receipt does not define capability truth. It may only reference truth already fixed by an immutable Capability Fidelity Manifest snapshot.

## Scope

A receipt records:

- which manifest snapshot governed the session;
- which capability representations were actually shown;
- the exact representation version, simulator mode and fidelity shown for each;
- whether Roadmap Preview was entered;
- the acknowledgement wording/version presented;
- who acknowledged it in the simulation context;
- when it was acknowledged;
- a correlation/reference ID;
- any receipt-integrity digest/signature when supported.

The receipt is not:

- a contract;
- a production authorisation;
- a scientific approval;
- a regulatory approval;
- a commissioning decision;
- proof that a capability is implemented merely because it was displayed;
- proof that the evaluator agrees with AAB's claims beyond acknowledging the disclosure distinction.

## Privacy and security minimisation

The receipt must not contain:

- passwords;
- MFA codes;
- recovery codes;
- secret keys;
- API tokens;
- private recovery addresses;
- phone numbers;
- production credentials;
- protected country scientific information.

The minimum evaluator record is:

- display name or approved evaluator reference;
- role;
- organisation where appropriate.

Email and other contact details are not required by this contract.

## Required receipt fields

Top-level fields:

- `receiptId`
- `receiptContractVersion`
- `createdAt`
- `correlationId`
- `authority`
- `manifestSnapshotId`
- `manifestVersion`
- `manifestSourceReference`
- `evaluator`
- `capabilitiesPresented`
- `roadmapPreview`
- `acknowledgement`
- `receiptDigest` when available
- `signature` when available

## Evaluator field

The evaluator object contains:

- `displayName` or `evaluatorReferenceId`;
- `role`;
- optional `organisation`.

The receipt must not imply that the evaluator identity has been legally verified unless a separate identity-verification process explicitly establishes that fact.

## Capability presentation entry

Each capability actually shown is recorded with:

- `capabilityId`;
- `capabilityPart` where relevant;
- `capabilityName`;
- `representationVersion`;
- `simulatorMode`;
- `fidelity`;
- `manifestDisclosureBurden`;
- `limitationsPresented`;
- `nonImplicationsPresented`.

Every entry must exactly match the governing manifest snapshot. A receipt must fail closed if a shown capability is absent from the manifest or if any representation version, mode, fidelity or disclosure-burden value differs from that snapshot.

## Roadmap Preview acknowledgement

Roadmap Preview is a higher-risk disclosure mode because it represents agreed future capability that is not implemented.

If `roadmapPreview.entered = true`, then the receipt must record:

- `previewVersion`;
- `enteredAt`;
- `capabilitiesEntered`;
- `acknowledgement.accepted = true`;
- acknowledgement wording/version;
- acknowledgement timestamp.

The required acknowledgement meaning is:

> **I understand that Roadmap Preview represents planned or future AAB capability and is not evidence that those capabilities are implemented, scientifically proven, production-ready, sovereign-commissioned or available for operational use.**

The UI may use clearer plain-English wording, but the acknowledgement version must map to this meaning.

A simple button press without a versioned acknowledgement record is insufficient.

## Manifest binding

The receipt validator must cross-check the governing manifest snapshot.

It must confirm:

1. `manifestSnapshotId` matches the supplied manifest;
2. `manifestVersion` matches;
3. every presented capability exists in that manifest;
4. each presented `representationVersion`, `simulatorMode`, `fidelity` and `manifestDisclosureBurden` exactly matches the manifest;
5. any Roadmap Preview capability recorded in `capabilitiesEntered` is actually classified `ROADMAP_PREVIEW` in the manifest;
6. the receipt does not represent a `NOT_YET_REPRESENTED` capability as having been shown;
7. the receipt does not downgrade the manifest's disclosure burden;
8. duplicate capability-part identities do not occur.

## Fail-closed outcomes

Validation failure returns:

`FAIL_CLOSED_DISCLOSURE_RECEIPT_INVALID`

Successful structural and manifest-binding validation returns:

`PASS_CAP34_DISCLOSURE_RECEIPT_VALID`

This validates only that the disclosure record faithfully matches the referenced manifest snapshot and that the required acknowledgement was recorded.

It does **not** establish scientific truth, implementation maturity, commercial entitlement, production readiness, sovereignty, certification or commissioning.

## Immutability

Once issued, a receipt is immutable.

If the manifest changes, a future session must issue a new receipt referencing the new snapshot. Historical receipts remain bound to the exact prior snapshot the evaluator saw.

## Relationship to CAP-34

CAP-34 may use the receipt to prove:

> the evaluator was shown a specific disclosed simulator state and acknowledged the Roadmap Preview distinction.

CAP-34 may not use the receipt to prove:

> the represented capability is real.

That remains the job of capability evidence and the Capability Fidelity Manifest.
