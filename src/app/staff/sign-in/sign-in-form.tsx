"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/staff/actions";
import { ErrorSummary } from "@/components/error-summary";
import { emptyFormState } from "@/lib/forms/types";

export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, emptyFormState);
  const errors = (["email", "password"] as const)
    .filter((name) => state.errors[name])
    .map((name) => ({ href: `#${name}`, message: state.errors[name] }));

  const field = (name: "email" | "password", label: string) => (
    <div className={`space-y-2 ${state.errors[name] ? "border-l-4 border-danger pl-4" : ""}`}>
      <label htmlFor={name} className="block text-xl font-bold">
        {label}
      </label>
      {state.errors[name] && (
        <p id={`${name}-error`} className="font-bold text-danger">
          <span className="sr-only">Error:</span> {state.errors[name]}
        </p>
      )}
      <input
        id={name}
        name={name}
        type={name}
        autoComplete={name === "email" ? "username" : "current-password"}
        spellCheck={false}
        defaultValue={name === "email" ? state.values.email : undefined}
        aria-invalid={state.errors[name] ? true : undefined}
        aria-describedby={state.errors[name] ? `${name}-error` : undefined}
        className="field w-full max-w-md"
      />
    </div>
  );

  return (
    <>
      <ErrorSummary errors={errors} />
      <form key={JSON.stringify(state.values)} action={action} noValidate className="space-y-6">
        {field("email", "Email address")}
        {field("password", "Password")}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}
