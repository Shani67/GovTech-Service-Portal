// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPgliteDb } from "@/db/pglite";
import { staffSessions, staffUsers } from "@/db/schema";
import type { Db } from "@/db/types";

import {
  authenticate,
  createSession,
  deleteExpiredSessions,
  deleteSession,
  getSessionStaff,
  hashPassword,
  verifyPassword,
} from "../auth";

let db: Db;
let close: () => Promise<void>;
let staffId: string;

beforeAll(async () => {
  ({ db, close } = await createPgliteDb());
  const [user] = await db
    .insert(staffUsers)
    .values({
      email: "Officer@Example.com",
      name: "Olivia",
      role: "officer",
      passwordHash: await hashPassword("correct horse battery staple"),
    })
    .returning();
  staffId = user.id;
});
afterAll(() => close());

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("secret-123");
    const b = await hashPassword("secret-123");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("secret-123", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword("secret-123", "not-a-hash")).toBe(false);
  });

  it("authenticates by email in any case", async () => {
    expect(
      await authenticate(db, "officer@example.com", "correct horse battery staple"),
    ).toMatchObject({ name: "Olivia", role: "officer" });
    expect(await authenticate(db, "officer@example.com", "nope")).toBeUndefined();
    expect(await authenticate(db, "nobody@example.com", "nope")).toBeUndefined();
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and resolves the staff member", async () => {
    const token = await createSession(db, staffId);
    const rows = await db.select().from(staffSessions);
    expect(rows.some((row) => row.tokenHash === token)).toBe(false);
    expect(await getSessionStaff(db, token)).toMatchObject({ id: staffId });
  });

  it("expires sessions and signs out", async () => {
    const token = await createSession(db, staffId, new Date("2026-01-01T00:00:00Z"));
    expect(await getSessionStaff(db, token, new Date("2026-01-01T07:59:00Z"))).toBeDefined();
    expect(await getSessionStaff(db, token, new Date("2026-01-01T08:01:00Z"))).toBeUndefined();

    await deleteExpiredSessions(db, new Date("2026-01-02T00:00:00Z"));
    const live = await createSession(db, staffId);
    await deleteSession(db, live);
    expect(await getSessionStaff(db, live)).toBeUndefined();
    expect(await getSessionStaff(db, undefined)).toBeUndefined();
  });
});
