// Test helper: the text of a rendition, page by page, with each page's footer
// separated from its body (SCS-PLATFORM-02, "The pilot renderer": completeness
// tests leave the footers out, because a reader can place a footer between the
// two halves of an entry that breaks across a page). Text is NFKC-normalised
// with whitespace collapsed, so a record's text can be found in it as a
// substring. pdfjs-dist is a development dependency only.

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Below this height (points from the page's bottom edge) text is footer. */
const FOOTER_TOP = 75;

export interface PdfPage {
  readonly body: string;
  readonly footer: readonly string[];
}

const norm = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();

export async function pdfPages(bytes: Uint8Array): Promise<PdfPage[]> {
  const pdf = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const pages: PdfPage[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    let body = "";
    const footer = new Map<number, string>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5] as number;
      if (y < FOOTER_TOP) {
        const line = Math.round(y);
        footer.set(line, (footer.get(line) ?? "") + item.str);
      } else {
        body += item.str + (item.hasEOL ? "\n" : "");
      }
    }
    pages.push({ body: norm(body), footer: [...footer.entries()].sort((a, b) => b[0] - a[0]).map(([, l]) => norm(l)) });
  }
  return pages;
}

/** Every page's body, joined: what a completeness test searches. */
export async function pdfBodyText(bytes: Uint8Array): Promise<string> {
  return (await pdfPages(bytes)).map((p) => p.body).join(" ");
}

/**
 * Whether the rendition text contains the record's text. Whitespace is ignored
 * on both sides: a line break (including one inside a Thai word, which the
 * renderer breaks at the line's edge) extracts as whitespace.
 */
export function contains(rendered: string, recordText: string): boolean {
  const compact = (s: string) => s.normalize("NFKC").replace(/\s+/g, "");
  return compact(rendered).includes(compact(recordText));
}
