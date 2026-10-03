# AAB-PLATFORM-10 — Canonical Serialisation and Cryptographic Digests — Canonical Contract — 2026-10-02

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES HOW A GOVERNED VALUE BECOMES THE EXACT BYTES THAT ARE HASHED, AND HOW A DIGEST IS CONSTRUCTED, NAMED AND REFERENCED: THE CANONICALISATION `aab-canonical-json-1`, THE INPUT RULES FOR ANYTHING NEW THAT WILL BE SIGNED, HASHED OR ADMITTED, THE DIGEST TYPES AND WHAT EACH COVERS, THE DIGEST REFERENCE, HOW CANONICALISATION VERSIONS COEXIST, AND THE CONFORMANCE VECTORS EVERY IMPLEMENTATION MUST PASS. It covers serialisation and digest construction only: **not key management, not signature authority, and not scientific meaning.** It changes no stored record, digest or signature, and amends no domain contract. This contract is PROPOSED_NOT_ADMITTED. No implementation exists beyond the SCS pilot's existing algorithm, which this contract records and freezes.
**Written:** 2026-10-02, with the amendment of AAB-PLATFORM-05 that cites it.

## Amendment of 2026-10-03: a human decision's digest is a `recordDigest`

**Consequential to AAB-PLATFORM-07's amendment of 2026-10-03** (finding RD-01 of the retrospective decision cross-review), and approved with it by the Platform Owner in review on 2026-10-03. **Approved draft:** `governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md`, SHA-256 `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2`; its approval and review history: `governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md`.
- **Section 6, the `recordDigest` row:**
  - the semantic object **"An admitted, written-once record"** now reads ***"A written-once governed record: an admitted record, a human decision, or a status record"***;
  - the included fields are, for a human decision, every field of AAB-PLATFORM-08's `HumanDecision` except `decisionDigest` and `signature`;
  - this states what the legacy mappings for AAB-PLATFORM-04 status records and the key registry's records already do (section 5).
- **Section 5, legacy forms,** gains a row: `decisionDigest` (AAB-PLATFORM-08), `sha256:` plus hexadecimal; interpreted as `recordDigest`, `aab-canonical-json-1`, `sha-256`.
- **No new digest type.** There are still seven types. No stored value changes. Nothing is implemented.

## What a digest proves

> **A digest proves equality with the exact canonical data model hashed under the identified canonicalisation and hash algorithms. It does not prove that the record is true, authoritative or sufficient.**
>
> **No canonicalisation algorithm is represented as RFC 8785-conformant until an implementation passes the applicable RFC and AAB conformance vectors.**

## Why this contract is needed

- **AAB's contracts rely on digests whose bytes were never defined.** Records, provenance, snapshots, human decisions, links, receipts, packages, signatures and evidence retrieval all carry a digest. The platform contracts that define them say "canonical JSON" in two different wordings (AAB-PLATFORM-07, section 3; AAB-PLATFORM-04, "What is signed"), neither of which describes the code exactly, and twenty-five AGR record types carry a `recordDigest` with no serialisation named at all.
- **CAP-03 cannot verify a record digest until this is settled.** Its decisions 6 and 7 make canonicalisation the platform's, list what it must specify, and wait for it; its failure code `CANONICALISATION_UNDEFINED` exists for exactly this.
- **The pilot's algorithm is already relied on, permanently.** Every stored signature over a link, status record, ceremony, attestation, notice or assessment (AAB-PLATFORM-04, AAB-PLATFORM-09) is over its bytes. The keys are held offline by people; some are rotated or compromised. **Those signatures can never be re-made, so the algorithm that produced their bytes can never change.**
- **Canonicalisation serves the whole platform, not only provenance.** Placing it inside AAB-PLATFORM-05 would make provenance appear to own a platform-wide cryptographic foundation. It is a contract of its own.

## Sources

