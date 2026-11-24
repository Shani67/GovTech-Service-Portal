"use server";

import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { IncompleteApplicationError, NotFoundError } from "@/lib/applications/errors";
import {
  createDraft,
  firstIncompleteStep,
  getDraft,
  saveStep,
  submitApplication,
} from "@/lib/applications/repository";
import { stepOrder, type StepName } from "@/lib/applications/validation";
import { combineDateParts } from "@/lib/format";
import { formValues, type FormState } from "@/lib/forms/types";
import { clearDraftId, getDraftId, setDraftId } from "@/lib/session";

export async function saveStepAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const step = formData.get("step") as StepName;
  if (!stepOrder.includes(step)) throw new NotFoundError("Unknown step");
  const values = formValues(formData);
  delete values.step;
  const input: Record<string, string> = { ...values };
  if (step === "start-date") {
    input.startsOn = combineDateParts(
      values["startsOn-day"] ?? "",
      values["startsOn-month"] ?? "",
      values["startsOn-year"] ?? "",
    );
  }

  const db = await getDb();
  let draftId = await getDraftId();
  // Start a new draft on the first answer, or when the old one was submitted or deleted.
  if (!draftId || !(await getDraft(db, draftId))) {
    draftId = await createDraft(db);
    await setDraftId(draftId);
  }

  const result = await saveStep(db, draftId, step, input);
  if (!result.ok) return { errors: result.errors, values };

  const next = stepOrder[stepOrder.indexOf(step) + 1];
  redirect(
    values.returnTo === "check-answers" || !next ? "/apply/check-answers" : `/apply/${next}`,
  );
}

export async function submitAction(): Promise<void> {
  const db = await getDb();
  const draftId = await getDraftId();
  if (!draftId) redirect("/");

  let reference: string;
  try {
    reference = await submitApplication(db, draftId);
  } catch (error) {
    if (error instanceof IncompleteApplicationError) {
      redirect(`/apply/${firstIncompleteStep(error.errors)}?returnTo=check-answers`);
    }
    if (error instanceof NotFoundError) redirect("/");
    throw error;
  }

  await clearDraftId();
  redirect(`/apply/confirmation?reference=${encodeURIComponent(reference)}`);
}
