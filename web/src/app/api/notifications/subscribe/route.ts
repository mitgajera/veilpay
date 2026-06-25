import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/notifications/subscribe — register a Web Push (VAPID) subscription. */
export const POST = handle(async (req: Request) => {
  const { address } = await requireSession();
  const sub = (await req.json().catch(() => ({}))) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return badRequest("Invalid push subscription");
  }

  await getDb()
    .insert(schema.pushSubscriptions)
    .values({
      userAddress: address,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoNothing({ target: schema.pushSubscriptions.endpoint });

  return ok({ ok: true });
});

/** DELETE /api/notifications/subscribe — unsubscribe a device by endpoint. */
export const DELETE = handle(async (req: Request) => {
  const { address } = await requireSession();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!endpoint) return badRequest("endpoint required");
  await getDb()
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.endpoint, endpoint),
        eq(schema.pushSubscriptions.userAddress, address),
      ),
    );
  return ok({ ok: true });
});
