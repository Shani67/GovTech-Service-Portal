import { splitDate } from "@/lib/format";
import type { Field } from "@/lib/applications/questions";

type Props = {
  field: Field;
  value: string;
  error?: string;
  /** Renders the label or legend as the page heading on one-question pages. */
  asHeading?: boolean;
  values?: Record<string, string>;
};

const widths = {
  full: "w-full",
  "20": "w-full max-w-[20ch] sm:max-w-[24ch]",
  "10": "w-full max-w-[16ch]",
  "5": "w-full max-w-[9ch]",
};

function ErrorMessage({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="font-bold text-danger">
      <span className="sr-only">Error:</span> {error}
    </p>
  );
}

export function FormField({ field, value, error, asHeading, values = {} }: Props) {
  const hintId = field.hint ? `${field.name}-hint` : undefined;
  const errorId = error ? `${field.name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const group = `space-y-2 ${error ? "border-l-4 border-danger pl-4" : ""}`;
  const hint = field.hint ? (
    <p id={hintId} className="text-muted">
      {field.hint}
    </p>
  ) : null;

  if (field.kind === "radios") {
    return (
      <div className={group}>
        <fieldset aria-describedby={describedBy} className="space-y-3">
          <legend className={asHeading ? "mb-3 text-3xl font-bold" : "mb-2 text-xl font-bold"}>
            {asHeading ? <h1>{field.label}</h1> : field.label}
          </legend>
          {hint}
          <ErrorMessage id={`${field.name}-error`} error={error} />
          {field.options.map((option) => (
            <div key={option.value} className="flex items-center gap-3">
              <input
                type="radio"
                id={`${field.name}-${option.value}`}
                name={field.name}
                value={option.value}
                defaultChecked={value === option.value}
                className="radio"
              />
              <label htmlFor={`${field.name}-${option.value}`}>{option.label}</label>
            </div>
          ))}
        </fieldset>
      </div>
    );
  }

  if (field.kind === "date") {
    // Values come back as day/month/year after a failed submission, or as an ISO date from the draft.
    const parts =
      values[`${field.name}-day`] !== undefined
        ? {
            day: values[`${field.name}-day`] ?? "",
            month: values[`${field.name}-month`] ?? "",
            year: values[`${field.name}-year`] ?? "",
          }
        : splitDate(value);
    return (
      <div className={group}>
        <fieldset role="group" aria-describedby={describedBy} className="space-y-3">
          <legend className={asHeading ? "mb-3 text-3xl font-bold" : "mb-2 text-xl font-bold"}>
            {asHeading ? <h1>{field.label}</h1> : field.label}
          </legend>
          {hint}
          <ErrorMessage id={`${field.name}-error`} error={error} />
          <div className="flex gap-4">
            {(["day", "month", "year"] as const).map((part) => (
              <div key={part} className="flex flex-col gap-1">
                <label htmlFor={`${field.name}-${part}`} className="capitalize">
                  {part}
                </label>
                <input
                  id={`${field.name}-${part}`}
                  name={`${field.name}-${part}`}
                  inputMode="numeric"
                  defaultValue={parts[part]}
                  aria-invalid={error ? true : undefined}
                  className={`field ${part === "year" ? "w-[6.5ch]" : "w-[4.5ch]"} box-content`}
                />
              </div>
            ))}
          </div>
        </fieldset>
      </div>
    );
  }

  const input = (
    <input
      id={field.name}
      name={field.name}
      type={field.type ?? "text"}
      autoComplete={field.autoComplete}
      inputMode={field.inputMode}
      spellCheck={field.spellCheck}
      defaultValue={value}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={`field ${widths[field.width ?? "full"]}`}
    />
  );

  return (
    <div className={group}>
      {asHeading ? (
        <h1>
          <label htmlFor={field.name} className="text-3xl font-bold">
            {field.label}
          </label>
        </h1>
      ) : (
        <label htmlFor={field.name} className="block text-xl font-bold">
          {field.label}
        </label>
      )}
      {hint}
      <ErrorMessage id={`${field.name}-error`} error={error} />
      {input}
    </div>
  );
}
