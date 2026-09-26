# AAB-PLATFORM-02 — Governed Document Rendition — Canonical Contract — 2026-09-26

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Supply Chain Sovereignty (SCS)
**Renamed:** from SCS-PLATFORM-02 on 2026-09-27. Platform contracts are numbered AAB-PLATFORM-NN (AAB-PLATFORM-03, decision 1).
**Authority:** DEFINES THE CONTRACT FOR GOVERNED DOCUMENT RENDITION, A PLATFORM SERVICE SHARED BY ALL SCS CAPABILITIES. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority. PROPOSED_NOT_ADMITTED. A pilot implementation exists in `scs-pilot/packages/api/src/platform/renditions/`.

## Plain-English boundary statement

A rendition is a human-readable document, a PDF, made from one governed record so that a
person can read it, print it or hand it to someone else. SCS-CAP-08's due diligence package is
its first source. A rendition presents the record. It is never the record: it adds nothing,
removes nothing required, and decides nothing. Anyone holding a rendition can check it against
the record it presents, because every page names that record's digest.

## The governing rule

> The record is the authority; the rendition only presents it. A rendition is made from the
> stored record alone, shows every part the record's owner requires, and names the record's
> digest on every page, so no one can mistake the rendition for the record or present less
> than the record says.

## Why it is a platform service

Any capability that hands a governed record to a person needs the same guarantees: the
document shows exactly what the record says, it can be reproduced, and it can be checked.
SCS-CAP-08 is the first user; SCS-CAP-10's challenge responses are likely to be the next. The
rules are therefore stated once, here. Each capability supplies only its template and says
which of its sections must always appear.

## What a rendition is — and is not

**A rendition is:**
- A PDF made from one stored governed record, by a pinned renderer and a versioned template
- Reproducible: the same record, renderer version and template version give the same bytes
- Checkable: every page shows the record's identity and digest

**A rendition is not:**
- The record, or a substitute for it
- A signature, a seal, a certification or an attestation by anyone
- Evidence: it is never admitted by any capability
- A place for any text, summary or interpretation the record does not contain

## Rendering rules

- **Source only.** A rendition is made from the record exactly as it is stored, read once. The
  renderer reads nothing else: no other records, no current time, no network, no random
  values.
- **Completeness.** Every section the owning capability's template declares is rendered. A
  section the owning capability marks as mandatory is never omitted, summarised, truncated or
  collapsed. Lists are rendered item by item, never aggregated into a count or summary alone.
- **No added content.** Beyond the record, a rendition contains only the fixed text of its
  template: headings, labels and the notices below.
- **Every page** carries, in its footer:
  - the owning capability and the record's identifier;
  - the record's digest and its algorithm;
  - "Presentation of a governed record. Not the record. Verify against the digest.";
  - the page number and page count.
- **The first page** states what the record is and is not, in the owning capability's words
  (for SCS-CAP-08: compiled, not submitted; not a compliance certificate).
- **A completeness test** is part of every template: rendering a record and extracting the
  text must yield every value in the record's mandatory sections.

## Determinism

The same record, renderer version and template version produce byte-identical output. That
requires:
- **Fixed metadata.** The PDF's creation and modification dates are the record's own timestamp
  (for SCS-CAP-08, `compiledAt`), never the time of rendering. The document identifier is
  derived from the record's digest.
- **Embedded, pinned fonts.** Every font is embedded, and its file is pinned by version and
  SHA-256 in the renderer. Nothing is fetched at render time.
- **A pinned renderer.** The renderer's library, its version and the template's version are
  recorded with each rendition as `rendererVersion`.
- **No compression variance.** Compression settings are fixed by the renderer version.

## The rendition record

