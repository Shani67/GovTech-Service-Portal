"use client";

import { useEffect, useRef } from "react";

type Props = { errors: { href: string; message: string }[]; title?: string };

/**
 * Lists every problem at the top of the form, links to each field and takes focus,
 * so screen reader and keyboard users hear about errors straight away.
 */
export function ErrorSummary({ errors, title = "There is a problem" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length === 0) return;
    ref.current?.focus();
    if (!document.title.startsWith("Error: ")) document.title = `Error: ${document.title}`;
    return () => {
      document.title = document.title.replace(/^Error: /, "");
    };
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="mb-8 border-4 border-danger p-5 focus:outline-3 focus:outline-focus"
      data-testid="error-summary"
    >
      <h2 id="error-summary-title" className="mb-3 text-xl font-bold">
        {title}
      </h2>
      <ul className="space-y-2">
        {errors.map((error) => (
          <li key={error.href}>
            <a href={error.href} className="font-bold text-danger underline">
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
