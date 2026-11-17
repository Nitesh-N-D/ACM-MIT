import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { WorldLinkRouter } from "@/components/explore/WorldRouting";

/** Shared shell for all public pages: atmosphere, header, main, footer. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="nexus-atmosphere" aria-hidden="true" />
      <SkipLink />
      <WorldLinkRouter />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="pt-(--spacing-header) outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