```typescript
interface ScsRendition {
  renditionId: string;
  // The capability whose record is rendered, e.g. "SCS-CAP-08"
  sourceCapabilityId: string;
  // The record rendered, e.g. a packageId
  sourceRecordId: string;
  // The record's own digest, as shown on every page
  sourceDigest: string;
  sourceDigestAlgorithm: string;
  // Renderer library and version, and template id and version
  rendererVersion: string;
  mediaType: "application/pdf";
  byteLength: number;
  // SHA-256 of the rendered bytes, computed by SCS
  sha256: string;
  renderedAt: string;
  renderedFor: ActorReference;
}
```

- **Storage.** The bytes are stored in the object store (AAB-PLATFORM-01) under their SHA-256,
  as a system write, not through the upload endpoint. A stored rendition is never evidence.
- **Append-only.** A rendition record is never changed or deleted. Rendering a record again,
  for example with a new renderer version, adds a new rendition record and never replaces one.
- **One-way binding.** The rendition names its record and the record's digest; the record never
  names its renditions. The owning capability may record which rendition it made (SCS-CAP-08
  does, in its compilation record).
- **When.** The owning capability decides when a rendition is made. SCS-CAP-08 renders at
  compilation, so the file an operator presents is the one whose digest was receipted.
- **Order of writes.** The object store is not transactional. The bytes are written first; the
  rendition record is then written in the owning capability's transaction. Bytes whose
  transaction fails are an unreferenced object and are harmless.

## Retrieval

`GET /scs/v1/renditions/:renditionId` returns the rendition's bytes, with
`Content-Type: application/pdf` and the SHA-256 in a response header.

- **Access.** The owning capability's readers only (for SCS-CAP-08: `COMPLIANCE_OFFICER` or
  `REGULATORY_REVIEWER`). Any other actor is `READER_NOT_AUTHORISED`.
- **Integrity on read.** The bytes are re-hashed before they are returned. If they do not match
  the recorded SHA-256, nothing is returned (`RENDITION_INTEGRITY_FAILED`).
- An unknown rendition is `RENDITION_NOT_FOUND`.

## Tooling

- **A PDF library, not a browser.** Renditions are built with a pinned PDF library, not a
  headless browser: a library is small, runs without a network, and can be made
  deterministic. A browser is a large, frequently changing dependency whose output varies by
  version.
- **Dependency audit first.** The library is chosen only after a dependency audit (licence,
  maintenance, transitive dependencies, known vulnerabilities, determinism). The chosen
  library and version are recorded in this contract's implementation notes when adopted.

## The pilot renderer

The dependency audit compared pdf-lib 1.17.1 and pdfkit 0.20.2. pdf-lib, and the font package
it needs, have not been maintained since 2022, which disqualifies them for governed document
production. pdfkit is adopted.

- **Library.** pdfkit **0.20.2**, pinned exactly (no range). A new pdfkit version is a new
  renderer version: it produces new renditions and never replaces existing ones.
- **No stream compression.** pdfkit compresses with the runtime's zlib, whose output is not
  guaranteed to be the same across runtime versions and platforms. The pilot renderer turns
  compression off, so the bytes depend only on the renderer, its fonts and the record. Files are
  larger as a result.
- **Fonts.** Two families, stored in the repository at `packages/api/assets/fonts/` with their
  SIL Open Font License 1.1 texts. The renderer refuses to render if a font's SHA-256 differs
  from the one recorded here. All are the static, unhinted TrueType files of the official
  releases (hinting only affects screen rasterisation):

| File | Family and release | Source | Bytes | SHA-256 |
|---|---|---|---|---|
| `NotoSans-Regular.ttf` | Noto Sans v2.015 | github.com/notofonts/latin-greek-cyrillic, release `NotoSans-v2.015` | 431364 | `f3961a9cde016d41a4879aecda1474d3a36d6bf54fa0e4643de029cc2248b0e8` |
| `NotoSans-Bold.ttf` | Noto Sans v2.015 | as above | 432376 | `87cb2d84472a7d66da659ee47b6cdb9552326e8c128245231f191b6ac72529d9` |
| `NotoSansThai-Regular.ttf` | Noto Sans Thai v2.002 | github.com/notofonts/thai, release `NotoSansThai-v2.002` | 20960 | `d4303fe9c63ebb72759ca8b6d2040c8ae81689f7d08d7b91c656154382b49313` |
| `NotoSansThai-Bold.ttf` | Noto Sans Thai v2.002 | as above | 20600 | `5227602d7f9108252cfb7d75d6f7b2a26bdb2fc2fa89a702f9063758fb2f86c7` |

