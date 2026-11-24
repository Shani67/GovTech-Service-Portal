"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { applicationStatus } from "@/db/schema";
import { ConflictError, ForbiddenTransitionError, NotFoundError } from "@/lib/applications/errors";
import { changeStatus } from "@/lib/applications/repository";
import { formValues, type FormState } from "@/lib/forms/types";
import { authenticate, createSession, deleteSession } from "@/lib/staff/auth";
import { clearStaffToken, getStaffToken, requireStaff, setStaffToken } from "@/lib/session";

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const errors: Record<string, string> = {};
  if (!values.email?.trim()) errors.email = "Enter your email address";
  if (!values.password) errors.password = "Enter your password";
  if (Object.keys(errors).length > 0) return { errors, values: { email: values.email ?? "" } };

  const db = await getDb();
  const staff = await authenticate(db, values.email, values.password);
  if (!staff) {
    // One message for both cases, so the form does not reveal which emails have accounts.
    return {
      errors: { email: "Enter a correct email address and password" },
      values: { email: values.email },
    };
  }

  await setStaffToken(await createSession(db, staff.id));
  redirect("/staff");
}

export async function signOutAction() {
  const token = await getStaffToken();
  if (token) await deleteSession(await getDb(), token);
  await clearStaffToken();
  redirect("/staff/sign-in");
}

const decisionSchema = z.object({
  applicationId: z.uuid(),
  version: z.coerce.number().int().positive(),
  decision: z.enum(applicationStatus.enumValues, { error: "Select what you want to do" }),
  note: z.string().max(2000, "Message must be 2,000 characters or fewer").default(""),
});

export async function decideAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const values = formValues(formData);
  const parsed = decisionSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { errors: { [String(issue.path[0])]: issue.message }, values };
  }

  const { applicationId, version, decision, note } = parsed.data;
  try {
    await changeStatus(await getDb(), {
      applicationId,
      expectedVersion: version,
      to: decision,
      staff,
      note,
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        errors: {},
        values,
        message:
          "Someone else updated this application while you had it open. Check the latest history below, then make your decision again.",
      };
    }
    if (error instanceof ForbiddenTransitionError) {
      const field = error.message.startsWith("Add a message") ? "note" : "decision";
      return { errors: { [field]: error.message }, values };
    }
    if (error instanceof NotFoundError) redirect("/staff");
    throw error;
  }

  revalidatePath(`/staff/applications/${applicationId}`);
  redirect(`/staff/applications/${applicationId}?updated=${decision}`);
}