- `scs-pilot/packages/api/src/foundation/canonical.ts`, at `main` `de8757a`: the algorithm as implemented, read in full, and run to produce the vectors in section 8.
- `governance/AAB-PLATFORM-07-FROZEN-EVALUATION-SNAPSHOTS-CANONICAL-CONTRACT-2026-09-28.md`, section 3, and `governance/AAB-PLATFORM-04-ACTOR-SUBJECT-LINK-CANONICAL-CONTRACT-2026-09-27.md`, "What is signed": the two existing descriptions, both amended on 2026-10-02 to cite this contract.
- `governance/workstream-b/CAP-03-EVIDENCE-INTEGRITY-AND-PROVENANCE-CANONICAL-CONTRACT-2026-10-02.md`, decisions 6 and 7: the canonicalisation prerequisite.
- `governance/AAB-PLATFORM-09-GOVERNED-PUBLIC-KEY-REGISTRY-CANONICAL-CONTRACT-2026-09-28.md`, section 5: signatures over the UTF-8 bytes of canonical JSON.
- `governance/workstream-b/AAB-PLATFORM-01-EVIDENCE-OBJECT-STORE-CANONICAL-CONTRACT-2026-09-25.md`: objects stored under the SHA-256 of their raw bytes.
- RFC 8785, JSON Canonicalization Scheme, and RFC 7493, I-JSON: compared, not adopted (section 3).

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review):
1. **A separate platform contract, AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests.** Its scope is serialisation and digest construction only: not key management, signature authority or scientific meaning.
2. **No RFC 8785 equivalence claim.** `aab-canonical-json-1` is the algorithm historically implemented by the SCS pilot. It has similarities to RFC 8785 but is not represented as RFC 8785-conformant unless and until it passes the published conformance vectors and every AAB-specific input restriction is reconciled. **Evidence honesty applies to the platform itself.**
3. **A structured digest reference:** `canonicalisation`, `hashAlgorithm` and `value` as separate fields. A fully qualified string is an acceptable alternative representation. Existing bare hexadecimal values keep their legacy interpretation, explicitly mapped (section 5).
4. **Separate digest types:** `objectDigest`, `recordDigest`, `statementDigest`, `snapshotDigest`, `packageDigest`, `renditionDigest` and `receiptDigest`. Each identifies the semantic object hashed, the canonicalisation or raw-byte rule, the hash algorithm, the included fields, the excluded fields, and the schema and version governing the input (section 6).
5. **Duplicate keys are rejected before ordinary parsing.** Every new route whose payload will be signed, hashed or admitted uses a duplicate-aware mechanism at parse time, never a check on the resulting object (section 4).
6. **Unicode:** invalid Unicode, including malformed and unpaired surrogates, is rejected. **No normalisation.** Canonically equivalent strings may produce different digests, and this is disclosed and covered by tests (section 4).
7. **Large integers:** integers outside JavaScript's safe range are rejected in JSON-number fields. Where larger values are needed, the owning schema uses validated strings with a defined lexical form (section 4).
8. **Conformance vectors are mandatory.** The cases in section 8 are adopted in full. **Until they pass in an independent implementation, no cross-language canonicalisation is claimed.**
9. **The pilot algorithm is frozen.** `aab-canonical-json-1` is immutable. No code correction silently changes its output. Existing signed material is never reinterpreted under a later version. Later versions may coexist, and verification selects the version recorded with the digest or signature (section 7).
10. **SCS adoption is separate.** This contract preserves the historical algorithm so that existing SCS evidence remains verifiable. It changes no SCS code, schema or stored value.
11. **The two statements above, on what a digest proves and on RFC 8785,** are recorded verbatim.

**Nothing is implemented by this contract.**

## 1. Scope

**In scope:** how a value becomes bytes (canonicalisation), how bytes become a digest (hashing), how a digest is named and referenced, which digest types exist and what each covers, how canonicalisation versions coexist, and how conformance is shown.

**Not in scope:**
- **Key management and signature authority:** AAB-PLATFORM-09 and AAB-PLATFORM-03. This contract defines only the bytes a signature is made over.
- **What a record means, and whether it is true, sufficient or authoritative:** never a digest's to say.
- **Which fields a record has:** the record's own contract. This contract defines how its digest envelope is declared (section 6), and AAB-PLATFORM-05 defines the record digest's envelope.
- **Storage, transport and encryption.**

## 2. What a digest proves, and what it does not

**A digest proves:** that the bytes hashed now are the bytes hashed then. Under a canonicalisation, that the canonical data model hashed now equals the one hashed then, under the identified canonicalisation and hash algorithms.

