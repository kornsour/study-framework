import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Selects the Drizzle driver from the connection string:
 *   - Neon hosts (`*.neon.tech`) use the serverless HTTP driver (best on Vercel).
 *   - Everything else (local Homebrew Postgres) uses node-postgres over TCP.
 *
 * This is what lets the same code run against a local Postgres in development
 * and Neon in preview/production — you only change `DATABASE_URL`.
 * See docs/adr/0011-local-postgres-neon-dual-driver.md.
 *
 * Both drivers expose the same Drizzle query API, so the export is typed as a
 * single concrete database type to keep call sites cleanly typed (the two
 * driver types don't unify cleanly across overloads like `.returning(...)`).
 */
const isNeon = /\.neon\.tech/.test(env.DATABASE_URL);

export const db = (isNeon
	? drizzleNeon({ client: neon(env.DATABASE_URL), schema })
	: drizzlePg({
			client: new Pool({ connectionString: env.DATABASE_URL }),
			schema,
		})) as unknown as NodePgDatabase<typeof schema>;