- **Scripts.** Noto Sans covers Latin, Latin Extended (including Vietnamese), Greek and
  Cyrillic. Thai is not in Noto Sans; it is published as Noto Sans Thai. The renderer splits
  text into runs by script and sets each Thai run (U+0E00–U+0E7F) in Noto Sans Thai. Text in
  any other script not covered is refused rather than rendered as missing glyphs.
- **Thai SARA AM.** The font draws SARA AM (U+0E33) as two glyphs, and a PDF reader then
  extracts it as SARA AM followed by an extra SARA AA. The renderer therefore writes SARA AM
  as its compatibility decomposition (U+0E4D U+0E32), which looks the same and extracts
  correctly: extracted text equals the record's text under NFKC normalisation.
- **Text extraction for tests.** pdfjs-dist **6.3.289** (Apache-2.0), a development
  dependency only, without its optional native canvas package. Completeness tests compare
  under NFKC, and leave out the page footers, which a reader can place between the two halves
  of an entry that breaks across a page.
- **Cross-platform stability.** A test renders a fixed record and compares the SHA-256 of the
  output with a stored expected value, on every platform that runs the tests, CI (Linux)
  included. A different digest on any platform is a critical failure: a rendition's recorded
  digest must not depend on where it was rendered.
- **`rendererVersion`** records the library and version, the font releases and the template
  and its version, for example
  `pdfkit@0.20.2;noto-sans@2.015;noto-sans-thai@2.002;scs-cap08-package@1`.

## Failure contract

Errors from this service are still attributed `capabilityId: "SCS-PLATFORM"`. That value is part of the SCS naming the platform code carries, which the platform–domain separation decision leaves to extraction, after the independent dependency audit. It changes then, not with this contract's identifier.

```typescript
interface ScsRenditionFailure {
  ok: false;
  capabilityId: "SCS-PLATFORM";
  result: "FAIL_CLOSED";

  error:
    | "UNAUTHENTICATED"
    | "READER_NOT_AUTHORISED"
    | "RENDITION_NOT_FOUND"
    // The stored bytes no longer match the recorded SHA-256
    | "RENDITION_INTEGRITY_FAILED"
    | "REQUEST_VALIDATION_FAILED"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  noWrites: true;
}
```

A rendering failure during a capability's operation is reported by that capability (for
SCS-CAP-08: `RENDITION_FAILED`), and that operation records nothing.

## Open gaps

**Contract gap: Thai line breaking.** Thai is written without spaces between words. The pilot
renderer has no dictionary-based word breaking, so a Thai run longer than a line is broken at
the line's edge, which may fall inside a word. The text is complete and extracts correctly;
only the break position may be wrong.

**Contract gap: other scripts.** Only the scripts listed under "The pilot renderer" can be
rendered. Records containing other scripts cannot be rendered until a font covering them is
added and recorded here.

**Contract gap: archival and accessibility standards.** Conformance to PDF/A (archival) or
PDF/UA (accessibility) is not claimed, and no rendition is presented as conforming. pdfkit has
options for both, but their output has not been checked with a validator. If a regulatory
authority or auditor requires either, it becomes a formal requirement with a tested
implementation.

**Contract gap: languages.** Renditions are in English only.

**Contract gap: signatures.** A rendition is not signed. Whether an operator may apply their
own signature to a rendition, and how that relates to the record, is not defined.

**Contract gap: retention.** How long renditions are kept is not defined; they are not deleted
by any operation in this contract.

## What this document does not establish

- It does not make any rendition a record, a declaration or a certification
- It does not admit any evidence
- It does not implement, deploy or migrate anything
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production
  or commissioning authority
