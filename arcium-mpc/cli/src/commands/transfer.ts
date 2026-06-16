import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import pc from "picocolors";
import { loadContext } from "../context";
import { balancePda, compAccounts, finalize, getMXEPublicKeyWithRetry, randomOffset } from "../arcium";
import { encryptValue } from "../crypto";

export function transferCmd() {
  return new Command("transfer")
    .description("Confidentially transfer an encrypted amount to another owner's balance")
    .argument("<mint>", "mint address")
    .argument("<receiver>", "receiver wallet address")
    .argument("<amount>", "amount in base units (kept private)")
    .action(async (mintStr: string, receiverStr: string, amountStr: string) => {
      const ctx = loadContext();
      const mint = new PublicKey(mintStr);
      const receiver = new PublicKey(receiverStr);

      const senderBalance = balancePda(ctx.program, ctx.owner.publicKey, mint);
      const receiverBalance = balancePda(ctx.program, receiver, mint);

      const mxeKey = await getMXEPublicKeyWithRetry(ctx);
      const enc = encryptValue(mxeKey, BigInt(amountStr));
      const off = randomOffset();

      await ctx.program.methods
        .transferBetweenAccounts(off, enc.ciphertext, enc.publicKey, enc.nonceBN)
        .accountsPartial({
          payer: ctx.owner.publicKey,
          mint,
          receiver,
          senderBalance,
          receiverBalance,
          ...compAccounts(ctx, "transfer_between_accounts", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await finalize(ctx, off);

      console.log(pc.green(`✔ transferred ${amountStr} (private) → ${receiver.toBase58()}`));
    });
}
