"use client";

import { useActionState, useEffect, useRef } from "react";

import { ErrorSummary } from "@/components/error-summary";
import { FormField } from "@/components/form-field";
import { StatusTag } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { statusLabels } from "@/lib/applications/workflow";

import { trackAction, type TrackState } from "./actions";

const nextSteps: Record<string, string> = {
  submitted: "Your application is waiting for a licensing officer.",
  in_review: "A licensing officer is reviewing your application.",
  more_info_required:
    "We need more information from you. Read the message below and email licensing@council.example with your reference.",
  approved: "Your trade licence has been approved.",
  rejected: "Your application was not approved. Read the message below for the reason.",
};

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackAction, {
    errors: {},
    values: {},
  });
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.result || state.notFound) resultRef.current?.focus();
  }, [state]);

  const errors = (["reference", "email"] as const)
    .filter((name) => state.errors[name])
    .map((name) => ({ href: `#${name}`, message: state.errors[name] }));

  return (
    <>
      <ErrorSummary errors={errors} />
      <form key={JSON.stringify(state.values)} action={action} noValidate className="space-y-6">
        <FormField
          field={{
            kind: "text",
            name: "reference",
            label: "Reference number",
            hint: "This is on your confirmation page, for example TL-2026-000042",
            spellCheck: false,
            width: "20",
          }}
          value={state.values.reference ?? ""}
          error={state.errors.reference}
        />
        <FormField
          field={{
            kind: "text",
            name: "email",
            label: "Email address you applied with",
            type: "email",
            autoComplete: "email",
            spellCheck: false,
          }}
          value={state.values.email ?? ""}
          error={state.errors.email}
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Checking…" : "Check status"}
        </button>
      </form>

      <div aria-live="polite" className="mt-10">
        {state.notFound && (
          <div className="inset">
            <h2 ref={resultRef} tabIndex={-1} className="mb-2 text-2xl font-bold">
              No application found
            </h2>
            <p>Check the reference number and email address, then try again.</p>
          </div>
        )}
        {state.result && (
          <section aria-labelledby="result-heading" className="space-y-6">
            <h2 ref={resultRef} id="result-heading" tabIndex={-1} className="text-2xl font-bold">
              {state.result.businessName} ({state.result.reference})
            </h2>
            <p className="flex flex-wrap items-center gap-3 text-xl">
              Status: <StatusTag status={state.result.status} />
            </p>
            <p>{nextSteps[state.result.status]}</p>
            <h3 className="text-xl font-bold">History</h3>
            <ol className="timeline">
              {state.result.events.map((event, index) => (
                <li key={index}>
                  <p className="font-bold">{statusLabels[event.status]}</p>
                  <p className="text-muted">{formatDateTime(new Date(event.at))}</p>
                  {event.note && <p className="mt-1 whitespace-pre-line">{event.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}
