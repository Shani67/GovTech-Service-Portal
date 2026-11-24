import { expect, test } from "@playwright/test";

import { applyForLicence, openApplication, signIn } from "./helpers";

test("staff pages need a signed-in user", async ({ page }) => {
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
});

test("a wrong password shows one generic message", async ({ page }) => {
  await page.goto("/staff/sign-in");
  await page.getByLabel("Email address").fill("officer@council.example");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("error-summary")).toContainText(
    "Enter a correct email address and password",
  );
});

test("an officer reviews, a manager approves and the applicant sees it", async ({ browser }) => {
  const citizen = await browser.newPage();
  const { reference, email } = await applyForLicence(citizen);

  const officer = await browser.newPage();
  await signIn(officer, "officer");
  await openApplication(officer, reference);
  await officer.getByLabel("Start review").check();
  await officer.getByRole("button", { name: "Save decision" }).click();
  await expect(officer.getByRole("status")).toContainText("In review");
  // Only managers can make the final decision.
  await expect(officer.getByLabel("Approve licence")).toHaveCount(0);

  const manager = await browser.newPage();
  await signIn(manager, "manager");
  await openApplication(manager, reference);
  await manager.getByLabel("Approve licence").check();
  await manager.getByLabel("Message to the applicant").fill("Licence valid for one year.");
  await manager.getByRole("button", { name: "Save decision" }).click();
  await expect(manager.getByRole("status")).toContainText("Approved");
  await expect(manager.getByText("A final decision has been made")).toBeVisible();

  await citizen.goto("/track");
  await citizen.getByLabel("Reference number").fill(reference);
  await citizen.getByLabel("Email address you applied with").fill(email);
  await citizen.getByRole("button", { name: "Check status" }).click();
  await expect(citizen.getByText("Status: Approved")).toBeVisible();
  await expect(citizen.getByText("Licence valid for one year.")).toBeVisible();
});

test("rejecting needs a message to the applicant", async ({ browser }) => {
  const { reference } = await applyForLicence(await browser.newPage());
  const page = await browser.newPage();
  await signIn(page, "manager");
  await openApplication(page, reference);
  await page.getByLabel("Start review").check();
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByRole("status")).toContainText("In review");

  await page.getByLabel("Reject application").check();
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByTestId("error-summary")).toContainText("Add a message to the applicant");
});

test("a stale decision is refused instead of overwriting a newer one", async ({ browser }) => {
  const { reference } = await applyForLicence(await browser.newPage());
  const first = await browser.newPage();
  const second = await browser.newPage();
  await signIn(first, "officer");
  await signIn(second, "manager");
  await openApplication(first, reference);
  await openApplication(second, reference);

  await first.getByLabel("Start review").check();
  await first.getByRole("button", { name: "Save decision" }).click();
  await expect(first.getByRole("status")).toContainText("In review");

  await second.getByLabel("Start review").check();
  await second.getByRole("button", { name: "Save decision" }).click();
  await expect(second.getByTestId("error-summary")).toContainText(
    "Someone else updated this application",
  );
});

test("the queue filters by status, searches and paginates", async ({ page }) => {
  await signIn(page, "officer");
  const filters = page.getByRole("navigation", { name: "Filter by status" });
  await filters.getByRole("link", { name: /^Approved/ }).click();
  await expect(filters.getByRole("link", { name: /^Approved/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const tags = await page.locator("tbody td:last-child").allTextContents();
  expect(tags.length).toBeGreaterThan(0);
  expect(new Set(tags)).toEqual(new Set(["Approved"]));

  await page.goto("/staff");
  await page.getByLabel("Search by business name or reference").fill("Ceylon Spice");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("cell", { name: "Ceylon Spice House" })).toBeVisible();

  await page.goto("/staff");
  await page
    .getByRole("navigation", { name: "Pagination" })
    .getByRole("link", { name: "Next page" })
    .click();
  await expect(page).toHaveURL(/page=2/);
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page, "officer");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
});
