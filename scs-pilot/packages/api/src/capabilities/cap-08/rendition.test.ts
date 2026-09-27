// The SCS-CAP-08 package rendition (AAB-PLATFORM-02, contract a0f8c46), with
// no database or object store: a fixed package envelope — a real one, compiled
// by the full-chain integration test, with Thai and Vietnamese text — rendered
// by the pinned renderer.
//
// The cross-platform test is the critical one: the rendition's SHA-256 must be
// the stored expected value on every platform that runs the tests, CI (Linux)
// included. A different digest means a rendition's recorded digest depends on
// where it was rendered, which breaks the governed rendition model. Update the
// expected value only for a deliberate change to the renderer, its fonts, the
// template or the fixture — each of which is a new renderer version.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalJson, sha256Hex } from "../../foundation/canonical.js";
import { runWithCorrelation } from "../../foundation/correlation.js";
import { validate } from "../../foundation/validation.js";
import { contains, pdfBodyText, pdfPages } from "../../integration/pdf-text.js";
import { PINNED_FONTS, renderPdf, RenditionError, verifyFont } from "../../platform/renditions/renderer.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsDueDiligencePackageEnvelope } from "../../types/cap-08.js";
import { FIRST_PAGE_NOTICE, FOOTER_NOTICE, packageDocument, RENDERER_VERSION } from "./template.js";

/** SHA-256 of the fixture's rendition. Must be the same on every platform. */
const EXPECTED_SHA256 = "a29b8e3775c2259aadb56b36addfb2269a0113a1f061a5402c761b9f6a5b8073";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/package-envelope.fixture.json", import.meta.url), "utf-8")) as ScsDueDiligencePackageEnvelope;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

test("the fixture is a valid package envelope, and its digest recomputes", () => {
  const checked = runWithCorrelation("rendition-test", () => validate("SCS-CAP-08", SCHEMAS.cap08PackageEnvelope, fixture));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
  assert.equal(fixture.packageDigest, `sha256:${sha256Hex(canonicalJson(fixture.package))}`);
});

test("CROSS-PLATFORM: the rendition's SHA-256 is the stored expected value on this platform", async () => {
  const bytes = await renderPdf(packageDocument(fixture));
  assert.equal(
    sha(bytes),
    EXPECTED_SHA256,
    `CRITICAL: the rendition differs on ${process.platform} (Node ${process.version}). A rendition's recorded digest must not depend on where it was rendered.`,
  );
});

test("the same package renders to the same bytes every time", async () => {
  const a = await renderPdf(packageDocument(fixture));
  const b = await renderPdf(packageDocument(fixture));
  assert.ok(a.equals(b));
  assert.match(a.subarray(0, 8).toString("latin1"), /^%PDF-1\.\d/);
});

test("completeness: every mandatory entry, Thai and Vietnamese text, and the digest on every page", async () => {
  const bytes = await renderPdf(packageDocument(fixture));
  const p = fixture.package;
  const pages = await pdfPages(bytes);
  assert.ok(pages.length > 1);
  for (const [i, pg] of pages.entries()) {
    assert.deepEqual(pg.footer, [
      `SCS-CAP-08 due diligence package ${fixture.compilationMetadata.packageId} · Page ${i + 1} of ${pages.length}`,
      `Package digest: ${fixture.packageDigest}`,
      FOOTER_NOTICE,
    ]);
  }
  assert.ok(contains(pages[0]!.body, FIRST_PAGE_NOTICE));
  const text = await pdfBodyText(bytes);
  for (const t of [p.packageTitle!, p.operator.operatorName, ...p.plots.map((x) => x.plotName!)]) assert.ok(contains(text, t), t);
  for (const g of [...p.gapDisclosure.blockingGaps, ...p.gapDisclosure.nonBlockingGaps]) {
    assert.ok(contains(text, `${g.gapId}, ${g.requirementCode} ${g.gapType}: ${g.explanation}`), `gap ${g.gapId}`);
    assert.ok(contains(text, g.reviewerAssessment), `assessment of ${g.gapId}`);
  }
  assert.ok(contains(text, p.gapDisclosure.gapDisclosureStatement));
  for (const l of p.packageLimitations) assert.ok(contains(text, l), l);
  for (const k of Object.keys(p.authorityBoundary)) assert.ok(contains(text, `${k}: true`), k);
  for (const r of p.reviewDecision.decision.decisionReasons) assert.ok(contains(text, r), r);
  for (const x of p.sufficiencyEvaluation.result.evaluationExplanation) assert.ok(contains(text, x), x);
});

test("refused: a script no recorded font covers, a control character, a font that fails its digest", async () => {
  const titled = (packageTitle: string) => packageDocument({ ...fixture, package: { ...fixture.package, packageTitle } });
  await assert.rejects(renderPdf(titled("橡胶")), (e: unknown) => e instanceof RenditionError && /U\+6A61 .* no recorded font covers/.test(e.message));
  await assert.rejects(renderPdf(titled("tab\there")), (e: unknown) => e instanceof RenditionError && /control character U\+0009/.test(e.message));
  const font = readFileSync(new URL("../../../assets/fonts/NotoSans-Regular.ttf", import.meta.url));
  assert.doesNotThrow(() => verifyFont("NotoSans-Regular.ttf", font));
  const altered = Buffer.from(font);
  altered.writeUInt8(altered.readUInt8(altered.length - 1) ^ 0xff, altered.length - 1);
  assert.throws(() => verifyFont("NotoSans-Regular.ttf", altered), /SHA-256 [0-9a-f]{64}, not the f3961a9c.* recorded in SCS-PLATFORM-02/);
  assert.throws(() => verifyFont("SomethingElse.ttf", font), /unrecorded/);
});

test("the renderer version names the library, both font releases and the template", () => {
  assert.equal(RENDERER_VERSION, "pdfkit@0.20.2;noto-sans@2.015;noto-sans-thai@2.002;scs-cap08-package@1");
  assert.deepEqual(Object.keys(PINNED_FONTS).sort(), ["NotoSans-Bold.ttf", "NotoSans-Regular.ttf", "NotoSansThai-Bold.ttf", "NotoSansThai-Regular.ttf"]);
});
