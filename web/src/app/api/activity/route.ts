import { and, desc, eq, lt, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/activity?cursor=<slot>&limit=<n> — the caller's indexed on-chain
 * events (deposits, transfers in/out, withdrawals, reveals). Confidential
 * transfers carry no amount. Empty until the indexer/webhook is fed.
 */
export const GET = handle(async (req: Request) => {
  const { address } = await requireSession();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 100);
  const cursor = url.searchParams.get("cursor"); // slot to page before

  const mine = or(
    eq(schema.indexedTxs.fromAddress, address),
    eq(schema.indexedTxs.toAddress, address),
  );
  const where = cursor ? and(mine, lt(schema.indexedTxs.slot, BigInt(cursor))) : mine;

  const rows = await getDb()
    .select()
    .from(schema.indexedTxs)
    .where(where)
    .orderBy(desc(schema.indexedTxs.slot))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1]?.slot.toString() : null;

  return ok(jsonSafe({ activity: page, nextCursor }));
});
