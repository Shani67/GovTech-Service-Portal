import { businessTypeLabels, type StepName } from "./validation";

export type TextField = {
  kind: "text";
  name: string;
  label: string;
  hint?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "numeric" | "text";
  spellCheck?: boolean;
  width?: "full" | "20" | "10" | "5";
};
export type RadiosField = {
  kind: "radios";
  name: string;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
};
export type DateField = { kind: "date"; name: string; label: string; hint?: string };
export type Field = TextField | RadiosField | DateField;

export type Question = {
  title: string;
  /** One-question pages use the question itself as the page heading (label or legend). */
  single?: boolean;
  fields: Field[];
};

export const questions: Record<StepName, Question> = {
  business: {
    title: "About your business",
    fields: [
      { kind: "text", name: "businessName", label: "Business name", autoComplete: "organization" },
      {
        kind: "radios",
        name: "businessType",
        label: "What type of business is it?",
        options: Object.entries(businessTypeLabels).map(([value, label]) => ({ value, label })),
      },
    ],
  },
  premises: {
    title: "Where will the business trade from?",
    fields: [
      {
        kind: "text",
        name: "addressLine1",
        label: "Address line 1",
        autoComplete: "address-line1",
      },
      {
        kind: "text",
        name: "addressLine2",
        label: "Address line 2 (optional)",
        autoComplete: "address-line2",
      },
      {
        kind: "text",
        name: "city",
        label: "Town or city",
        autoComplete: "address-level2",
        width: "20",
      },
      {
        kind: "text",
        name: "postcode",
        label: "Postal code",
        autoComplete: "postal-code",
        inputMode: "numeric",
        width: "5",
      },
      {
        kind: "text",
        name: "employees",
        label: "How many people will work there?",
        hint: "Include yourself and part-time staff",
        inputMode: "numeric",
        width: "5",
      },
    ],
  },
  "start-date": {
    title: "When will the business start trading?",
    single: true,
    fields: [
      {
        kind: "date",
        name: "startsOn",
        label: "When will the business start trading?",
        hint: "For example, 27 3 2027",
      },
    ],
  },
  "your-details": {
    title: "Your contact details",
    fields: [
      {
        kind: "text",
        name: "fullName",
        label: "Full name",
        autoComplete: "name",
        spellCheck: false,
      },
      {
        kind: "text",
        name: "email",
        label: "Email address",
        hint: "You will need this to track your application",
        type: "email",
        autoComplete: "email",
        spellCheck: false,
      },
      {
        kind: "text",
        name: "phone",
        label: "Phone number",
        type: "tel",
        autoComplete: "tel",
        width: "20",
      },
      {
        kind: "text",
        name: "nicNumber",
        label: "National Identity Card (NIC) number",
        hint: "For example, 851234567V or 198512345678",
        spellCheck: false,
        width: "10",
      },
    ],
  },
};

/** The element the error summary links to for a field. */
export function fieldAnchor(field: Field | undefined, name: string): string {
  if (field?.kind === "radios") return `${name}-${field.options[0].value}`;
  if (field?.kind === "date") return `${name}-day`;
  return name;
}
