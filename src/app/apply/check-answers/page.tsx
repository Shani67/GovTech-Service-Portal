import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { submitAction } from "@/app/apply/actions";
import { BackLink, SubmitButton, SummaryList, type SummaryRow } from "@/components/ui";
import { getDb } from "@/db";
import type { BusinessType } from "@/db/schema";
import { firstIncompleteStep, getDraft } from "@/lib/applications/repository";
import {
  businessTypeLabels,
  completeApplication,
  toFieldErrors,
} from "@/lib/applications/validation";
import { formatDate } from "@/lib/format";
import { getDraftId } from "@/lib/session";

export const metadata: Metadata = { title: "Check your answers before sending your application" };

const change = (step: string) => `/apply/${step}?returnTo=check-answers`;

export default async function CheckAnswersPage() {
  const draftId = await getDraftId();
  const draft = draftId ? await getDraft(await getDb(), draftId) : undefined;
  if (!draft) redirect("/");

  const { application: a, applicant: p } = draft;
  const check = completeApplication.safeParse({ ...a, ...p, employees: a.employees ?? undefined });
  const missing = check.success ? undefined : firstIncompleteStep(toFieldErrors(check.error));

  const business: SummaryRow[] = [
    { key: "Business name", value: a.businessName, href: change("business") },
    {
      key: "Type of business",
      value: a.businessType && businessTypeLabels[a.businessType as BusinessType],
      href: change("business"),
    },
    {
      key: "Address",
      value: [a.addressLine1, a.addressLine2, a.city, a.postcode].filter(Boolean).join("\n"),
      href: change("premises"),
    },
    {
      key: "Number of people working there",
      value: a.employees === null ? "" : String(a.employees),
      href: change("premises"),
    },
    { key: "Trading start date", value: formatDate(a.startsOn), href: change("start-date") },
  ];
  const contact: SummaryRow[] = [
    { key: "Full name", value: p?.fullName, href: change("your-details") },
    { key: "Email address", value: p?.email, href: change("your-details") },
    { key: "Phone number", value: p?.phone, href: change("your-details") },
    { key: "NIC number", value: p?.nicNumber, href: change("your-details") },
  ];

  return (
    <>
      <BackLink href="/apply/your-details" />
      <div className="max-w-3xl pt-6">
        <h1 className="mb-8 text-3xl font-bold sm:text-4xl">
          Check your answers before sending your application
        </h1>
        <h2 className="mb-4 text-2xl font-bold">Business details</h2>
        <SummaryList rows={business} />
        <h2 className="mb-4 text-2xl font-bold">Your contact details</h2>
        <SummaryList rows={contact} />

        {missing ? (
          <div className="inset">
            <p>
              You have not answered every question yet.{" "}
              <Link href={change(missing)} className="link">
                Continue your application
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-2xl font-bold">Now send your application</h2>
            <p className="mb-6 max-w-2xl">
              By submitting this application you are confirming that, to the best of your knowledge,
              the details you are providing are correct.
            </p>
            <form action={submitAction}>
              <SubmitButton>Accept and send</SubmitButton>
            </form>
          </>
        )}
      </div>
    </>
  );
}
