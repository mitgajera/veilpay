import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, notFound, badRequest, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/requests/:id/fulfilled — the payer reports a signature after sending.
 * The amount stays confidential; we only record that it was paid and notify the creator.
 */
export const POST = handle(async (req: Request, { params }: Params) => {
  const { address } = await requireSession();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { signature?: string };
  if (!body.signature) return badRequest("signature required");

  const [row] = await getDb()
    .select()
    .from(schema.paymentRequests)
    .where(eq(schema.paymentRequests.id, id))
    .limit(1);
  if (!row) return notFound("Request not found");
  if (row.status !== "open") return badRequest(`Request is ${row.status}`);

  const [updated] = await getDb()
    .update(schema.paymentRequests)
    .set({ status: "paid", fulfilledSignature: body.signature, payerAddress: address })
    .where(eq(schema.paymentRequests.id, id))
    .returning();

  await notify({
    userAddress: row.creatorAddress,
    kind: "request_paid",
    title: "Payment request fulfilled",
    body: row.memo ? `"${row.memo}" was paid.` : "Your payment request was paid.",
    data: { requestId: id, signature: body.signature },
  });

  return ok({ request: jsonSafe(updated) });
});
