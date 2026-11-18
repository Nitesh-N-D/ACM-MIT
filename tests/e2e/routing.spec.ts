import { expect, test } from "@playwright/test";

/**
 * 3D-first routing (src/proxy.ts): opening a world page directly enters the
 * 3D world and opens the page there; the 2D choice and crawlers skip it.
 */
const document = { "sec-fetch-dest": "document" };

test("a world page opened directly enters the 3D world", async ({
  request,
}) => {
  const res = await request.get("/about", {
    headers: document,
    maxRedirects: 0,
  });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain("/explore?open=%2Fabout");
});

test("?view=2d and the 2D cookie open the plain page", async ({ request }) => {
  expect(
    (
      await request.get("/about?view=2d", {
        headers: document,
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.get("/about", {
        headers: { ...document, cookie: "nexus-view=2d" },
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(200);
});

test("the 3D world in 2D mode becomes the district map", async ({
  request,
}) => {
  const res = await request.get("/explore", {
    headers: { ...document, cookie: "nexus-view=2d" },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(307);
  expect(new URL(res.headers().location!, "http://x").pathname).toBe(
    "/explore/map",
  );
});

test("crawlers get the plain page with no redirect", async ({ request }) => {
  const res = await request.get("/about", {
    headers: { ...document, "user-agent": "Googlebot/2.1" },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("<h1");
});

test("pages outside the world are never redirected", async ({ request }) => {
  for (const path of ["/sign-in", "/privacy", "/terms"]) {
    expect(
      (
        await request.get(path, { headers: document, maxRedirects: 0 })
      ).status(),
      path,
    ).toBe(200);
  }
});

test("robots.txt and the sitemap are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/sitemap/i);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<urlset");
});
