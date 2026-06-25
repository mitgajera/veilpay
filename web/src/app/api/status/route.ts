import { Connection, PublicKey } from "@solana/web3.js";
import { handle, ok } from "@/lib/api";
import { publicConfig, PROGRAM_ID } from "@/lib/config";

export const runtime = "nodejs";

type Health = "up" | "down" | "unknown";

/**
 * GET /api/status — aggregate health of RPC, the deployed program, and the
 * Arcium MPC cluster. Drives the "payments paused" banner in the UI.
 */
export const GET = handle(async () => {
  const connection = new Connection(publicConfig.rpcUrl, "confirmed");

  let rpc: Health = "unknown";
  let program: Health = "unknown";

  try {
    await connection.getVersion();
    rpc = "up";
  } catch {
    rpc = "down";
  }

  if (rpc === "up") {
    try {
      const info = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
      program = info?.executable ? "up" : "down";
    } catch {
      program = "down";
    }
  }

  // Arcium cluster #456 is the known blocker; trust the config flag until a live
  // probe exists. paymentsEnabled is only flipped on once the cluster is live.
  const arciumCluster: Health = publicConfig.paymentsEnabled ? "up" : "down";

  const paymentsAvailable =
    publicConfig.paymentsEnabled && rpc === "up" && program === "up" && arciumCluster === "up";

  return ok(
    {
      rpc,
      program,
      arciumCluster,
      paymentsAvailable,
      mockMode: publicConfig.mockMode,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=15" } },
  );
});
