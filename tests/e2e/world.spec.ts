import { expect, test, type Page } from "@playwright/test";
import { skipIntro, watchErrors } from "./helpers";

/**
 * The 3D world. Headless browsers may have no GPU; these tests then check
 * the fallback instead, which is just as much a part of the experience.
 */
const hasWebGL = (page: Page) =>
  page.evaluate(() =>
    Boolean(document.createElement("canvas").getContext("webgl2")),
  );

test.beforeEach(async ({ context }) => {
  await skipIntro(context);
});

test("the gateway shows the Sentinel or its still fallback @desktop", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/");
  const stage = page.locator("[data-gateway-stage]");
  await expect(stage).toHaveCount(1);
  if (await hasWebGL(page))
    await expect(stage).toHaveAttribute("data-gateway-stage", /3d|static/, {
      timeout: 45_000,
    });
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("a page opened in the world shows as a panel over the city @desktop", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/explore?open=%2Fabout");
  await page.waitForURL(/\/about$/, { timeout: 30_000 });
  await expect(page.getByRole("dialog").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("dialog").first().locator("h1, h2").first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a topic hall opens in the world @desktop", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/explore?open=%2Fteam%2Ftopics%2Fcommittee");
  await page.waitForURL(/\/team\/topics\/committee$/, { timeout: 30_000 });
  await expect(page.getByRole("dialog").first()).toBeVisible({
    timeout: 30_000,
  });
  expect(errors).toEqual([]);
});

test("the 2D switch leaves the world for the plain site", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/explore/map?view=2d");
  await expect(page.locator("h1").first()).toBeVisible();
  // Choosing 2D is remembered: the next direct visit is not redirected.
  await context.addCookies([
    { name: "nexus-view", value: "2d", url: baseURL! },
  ]);
  await page.goto("/events");
  expect(new URL(page.url()).pathname).toBe("/events");
});
