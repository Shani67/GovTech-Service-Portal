import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";

import * as schema from "./schema";
import type { Db } from "./types";

export const migrationsFolder = path.join(process.cwd(), "drizzle");

/** A real Postgres running in-process (WebAssembly). Used for tests and zero-setup local runs. */
export async function createPgliteDb(
  dataDir?: string,
): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db: db as unknown as Db, close: () => client.close() };
}
