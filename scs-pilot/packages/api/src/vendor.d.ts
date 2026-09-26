// Type declarations for the parts of pdfkit 0.20.2 and fontkit 2.0.4 the
// renderer uses (AAB-PLATFORM-02). Neither package ships types, and the
// community types lag pdfkit's version, so only what is used is declared.

declare module "pdfkit" {
  interface PDFDocumentOptions {
    size?: string | [number, number];
    margins?: { top: number; bottom: number; left: number; right: number };
    bufferPages?: boolean;
    autoFirstPage?: boolean;
    compress?: boolean;
    info?: Record<string, string | Date>;
    lang?: string;
  }
  interface TextOptions {
    width?: number;
    continued?: boolean;
    lineBreak?: boolean;
    lineGap?: number;
    indent?: number;
  }
  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } };
    x: number;
    y: number;
    registerFont(name: string, src: Buffer): this;
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: TextOptions): this;
    text(text: string, x: number, y: number, options?: TextOptions): this;
    moveDown(lines?: number): this;
    bufferedPageRange(): { start: number; count: number };
    switchToPage(n: number): this;
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    end(): void;
  }
  export default PDFDocument;
}

declare module "fontkit" {
  export interface Font {
    hasGlyphForCodePoint(codePoint: number): boolean;
  }
  export function create(buffer: Buffer): Font;
}
