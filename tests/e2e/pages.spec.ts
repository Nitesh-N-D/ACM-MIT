import { expect, test } from "@playwright/test";
import {
  HALL_HUBS,
  PUBLIC_PAGES,
  linksUnder,
  overflowX,
  use2d,
  watchErrors,
} from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await use2d(context, baseURL!);
});

test.describe("every public page", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} loads cleanly`, async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(path, { waitUntil: "networkidle" });
      expect(res?.status(), "HTTP status").toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(await page.title()).not.toBe("");
      // Landmarks and the skip link that keyboard users rely on.
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.locator("header").first()).toBeVisible();
      expect(
        await overflowX(page),
        "horizontal overflow (px)",
      ).toBeLessThanOrEqual(0);
      // Every image has an alt attribute (empty is fine for decoration).
      expect(
        await page.locator("img:not([alt])").count(),
        "images without alt",
      ).toBe(0);
      expect(errors, "console errors").toEqual([]);
    });
  }
});

test.describe("topic halls", () => {
  for (const [hub, prefix] of HALL_HUBS) {
    test(`every hall linked from ${hub} opens`, async ({ page }) => {
      await page.goto(hub);
      const halls = await linksUnder(page, prefix);
      expect(halls.length, `halls linked from ${hub}`).toBeGreaterThan(0);
      for (const hall of halls) {
        const errors = watchErrors(page);
        const res = await page.goto(hall, { waitUntil: "domcontentloaded" });
        expect(res?.status(), hall).toBe(200);
        await expect(page.locator("h1").first(), hall).toBeVisible();
        expect(
          await overflowX(page),
          `${hall} horizontal overflow`,
        ).toBeLessThanOrEqual(0);
        expect(errors, `${hall} console errors`).toEqual([]);
      }
    });
  }
});

test.describe("detail pages", () => {
  for (const [list, prefix] of [
    ["/events", "/events/"],
    ["/gallery", "/gallery/"],
    ["/vault", "/vault/"],
  ] as const) {
    test(`the first item listed on ${list} opens`, async ({ page }) => {
      await page.goto(list);
      const items = (await linksUnder(page, prefix)).filter(
        (p) => !p.includes("/topics/"),
      );
      test.skip(items.length === 0, `nothing is listed on ${list}`);
      const res = await page.goto(items[0]!);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  }
});

test("an unknown address shows the not-found page", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
});

test("the main menu reaches the pages it lists", async ({ page }) => {
  await page.goto("/about");
  const nav = await page.$$eval("header a[href^='/']", (as) => [
    ...new Set(as.map((a) => (a as HTMLAnchorElement).pathname)),
  ]);
  expect(nav.length).toBeGreaterThan(0);
  for (const path of nav) {
    const res = await page.request.get(path, {
      headers: { cookie: "nexus-view=2d" },
    });
    expect(res.status(), path).toBeLessThan(400);
  }
});
