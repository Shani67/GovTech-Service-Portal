// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPgliteDb } from "@/db/pglite";
import { applicants, applicationEvents, applications, staffUsers } from "@/db/schema";
import type { Db } from "@/db/types";

import { ConflictError, ForbiddenTransitionError, IncompleteApplicationError } from "../errors";
import {
  changeStatus,
  createDraft,
  deleteStaleDrafts,
  findForApplicant,
  firstIncompleteStep,
  formatReference,
  getApplicationForStaff,
  getDraft,
  listApplications,
  saveStep,
  submitApplication,
} from "../repository";
import { staffTransitions } from "../workflow";

let db: Db;
let close: () => Promise<void>;
let officer: { id: string; role: "officer" };
let manager: { id: string; role: "manager" };

beforeAll(async () => {
  ({ db, close } = await createPgliteDb());
  const [o, m] = await db
    .insert(staffUsers)
    .values([
      { email: "officer@example.com", name: "Olivia Officer", role: "officer", passwordHash: "x" },
      { email: "manager@example.com", name: "Manoj Manager", role: "manager", passwordHash: "x" },
    ])
    .returning();
  officer = { id: o.id, role: "officer" };
  manager = { id: m.id, role: "manager" };
});
afterAll(() => close());

const answers = {
  business: { businessName: "Lanka Tea Corner", businessType: "food" },
  premises: {
    addressLine1: "12 Galle Road",
    addressLine2: "",
    city: "Colombo",
    postcode: "00300",
    employees: "4",
  },
  "start-date": { startsOn: "2027-01-15" },
  "your-details": {
    fullName: "Nimal Perera",
    email: "Nimal@Example.com",
    phone: "0771234567",
    nicNumber: "851234567v",
  },
} as const;

async function submittedApplication(): Promise<{ id: string; reference: string }> {
  const id = await createDraft(db);
  for (const [step, input] of Object.entries(answers)) {
    const result = await saveStep(db, id, step as keyof typeof answers, input);
    expect(result).toEqual({ ok: true });
  }
  const reference = await submitApplication(db, id);
  return { id, reference };
}

describe("drafts", () => {
  it("saves each step and returns field errors for invalid input", async () => {
    const id = await createDraft(db);

    const invalid = await saveStep(db, id, "premises", { ...answers.premises, postcode: "ABC" });
    expect(invalid).toEqual({
      ok: false,
      errors: { postcode: "Enter a 5 digit postal code, like 10350" },
    });

    await saveStep(db, id, "business", answers.business);
    const draft = await getDraft(db, id);
    expect(draft?.application.businessName).toBe("Lanka Tea Corner");
  });

  it("creates the applicant once and updates it when details change", async () => {
    const id = await createDraft(db);
    await saveStep(db, id, "your-details", answers["your-details"]);
    await saveStep(db, id, "your-details", {
      ...answers["your-details"],
      fullName: "Nimal R. Perera",
    });

    const draft = await getDraft(db, id);
    expect(draft?.applicant?.fullName).toBe("Nimal R. Perera");
    expect(draft?.applicant?.nicNumber).toBe("851234567V");
    const rows = await db
      .select()
      .from(applicants)
      .where(eq(applicants.id, draft!.application.applicantId!));
    expect(rows).toHaveLength(1);
  });
});

describe("submitting", () => {
  it("assigns a sequential reference, changes status and writes an audit event", async () => {
    const first = await submittedApplication();
    const second = await submittedApplication();

    expect(first.reference).toMatch(new RegExp(`^TL-${new Date().getUTCFullYear()}-\\d{6}$`));
    expect(Number(second.reference.slice(-6))).toBe(Number(first.reference.slice(-6)) + 1);

    const events = await db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, first.id));
    expect(events).toMatchObject([
      { fromStatus: "draft", toStatus: "submitted", actorType: "applicant" },
    ]);
  });

  it("refuses an incomplete draft and says which step to fix", async () => {
    const id = await createDraft(db);
    await saveStep(db, id, "business", answers.business);

    const error = await submitApplication(db, id).catch((e) => e);
    expect(error).toBeInstanceOf(IncompleteApplicationError);
    expect(firstIncompleteStep(error.errors)).toBe("premises");
    expect((await getDraft(db, id))?.application.status).toBe("draft");
  });

  it("cannot edit or resubmit an application once submitted", async () => {
    const { id } = await submittedApplication();
    await expect(saveStep(db, id, "business", answers.business)).rejects.toThrow("Draft not found");
    await expect(submitApplication(db, id)).rejects.toThrow("Draft not found");
  });

  it("formats references with zero padding", () => {
    expect(formatReference(2026, 42)).toBe("TL-2026-000042");
  });
});

describe("tracking", () => {
  it("finds an application by reference and email, ignoring case", async () => {
    const { reference } = await submittedApplication();
    const found = await findForApplicant(db, reference.toLowerCase(), "NIMAL@example.COM");
    expect(found?.status).toBe("submitted");
    expect(found?.events).toHaveLength(1);
  });

  it("does not reveal applications to the wrong email", async () => {
    const { reference } = await submittedApplication();
    expect(await findForApplicant(db, reference, "someone@else.com")).toBeUndefined();
  });
});

