import { PublicKey } from "@solana/web3.js";

export const KNOWN_TOKENS: Record<string, { mint: string; decimals: number; name: string }> = {
  usdc: {
    mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    decimals: 6,
    name: "USDC",
  },
  wsol: {
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    name: "wSOL",
  },
  usdt: {
    mint: "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS",
    decimals: 6,
    name: "USDT",
  },
};

export function resolveMint(token?: string, mint?: string): { mintPubkey: PublicKey; decimals: number; symbol: string } {
  if (token) {
    const known = KNOWN_TOKENS[token.toLowerCase()];
    if (!known) {
      console.error(`Unknown token '${token}'. Available: ${Object.keys(KNOWN_TOKENS).join(", ")}`);
      process.exit(1);
    }
    return { mintPubkey: new PublicKey(known.mint), decimals: known.decimals, symbol: known.name };
  }
  if (mint) {
    return { mintPubkey: new PublicKey(mint), decimals: 6, symbol: "Token" };
  }
  console.error("Provide --token <usdc|wsol|usdt> or --mint <address>");
  process.exit(1);
}

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