**A digest does not prove:**
- that the record is true, authoritative, sufficient or lawful;
- who made it, or when: those are provenance (AAB-PLATFORM-05) and signatures (AAB-PLATFORM-09);
- that two records which differ only in form are the same: under no normalisation, two strings that look identical may hash differently (section 3).

**A digest without its canonicalisation and hash algorithm identified proves nothing,** because the same value hashed under two canonicalisations gives two digests. Every digest is therefore stored or read with both (section 5).

## 3. `aab-canonical-json-1`

**Status.** `aab-canonical-json-1` is the algorithm historically implemented by the SCS pilot (`scs-pilot/packages/api/src/foundation/canonical.ts`, function `canonicalJson`). It has similarities to RFC 8785 but is not represented as RFC 8785-conformant unless and until it passes the published conformance vectors and every AAB-specific input restriction is reconciled. **It is immutable** (section 7).

**Input.** A value of the JSON data model, already parsed: `null`, a boolean, a finite number, a string, an array, or a plain object. A value of any of these types may be the top-level value.

**Output.** A string, encoded as UTF-8 with no byte-order mark. The hashed bytes are exactly those UTF-8 bytes.

**The algorithm, as implemented:**

| Value | Serialised as |
|---|---|
| `null` | `null` |
| A boolean | `true` or `false` |
| A finite number | ECMAScript `Number.prototype.toString` form, as `JSON.stringify` writes it: the shortest form that round-trips; `-0` as `0`; exponents written `1e+21` and `1e-7`; no `+` on mantissas, no leading zeros |
| A string | As `JSON.stringify` writes it: `"` and `\` escaped as `\"` and `\\`; U+0008, U+0009, U+000A, U+000C and U+000D as `\b`, `\t`, `\n`, `\f`, `\r`; every other code unit from U+0000 to U+001F as `\u00xx`, lowercase hexadecimal; **an unpaired surrogate as `\udxxx`, lowercase;** every other character written as itself, in UTF-8, including U+007F, U+2028 and U+2029. `/` is not escaped |
| An array | `[`, its elements in their given order, serialised and separated by `,`, then `]` |
| A plain object | `{`, its members `"key":value` separated by `,`, then `}`; **keys sorted by UTF-16 code unit, in ascending order,** at every depth; each key serialised as a string |

- **No insignificant whitespace,** anywhere.
- **Key order is by UTF-16 code unit, not by Unicode code point.** The two orders differ only between a character at or above U+10000 and one from U+E000 to U+FFFF: under code units, U+1F600 (`D83D DE00`) sorts before U+E000; under code points, after (vector V03). **AAB-PLATFORM-07, section 3, and the pilot's own comment said "by code point"; both were wrong about the code, and AAB-PLATFORM-07 is corrected by amendment.**
- **No Unicode normalisation.** The exact code-unit sequence is preserved. Canonically equivalent strings, such as U+00E9 and U+0065 U+0301, produce different digests (vector V16); visually indistinguishable identifiers may differ.
- **A missing key and a key whose value is `null` are different,** and produce different digests (vector V08). The algorithm never adds or removes a key.
- **Arrays are never reordered.** The order of an array is part of its meaning; a contract that wants an order-independent digest orders its array before hashing, by a rule it states (as AAB-PLATFORM-07 does for snapshot members).

**Refused, never silently changed.** The algorithm fails, and nothing is hashed, for: a non-finite number (`NaN`, `Infinity`, `-Infinity`); `undefined`, anywhere; a function, symbol or `bigint`; an object that is not a plain object or array, such as a `Date` (vectors V11, V13, V14). Symbol-keyed properties are ignored by the implementation; a governed value never has one.

**What version 1 accepts that new input must not.** `aab-canonical-json-1` itself accepts a string containing an unpaired surrogate, and serialises it escaped (vector V12). It hashes the value it is given, so a duplicate key or an unsafe integer has already been resolved or rounded by the parser before it sees them (vectors V09, V10). **These are not changes to the algorithm:** the algorithm's output for anything it accepts is frozen. They are input rules, applied before canonicalisation to everything new (section 4). **Legacy material is verified under the algorithm exactly as implemented,** including these behaviours.

