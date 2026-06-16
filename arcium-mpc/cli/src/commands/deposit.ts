import { Command } from "commander";
import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
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

export function depositCmd() {
  return new Command("deposit")
    .description("Deposit real tokens into the vault and credit the confidential balance")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (public on-ramp)")
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
        .depositToAccount(off, amount)
        .accountsPartial({
          payer: ctx.owner.publicKey,
          mint,
          confidentialBalance: bal,
          ownerTokenAccount,
          vault,
          mintConfig,
          tokenProgram: TOKEN_PROGRAM_ID,
          ...compAccounts(ctx, "deposit_to_account", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await finalize(ctx, off);

      console.log(pc.green(`✔ deposited ${amountStr} (public) → confidential balance credited`));
    });
}
