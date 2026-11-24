import { z } from "zod";

import { businessType } from "@/db/schema";

export const businessTypeLabels: Record<(typeof businessType.enumValues)[number], string> = {
  retail: "Shop or retail",
  food: "Food and drink",
  services: "Services (for example salon, repair, consultancy)",
  manufacturing: "Manufacturing or workshop",
  home_based: "Home-based business",
};

const text = (min: number, max: number, empty: string, long: string) =>
  z.string().trim().min(min, empty).max(max, long);

export const businessStep = z.object({
  businessName: text(
    2,
    120,
    "Enter the business name",
    "Business name must be 120 characters or fewer",
  ),
  businessType: z.enum(businessType.enumValues, { error: "Select the type of business" }),
});

export const premisesStep = z.object({
  addressLine1: text(
    3,
    120,
    "Enter address line 1",
    "Address line 1 must be 120 characters or fewer",
  ),
  addressLine2: z
    .string()
    .trim()
    .max(120, "Address line 2 must be 120 characters or fewer")
    .default(""),
  city: text(2, 60, "Enter the town or city", "Town or city must be 60 characters or fewer"),
  // Sri Lankan postal codes are five digits.
  postcode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Enter a 5 digit postal code, like 10350"),
  employees: z.coerce
    .number({ error: "Enter the number of employees" })
    .int("Enter a whole number of employees")
    .min(0, "Number of employees cannot be negative")
    .max(10000, "Number of employees must be 10,000 or fewer"),
});

/** True for a calendar date that exists, so 31 February is refused. */
function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const startDateStep = z.object({
  startsOn: z
    .string({ error: "Enter the date trading starts" })
    .min(1, "Enter the date trading starts")
    .refine(isRealDate, "Date trading starts must be a real date"),
});

// Old NIC: 9 digits followed by V or X. New NIC: 12 digits.
const nicPattern = /^(\d{9}[VvXx]|\d{12})$/;

export const detailsStep = z.object({
  fullName: text(2, 120, "Enter your full name", "Full name must be 120 characters or fewer"),
  email: z
    .string()
    .trim()
    .email("Enter an email address in the correct format, like name@example.com"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+94|0)\d{9}$/, "Enter a Sri Lankan phone number, like 0771234567 or +94771234567"),
  nicNumber: z
    .string()
    .trim()
    .regex(nicPattern, "Enter a valid NIC number, like 851234567V or 198512345678")
    .transform((value) => value.toUpperCase()),
});

export const steps = {
  business: businessStep,
  premises: premisesStep,
  "start-date": startDateStep,
  "your-details": detailsStep,
} as const;

export type StepName = keyof typeof steps;
export const stepOrder: StepName[] = ["business", "premises", "start-date", "your-details"];

export const completeApplication = businessStep
  .extend(premisesStep.shape)
  .extend(startDateStep.shape)
  .extend(detailsStep.shape);

export type CompleteApplication = z.infer<typeof completeApplication>;

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    errors[key] ??= issue.message;
  }
  return errors;
}