**Compared with RFC 8785, without a conformance claim:** like RFC 8785, it sorts keys by UTF-16 code unit and serialises numbers and strings as ECMAScript does. Unlike RFC 8785, it accepts input outside the I-JSON subset (unpaired surrogates) and does not itself detect duplicate keys or unsafe integers. Whether it matches every RFC 8785 test vector has not been tested.

**The hash algorithm.** SHA-256 (FIPS 180-4), over the UTF-8 bytes, written as 64 lowercase hexadecimal characters. A digest under `aab-canonical-json-1` uses `sha-256` unless a contract names another algorithm, by amendment.

## 4. Input rules for anything new that will be signed, hashed or admitted

**These rules apply to every new route, schema and record whose content will be signed, hashed or admitted,** from this contract onwards. They are checked before canonicalisation, and a value that breaks one is refused (section 10). They never apply retroactively to stored material.

1. **Duplicate keys are rejected before ordinary parsing.** Once a normal JSON parser has accepted duplicate keys and kept one value, the ambiguity is already lost. **The route parses the original request with a duplicate-aware mechanism** and refuses any object with a repeated key, at any depth. A check on the resulting object is not compliance.
2. **Invalid Unicode is rejected:** a malformed UTF-8 sequence in the request bytes, and an unpaired surrogate in any string or key, including one written as an escape (`\ud800`). Different runtimes serialise invalid Unicode differently; AAB refuses it rather than choose.
3. **No normalisation is applied.** A declared string is kept exactly as given, as AAB-PLATFORM-05 requires. A contract that needs equivalent identifiers to match must define a validated lexical form for them, such as an ASCII pattern, in its schema.
4. **JSON numbers that are integers must lie within the safe range,** −(2^53 − 1) to 2^53 − 1. A number literal whose value is an integer outside it is refused, before the parser can round it.
5. **Values that need more range or exact precision are strings,** in a lexical form the owning schema defines so that one value has one spelling. For example:

   ```json
   { "largeInteger": "9007199254740993", "decimalMeasurement": "0.000000000000000001" }
   ```

   with schema patterns that forbid leading zeros, a leading `+`, trailing fractional zeros and exponents where the schema says so.
6. **Non-finite numbers are not JSON, and cannot arrive;** a value computed by the platform that is not finite is refused (section 3).
7. **System-set times** are strings in RFC 3339 UTC form with millisecond precision and `Z`: `YYYY-MM-DDTHH:MM:SS.sssZ` (vector V15). **A time is fixed to that precision before the record is hashed,** so a database that stores more precision never changes a digest when the record is read back. **Declared times are kept exactly as given,** and a contract that needs a declared time in a fixed form validates it by pattern.
8. **No `Date` or other non-plain object reaches the canonicaliser;** a time is always a string by then.

## 5. Digest references

**The structured form, preferred:**

```typescript
interface DigestReference {
  digestType:                        // section 6
    | "objectDigest" | "recordDigest" | "statementDigest" | "snapshotDigest"
    | "packageDigest" | "renditionDigest" | "receiptDigest";
  canonicalisation: "aab-canonical-json-1" | "raw-bytes";  // a later version is added by amendment
  hashAlgorithm: "sha-256";
  value: string;                     // 64 lowercase hexadecimal characters
}
```

**The qualified string form, an acceptable alternative:** `<canonicalisation>:<hashAlgorithm>:<value>`, for example `aab-canonical-json-1:sha-256:cee714ce…` or `raw-bytes:sha-256:2d652c99…`. A field holding the string form is declared, by its contract, as holding exactly one digest type, so the type is known from the field.

- **`canonicalisation` and `hashAlgorithm` are independent choices,** and both are always identified. `sha256:<hex>` identifies only the hash algorithm, and is therefore not a complete reference on its own.
- **`raw-bytes`** means the bytes were hashed as they are, with no canonicalisation: a stored object (AAB-PLATFORM-01) or a produced rendition (AAB-PLATFORM-02).

**Legacy forms, kept, with their interpretation mapped.** Existing stored and externally visible values keep their form (the naming rule). Each is interpreted by the field that holds it, never by guessing from its shape:

