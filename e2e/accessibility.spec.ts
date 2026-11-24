import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { applyForLicence, openApplication, signIn } from "./helpers";

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

const publicPages = [
  "/",
  "/apply/business",
  "/apply/premises",
  "/apply/start-date",
  "/apply/your-details",
  "/track",
  "/accessibility",
  "/privacy",
  "/staff/sign-in",
  "/no-such-page",
];

for (const path of publicPages) {
  test(`${path} has no detectable accessibility issues`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page);
  });
}

test("error states have no detectable accessibility issues", async ({ page }) => {
  await page.goto("/apply/start-date");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("error-summary")).toBeVisible();
  await expectNoViolations(page);
});

test("confirmation, queue and application pages have no detectable issues", async ({
  page,
  browser,
}) => {
  const { reference } = await applyForLicence(page);
  await expectNoViolations(page);

  const staff = await (await browser.newContext()).newPage();
  await signIn(staff, "manager");
  await expectNoViolations(staff);
  await openApplication(staff, reference);
  await expectNoViolations(staff);
});

test("every page has one h1, a skip link and a unique title", async ({ page }) => {
  const titles = new Set<string>();
  for (const path of ["/", "/apply/business", "/track", "/staff/sign-in", "/accessibility"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    titles.add(await page.title());
  }
  expect(titles.size).toBe(5);

  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("content reflows at 320px without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/", "/apply/premises", "/track", "/staff/sign-in"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, path).toBe(false);
  }
});
