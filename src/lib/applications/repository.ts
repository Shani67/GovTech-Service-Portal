import { and, count, desc, eq, ilike, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  applicants,
  applicationEvents,
  applications,
  staffUsers,
  type ApplicationStatus,
  type StaffRole,
} from "@/db/schema";
import type { Db } from "@/db/types";

import {
  ConflictError,
  ForbiddenTransitionError,
  IncompleteApplicationError,
  NotFoundError,
} from "./errors";
import {
  businessStep,
  completeApplication,
  detailsStep,
  premisesStep,
  startDateStep,
  toFieldErrors,
  type StepName,
} from "./validation";
import { canTransition, noteRequired, statusLabels } from "./workflow";

// ---------------------------------------------------------------------------------------
// Applicant journey
// ---------------------------------------------------------------------------------------

export async function createDraft(db: Db): Promise<string> {
  const [draft] = await db.insert(applications).values({}).returning({ id: applications.id });
  return draft.id;
}

export async function getDraft(db: Db, id: string) {
  const [row] = await db
    .select({ application: applications, applicant: applicants })
    .from(applications)
    .leftJoin(applicants, eq(applicants.id, applications.applicantId))
    .where(and(eq(applications.id, id), eq(applications.status, "draft")));
  return row;
}

export type Draft = NonNullable<Awaited<ReturnType<typeof getDraft>>>;

/** Flattens a draft into the field names used by the forms. */
export function draftValues(draft: Draft): Record<string, string> {
  const { application: a, applicant: p } = draft;
  return {
    businessName: a.businessName ?? "",
    businessType: a.businessType ?? "",
    addressLine1: a.addressLine1 ?? "",
    addressLine2: a.addressLine2 ?? "",
    city: a.city ?? "",
    postcode: a.postcode ?? "",
    employees: a.employees === null ? "" : String(a.employees),
    startsOn: a.startsOn ?? "",
    fullName: p?.fullName ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    nicNumber: p?.nicNumber ?? "",
  };
}

const stepSchemas = {
  business: businessStep,
  premises: premisesStep,
  "start-date": startDateStep,
  "your-details": detailsStep,
} as const;

type SaveResult = { ok: true } | { ok: false; errors: Record<string, string> };

/** Validates one step and saves it to the draft. Only drafts can be edited. */
export async function saveStep(
  db: Db,
  id: string,
  step: StepName,
  input: Record<string, unknown>,
): Promise<SaveResult> {
  const parsed = stepSchemas[step].safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };

  await db.transaction(async (tx) => {
    const [draft] = await tx
      .select({ applicantId: applications.applicantId })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.status, "draft")))
      .for("update");
    if (!draft) throw new NotFoundError("Draft not found");

    if (step === "your-details") {
      const details = parsed.data as typeof detailsStep._output;
      if (draft.applicantId) {
        await tx.update(applicants).set(details).where(eq(applicants.id, draft.applicantId));
      } else {
        const [applicant] = await tx
          .insert(applicants)
          .values(details)
          .returning({ id: applicants.id });
        await tx
          .update(applications)
          .set({ applicantId: applicant.id })
          .where(eq(applications.id, id));
      }
      return;
    }

    const values = parsed.data as Partial<typeof applications.$inferInsert>;
    await tx.update(applications).set(values).where(eq(applications.id, id));
  });

  return { ok: true };
}

/** Returns the first step with a problem, so "check your answers" can send people back. */
export function firstIncompleteStep(errors: Record<string, string>): StepName {
  const order: [StepName, string[]][] = [
    ["business", Object.keys(businessStep.shape)],
    ["premises", Object.keys(premisesStep.shape)],
    ["start-date", Object.keys(startDateStep.shape)],
    ["your-details", Object.keys(detailsStep.shape)],
  ];
  return order.find(([, fields]) => fields.some((field) => field in errors))?.[0] ?? "business";
}

/**
 * Submits a draft in one transaction: lock the row, re-validate everything, take the next
 * reference number, change the status and write the audit event.
 */
export async function submitApplication(db: Db, id: string, now = new Date()): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ application: applications, applicant: applicants })
      .from(applications)
      .leftJoin(applicants, eq(applicants.id, applications.applicantId))
      .where(and(eq(applications.id, id), eq(applications.status, "draft")))
      .for("update", { of: applications });
    if (!row) throw new NotFoundError("Draft not found");

    const check = completeApplication.safeParse(draftValues(row));
    if (!check.success) throw new IncompleteApplicationError(toFieldErrors(check.error));

    const [{ value }] = await tx
      .select({ value: sql<string>`nextval('application_reference_seq')` })
      .from(sql`(select 1) as one`);
    const reference = formatReference(now.getUTCFullYear(), Number(value));

    await tx
      .update(applications)
      .set({
        status: "submitted",
        reference,
        submittedAt: now,
        version: sql`${applications.version} + 1`,
      })
      .where(eq(applications.id, id));

    await tx.insert(applicationEvents).values({
      applicationId: id,
      fromStatus: "draft",
      toStatus: "submitted",
      actorType: "applicant",
      createdAt: now,
    });

    return reference;
  });
}

