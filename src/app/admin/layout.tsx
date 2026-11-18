import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The command centre is a plain, fast 2D interface with its own shell: no
 * 3D world, no gateway intro, and never indexed by search engines.
 */
export const metadata: Metadata = {
  title: { default: "Command centre", template: "%s · Command centre" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-void text-silver">{children}</div>;
}
