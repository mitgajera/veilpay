import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { serverConfig } from "@/lib/config";

/**
 * Neon serverless HTTP driver — works in Vercel edge/serverless without a pool.
 * Lazily instantiated so a missing DATABASE_URL doesn't crash pages that never
 * touch the DB (e.g. the landing page in mock mode).
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = serverConfig.databaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set — required for database-backed routes.");
  }
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export { schema };
