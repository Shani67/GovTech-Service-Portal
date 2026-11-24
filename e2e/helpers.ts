import { expect, type Page } from "@playwright/test";

let counter = 0;
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${counter++}`;

/** Completes the citizen journey and returns the reference and email used. */
export async function applyForLicence(page: Page, businessName = `Test Bakery ${unique()}`) {
  const email = `applicant.${unique()}@example.com`;
  await page.goto("/");
  await page.getByRole("link", { name: "Start now" }).click();

  await page.getByLabel("Business name").fill(businessName);
  await page.getByLabel("Food and drink").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Address line 1").fill("21 Lake Road");
  await page.getByLabel("Town or city").fill("Kandy");
  await page.getByLabel("Postal code").fill("20000");
  await page.getByLabel("How many people will work there?").fill("3");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Day").fill("15");
  await page.getByLabel("Month").fill("3");
  await page.getByLabel("Year").fill(String(new Date().getFullYear() + 1));
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Full name").fill("Sanduni Perera");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("0771234567");
  await page.getByLabel("National Identity Card (NIC) number").fill("851234567V");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Check your answers before sending your application",
  );
  await page.getByRole("button", { name: "Accept and send" }).click();
  const reference = (await page.getByTestId("reference").textContent())!.trim();
  return { reference, email, businessName };
}

export async function signIn(page: Page, role: "officer" | "manager") {
  await page.goto("/staff/sign-in");
  await page.getByLabel("Email address").fill(`${role}@council.example`);
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible();
}

export async function openApplication(page: Page, reference: string) {
  await page.goto(`/staff?q=${reference}`);
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
}
