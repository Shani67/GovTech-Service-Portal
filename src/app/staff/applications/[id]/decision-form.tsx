"use client";

import { useActionState } from "react";

import { decideAction } from "@/app/staff/actions";
import { ErrorSummary } from "@/components/error-summary";
import { FormField } from "@/components/form-field";
import type { ApplicationStatus } from "@/db/schema";
import { emptyFormState } from "@/lib/forms/types";

type Props = {
  applicationId: string;
  version: number;
  options: { to: ApplicationStatus; label: string; noteRequired: boolean }[];
};

export function DecisionForm({ applicationId, version, options }: Props) {
  const [state, action, pending] = useActionState(decideAction, emptyFormState);

  const errors = [
    state.errors.decision && { href: `#decision-${options[0].to}`, message: state.errors.decision },
    state.errors.note && { href: "#note", message: state.errors.note },
  ].filter((e): e is { href: string; message: string } => Boolean(e));
  if (state.message) errors.unshift({ href: "#history", message: state.message });

  const needsNote = options.filter((o) => o.noteRequired).map((o) => o.label.toLowerCase());

  return (
    <>
      <ErrorSummary errors={errors} />
      <form key={JSON.stringify(state.values)} action={action} noValidate className="space-y-6">
        <input type="hidden" name="applicationId" value={applicationId} />
        {/* Optimistic locking: the update only succeeds if nobody changed the application since this page loaded. */}
        <input type="hidden" name="version" value={version} />
        <FormField
          field={{
            kind: "radios",
            name: "decision",
            label: "What do you want to do?",
            options: options.map((o) => ({ value: o.to, label: o.label })),
          }}
          value={state.values.decision ?? ""}
          error={state.errors.decision}
        />
        <div className={`space-y-2 ${state.errors.note ? "border-l-4 border-danger pl-4" : ""}`}>
          <label htmlFor="note" className="block text-xl font-bold">
            Message to the applicant
          </label>
          <p id="note-hint" className="text-muted">
            {needsNote.length > 0
              ? `Required if you ${needsNote.join(" or ")}. The applicant sees this when they track their application.`
              : "Optional. The applicant sees this when they track their application."}
          </p>
          {state.errors.note && (
            <p id="note-error" className="font-bold text-danger">
              <span className="sr-only">Error:</span> {state.errors.note}
            </p>
          )}
          <textarea
            id="note"
            name="note"
            rows={4}
            defaultValue={state.values.note}
            aria-describedby={state.errors.note ? "note-hint note-error" : "note-hint"}
            aria-invalid={state.errors.note ? true : undefined}
            className="field h-auto w-full py-2"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save decision"}
        </button>
      </form>
    </>
  );
}