| Legacy field (SCS pilot and platform) | Form | Interpreted as |
|---|---|---|
| `receiptDigest`, `requestDigest` (receipts and idempotency) | bare hexadecimal | `receiptDigest` / request fingerprint; `aab-canonical-json-1`; `sha-256` |
| `evaluationSnapshotDigest` (SCS-CAP-06, SCS-CAP-09), `subjectKey` (SCS-CAP-06) | bare hexadecimal | `snapshotDigest` / subject key; `aab-canonical-json-1`; `sha-256` |
| `packageDigest` (SCS-CAP-08) | `sha256:` + hexadecimal | `packageDigest`; `aab-canonical-json-1`; `sha-256` |
| `linkDigest`, status `recordDigest` (AAB-PLATFORM-04) | `sha256:` + hexadecimal | `recordDigest`; `aab-canonical-json-1`; `sha-256` |
| Key registry digests (AAB-PLATFORM-09) | as stored | `recordDigest`; `aab-canonical-json-1`; `sha-256` |
| Evidence object identifiers and `contentDigest` (AAB-PLATFORM-01; SCS-CAP-04, SCS-CAP-05) | bare hexadecimal, or `scs-object:sha256:` | `objectDigest`; `raw-bytes`; `sha-256` |
| Rendition digests (AAB-PLATFORM-02) | bare hexadecimal, with `sourceDigestAlgorithm` | `renditionDigest`; `raw-bytes`; `sha-256` |
| `publicKeyDigest` (AAB-PLATFORM-09) | as stored | SHA-256 of the raw SPKI bytes: `raw-bytes`; `sha-256` |
| AGR contracts' `recordDigest`, written `"sha256:"` (CAP-04 and others) | designed, not stored | **To be declared** by the AGR conformance change: `recordDigest`, `aab-canonical-json-1`, `sha-256` |

**The SCS pilot stores nothing differently because of this contract.** The mapping is how a verifier reads what is stored.

## 6. Digest types

**Every digest is one of seven types.** A digest of one type is never accepted where another is expected, even when the value happens to match, because each hashes a different thing.

| Type | The semantic object hashed | Rule | Included | Excluded | Input governed by |
|---|---|---|---|---|---|
| `objectDigest` | A stored file's exact bytes | `raw-bytes` | Every byte | Nothing; metadata such as the media type is not part of the bytes | AAB-PLATFORM-01 |
| `recordDigest` | An admitted, written-once record | `aab-canonical-json-1` | The record's digest envelope (AAB-PLATFORM-05, amendment of 2026-10-02) | Its own `recordDigest`, and everything outside the envelope | The record's schema and version |
| `statementDigest` | The exact statement a person signs | `aab-canonical-json-1` | Every field of the statement, as the signer submitted it | Server-set fields the signer cannot know | The statement's schema (AAB-PLATFORM-04, AAB-PLATFORM-09) |
| `snapshotDigest` | A frozen evaluation snapshot, or its manifest | `aab-canonical-json-1` | As AAB-PLATFORM-07, section 3, defines `snapshotDigest` and `manifestDigest` | As AAB-PLATFORM-07 defines | AAB-PLATFORM-07 |
| `packageDigest` | A compiled package's content | `aab-canonical-json-1` | The package content | Compilation metadata, as the package contract defines | The package contract (SCS-CAP-08; CAP-11 and CAP-12 when built) |
| `renditionDigest` | A produced document's bytes | `raw-bytes` | Every byte of the rendition | Nothing | AAB-PLATFORM-02 |
| `receiptDigest` | A receipt | `aab-canonical-json-1` | The whole receipt document | Nothing else; the receipt names its own decision | The receipt schema (primitive 9) |

**Every digest field is declared by its owning contract,** with: its digest type; the semantic object; the canonicalisation or raw-byte rule; the hash algorithm; the included fields; the excluded fields; and the schema and version governing the input. **For `recordDigest`, `statementDigest` and `packageDigest`, the included and excluded fields are machine-readable,** as part of the record's or statement's schema, so that any verifier can rebuild the exact hashed value from the stored record.

**A signature is over a statement's canonical bytes, not its digest.** AAB-PLATFORM-09 signs the UTF-8 bytes of the statement's canonicalisation; its `statementDigest` identifies the statement, and the signature records the canonicalisation it was made over (section 7).

## 7. Versions

