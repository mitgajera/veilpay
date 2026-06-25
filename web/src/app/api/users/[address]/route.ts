import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest, jsonSafe } from "@/lib/api";
import { isValidAddress } from "@/lib/siws";

export const runtime = "nodejs";

type Params = { params: Promise<{ address: string }> };

/** GET /api/users/:address — public profile for send/lookup. */
export const GET = handle(async (_req: Request, { params }: Params) => {
  const { address } = await params;
  if (!isValidAddress(address)) return badRequest("Invalid address");
  const [user] = await getDb()
    .select({ address: schema.users.address, displayName: schema.users.displayName, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(eq(schema.users.address, address))
    .limit(1);
  return ok({ user: jsonSafe(user ?? { address, displayName: null, avatarUrl: null }) });
});
