import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { seed } from "../src/db/seed";
import type { Db } from "../src/db/types";

const url = process.env.DATABASE_URL;
const staffPassword = process.env.STAFF_DEMO_PASSWORD;

if (!url || !staffPassword) {
  console.error("Set DATABASE_URL and STAFF_DEMO_PASSWORD to seed a database.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const result = await seed(drizzle(client, { schema }) as unknown as Db, { staffPassword });
await client.end();
console.log(
  result.skipped
    ? "Database already has staff users: nothing to seed."
    : `Seeded ${result.applications} applications.`,
);
