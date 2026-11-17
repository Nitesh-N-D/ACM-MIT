import type { Metadata } from "next";
import { site } from "@/config/site";

/**
 * Per-page metadata: title, description, canonical URL and social cards.
 * Paths are relative; `metadataBase` in the root layout makes them absolute.
 */
export function pageMetadata({ title, description, path, noIndex }: { title: string; description: string; path: string; noIndex?: boolean }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "en_IN", url: path, siteName: site.name, title: `${title} · ${site.name}`, description },
    twitter: { card: "summary_large_image", title: `${title} · ${site.name}`, description },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
