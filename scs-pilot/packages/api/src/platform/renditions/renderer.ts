// SCS-PLATFORM-02 renderer: a governed record, laid out by a capability's
// template as a list of blocks, rendered to PDF bytes (contract a0f8c46, "The
// pilot renderer").
//
// The same document always gives the same bytes, on every platform:
//   - pdfkit 0.20.2, pinned exactly; stream compression is off, because pdfkit
//     compresses with the runtime's zlib, whose output is not guaranteed
//     across runtimes and platforms;
//   - the fonts are the files recorded in the contract, checked against their
//     SHA-256 before use; nothing is fetched;
//   - the PDF's dates are the record's own timestamp, never the clock;
//   - the renderer reads nothing but the document it is given.
//
// Scripts: Thai runs (U+0E00–U+0E7F) are set in Noto Sans Thai, everything
// else in Noto Sans. A character neither font covers is refused
// (RenditionError), never drawn as a missing glyph. SARA AM (U+0E33) is written
// as its compatibility decomposition (U+0E4D U+0E32), which the font draws
// the same way and a reader extracts correctly.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { create as createFont, type Font } from "fontkit";
import PDFDocument from "pdfkit";

/** The fonts recorded in SCS-PLATFORM-02, by file, with their SHA-256. */
export const PINNED_FONTS = {
  "NotoSans-Regular.ttf": "f3961a9cde016d41a4879aecda1474d3a36d6bf54fa0e4643de029cc2248b0e8",
  "NotoSans-Bold.ttf": "87cb2d84472a7d66da659ee47b6cdb9552326e8c128245231f191b6ac72529d9",
  "NotoSansThai-Regular.ttf": "d4303fe9c63ebb72759ca8b6d2040c8ae81689f7d08d7b91c656154382b49313",
  "NotoSansThai-Bold.ttf": "5227602d7f9108252cfb7d75d6f7b2a26bdb2fc2fa89a702f9063758fb2f86c7",
} as const;

/** Library and font releases; a template adds its own id and version. */
export const RENDERER_BASE_VERSION = "pdfkit@0.20.2;noto-sans@2.015;noto-sans-thai@2.002";

const FONT_DIR = fileURLToPath(new URL("../../../assets/fonts/", import.meta.url));

/** The document cannot be rendered: a font failed its check, or text uses a script no font covers. */
export class RenditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenditionError";
  }
}

type FontFile = keyof typeof PINNED_FONTS;
interface LoadedFont { readonly bytes: Buffer; readonly glyphs: Font }

/** Read a pinned font and check it against its recorded SHA-256. */
export function verifyFont(file: string, bytes: Buffer): void {
  const expected = (PINNED_FONTS as Record<string, string>)[file];
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (expected === undefined || actual !== expected) {
    throw new RenditionError(`font ${file} has SHA-256 ${actual}, not the ${expected ?? "(unrecorded)"} recorded in SCS-PLATFORM-02`);
  }
}

let fonts: Record<FontFile, LoadedFont> | undefined;
function loadFonts(): Record<FontFile, LoadedFont> {
  if (fonts === undefined) {
    const loaded = {} as Record<FontFile, LoadedFont>;
    for (const file of Object.keys(PINNED_FONTS) as FontFile[]) {
      const bytes = readFileSync(FONT_DIR + file);
      verifyFont(file, bytes);
      loaded[file] = { bytes, glyphs: createFont(bytes) };
    }
    fonts = loaded;
  }
  return fonts;
}

export type Block =
  | { readonly kind: "title"; readonly text: string }
  | { readonly kind: "notice"; readonly text: string }
  | { readonly kind: "heading"; readonly text: string }
  | { readonly kind: "subheading"; readonly text: string }
  | { readonly kind: "field"; readonly label: string; readonly value: string }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "item"; readonly text: string };

export interface RenditionDocument {
  /** PDF title metadata. */
  readonly title: string;
  /** The record's own timestamp: the PDF's creation and modification date. */
  readonly date: Date;
  readonly blocks: readonly Block[];
  /** The footer lines of page `page` (1-based) of `count`. */
  readonly footer: (page: number, count: number) => readonly string[];
}

const SARA_AM = String.fromCodePoint(0x0e33);
const NIKHAHIT_SARA_AA = String.fromCodePoint(0x0e4d, 0x0e32);
const isThai = (cp: number) => cp >= 0x0e00 && cp <= 0x0e7f;

interface Span { readonly text: string; readonly bold?: boolean }
interface Run { readonly text: string; readonly font: "Sans" | "SansBold" | "Thai" | "ThaiBold" }

