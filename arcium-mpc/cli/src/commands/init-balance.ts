import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import pc from "picocolors";
import { loadContext } from "../context";
import { balancePda, compAccounts, finalize, randomOffset } from "../arcium";

export function initBalanceCmd() {
  return new Command("init-balance")
    .description("Create a fresh confidential balance (encrypted 0) for a mint")
    .argument("<mint>", "mint address")
    .action(async (mintStr: string) => {
      const ctx = loadContext();
      const mint = new PublicKey(mintStr);
      const bal = balancePda(ctx.program, ctx.owner.publicKey, mint);
      const off = randomOffset();

      await ctx.program.methods
        .initBalance(off)
        .accountsPartial({
          payer: ctx.owner.publicKey,
          mint,
          confidentialBalance: bal,
          ...compAccounts(ctx, "init_balance", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await finalize(ctx, off);

      console.log(pc.green("✔ confidential balance initialized"));
      console.log("  balance:", bal.toBase58());
    });
}
