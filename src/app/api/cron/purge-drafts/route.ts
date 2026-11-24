import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { deleteStaleDrafts } from "@/lib/applications/repository";
import { deleteExpiredSessions } from "@/lib/staff/auth";

/**
 * Data retention job, run daily by Vercel Cron (see vercel.json).
 * Vercel sends CRON_SECRET as a bearer token; without the secret the job is disabled.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const drafts = await deleteStaleDrafts(db, 30);
  await deleteExpiredSessions(db);
  return NextResponse.json({ deletedDrafts: drafts });
}
