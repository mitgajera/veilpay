import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/users/me — profile + prefs. */
export const GET = handle(async () => {
  const { address } = await requireSession();
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.address, address)).limit(1);
  return ok({ user: jsonSafe(user ?? { address }) });
});

/** PATCH /api/users/me — update display name / avatar. */
export const PATCH = handle(async (req: Request) => {
  const { address } = await requireSession();
  const body = (await req.json().catch(() => ({}))) as { displayName?: string; avatarUrl?: string };

  const set: Record<string, string | null> = { updatedAt: new Date() as unknown as string };
  if (body.displayName !== undefined) set.displayName = body.displayName.slice(0, 64) || null;
  if (body.avatarUrl !== undefined) set.avatarUrl = body.avatarUrl || null;

  const [user] = await getDb()
    .insert(schema.users)
    .values({ address, displayName: body.displayName ?? null, avatarUrl: body.avatarUrl ?? null })
    .onConflictDoUpdate({ target: schema.users.address, set })
    .returning();

  return ok({ user: jsonSafe(user) });
});
