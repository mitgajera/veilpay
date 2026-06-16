import { Command } from "commander";
import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import pc from "picocolors";
import { loadContext } from "../context";
import {
  balancePda,
  compAccounts,
  finalize,
  mintConfigPda,
  randomOffset,
  vaultPda,
} from "../arcium";

export function withdrawCmd() {
  return new Command("withdraw")
    .description("Withdraw real tokens from the vault if the hidden balance covers it")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (public off-ramp)")
    .action(async (mintStr: string, amountStr: string) => {
      const ctx = loadContext();
      const mint = new PublicKey(mintStr);
      const amount = new anchor.BN(amountStr);

      const bal = balancePda(ctx.program, ctx.owner.publicKey, mint);
      const mintConfig = mintConfigPda(ctx.program, mint);
      const vault = vaultPda(ctx.program, mintConfig);
      const ownerTokenAccount = getAssociatedTokenAddressSync(mint, ctx.owner.publicKey);
      const off = randomOffset();

      await ctx.program.methods
        .withdrawFromAccount(off, amount)
        .accountsPartial({
          payer: ctx.owner.publicKey,
          mint,
          confidentialBalance: bal,
          ownerTokenAccount,
          vault,
          mintConfig,
          ...compAccounts(ctx, "withdraw_from_account", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await finalize(ctx, off);

      console.log(
        pc.green(`✔ withdraw of ${amountStr} requested — released iff hidden balance covered it`),
      );
    });
}
