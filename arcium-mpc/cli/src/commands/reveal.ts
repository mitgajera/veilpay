import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import pc from "picocolors";
import { loadContext } from "../context";
import { balancePda, compAccounts, finalize, randomOffset } from "../arcium";

export function revealCmd() {
  return new Command("reveal")
    .description("Reveal your own confidential balance (decrypts via MPC, emits plaintext)")
    .argument("<mint>", "mint address")
    .action(async (mintStr: string) => {
      const ctx = loadContext();
      const mint = new PublicKey(mintStr);
      const bal = balancePda(ctx.program, ctx.owner.publicKey, mint);
      const off = randomOffset();

      // Register the event listener BEFORE queuing so we don't miss the callback.
      let listenerId: number;
      const revealed = new Promise<bigint>((res) => {
        listenerId = ctx.program.addEventListener("accountBalanceRevealedEvent", (ev: any) =>
          res(BigInt(ev.balance.toString())),
        );
      });

      await ctx.program.methods
        .revealAccountBalance(off)
        .accountsPartial({
          payer: ctx.owner.publicKey,
          mint,
          confidentialBalance: bal,
          ...compAccounts(ctx, "reveal_account_balance", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await finalize(ctx, off);

      const balance = await revealed;
      await ctx.program.removeEventListener(listenerId!);

      console.log(pc.green("✔ balance revealed"));
      console.log("  balance:", balance.toString());
    });
}
