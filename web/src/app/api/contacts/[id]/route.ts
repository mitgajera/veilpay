import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest, notFound, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/contacts/:id — edit label. */
export const PATCH = handle(async (req: Request, { params }: Params) => {
  const { address: owner } = await requireSession();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { label?: string };
  if (!body.label?.trim()) return badRequest("label required");

  const [row] = await getDb()
    .update(schema.contacts)
    .set({ label: body.label.trim() })
    .where(and(eq(schema.contacts.id, id), eq(schema.contacts.ownerAddress, owner)))
    .returning();
  if (!row) return notFound("Contact not found");
  return ok({ contact: jsonSafe(row) });
});

/** DELETE /api/contacts/:id */
export const DELETE = handle(async (_req: Request, { params }: Params) => {
  const { address: owner } = await requireSession();
  const { id } = await params;
  const [row] = await getDb()
    .delete(schema.contacts)
    .where(and(eq(schema.contacts.id, id), eq(schema.contacts.ownerAddress, owner)))
    .returning();
  if (!row) return notFound("Contact not found");
  return ok({ ok: true });
});
