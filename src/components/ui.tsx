import Link from "next/link";

import type { ApplicationStatus } from "@/db/schema";
import { statusLabels } from "@/lib/applications/workflow";

export function BackLink({
  href,
  children = "Back",
}: {
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="back-link">
      {children}
    </Link>
  );
}

const tagStyles: Record<ApplicationStatus, string> = {
  draft: "bg-slate-200 text-slate-900",
  submitted: "bg-slate-200 text-slate-900",
  in_review: "bg-sky-100 text-sky-950",
  more_info_required: "bg-amber-100 text-amber-950",
  approved: "bg-green-100 text-green-950",
  rejected: "bg-red-100 text-red-950",
};

export function StatusTag({ status }: { status: ApplicationStatus }) {
  return (
    <strong className={`inline-block px-2 py-0.5 text-base font-bold ${tagStyles[status]}`}>
      {statusLabels[status]}
    </strong>
  );
}

export type SummaryRow = {
  key: string;
  value: React.ReactNode;
  href?: string;
  hiddenLabel?: string;
};

export function SummaryList({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="mb-10 divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <div key={row.key} className="grid gap-1 py-3 sm:grid-cols-[1fr_1.5fr_auto] sm:gap-4">
          <dt className="font-bold">{row.key}</dt>
          <dd className="break-words whitespace-pre-line">{row.value || "Not provided"}</dd>
          {row.href && (
            <dd>
              <Link href={row.href} className="link">
                Change<span className="sr-only"> {row.hiddenLabel ?? row.key.toLowerCase()}</span>
              </Link>
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "warning";
}) {
  return (
    <button type="submit" className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}
