import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { isValidAddress } from "@/lib/siws";

export const runtime = "nodejs";

/** GET /api/contacts — the caller's address book. */
export const GET = handle(async () => {
  const { address } = await requireSession();
  const rows = await getDb()
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.ownerAddress, address))
    .orderBy(desc(schema.contacts.createdAt));
  return ok({ contacts: jsonSafe(rows) });
});

/** POST /api/contacts — add { label, address }. */
export const POST = handle(async (req: Request) => {
  const { address: owner } = await requireSession();
  const body = (await req.json().catch(() => ({}))) as { label?: string; address?: string };
  if (!body.label?.trim()) return badRequest("label required");
  if (!body.address || !isValidAddress(body.address)) return badRequest("Valid address required");
  if (body.address === owner) return badRequest("Cannot add yourself");

  const existing = await getDb()
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.ownerAddress, owner), eq(schema.contacts.address, body.address)))
    .limit(1);
  if (existing.length) return badRequest("Contact already exists");

  const [row] = await getDb()
    .insert(schema.contacts)
    .values({ ownerAddress: owner, label: body.label.trim(), address: body.address })
    .returning();
  return ok({ contact: jsonSafe(row) });
});
