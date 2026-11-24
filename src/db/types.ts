import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/** Works with both drivers: postgres.js in production and PGlite locally and in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
