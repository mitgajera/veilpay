import { getDb, schema } from "@/db";
import { handle, ok, unauthorized } from "@/lib/api";
import { serverConfig } from "@/lib/config";
import { notify, signalBalanceRefresh } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/helius — inbound program tx notifications.
 *
 * Skeleton: authenticates via a shared secret (Authorization header), maps
 * Helius enhanced-tx payloads into `indexed_txs`, then notifies recipients and
 * signals balance refreshes. The exact parsing depends on the program's logged
 * events; this lays the pipe so it lights up once events are decoded.
 */
type HeliusTx = {
  signature?: string;
  slot?: number;
  timestamp?: number;
  type?: string;
  // ...enhanced fields vary; we only persist what we can map safely.
};

export const POST = handle(async (req: Request) => {
  const expected = serverConfig.heliusWebhookSecret();
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== expected) return unauthorized("Bad webhook secret");
  }

  const payload = (await req.json().catch(() => [])) as HeliusTx[];
  const events = Array.isArray(payload) ? payload : [payload];

  let indexed = 0;
  for (const ev of events) {
    if (!ev.signature || ev.slot == null) continue;

    // TODO: decode program logs to derive kind/mint/parties/publicAmount.
    // For now persist a minimal record so the activity feed/idempotency works.
    await getDb()
      .insert(schema.indexedTxs)
      .values({
        signature: ev.signature,
        slot: BigInt(ev.slot),
        kind: ev.type ?? "unknown",
        blockTime: ev.timestamp ? new Date(ev.timestamp * 1000) : null,
      })
      .onConflictDoNothing({ target: schema.indexedTxs.signature });
    indexed++;

    // Once parties are decoded, fan out notifications + refreshes, e.g.:
    // await notify({ userAddress: toAddress, kind: "transfer_received", title: "Payment received" });
    // signalBalanceRefresh(toAddress, mint);
    void notify;
    void signalBalanceRefresh;
  }

  return ok({ received: events.length, indexed });
});
