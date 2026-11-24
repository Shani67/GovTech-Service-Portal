import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { getSessionStaff, SESSION_TTL_HOURS, type StaffMember } from "@/lib/staff/auth";

export const DRAFT_COOKIE = "tl_draft";
export const STAFF_COOKIE = "tl_staff_session";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDraftId(): Promise<string | undefined> {
  const value = (await cookies()).get(DRAFT_COOKIE)?.value;
  return value && uuid.test(value) ? value : undefined;
}

export async function setDraftId(id: string) {
  // Matches the 30 day retention period for unfinished applications.
  (await cookies()).set(DRAFT_COOKIE, id, { ...base, maxAge: 30 * 24 * 60 * 60 });
}

export async function clearDraftId() {
  (await cookies()).delete(DRAFT_COOKIE);
}

export async function setStaffToken(token: string) {
  (await cookies()).set(STAFF_COOKIE, token, {
    ...base,
    sameSite: "strict",
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function getStaffToken() {
  return (await cookies()).get(STAFF_COOKIE)?.value;
}

export async function clearStaffToken() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function currentStaff(): Promise<StaffMember | undefined> {
  return getSessionStaff(await getDb(), await getStaffToken());
}

/** Use at the top of every staff page and action. */
export async function requireStaff(): Promise<StaffMember> {
  const staff = await currentStaff();
  if (!staff) redirect("/staff/sign-in");
  return staff;
}
