import type { Metadata } from "next";

import { BackLink } from "@/components/ui";

import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Track your application" };

export default function TrackPage() {
  return (
    <>
      <BackLink href="/" />
      <div className="max-w-2xl pt-6">
        <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Track your application</h1>
        <p className="mb-8">Enter the reference number and the email address you applied with.</p>
        <TrackForm />
      </div>
    </>
  );
}
