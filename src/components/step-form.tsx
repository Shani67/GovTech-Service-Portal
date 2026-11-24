"use client";

import { useActionState } from "react";

import { saveStepAction } from "@/app/apply/actions";
import { ErrorSummary } from "@/components/error-summary";
import { FormField } from "@/components/form-field";
import { fieldAnchor, type Question } from "@/lib/applications/questions";
import type { StepName } from "@/lib/applications/validation";
import { emptyFormState } from "@/lib/forms/types";

type Props = {
  step: StepName;
  question: Question;
  saved: Record<string, string>;
  returnTo?: "check-answers";
};

export function StepForm({ step, question, saved, returnTo }: Props) {
  const [state, action, pending] = useActionState(saveStepAction, emptyFormState);
  const submitted = Object.keys(state.values).length > 0;
  const value = (name: string) => (submitted ? (state.values[name] ?? "") : (saved[name] ?? ""));

  const errors = question.fields
    .filter((field) => state.errors[field.name])
    .map((field) => ({
      href: `#${fieldAnchor(field, field.name)}`,
      message: state.errors[field.name],
    }));

  return (
    <>
      <ErrorSummary errors={errors} />
      {/* Re-mount after each attempt so inputs show the values that were sent. */}
      <form key={JSON.stringify(state.values)} action={action} noValidate className="space-y-8">
        {!question.single && <h1 className="text-3xl font-bold sm:text-4xl">{question.title}</h1>}
        {question.fields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={value(field.name)}
            values={submitted ? state.values : {}}
            error={state.errors[field.name]}
            asHeading={question.single}
          />
        ))}
        <input type="hidden" name="step" value={step} />
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </button>
      </form>
    </>
  );
}
