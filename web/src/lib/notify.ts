import { getDb, schema } from "@/db";
import { publish } from "@/lib/events";

export type NotifyInput = {
  userAddress: string;
  kind: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
};

/**
 * Persist an in-app notification, push it live over SSE, and (best-effort) fire
 * a web-push. Web push is a stub until VAPID keys + a sender are wired.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const [row] = await getDb()
    .insert(schema.notifications)
    .values({
      userAddress: input.userAddress,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    })
    .returning();

  publish(input.userAddress, "notification", {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    data: row.data,
    createdAt: row.createdAt,
  });

  // TODO: web-push to registered subscriptions (VAPID). Intentionally a no-op
  // until VAPID keys are configured; see push_subscriptions table.
}

/** Signal a balance refresh for a user/mint (UI re-reads via the SDK). */
export function signalBalanceRefresh(userAddress: string, mint: string): void {
  publish(userAddress, "balance", { mint });
}
