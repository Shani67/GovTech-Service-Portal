import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy and cookies" };

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-6">
      <h1 className="text-4xl font-bold">Privacy and cookies</h1>
      <p>
        This is a demonstration service. Please do not enter real personal information. Data may be
        reset at any time.
      </p>
      <h2 className="text-2xl font-bold">What we store</h2>
      <p>
        Your business details, address, contact details and NIC number, and a history of every
        change to the status of your application.
      </p>
      <h2 className="text-2xl font-bold">How long we keep it</h2>
      <p>
        Unfinished applications are deleted automatically after 30 days without changes, along with
        the personal details entered in them.
      </p>
      <h2 className="text-2xl font-bold">Cookies</h2>
      <p>We use only essential cookies, so we do not ask for consent.</p>
      <div className="overflow-x-auto">
        <table className="table">
          <caption className="mb-2 text-left font-bold">Essential cookies</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Purpose</th>
              <th scope="col">Expires</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>tl_draft</td>
              <td>Remembers your unfinished application</td>
              <td>30 days, or when you submit</td>
            </tr>
            <tr>
              <td>tl_staff_session</td>
              <td>Keeps council staff signed in</td>
              <td>8 hours, or when they sign out</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