- **`aab-canonical-json-1` is immutable.** No code correction, refactoring, dependency upgrade or runtime upgrade may change its output for any input it accepts. A change that would is a new version.
- **Later versions may coexist with it,** each with its own identifier, defined by amendment to this contract, with its own conformance vectors.
- **Verification selects the version recorded with the digest or signature.** A verifier never tries versions in turn until one matches.
- **Existing signed material is never reinterpreted under a later version,** and no stored digest is recomputed under a different version and replaced.
- **New records may use a later version** when it exists. Moving any kind of record to a new version is a migration and compatibility decision of its own, never a replacement.
- **This does not require AAB to use version 1 for ever.** It requires that version 1 stays verifiable for ever.

## 8. Conformance vectors

**Every implementation of `aab-canonical-json-1` must reproduce these exactly.** They were produced by running the SCS pilot's `canonicalJson` (`main` `de8757a`, Node.js 24.19.0) on the inputs shown, and are the reference for the frozen algorithm. Strings in the "Input" column are written with JavaScript escapes.

| # | Case | Input | Canonical bytes (UTF-8, hexadecimal) | SHA-256 |
|---|---|---|---|---|
| V01 | Nested key ordering | `{"b":1,"a":{"d":[3,1,2],"c":true}}` | `7b2261223a7b2263223a747275652c2264223a5b332c312c325d7d2c2262223a317d` | `dc4ed0113e4ceb986bc90fd2919f1544dfca831c335f6f8c8b2dea9298ea203d` |
| V02 | Non-ASCII keys | `{"é":1,"z":2,"a":3,"Ω":4}` | `7b2261223a332c227a223a322c22c3a9223a312c22cea9223a347d` | `9473c2fdf1490c282af1cd32b5c6e4f4d5e97361378226bcaeb2628af80f9600` |
| V03 | Supplementary against private-use key (UTF-16 order) | `{"":"bmp-private-use","\u{1F600}":"astral"}` | `7b22f09f9880223a2261737472616c222c22ee8080223a22626d702d707269766174652d757365227d` | `f51875ba51d941f6d3863cb9f271f68d1490200af0f75a0ac8eea3fffa92c970` |
| V04 | Escaped characters | `{"s":"q\" b\\ s/ t\t n\n r\r b\b f\f z\u0000 u\u001f d\u007f l  p "}` | `7b2273223a22715c2220625c5c20732f20745c74206e5c6e20725c7220625c6220665c66207a5c753030303020755c753030316620647f206ce280a82070e280a9227d` | `0cd1e8b2eba43c6a02f09d89722d6453a96cb5b5d63800029c961b50241c6241` |
| V05 | Negative zero | `{"n":-0}` | `7b226e223a307d` | `f3013f933b9fb80ab6d995e7ad9da36f683837ba1d81e950c943d40111eac2f0` |
| V06 | Very large, very small and exponent forms | `{"a":1e21,"b":1e-7,"c":5e-324,"d":1.7976931348623157e308,"e":0.1,"f":100}` | `7b2261223a31652b32312c2262223a31652d372c2263223a35652d3332342c2264223a312e37393736393331333438363233313537652b3330382c2265223a302e312c2266223a3130307d` | `88677edcc69c1023dc16ca9b6d349af4b0acb5ebada5a31bc0b367a6b909e343` |
| V07 | Array order kept | `{"x":[2,1],"y":[1,2]}` | `7b2278223a5b322c315d2c2279223a5b312c325d7d` | `0c844d053791282ae95469478652cfed81a0357cca908459cb3d1baeea752e95` |
| V08a | Missing | `{"a":1}` | `7b2261223a317d` | `015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862` |
| V08b | Null | `{"a":1,"b":null}` | `7b2261223a312c2262223a6e756c6c7d` | `46e0ff59f6164548317489fbea1133a48f7a83c325c3535e44559c9619afb76b` |
| V09 | Duplicate keys | Request bytes `{"a":1,"a":2}` | **New input: refused** (`DUPLICATE_KEY`, section 4). Legacy behaviour: the parser kept `{"a":2}`, canonical `7b2261223a327d` | Legacy: `7e8059f495589fcd981232cc11d00b00da3802c01d688fa1cf1f6bed6e5bb33c` |
| V10 | Unsafe integer | Request bytes `{"n":9007199254740993}` | **New input: refused** (`UNSAFE_INTEGER`). Legacy behaviour: rounded at parse to `9007199254740992`, canonical `7b226e223a393030373139393235343734303939327d` | Legacy: `66c87d9cb3014e05a11baa97df62282d89d425f22ee15816577c84534e2ef1bb` |
| V11 | Non-finite values | `{"n":NaN}`, `{"n":Infinity}` | **Refused** by the algorithm | — |
| V12 | Invalid Unicode (unpaired surrogate) | `{"s":"a\uD800b"}` | **New input: refused** (`INVALID_UNICODE`). Legacy verification: `7b2273223a22615c756438303062227d` | Legacy: `8d0d9d697f7489a2f94b4ca2f8ab9036bc9609c12345f0060d60a97864157929` |
| V13 | `undefined` | `{"a":undefined}` | **Refused** by the algorithm | — |
| V14 | Non-plain object | `{"t":new Date(0)}` | **Refused** by the algorithm | — |
| V15 | System timestamp | `{"submittedAt":"2026-10-02T03:04:05.678Z"}` | `7b227375626d69747465644174223a22323032362d31302d30325430333a30343a30352e3637385a227d` | `5c9f33360cb1ed7489d69b1ba3a216818b24088e8f893b367c8813f7d7e8ea76` |
| V16a | No normalisation: NFC | `{"s":"é"}` | `7b2273223a22c3a9227d` | `86028b41ba792eaf82aa26a45b218f6734f7f1096a86f1746c8296e088a0ccb4` |
| V16b | No normalisation: NFD | `{"s":"é"}` | `7b2273223a2265cc81227d` | `1fc0bd7cc93fca8092a2041d7d01842876422aa7e2838acf42c14578e9f2be05` |
| V17 | Top-level scalar | `"text"` | `227465787422` | `1e1d0f251d3a76fa2b1bfc81164078572623403887db02988b504b0492e9f076` |
| V18a | One-field mutation: base | `{"record":{"id":"r1","value":10}}` | `7b227265636f7264223a7b226964223a227231222c2276616c7565223a31307d7d` | `cee714ce2f009a5b759fb1fc9488080d1ac74a745e7b015e6fe0bdf36ce87d80` |
| V18b | One-field mutation: changed | `{"record":{"id":"r1","value":11}}` | `7b227265636f7264223a7b226964223a227231222c2276616c7565223a31317d7d` | `14cf62966d77876c4b4d5cc439e807ee30eb3592e85f68c7c131fc1c38c14ca6` |
| V19 | Raw file bytes (`raw-bytes`) | The 14 bytes `414142207261772062797465730a` ("AAB raw bytes" and a newline) | Hashed as they are | `2d652c991e2433065bbe26b753ad7a5fef44b350b55f336cc1b7dbf2d0c409bf` |
| V20 | Digest reference forms | The V18a digest | Structured: `{"canonicalisation":"aab-canonical-json-1","digestType":"recordDigest","hashAlgorithm":"sha-256","value":"cee714ce2f009a5b759fb1fc9488080d1ac74a745e7b015e6fe0bdf36ce87d80"}`; qualified: `aab-canonical-json-1:sha-256:cee714ce2f009a5b759fb1fc9488080d1ac74a745e7b015e6fe0bdf36ce87d80`; legacy: `sha256:cee714ce…`, accepted only in a field mapped in section 5 | — |

