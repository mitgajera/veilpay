import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { isValidAddress } from "@/lib/siws";

export const runtime = "nodejs";

/** GET /api/mints — enabled mints + metadata. */
export const GET = handle(async () => {
  const rows = await getDb().select().from(schema.mints).where(eq(schema.mints.enabled, true));
  return ok({ mints: jsonSafe(rows) });
});

/** POST /api/mints — register/whitelist a mint (any authed user for now; gate to admin later). */
export const POST = handle(async (req: Request) => {
  await requireSession();
  const body = (await req.json().catch(() => ({}))) as {
    mint?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
    logoUrl?: string;
  };
  if (!body.mint || !isValidAddress(body.mint)) return badRequest("Valid mint address required");
  if (!body.symbol || !body.name || body.decimals == null) {
    return badRequest("symbol, name and decimals required");
  }

  const [row] = await getDb()
    .insert(schema.mints)
    .values({
      mint: body.mint,
      symbol: body.symbol,
      name: body.name,
      decimals: body.decimals,
      logoUrl: body.logoUrl,
    })
    .onConflictDoUpdate({
      target: schema.mints.mint,
      set: { symbol: body.symbol, name: body.name, decimals: body.decimals, logoUrl: body.logoUrl },
    })
    .returning();

  return ok({ mint: jsonSafe(row) });
});
