import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/env";

/** Public pages are open to search engines; accounts and the command centre are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/auth/", "/search"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
