import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Barlow_Semi_Condensed } from "next/font/google";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

// Self-hosted by next/font: nothing is fetched from Google at runtime. See DESIGN.md → Type.
const bodyFont = Atkinson_Hyperlegible({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-hl-body" });
const labelFont = Barlow_Semi_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-hl-label",
});

// Public-facing identity only (see CLAUDE.md threat model).
export const metadata: Metadata = {
  title: "Path Finder",
  description: "A calm maze puzzle game.",
  applicationName: "Path Finder",
  appleWebApp: {
    capable: true,
    title: "Path Finder",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5e7c8" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1f2a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${labelFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