**Legacy example, recomputed:**

| # | What | Stored | Recomputed under `aab-canonical-json-1`, `sha-256` |
|---|---|---|---|
| L01 | The SCS-CAP-08 rendition test's package fixture (`scs-pilot/packages/api/src/capabilities/cap-08/fixtures/package-envelope.fixture.json`), `packageDigest` over its `package` | `sha256:cbd20b37bfab1747f6da03ff048e3ea24653cebb3417cf7da23e12461c55d374` | `sha256:cbd20b37bfab1747f6da03ff048e3ea24653cebb3417cf7da23e12461c55d374`: **equal** |

**Required properties,** each shown by test before any implementation relies on this contract:
- **Repeatable:** the same input produces identical bytes across repeated runs.
- **Independent:** an implementation written separately from the pilot's produces identical bytes for every vector.
- **Sensitive:** every one-byte or one-field mutation changes the digest (V18).
- **Fail closed:** every unsupported or invalid input is refused, and nothing is hashed (V09 to V14 for new input).
- **Legacy-exact:** legacy pilot fixtures reproduce their existing digests and signatures exactly (L01; and the signature fixtures, an open item).

**Until these vectors pass in an independent implementation, the platform claims no cross-language canonicalisation.** The vectors above prove only that the pilot's implementation produces them.

