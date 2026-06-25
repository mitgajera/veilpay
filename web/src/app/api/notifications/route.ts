import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/notifications — in-app notifications, newest first. */
export const GET = handle(async () => {
  const { address } = await requireSession();
  const rows = await getDb()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userAddress, address))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);
  const unread = rows.filter((r) => !r.readAt).length;
  return ok({ notifications: jsonSafe(rows), unread });
});
