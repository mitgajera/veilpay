import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, notFound, badRequest, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** POST /api/requests/:id/cancel — creator cancels an open request. */
export const POST = handle(async (_req: Request, { params }: Params) => {
  const { address } = await requireSession();
  const { id } = await params;

  const [row] = await getDb()
    .select()
    .from(schema.paymentRequests)
    .where(eq(schema.paymentRequests.id, id))
    .limit(1);
  if (!row) return notFound("Request not found");
  if (row.creatorAddress !== address) return badRequest("Only the creator can cancel");
  if (row.status !== "open") return badRequest(`Cannot cancel a ${row.status} request`);

  const [updated] = await getDb()
    .update(schema.paymentRequests)
    .set({ status: "cancelled" })
    .where(and(eq(schema.paymentRequests.id, id), eq(schema.paymentRequests.status, "open")))
    .returning();

  return ok({ request: jsonSafe(updated) });
});
