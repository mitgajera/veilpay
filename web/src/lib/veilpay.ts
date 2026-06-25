import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { buildContext, type Ctx, type VeilPayWallet } from "@veilpay/sdk";
import { publicConfig } from "@/lib/config";

/**
 * A read-only wallet for server-side account reads. It can derive PDAs and fetch
 * accounts but must never sign — the privacy boundary keeps all signing in the
 * browser. Any attempt to sign throws.
 */
function readOnlyWallet(): VeilPayWallet {
  const placeholder = Keypair.generate().publicKey;
  return {
    publicKey: placeholder,
    signTransaction() {
      throw new Error("read-only context cannot sign transactions");
    },
    signAllTransactions() {
      throw new Error("read-only context cannot sign transactions");
    },
  };
}

let _ctx: Ctx | null = null;

/** Shared read-only context for indexer/read routes. */
export function readCtx(): Ctx {
  if (_ctx) return _ctx;
  _ctx = buildContext({
    connection: new Connection(publicConfig.rpcUrl, "confirmed"),
    wallet: readOnlyWallet(),
    clusterOffset: publicConfig.clusterOffset,
  });
  return _ctx;
}

export { PublicKey };