## 9. Known copies of the algorithm

The pilot's algorithm exists in four places. **Only `canonical.ts` is the reference;** the others must match it for every input `aab-canonical-json-1` accepts:
- `scs-pilot/packages/api/src/foundation/canonical.ts`: the reference;
- `scs-pilot/backup/prove-backup-restore.mjs` (lines 56 to 61): matches for valid input, but does not refuse invalid input (it writes `undefined`, turns `NaN` into `null`, and a `Date` into `{}`);
- the operator signing command in `scs-pilot/README.md` (line 90): no refusals;
- `simulation/cap34/capability-fidelity-manifest.js` (lines 8 to 12): a separate canonicaliser outside the pilot, not governed by this contract until the simulation adopts it.

**Aligning them is implementation work,** for the extraction, each copy tested against section 8. Nothing is changed by this contract.

## 10. Failure rules

| Code | HTTP | Meaning |
|---|---:|---|
| `DUPLICATE_KEY` | 400 | An object in the request has a repeated key, found by duplicate-aware parsing |
| `INVALID_UNICODE` | 400 | Malformed UTF-8, or an unpaired surrogate in a string or key |
| `UNSAFE_INTEGER` | 400 | A JSON-number integer outside the safe range |
| `CANONICALISATION_INPUT_INVALID` | 400 | A value the canonicalisation refuses: non-finite, undefined, unsupported type, or a non-plain object |
| `CANONICALISATION_VERSION_UNKNOWN` | 422 | A digest or signature names a canonicalisation this platform does not define |
| `DIGEST_REFERENCE_INVALID` | 422 | A digest reference without its canonicalisation or algorithm, of the wrong type for its field, or not 64 lowercase hexadecimal characters |
| `DIGEST_MISMATCH` | 422 | A recomputed digest differs from the one recorded |

- **A refused value is never hashed, stored or signed.** Every refusal is fail closed, with nothing written.
- **A digest that cannot be recomputed is never reported as verified.** CAP-03's `CANONICALISATION_UNDEFINED` remains its own code for a record whose canonicalisation is not yet declared.

## 11. Adopting this contract

A contract adopts this one by amendment, documenting for each digest field it defines: the digest type; the canonicalisation or raw-byte rule; the hash algorithm; the included and excluded fields, machine-readable for records, statements and packages; and the governing schema and version. **For stored and externally visible fields, the legacy mapping in section 5 is the adoption;** nothing stored is rewritten.

- **AAB-PLATFORM-05** adopts it by its amendment of 2026-10-02, which defines the record digest's envelope and calculation.
- **AAB-PLATFORM-04 and AAB-PLATFORM-07** cite it by clerical amendments of 2026-10-02.
- **The AGR contracts** adopt it in the AGR conformance change that follows.
- **SCS** adopts it when its own adoption is decided, after the extraction.

## What this contract does not establish

- It does not prove that any record is true, authoritative or sufficient.
- It does not define keys, signatures' authority, or who may sign anything.
- It does not claim conformance with RFC 8785 or any other standard.
- It does not change any stored record, digest or signature, or any code.
- It does not define any record's fields or meaning.
- It implements nothing.

## Open items

- **Independent implementation:** a second implementation, written apart from the pilot's, passing section 8. Until then, no cross-language claim.
- **RFC 8785 reconciliation:** running the published RFC 8785 vectors against `aab-canonical-json-1`, and recording each difference, before any conformance is stated.
- **Signature fixtures:** legacy signatures over canonical bytes, such as those created by the backup-restore proof and the key-registry tests, added to section 8 as legacy examples, with their public keys.
- **Aligning the copies of the algorithm** (section 9), and correcting the reference implementation's comment, which says "by code point".
- **Duplicate-aware parsing in the pilot:** the pilot's routes parse with an ordinary parser today. New routes must not (section 4); whether and when the pilot's existing routes change is part of SCS's adoption.
- **A later canonicalisation version,** if one is ever needed: its identifier, vectors and migration rules, by amendment.
