/** State returned by form server actions and read with useActionState. */
export type FormState = {
  errors: Record<string, string>;
  values: Record<string, string>;
  message?: string;
};

export const emptyFormState: FormState = { errors: {}, values: {} };

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}
