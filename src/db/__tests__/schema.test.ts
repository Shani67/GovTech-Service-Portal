// @vitest-environment node
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPgliteDb } from "../pglite";
import { applicationEvents, applications } from "../schema";
import type { Db } from "../types";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createPgliteDb());
});
afterAll(() => close());

const errorText = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "no error";
  } catch (error) {
    const e = error as { message?: string; cause?: { message?: string } };
    return `${e.message} ${e.cause?.message ?? ""}`;
  }
};

describe("database constraints", () => {
  it("allows incomplete drafts", async () => {
    const [draft] = await db.insert(applications).values({ businessName: "Half done" }).returning();
    expect(draft.status).toBe("draft");
    expect(draft.reference).toBeNull();
  });

  it("rejects a non-draft application that is missing required data", async () => {
    const message = await errorText(db.insert(applications).values({ status: "submitted" }));
    expect(message).toContain("applications_complete_when_submitted");
  });

  it("rejects negative employee counts", async () => {
    const message = await errorText(db.insert(applications).values({ employees: -1 }));
    expect(message).toContain("applications_employees_range");
  });

  it("blocks status transitions the workflow does not allow", async () => {
    const [draft] = await db.insert(applications).values({}).returning();
    const message = await errorText(
      db.execute(
        sql`update applications set status = 'approved', decided_at = now() where id = ${draft.id}`,
      ),
    );
    expect(message).toContain("Invalid status transition from draft to approved");
  });

  it("keeps the audit log append-only", async () => {
    const [draft] = await db.insert(applications).values({}).returning();
    const [event] = await db
      .insert(applicationEvents)
      .values({ applicationId: draft.id, toStatus: "draft", actorType: "system" })
      .returning();
    const message = await errorText(
      db.execute(sql`update application_events set note = 'edited' where id = ${event.id}`),
    );
    expect(message).toContain("append-only");
  });
});
