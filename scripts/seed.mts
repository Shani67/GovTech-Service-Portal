import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { seed } from "../src/db/seed";
import type { Db } from "../src/db/types";

const url = process.env.DATABASE_URL;
const staffPassword = process.env.STAFF_DEMO_PASSWORD;

// Runs on every deploy, so it skips quietly when there is nothing to do.
if (!url || !staffPassword) {
  console.log("DATABASE_URL or STAFF_DEMO_PASSWORD is not set: skipping the demo data.");
  process.exit(0);
}

const client = postgres(url, { max: 1 });
const result = await seed(drizzle(client, { schema }) as unknown as Db, { staffPassword });
await client.end();
console.log(
  result.skipped
    ? "The database already has staff users: nothing to seed."
    : `Seeded ${result.applications} applications.`,
);
