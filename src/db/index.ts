import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import path from "node:path";
import postgres from "postgres";

import * as schema from "./schema";
import { seed } from "./seed";
import type { Db } from "./types";

export type { Db } from "./types";

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Production: a real PostgreSQL server (for example Neon or Supabase).
    // Migrations run at deploy time with `npm run db:migrate`.
    const client = postgres(url, { max: 5, prepare: false });
    return drizzle(client, { schema }) as unknown as Db;
  }

  // No DATABASE_URL: run Postgres in-process with PGlite, so the app works with zero setup.
  // Data is kept in .data/pglite during development and in memory elsewhere (demo mode).
  const { createPgliteDb } = await import("./pglite");
  const dataDir =
    process.env.PGLITE_DATA_DIR ??
    (process.env.NODE_ENV === "development"
      ? path.join(process.cwd(), ".data", "pglite")
      : undefined);
  const { db } = await createPgliteDb(dataDir);
  await seed(db, { staffPassword: process.env.STAFF_DEMO_PASSWORD ?? "demo-password" });
  return db;
}

const globalForDb = globalThis as unknown as { dbPromise?: Promise<Db> };

/** One shared connection per server process, also across hot reloads in development. */
export function getDb(): Promise<Db> {
  globalForDb.dbPromise ??= connect().catch((error) => {
    globalForDb.dbPromise = undefined;
    throw error;
  });
  return globalForDb.dbPromise;
}

export const isDemoDatabase = !process.env.DATABASE_URL;
