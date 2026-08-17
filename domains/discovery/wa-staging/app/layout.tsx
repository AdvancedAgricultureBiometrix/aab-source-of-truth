import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./discovery-order.css";
import "./discovery-request.css";
import "./regional-results.css";
import "./environmental-history.css";
import "./comparison-fixes.css";
import "./candidate-site-map.css";
import "./candidate-context-imagery.css";
import "./investigation-readability.css";
import "./fogo-material-discovery.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AAB Western Australia Staging",
  description: "Governed jurisdiction discovery, environmental change and private demonstration workspace.",
  icons: { icon: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
