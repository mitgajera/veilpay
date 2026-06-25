import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { readCtx, PublicKey } from "@/lib/veilpay";
import { getConfidentialBalance } from "@veilpay/sdk";

export const runtime = "nodejs";

/**
 * GET /api/balances — for each enabled mint, whether the caller has a
 * confidential balance account and its nonce. The ciphertext stays encrypted;
 * decryption only happens client-side via the SDK's reveal (MPC).
 */
export const GET = handle(async () => {
  const { address } = await requireSession();
  const owner = new PublicKey(address);
  const ctx = readCtx();

  const mints = await getDb().select().from(schema.mints).where(eq(schema.mints.enabled, true));

  const balances = await Promise.all(
    mints.map(async (m) => {
      try {
        const state = await getConfidentialBalance(ctx, new PublicKey(m.mint), owner);
        return {
          mint: m.mint,
          symbol: m.symbol,
          decimals: m.decimals,
          exists: state.exists,
          nonce: state.nonce.toString(),
        };
      } catch {
        return { mint: m.mint, symbol: m.symbol, decimals: m.decimals, exists: false, nonce: "0", error: true };
      }
    }),
  );

  return ok({ balances: jsonSafe(balances) });
});