describe("staff decisions", () => {
  it("moves through review to approval and records who did what", async () => {
    const { id } = await submittedApplication();

    const reviewed = await changeStatus(db, {
      applicationId: id,
      expectedVersion: 2,
      to: "in_review",
      staff: officer,
    });
    await changeStatus(db, {
      applicationId: id,
      expectedVersion: reviewed.version,
      to: "approved",
      staff: manager,
      note: "Inspection passed.",
    });

    const result = await getApplicationForStaff(db, id);
    expect(result?.application.status).toBe("approved");
    expect(result?.application.decidedAt).not.toBeNull();
    expect(result?.assigneeName).toBe("Manoj Manager");
    expect(result?.events.map((e) => [e.toStatus, e.staffName])).toEqual([
      ["approved", "Manoj Manager"],
      ["in_review", "Olivia Officer"],
      ["submitted", null],
    ]);
  });

  it("only lets managers make final decisions", async () => {
    const { id } = await submittedApplication();
    const { version } = await changeStatus(db, {
      applicationId: id,
      expectedVersion: 2,
      to: "in_review",
      staff: officer,
    });

    await expect(
      changeStatus(db, {
        applicationId: id,
        expectedVersion: version,
        to: "approved",
        staff: officer,
      }),
    ).rejects.toBeInstanceOf(ForbiddenTransitionError);
  });

  it("requires a message when asking for more information or rejecting", async () => {
    const { id } = await submittedApplication();
    const { version } = await changeStatus(db, {
      applicationId: id,
      expectedVersion: 2,
      to: "in_review",
      staff: officer,
    });

    await expect(
      changeStatus(db, {
        applicationId: id,
        expectedVersion: version,
        to: "rejected",
        staff: manager,
        note: " ",
      }),
    ).rejects.toThrow("Add a message to the applicant");
  });

  it("rejects a stale decision instead of overwriting a newer one", async () => {
    const { id } = await submittedApplication();
    // Two officers open the same application at version 2.
    await changeStatus(db, {
      applicationId: id,
      expectedVersion: 2,
      to: "in_review",
      staff: officer,
    });

    await expect(
      changeStatus(db, { applicationId: id, expectedVersion: 2, to: "in_review", staff: manager }),
    ).rejects.toBeInstanceOf(ConflictError);

    const events = await db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, id));
    expect(events).toHaveLength(2);
  });

  it("matches the database trigger for every staff transition", async () => {
    // Every transition the app allows must also pass the trigger in 0001_workflow_guards.sql.
    for (const transition of staffTransitions) {
      const { id } = await submittedApplication();
      const path: Record<string, string[]> = {
        submitted: [],
        in_review: ["in_review"],
        more_info_required: ["in_review", "more_info_required"],
      };
      for (const status of path[transition.from]) {
        await db.execute(sql`update applications set status = ${status} where id = ${id}`);
      }
      const final = transition.to === "approved" || transition.to === "rejected";
      await db.execute(
        sql`update applications set status = ${transition.to}, decided_at = ${final ? sql`now()` : null} where id = ${id}`,
      );
    }
  });
});

describe("staff queue", () => {
  it("filters by status, searches by name or reference and paginates", async () => {
    const { reference } = await submittedApplication();

    const all = await listApplications(db, {});
    expect(all.rows.length).toBeLessThanOrEqual(10);
    expect(all.total).toBeGreaterThan(10);
    expect(all.pageCount).toBe(Math.ceil(all.total / 10));
    expect(all.rows.every((row) => row.status !== "draft")).toBe(true);

    const byReference = await listApplications(db, { q: reference });
    expect(byReference.rows.map((row) => row.reference)).toEqual([reference]);

    const approved = await listApplications(db, { status: "approved" });
    expect(approved.rows.every((row) => row.status === "approved")).toBe(true);

    // LIKE wildcards in the search box are treated as text.
    expect((await listApplications(db, { q: "%" })).total).toBe(0);
  });
});

describe("data retention", () => {
  it("deletes old drafts and their applicant details, but not submitted applications", async () => {
    const staleId = await createDraft(db);
    await saveStep(db, staleId, "your-details", answers["your-details"]);
    await db.execute(sql`alter table applications disable trigger applications_status_transition`);
    await db
      .update(applications)
      .set({ updatedAt: new Date("2020-01-01T00:00:00Z") })
      .where(eq(applications.id, staleId));
    await db.execute(sql`alter table applications enable trigger applications_status_transition`);
    const submitted = await submittedApplication();

    const removed = await deleteStaleDrafts(db, 30);

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await getDraft(db, staleId)).toBeUndefined();
    expect(await getApplicationForStaff(db, submitted.id)).toBeDefined();
  });
});
