import Link from "next/link";

export default function StartPage() {
  return (
    <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Apply for a trade licence</h1>
        <p>
          You need a trade licence from the council to run a shop, food business, workshop or other
          business in the Lakeside area. This includes businesses run from home.
        </p>
        <p>Use this service to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>apply for a new trade licence</li>
          <li>track an application you have already made</li>
        </ul>
        <p>Applying takes around 10 minutes. You will need:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the address the business will trade from</li>
          <li>the date you plan to start trading</li>
          <li>your National Identity Card (NIC) number</li>
        </ul>
        <p>Your answers are saved as you go, so you can come back and finish within 30 days.</p>
        <Link href="/apply/business" className="btn btn-primary gap-3 text-xl">
          Start now
          <svg aria-hidden="true" focusable="false" width="17" height="19" viewBox="0 0 33 40">
            <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
          </svg>
        </Link>
        <h2 className="pt-6 text-2xl font-bold">Already applied?</h2>
        <p>
          <Link href="/track" className="link">
            Track your application
          </Link>{" "}
          with your reference number and email address.
        </p>
      </div>
      <aside aria-labelledby="related" className="border-t-4 border-brand pt-4 lg:self-start">
        <h2 id="related" className="mb-3 text-xl font-bold">
          Help and contact
        </h2>
        <p className="text-base">
          Licensing team
          <br />
          licensing@council.example
          <br />
          Monday to Friday, 9am to 4pm
        </p>
      </aside>
    </div>
  );
}
