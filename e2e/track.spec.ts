import { expect, test } from "@playwright/test";

import { applyForLicence } from "./helpers";

test("an applicant can track their application", async ({ page }) => {
  const { reference, email, businessName } = await applyForLicence(page);
  await page.getByRole("link", { name: "Track your application" }).click();

  await page.getByLabel("Reference number").fill(reference.toLowerCase());
  await page.getByLabel("Email address you applied with").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Check status" }).click();

  await expect(page.getByRole("heading", { name: `${businessName} (${reference})` })).toBeFocused();
  await expect(page.getByText("Status: Submitted")).toBeVisible();
});

test("does not say whether the reference or the email was wrong", async ({ page }) => {
  const { reference } = await applyForLicence(page);
  await page.goto("/track");
  await page.getByLabel("Reference number").fill(reference);
  await page.getByLabel("Email address you applied with").fill("someone.else@example.com");
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByRole("heading", { name: "No application found" })).toBeVisible();
});

test("validates the reference format", async ({ page }) => {
  await page.goto("/track");
  await page.getByLabel("Reference number").fill("12345");
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByTestId("error-summary")).toContainText(
    "Enter your reference number in the correct format",
  );
});