/** Split spans into single-font runs, refusing any character its font lacks. */
function runsOf(spans: readonly Span[]): Run[] {
  const f = loadFonts();
  const runs: Run[] = [];
  for (const span of spans) {
    let current: { thai: boolean; text: string } | null = null;
    const flush = () => {
      if (current === null || current.text === "") return;
      const font = current.thai ? (span.bold ? "ThaiBold" : "Thai") : span.bold ? "SansBold" : "Sans";
      runs.push({ font, text: current.thai ? current.text.replaceAll(SARA_AM, NIKHAHIT_SARA_AA) : current.text });
    };
    for (const ch of span.text) {
      const cp = ch.codePointAt(0)!;
      if (cp === 0x0a) {
        // a line break stays in whichever run it falls in
      } else if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) {
        throw new RenditionError(`control character U+${cp.toString(16).toUpperCase().padStart(4, "0")} cannot be rendered`);
      } else {
        const thai = isThai(cp);
        const glyphs = f[thai ? "NotoSansThai-Regular.ttf" : "NotoSans-Regular.ttf"].glyphs;
        if (!glyphs.hasGlyphForCodePoint(cp)) {
          throw new RenditionError(`character U+${cp.toString(16).toUpperCase().padStart(4, "0")} (${ch}) is in a script no recorded font covers`);
        }
        if (current !== null && current.thai !== thai) {
          flush();
          current = null;
        }
      }
      current ??= { thai: isThai(cp), text: "" };
      current.text += ch;
    }
    flush();
  }
  return runs;
}

const INK = "#1a1a1a";
const ACCENT = "#06271f";
const MARGIN = { top: 56, bottom: 84, left: 56, right: 56 };

/** Render the document to PDF bytes. */
export async function renderPdf(d: RenditionDocument): Promise<Buffer> {
  const f = loadFonts();
  const doc = new PDFDocument({
    size: "A4",
    margins: MARGIN,
    bufferPages: true,
    compress: false,
    lang: "en",
    info: { Title: d.title, Producer: "SCS-PLATFORM-02", Creator: "SCS-PLATFORM-02", CreationDate: d.date, ModDate: d.date },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });
  doc.registerFont("Sans", f["NotoSans-Regular.ttf"].bytes);
  doc.registerFont("SansBold", f["NotoSans-Bold.ttf"].bytes);
  doc.registerFont("Thai", f["NotoSansThai-Regular.ttf"].bytes);
  doc.registerFont("ThaiBold", f["NotoSansThai-Bold.ttf"].bytes);
  const width = doc.page.width - MARGIN.left - MARGIN.right;

  const write = (spans: readonly Span[], size: number, color: string, indent = 0) => {
    const runs = runsOf(spans);
    if (runs.length === 0) return;
    doc.fillColor(color).fontSize(size);
    runs.forEach((r, i) => {
      doc.font(r.font).text(r.text, i === 0 ? { width: width - indent, indent: 0, continued: i < runs.length - 1, lineGap: 1 } : { continued: i < runs.length - 1 });
    });
  };

  for (const b of d.blocks) {
    switch (b.kind) {
      case "title":
        write([{ text: b.text, bold: true }], 18, ACCENT);
        doc.moveDown(0.4);
        break;
      case "notice":
        write([{ text: b.text, bold: true }], 10, ACCENT);
        doc.moveDown(0.4);
        break;
      case "heading":
        doc.moveDown(0.6);
        write([{ text: b.text, bold: true }], 13, ACCENT);
        doc.moveDown(0.3);
        break;
      case "subheading":
        doc.moveDown(0.3);
        write([{ text: b.text, bold: true }], 10.5, INK);
        break;
      case "field":
        write([{ text: `${b.label}: `, bold: true }, { text: b.value }], 9, INK);
        break;
      case "text":
        write([{ text: b.text }], 9, INK);
        break;
      case "item":
        write([{ text: `• ${b.text}` }], 9, INK);
        break;
    }
  }

  // footers, once the page count is known
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(range.start + p);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const lines = d.footer(p + 1, range.count);
    lines.forEach((line, i) => {
      const runs = runsOf([{ text: line }]);
      doc.fillColor(INK).fontSize(6.5);
      runs.forEach((r, j) => {
        const opts = { lineBreak: false, continued: j < runs.length - 1 };
        if (j === 0) doc.font(r.font).text(r.text, MARGIN.left, doc.page.height - 58 + i * 9, opts);
        else doc.font(r.font).text(r.text, opts);
      });
    });
    doc.page.margins.bottom = bottom;
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
