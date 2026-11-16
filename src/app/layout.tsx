import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import { site } from "@/config/site";
import { bootScript } from "@/lib/gateway/prefs";
import { siteUrl } from "@/lib/supabase/env";
import "./globals.css";

const display = Unbounded({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-unbounded",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

const verification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${site.name} · ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "ACM MIT",
    "ACM MIT Student Chapter",
    "ACM Student Chapter",
    "Madras Institute of Technology",
    "MIT Chennai",
    "Anna University",
    "NEXUS",
    "computer science student chapter",
    "hackathons",
    "workshops",
    "student projects",
  ],
  authors: [{ name: site.chapter.fullName }],
  creator: site.chapter.fullName,
  publisher: site.chapter.fullName,
  category: "education",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Google Search Console: set GOOGLE_SITE_VERIFICATION to the code from the
  // "HTML tag" verification method. Nothing is emitted while it is empty.
  ...(verification ? { verification: { google: verification } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#03050d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The boot script sets data-intro / data-motion before paint, hence the warning suppression.
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Static, first-party script (no user input) — decides the intro before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
