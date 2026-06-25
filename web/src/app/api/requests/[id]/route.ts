import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, notFound, jsonSafe } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/requests/:id — public resolution for the /pay/:id page.
 * Returns enough to render a payment screen; no private data.
 */
export const GET = handle(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const [row] = await getDb()
    .select()
    .from(schema.paymentRequests)
    .where(eq(schema.paymentRequests.id, id))
    .limit(1);
  if (!row) return notFound("Request not found");

  // Auto-expire on read.
  if (row.status === "open" && row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    await getDb()
      .update(schema.paymentRequests)
      .set({ status: "expired" })
      .where(eq(schema.paymentRequests.id, id));
    row.status = "expired";
  }

  return ok({ request: jsonSafe(row) });
});
