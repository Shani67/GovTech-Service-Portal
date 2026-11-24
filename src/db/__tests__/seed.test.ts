// @vitest-environment node
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authenticate } from "@/lib/staff/auth";

import { createPgliteDb } from "../pglite";
import { applicationEvents, applications } from "../schema";
import { seed } from "../seed";
import type { Db } from "../types";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createPgliteDb());
});
afterAll(() => close());

describe("seed", () => {
  it("creates staff and applications in every status with audit trails", async () => {
    const result = await seed(db, { staffPassword: "test-password" });
    expect(result).toEqual({ skipped: false, applications: 22 });

    const byStatus = await db
      .select({ status: applications.status, total: count() })
      .from(applications)
      .groupBy(applications.status);
    expect(byStatus.map((row) => row.status).sort()).toEqual(
      ["approved", "in_review", "more_info_required", "rejected", "submitted"].sort(),
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(applicationEvents)
      .where(eq(applicationEvents.toStatus, "approved"));
    expect(total).toBe(5);

    expect(await authenticate(db, "manager@council.example", "test-password")).toMatchObject({
      role: "manager",
    });
  });

  it("does nothing when the database already has staff", async () => {
    expect(await seed(db, { staffPassword: "x" })).toEqual({ skipped: true });
  });
});
