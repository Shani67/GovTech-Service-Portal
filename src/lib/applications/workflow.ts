import type { ApplicationStatus, StaffRole } from "@/db/schema";

export const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  more_info_required: "More information needed",
  approved: "Approved",
  rejected: "Rejected",
};

type Transition = {
  from: ApplicationStatus;
  to: ApplicationStatus;
  roles: StaffRole[];
  label: string;
};

/**
 * Staff decisions. Mirrors the enforce_application_status_transition trigger in
 * drizzle/0001_workflow_guards.sql; a unit test keeps the two in step.
 */
export const staffTransitions: Transition[] = [
  { from: "submitted", to: "in_review", roles: ["officer", "manager"], label: "Start review" },
  {
    from: "in_review",
    to: "more_info_required",
    roles: ["officer", "manager"],
    label: "Ask for more information",
  },
  {
    from: "more_info_required",
    to: "in_review",
    roles: ["officer", "manager"],
    label: "Resume review",
  },
  // Only managers can make a final decision.
  { from: "in_review", to: "approved", roles: ["manager"], label: "Approve licence" },
  { from: "in_review", to: "rejected", roles: ["manager"], label: "Reject application" },
];

export function allowedTransitions(from: ApplicationStatus, role: StaffRole): Transition[] {
  return staffTransitions.filter((t) => t.from === from && t.roles.includes(role));
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  role: StaffRole,
): boolean {
  return allowedTransitions(from, role).some((t) => t.to === to);
}

/** A note is required when it is what the applicant needs to act on. */
export function noteRequired(to: ApplicationStatus): boolean {
  return to === "more_info_required" || to === "rejected";
}
