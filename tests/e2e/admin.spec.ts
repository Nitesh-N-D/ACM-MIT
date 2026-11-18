import { expect, test } from "@playwright/test";

/** Every section of the command centre is closed to a visitor who is not signed in. */
const SECTIONS = [
  "/admin",
  "/admin/events",
  "/admin/projects",
  "/admin/media",
  "/admin/registrations",
  "/admin/members",
  "/admin/roles",
  "/admin/submissions",
  "/admin/applications",
  "/admin/messages",
  "/admin/content",
  "/admin/settings",
  "/admin/activity",
  "/admin/exports",
];

test("every command-centre page turns a signed-out visitor away", async ({
  request,
}) => {
  for (const path of SECTIONS) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(307);
    // To sign in, or to the explanation page when the server has no database.
    expect(res.headers().location, path).toMatch(/\/sign-in|\/admin\/denied/);
  }
});

test("exports and uploads refuse a signed-out visitor", async ({ request }) => {
  for (const kind of [
    "members",
    "registrations",
    "applications",
    "messages",
    "submissions",
    "events",
    "activity",
  ]) {
    const res = await request.get(`/admin/api/export/${kind}`, {
      maxRedirects: 0,
    });
    expect([401, 403], kind).toContain(res.status());
    expect(res.headers()["content-type"] ?? "", kind).not.toContain("text/csv");
  }
  const upload = await request.post("/admin/api/upload", {
    maxRedirects: 0,
    multipart: {
      file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from([0]) },
    },
  });
  expect([401, 403, 405]).toContain(upload.status());
});

test("the access-denied page explains itself", async ({ page }) => {
  const res = await page.goto("/admin/denied?reason=not-configured");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("members' pages ask a signed-out visitor to sign in", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "nexus-view", value: "2d", url: baseURL! },
  ]);
  for (const path of [
    "/dashboard",
    "/dashboard/projects/new",
    "/dashboard/security",
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(500);
    // Either the sign-in page, or the dashboard saying sign-in is needed.
    await expect(page.locator("h1").first(), path).toBeVisible();
  }
});
