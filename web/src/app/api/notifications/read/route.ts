import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/notifications/read — mark { ids } or all as read. */
export const POST = handle(async (req: Request) => {
  const { address } = await requireSession();
  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };

  const base = and(
    eq(schema.notifications.userAddress, address),
    isNull(schema.notifications.readAt),
  );
  const where =
    body.ids && body.ids.length
      ? and(base, inArray(schema.notifications.id, body.ids))
      : base;

  await getDb().update(schema.notifications).set({ readAt: new Date() }).where(where);
  return ok({ ok: true });
});
