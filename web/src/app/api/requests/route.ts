import { eq, or, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { isValidAddress } from "@/lib/siws";

export const runtime = "nodejs";

/** GET /api/requests — requests I created or that target me. */
export const GET = handle(async () => {
  const { address } = await requireSession();
  const rows = await getDb()
    .select()
    .from(schema.paymentRequests)
    .where(
      or(
        eq(schema.paymentRequests.creatorAddress, address),
        eq(schema.paymentRequests.payerAddress, address),
      ),
    )
    .orderBy(desc(schema.paymentRequests.createdAt));

  const sent = rows.filter((r) => r.creatorAddress === address);
  const received = rows.filter((r) => r.payerAddress === address);
  return ok({ sent: jsonSafe(sent), received: jsonSafe(received) });
});

/** POST /api/requests — create a request → shareable /pay/:id link. */
export const POST = handle(async (req: Request) => {
  const { address: creator } = await requireSession();
  const body = (await req.json().catch(() => ({}))) as {
    mint?: string;
    amount?: string | number;
    memo?: string;
    payerAddress?: string;
    expiresInHours?: number;
  };
  if (!body.mint || !isValidAddress(body.mint)) return badRequest("Valid mint required");
  if (body.payerAddress && !isValidAddress(body.payerAddress)) {
    return badRequest("payerAddress invalid");
  }

  let amount: bigint | null = null;
  if (body.amount != null && body.amount !== "") {
    try {
      amount = BigInt(body.amount);
      if (amount <= 0n) return badRequest("amount must be positive");
    } catch {
      return badRequest("amount must be an integer (base units)");
    }
  }

  const expiresAt = body.expiresInHours
    ? new Date(Date.now() + body.expiresInHours * 3600 * 1000)
    : null;

  const [row] = await getDb()
    .insert(schema.paymentRequests)
    .values({
      creatorAddress: creator,
      payerAddress: body.payerAddress ?? null,
      mint: body.mint,
      amount,
      memo: body.memo?.slice(0, 280) ?? null,
      expiresAt,
    })
    .returning();

  return ok({ request: jsonSafe(row) });
});
