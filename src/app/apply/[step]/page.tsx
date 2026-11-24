import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StepForm } from "@/components/step-form";
import { BackLink } from "@/components/ui";
import { getDb } from "@/db";
import { questions } from "@/lib/applications/questions";
import { draftValues, getDraft } from "@/lib/applications/repository";
import { stepOrder, type StepName } from "@/lib/applications/validation";
import { getDraftId } from "@/lib/session";

type Props = {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

const isStep = (value: string): value is StepName => stepOrder.includes(value as StepName);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  return { title: isStep(step) ? questions[step].title : "Page not found" };
}

export default async function StepPage({ params, searchParams }: Props) {
  const { step } = await params;
  if (!isStep(step)) notFound();
  const returnTo = (await searchParams).returnTo === "check-answers" ? "check-answers" : undefined;

  const draftId = await getDraftId();
  const draft = draftId ? await getDraft(await getDb(), draftId) : undefined;
  const index = stepOrder.indexOf(step);
  const back = returnTo
    ? "/apply/check-answers"
    : index === 0
      ? "/"
      : `/apply/${stepOrder[index - 1]}`;

  return (
    <>
      <BackLink href={back} />
      <div className="max-w-2xl pt-6">
        <p className="mb-2 text-lg text-muted">
          Step {index + 1} of {stepOrder.length}
        </p>
        <StepForm
          step={step}
          question={questions[step]}
          saved={draft ? draftValues(draft) : {}}
          returnTo={returnTo}
        />
      </div>
    </>
  );
}
