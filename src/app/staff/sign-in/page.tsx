import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { demoStaff } from "@/db/seed";
import { currentStaff } from "@/lib/session";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in to the licensing team area" };

// This is a portfolio demo, so reviewers are shown how to sign in. Set DEMO_MODE=false to hide it.
const showDemoAccounts = process.env.DEMO_MODE !== "false";

export default async function SignInPage() {
  if (await currentStaff()) redirect("/staff");

  return (
    <div className="max-w-2xl pt-6">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Sign in to the licensing team area</h1>
      {showDemoAccounts && (
        <div className="inset mb-8">
          <p className="mb-2 font-bold">Demo accounts</p>
          <ul className="list-disc space-y-1 pl-6">
            {demoStaff.map((member) => (
              <li key={member.email}>
                {member.email} ({member.role})
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Password: <code>{process.env.STAFF_DEMO_PASSWORD ?? "demo-password"}</code>
          </p>
        </div>
      )}
      <SignInForm />
    </div>
  );
}
