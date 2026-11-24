import { and, eq, gt, lt, sql } from "drizzle-orm";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { staffSessions, staffUsers, type StaffRole } from "@/db/schema";
import type { Db } from "@/db/types";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const SESSION_TTL_HOURS = 8;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return ["scrypt", salt.toString("base64"), key.toString("base64")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

// Used when the email does not exist, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = [
  "scrypt",
  Buffer.alloc(16).toString("base64"),
  Buffer.alloc(KEY_LENGTH).toString("base64"),
].join(":");

export type StaffMember = { id: string; name: string; email: string; role: StaffRole };

export async function authenticate(
  db: Db,
  email: string,
  password: string,
): Promise<StaffMember | undefined> {
  const [user] = await db
    .select()
    .from(staffUsers)
    .where(eq(sql`lower(${staffUsers.email})`, email.trim().toLowerCase()));
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return undefined;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a session and returns the raw token for the cookie. Only its hash is stored. */
export async function createSession(db: Db, staffId: string, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(staffSessions).values({
    tokenHash: hashToken(token),
    staffId,
    expiresAt: new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000),
  });
  return token;
}

export async function getSessionStaff(
  db: Db,
  token: string | undefined,
  now = new Date(),
): Promise<StaffMember | undefined> {
  if (!token) return undefined;
  const [row] = await db
    .select({
      id: staffUsers.id,
      name: staffUsers.name,
      email: staffUsers.email,
      role: staffUsers.role,
    })
    .from(staffSessions)
    .innerJoin(staffUsers, eq(staffUsers.id, staffSessions.staffId))
    .where(and(eq(staffSessions.tokenHash, hashToken(token)), gt(staffSessions.expiresAt, now)));
  return row;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(staffSessions).where(eq(staffSessions.tokenHash, hashToken(token)));
}

export async function deleteExpiredSessions(db: Db, now = new Date()): Promise<void> {
  await db.delete(staffSessions).where(lt(staffSessions.expiresAt, now));
}
