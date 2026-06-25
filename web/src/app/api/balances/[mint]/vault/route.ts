import { handle, ok, badRequest, jsonSafe } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { readCtx, PublicKey } from "@/lib/veilpay";
import { getMintConfig, getVaultTokenBalance } from "@veilpay/sdk";
import { isValidAddress } from "@/lib/siws";

export const runtime = "nodejs";

type Params = { params: Promise<{ mint: string }> };

/** GET /api/balances/:mint/vault — vault token balance + mint totals. */
export const GET = handle(async (_req: Request, { params }: Params) => {
  await requireSession();
  const { mint } = await params;
  if (!isValidAddress(mint)) return badRequest("Invalid mint");

  const ctx = readCtx();
  const mintPk = new PublicKey(mint);
  const [config, vaultBalance] = await Promise.all([
    getMintConfig(ctx, mintPk),
    getVaultTokenBalance(ctx, mintPk),
  ]);

  return ok(
    jsonSafe({
      mint,
      exists: config.exists,
      vaultBalance: vaultBalance.toString(),
      totalDeposited: config.totalDeposited.toString(),
      totalWithdrawn: config.totalWithdrawn.toString(),
    }),
  );
});
