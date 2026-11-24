import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StaffBar } from "@/components/staff-bar";
import { BackLink, StatusTag, SummaryList } from "@/components/ui";
import { getDb } from "@/db";
import type { BusinessType } from "@/db/schema";
import { getApplicationForStaff } from "@/lib/applications/repository";
import { businessTypeLabels } from "@/lib/applications/validation";
import { allowedTransitions, noteRequired, statusLabels } from "@/lib/applications/workflow";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/session";

import { DecisionForm } from "./decision-form";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationPage({ params, searchParams }: Props) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const found = await getApplicationForStaff(await getDb(), id);
  if (!found) notFound();
  const { updated } = await searchParams;

  const { application: a, applicant: p, events, assigneeName } = found;
  const options = allowedTransitions(a.status, staff.role).map((t) => ({
    to: t.to,
    label: t.label,
    noteRequired: noteRequired(t.to),
  }));
  const updatedLabel =
    updated && updated in statusLabels
      ? statusLabels[updated as keyof typeof statusLabels]
      : undefined;

  return (
    <>
      <StaffBar staff={staff} />
      <BackLink href="/staff">Back to applications</BackLink>
      <div className="max-w-3xl pt-6">
        {updatedLabel && (
          <div role="status" className="mb-8 border-4 border-success p-5">
            <h2 className="text-xl font-bold">Decision saved</h2>
            <p>The application is now: {updatedLabel}.</p>
          </div>
        )}
        <p className="mb-2 text-lg text-muted">{a.reference}</p>
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{a.businessName}</h1>
        <p className="mb-8 flex flex-wrap items-center gap-3">
          <StatusTag status={a.status} />
          {assigneeName && <span>Assigned to {assigneeName}</span>}
        </p>

        <h2 className="mb-4 text-2xl font-bold">Business</h2>
        <SummaryList
          rows={[
            {
              key: "Type",
              value: a.businessType && businessTypeLabels[a.businessType as BusinessType],
            },
            {
              key: "Address",
              value: [a.addressLine1, a.addressLine2, a.city, a.postcode]
                .filter(Boolean)
                .join("\n"),
            },
            { key: "People working there", value: String(a.employees ?? "") },
            { key: "Trading starts", value: formatDate(a.startsOn) },
            { key: "Submitted", value: formatDateTime(a.submittedAt) },
          ]}
        />
        <h2 className="mb-4 text-2xl font-bold">Applicant</h2>
        <SummaryList
          rows={[
            { key: "Name", value: p.fullName },
            { key: "Email", value: p.email },
            { key: "Phone", value: p.phone },
            { key: "NIC number", value: p.nicNumber },
          ]}
        />

        <h2 className="mb-4 text-2xl font-bold">Decision</h2>
        {options.length > 0 ? (
          <div className="mb-10">
            <DecisionForm applicationId={a.id} version={a.version} options={options} />
          </div>
        ) : (
          <div className="inset mb-10">
            <p>
              {a.status === "approved" || a.status === "rejected"
                ? "A final decision has been made on this application."
                : "There is nothing for you to do right now. A manager makes the final decision."}
            </p>
          </div>
        )}

        <h2 id="history" tabIndex={-1} className="mb-4 text-2xl font-bold">
          History
        </h2>
        <ol className="timeline">
          {events.map((event) => (
            <li key={event.id}>
              <p className="font-bold">{statusLabels[event.toStatus]}</p>
              <p className="text-muted">
                {formatDateTime(event.createdAt)} by{" "}
                {event.actorType === "staff" ? event.staffName : "the applicant"}
              </p>
              {event.note && <p className="mt-1 whitespace-pre-line">{event.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
