import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

const FIELDS = [
  "transferReceived",
  "depositConfirmed",
  "requestPaid",
  "auditGranted",
  "webPushEnabled",
] as const;

/** PATCH /api/notifications/preferences — per-event toggles (upserted). */
export const PATCH = handle(async (req: Request) => {
  const { address } = await requireSession();
  const body = (await req.json().catch(() => ({}))) as Record<string, boolean>;

  const set: Record<string, boolean> = {};
  for (const f of FIELDS) {
    if (typeof body[f] === "boolean") set[f] = body[f];
  }

  const [row] = await getDb()
    .insert(schema.notificationPrefs)
    .values({ userAddress: address, ...set })
    .onConflictDoUpdate({ target: schema.notificationPrefs.userAddress, set })
    .returning();

  return ok({ preferences: jsonSafe(row) });
});

/** GET /api/notifications/preferences */
export const GET = handle(async () => {
  const { address } = await requireSession();
  const [row] = await getDb()
    .select()
    .from(schema.notificationPrefs)
    .where(eq(schema.notificationPrefs.userAddress, address))
    .limit(1);
  return ok({ preferences: jsonSafe(row ?? { userAddress: address }) });
});
