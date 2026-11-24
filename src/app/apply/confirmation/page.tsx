import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Application complete" };

type Props = { searchParams: Promise<{ reference?: string }> };

export default async function ConfirmationPage({ searchParams }: Props) {
  const { reference } = await searchParams;
  if (!reference || !/^TL-\d{4}-\d{6}$/.test(reference)) notFound();

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      <div className="bg-success p-8 text-center text-white">
        <h1 className="mb-4 text-4xl font-bold">Application complete</h1>
        <p className="text-2xl">
          Your reference number
          <br />
          <strong className="text-3xl tracking-wide" data-testid="reference">
            {reference}
          </strong>
        </p>
      </div>
      <p>
        Keep this reference. You will need it, with your email address, to track your application.
      </p>
      <h2 className="text-2xl font-bold">What happens next</h2>
      <p>
        A licensing officer will review your application within 10 working days. If they need more
        information they will tell you on the tracking page.
      </p>
      <p>
        <Link href="/track" className="link">
          Track your application
        </Link>
      </p>
      <p className="text-muted">This is a demonstration service. No real licence will be issued.</p>
    </div>
  );
}
