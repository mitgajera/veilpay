import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/auth/me — current session user, or null. */
export const GET = handle(async () => {
  const session = await getSession();
  if (!session) return ok({ user: null });

  const [user] = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.address, session.address))
    .limit(1);

  return ok({ user: user ?? { address: session.address } });
});
