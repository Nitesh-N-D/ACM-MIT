import type { BrowserContext, Page } from "@playwright/test";

export const VIEW_COOKIE = "nexus-view";

/** Every static public page (dynamic ones are reached by following links). */
export const PUBLIC_PAGES = [
  "/",
  "/about",
  "/accessibility",
  "/achievements",
  "/alumni",
  "/announcements",
  "/contact",
  "/events",
  "/explore/map",
  "/gallery",
  "/heritage",
  "/learning",
  "/membership",
  "/privacy",
  "/realms/intelligence",
  "/realms/technology",
  "/search",
  "/sign-in",
  "/team",
  "/terms",
  "/vault",
];

/** The pages that list topic halls, and the prefix of each hall. */
export const HALL_HUBS: [hub: string, prefix: string][] = [
  ["/about", "/about/"],
  ["/events", "/events/topics/"],
  ["/realms/intelligence", "/realms/intelligence/"],
  ["/realms/technology", "/realms/technology/"],
  ["/team", "/team/topics/"],
  ["/vault", "/vault/topics/"],
];

/** The 2D site: no redirect into the world, no intro. */
export async function use2d(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: VIEW_COOKIE, value: "2d", url: baseURL }]);
  await skipIntro(context);
}

/** Marks the gateway intro as already seen. */
export async function skipIntro(context: BrowserContext) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("nexus:intro", "seen");
    } catch {}
  });
}

/**
 * Collects console errors and uncaught exceptions. Failed requests for
 * images are left out: a missing photograph is shown as an empty frame, not
 * a broken page.
 */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (
      /Failed to load resource/.test(text) &&
      /\.(png|jpe?g|webp|avif)|_next\/image/.test(m.location().url)
    )
      return;
    errors.push(text.slice(0, 300));
  });
  page.on("pageerror", (e) =>
    errors.push(`Uncaught: ${e.message.slice(0, 300)}`),
  );
  return errors;
}

/** Pixels the page is wider than the viewport (0 when nothing overflows). */
export const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** Same-origin links on the page whose path starts with `prefix`. */
export async function linksUnder(page: Page, prefix: string) {
  const hrefs = await page.$$eval("a[href]", (as) =>
    as.map((a) => (a as HTMLAnchorElement).href),
  );
  const origin = new URL(page.url()).origin;
  return [
    ...new Set(
      hrefs
        .map((h) => new URL(h))
        .filter(
          (u) =>
            u.origin === origin &&
            u.pathname.startsWith(prefix) &&
            u.pathname.length > prefix.length,
        )
        .map((u) => u.pathname),
    ),
  ];
}
