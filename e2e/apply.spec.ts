import { expect, test } from "@playwright/test";

import { applyForLicence } from "./helpers";

test("a citizen can apply and gets a reference number", async ({ page }) => {
  const { reference } = await applyForLicence(page);
  expect(reference).toMatch(/^TL-\d{4}-\d{6}$/);
  await expect(page.getByRole("heading", { name: "Application complete" })).toBeVisible();
});

test("shows an error summary that links to each problem", async ({ page }) => {
  await page.goto("/apply/business");
  await page.getByRole("button", { name: "Continue" }).click();

  const summary = page.getByTestId("error-summary");
  await expect(summary).toBeFocused();
  await expect(summary.getByRole("link")).toHaveText([
    "Enter the business name",
    "Select the type of business",
  ]);
  await expect(page).toHaveTitle(/^Error: /);

  await summary.getByRole("link", { name: "Enter the business name" }).click();
  await expect(page.getByLabel("Business name")).toBeFocused();
  await expect(page.getByLabel("Business name")).toHaveAttribute("aria-invalid", "true");
});

test("keeps what was typed when another field is wrong", async ({ page }) => {
  await page.goto("/apply/premises");
  await page.getByLabel("Address line 1").fill("1 Hill Street");
  await page.getByLabel("Town or city").fill("Kandy");
  await page.getByLabel("Postal code").fill("ABC");
  await page.getByLabel("How many people will work there?").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("error-summary")).toContainText("Enter a 5 digit postal code");
  await expect(page.getByLabel("Address line 1")).toHaveValue("1 Hill Street");
  await expect(page.getByLabel("Postal code")).toHaveValue("ABC");
});

test("rejects a date that does not exist", async ({ page }) => {
  await page.goto("/apply/start-date");
  await page.getByLabel("Day").fill("31");
  await page.getByLabel("Month").fill("2");
  await page.getByLabel("Year").fill("2027");
  await page.getByRole("button", { name: "Continue" }).click();
  const summary = page.getByTestId("error-summary");
  await expect(summary).toContainText("Date trading starts must be a real date");
  await summary.getByRole("link").click();
  await expect(page.getByLabel("Day")).toBeFocused();
});

test("change links on check your answers return to the summary", async ({ page }) => {
  await page.goto("/apply/business");
  await page.getByLabel("Business name").fill("First Name Ltd");
  await page.getByLabel("Shop or retail").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/apply\/premises$/);

  await page.goto("/apply/check-answers");
  await expect(page.getByText("You have not answered every question yet")).toBeVisible();
  await page.getByRole("link", { name: "Change business name" }).click();
  await page.getByLabel("Business name").fill("Second Name Ltd");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/apply\/check-answers$/);
  await expect(page.getByText("Second Name Ltd")).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the whole application works", async ({ page }) => {
    await page.goto("/apply/business");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByTestId("error-summary")).toContainText("Enter the business name");

    const { reference } = await applyForLicence(page);
    expect(reference).toMatch(/^TL-\d{4}-\d{6}$/);
  });
});