export function formatReference(year: number, sequence: number): string {
  return `TL-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Applicants track an application with its reference and the email they applied with. */
export async function findForApplicant(db: Db, reference: string, email: string) {
  const [row] = await db
    .select({
      id: applications.id,
      reference: applications.reference,
      status: applications.status,
      businessName: applications.businessName,
      submittedAt: applications.submittedAt,
    })
    .from(applications)
    .innerJoin(applicants, eq(applicants.id, applications.applicantId))
    .where(
      and(
        eq(applications.reference, reference.trim().toUpperCase()),
        eq(sql`lower(${applicants.email})`, email.trim().toLowerCase()),
        ne(applications.status, "draft"),
      ),
    );
  if (!row) return undefined;

  const events = await db
    .select({
      toStatus: applicationEvents.toStatus,
      note: applicationEvents.note,
      createdAt: applicationEvents.createdAt,
    })
    .from(applicationEvents)
    .where(eq(applicationEvents.applicationId, row.id))
    .orderBy(desc(applicationEvents.createdAt), desc(applicationEvents.id));

  return { ...row, events };
}

/** Removes drafts nobody has touched for a while, so personal data is not kept forever. */
export async function deleteStaleDrafts(db: Db, olderThanDays = 30): Promise<number> {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(applications)
      .where(
        and(
          eq(applications.status, "draft"),
          lt(applications.updatedAt, sql`now() - make_interval(days => ${olderThanDays})`),
        ),
      )
      .returning({ applicantId: applications.applicantId });

    const applicantIds = removed
      .map((r) => r.applicantId)
      .filter((id): id is string => id !== null);
    for (const applicantId of applicantIds) {
      await tx.delete(applicants).where(eq(applicants.id, applicantId));
    }
    return removed.length;
  });
}

// ---------------------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------------------

export const PAGE_SIZE = 10;

export type ListFilters = { status?: ApplicationStatus; q?: string; page?: number };

export async function listApplications(db: Db, { status, q, page = 1 }: ListFilters) {
  const conditions = [ne(applications.status, "draft")];
  if (status) conditions.push(eq(applications.status, status));
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(ilike(applications.reference, pattern), ilike(applications.businessName, pattern))!,
    );
  }
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: applications.id,
        reference: applications.reference,
        businessName: applications.businessName,
        status: applications.status,
        submittedAt: applications.submittedAt,
        applicantName: applicants.fullName,
      })
      .from(applications)
      .innerJoin(applicants, eq(applicants.id, applications.applicantId))
      .where(where)
      .orderBy(desc(applications.submittedAt), desc(applications.reference))
      .limit(PAGE_SIZE)
      .offset((Math.max(page, 1) - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(applications).where(where),
  ]);

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function statusCounts(db: Db) {
  const rows = await db
    .select({ status: applications.status, total: count() })
    .from(applications)
    .where(ne(applications.status, "draft"))
    .groupBy(applications.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.total])) as Partial<
    Record<ApplicationStatus, number>
  >;
}

export async function getApplicationForStaff(db: Db, id: string) {
  const assignee = alias(staffUsers, "assignee");
  const [row] = await db
    .select({ application: applications, applicant: applicants, assigneeName: assignee.name })
    .from(applications)
    .innerJoin(applicants, eq(applicants.id, applications.applicantId))
    .leftJoin(assignee, eq(assignee.id, applications.assignedTo))
    .where(and(eq(applications.id, id), ne(applications.status, "draft")));
  if (!row) return undefined;

  const events = await db
    .select({
      id: applicationEvents.id,
      fromStatus: applicationEvents.fromStatus,
      toStatus: applicationEvents.toStatus,
      actorType: applicationEvents.actorType,
      staffName: staffUsers.name,
      note: applicationEvents.note,
      createdAt: applicationEvents.createdAt,
    })
    .from(applicationEvents)
    .leftJoin(staffUsers, eq(staffUsers.id, applicationEvents.staffId))
    .where(eq(applicationEvents.applicationId, id))
    .orderBy(desc(applicationEvents.createdAt), desc(applicationEvents.id));

  return { ...row, events };
}

type ChangeStatusInput = {
  applicationId: string;
  expectedVersion: number;
  to: ApplicationStatus;
  staff: { id: string; role: StaffRole };
  note?: string;
};

/**
 * Changes status with optimistic locking: the update only applies if the row still has the
 * version the staff member was looking at. Status change and audit event commit together.
 */
export async function changeStatus(db: Db, input: ChangeStatusInput, now = new Date()) {
  const note = input.note?.trim() || null;
  if (noteRequired(input.to) && !note) {
    throw new ForbiddenTransitionError(
      `Add a message to the applicant explaining why (${statusLabels[input.to]})`,
    );
  }

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: applications.status, version: applications.version })
      .from(applications)
      .where(eq(applications.id, input.applicationId));
    if (!current || current.status === "draft") throw new NotFoundError();
    if (current.version !== input.expectedVersion) throw new ConflictError();
    if (!canTransition(current.status, input.to, input.staff.role)) {
      throw new ForbiddenTransitionError(
        `A ${input.staff.role} cannot move an application from ${statusLabels[current.status]} to ${statusLabels[input.to]}`,
      );
    }

    const final = input.to === "approved" || input.to === "rejected";
    const updated = await tx
      .update(applications)
      .set({
        status: input.to,
        version: sql`${applications.version} + 1`,
        assignedTo: input.staff.id,
        decidedAt: final ? now : null,
      })
      .where(
        and(
          eq(applications.id, input.applicationId),
          eq(applications.version, input.expectedVersion),
        ),
      )
      .returning({ version: applications.version });
    // Another transaction won the race between our read and this update.
    if (updated.length === 0) throw new ConflictError();

    await tx.insert(applicationEvents).values({
      applicationId: input.applicationId,
      fromStatus: current.status,
      toStatus: input.to,
      actorType: "staff",
      staffId: input.staff.id,
      note,
      createdAt: now,
    });

    return { version: updated[0].version };
  });
}
