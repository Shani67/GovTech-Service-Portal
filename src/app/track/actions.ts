"use server";

import { z } from "zod";

import { getDb } from "@/db";
import type { ApplicationStatus } from "@/db/schema";
import { findForApplicant } from "@/lib/applications/repository";
import { toFieldErrors } from "@/lib/applications/validation";
import { formValues } from "@/lib/forms/types";

const trackSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(
      /^TL-\d{4}-\d{6}$/i,
      "Enter your reference number in the correct format, like TL-2026-000042",
    ),
  email: z
    .string()
    .trim()
    .email("Enter an email address in the correct format, like name@example.com"),
});

export type TrackResult = {
  reference: string;
  businessName: string;
  status: ApplicationStatus;
  submittedAt: string;
  events: { status: ApplicationStatus; note: string | null; at: string }[];
};

export type TrackState = {
  errors: Record<string, string>;
  values: Record<string, string>;
  result?: TrackResult;
  notFound?: boolean;
};

export async function trackAction(_previous: TrackState, formData: FormData): Promise<TrackState> {
  const values = formValues(formData);
  const parsed = trackSchema.safeParse(values);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), values };

  const found = await findForApplicant(await getDb(), parsed.data.reference, parsed.data.email);
  // The same message for a wrong reference or a wrong email, so references cannot be probed.
  if (!found) return { errors: {}, values, notFound: true };

  return {
    errors: {},
    values,
    result: {
      reference: found.reference!,
      businessName: found.businessName ?? "",
      status: found.status,
      submittedAt: found.submittedAt!.toISOString(),
      events: found.events.map((event) => ({
        status: event.toStatus,
        note: event.note,
        at: event.createdAt.toISOString(),
      })),
    },
  };
}
