import type { Metadata } from "next";
import Link from "next/link";

import { StaffBar } from "@/components/staff-bar";
import { StatusTag } from "@/components/ui";
import { getDb } from "@/db";
import { applicationStatus, type ApplicationStatus } from "@/db/schema";
import { listApplications, PAGE_SIZE, statusCounts } from "@/lib/applications/repository";
import { statusLabels } from "@/lib/applications/workflow";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Applications" };

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string }> };

const filters: ApplicationStatus[] = applicationStatus.enumValues.filter((s) => s !== "draft");

function queueHref(params: { status?: string; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/staff?${query}` : "/staff";
}

export default async function QueuePage({ searchParams }: Props) {
  const staff = await requireStaff();
  const params = await searchParams;
  const status = filters.includes(params.status as ApplicationStatus)
    ? (params.status as ApplicationStatus)
    : undefined;
  const q = params.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const db = await getDb();
  const [result, counts] = await Promise.all([
    listApplications(db, { status, q, page }),
    statusCounts(db),
  ]);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const tabs: { label: string; value?: ApplicationStatus; count: number }[] = [
    { label: "All", count: total },
    ...filters.map((value) => ({ label: statusLabels[value], value, count: counts[value] ?? 0 })),
  ];

  return (
    <>
      <StaffBar staff={staff} />
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Applications</h1>

      <nav aria-label="Filter by status" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const current = tab.value === status;
            return (
              <li key={tab.label}>
                <Link
                  href={queueHref({ status: tab.value, q })}
                  aria-current={current ? "page" : undefined}
                  className={`inline-block border-2 px-3 py-1 font-bold ${
                    current ? "border-brand bg-brand text-white" : "border-border link"
                  }`}
                >
                  {tab.label} <span className="font-normal">({tab.count})</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form
        role="search"
        method="get"
        action="/staff"
        className="mb-8 flex flex-wrap items-end gap-3"
      >
        {status && <input type="hidden" name="status" value={status} />}
        <div className="space-y-2">
          <label htmlFor="q" className="block font-bold">
            Search by business name or reference
          </label>
          <input id="q" name="q" type="search" defaultValue={q} className="field w-80 max-w-full" />
        </div>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
        {q && (
          <Link href={queueHref({ status })} className="link pb-2">
            Clear search
          </Link>
        )}
      </form>

      <p role="status" className="mb-4">
        {result.total === 0
          ? "No applications match."
          : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, result.total)} of ${result.total} applications`}
      </p>

      {result.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table">
            <caption className="sr-only">
              Applications{status ? ` with status ${statusLabels[status]}` : ""}, newest first
            </caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Business</th>
                <th scope="col">Applicant</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/staff/applications/${row.id}`} className="link font-bold">
                      {row.reference}
                    </Link>
                  </td>
                  <td>{row.businessName}</td>
                  <td>{row.applicantName}</td>
                  <td className="whitespace-nowrap">{formatDate(row.submittedAt)}</td>
                  <td>
                    <StatusTag status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8">
          <ul className="flex flex-wrap items-center gap-4">
            {page > 1 && (
              <li>
                <Link href={queueHref({ status, q, page: page - 1 })} className="link" rel="prev">
                  Previous<span className="sr-only"> page</span>
                </Link>
              </li>
            )}
            {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <Link
                  href={queueHref({ status, q, page: n })}
                  aria-current={n === page ? "page" : undefined}
                  className={n === page ? "bg-brand px-3 py-1 font-bold text-white" : "link px-1"}
                >
                  <span className="sr-only">Page </span>
                  {n}
                </Link>
              </li>
            ))}
            {page < result.pageCount && (
              <li>
                <Link href={queueHref({ status, q, page: page + 1 })} className="link" rel="next">
                  Next<span className="sr-only"> page</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </>
  );
}
