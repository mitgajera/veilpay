import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getBalancePda } from "../solana";
import { transferCommitment } from "../crypto";
import { encryptAmount, encryptTag, newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, info, warn, spinner } from "../ui";

export function batchSendCmd(): Command {
  return new Command("batch-send")
    .description("Send private transfers to up to 5 recipients in one transaction")
    .requiredOption(
      "--to <pubkeys>",
      "Comma-separated recipient pubkeys (max 5)"
    )
    .requiredOption("--amount <number>", "Amount per recipient (e.g. 10)")
    .action(async (opts) => {
      const { program, provider } = getProgram();
      const sender = provider.wallet.publicKey;

      const recipients = (opts.to as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (recipients.length === 0 || recipients.length > 5) {
        fail("Provide 1–5 comma-separated recipient pubkeys.");
        process.exit(1);
      }

      const amount = Number(opts.amount);
      const [senderBalancePda] = getBalancePda(sender, program.programId);

      const spin = spinner("Loading accounts...");

      let senderBal: any;
      try {
        senderBal = await program.account.confidentialBalance.fetch(senderBalancePda);
      } catch {
        spin.fail("Sender account not found");
        fail("Run: veilpay init-balance");
        process.exit(1);
      }

      // Load all receiver balances
      const receiverAccounts: {
        pubkey: PublicKey;
        balancePda: PublicKey;
        ownerCommitment: Buffer;
      }[] = [];

      for (const addr of recipients) {
        const receiverPubkey = new PublicKey(addr);
        const [balPda] = getBalancePda(receiverPubkey, program.programId);
        try {
          const rBal = await program.account.confidentialBalance.fetch(balPda);
          receiverAccounts.push({
            pubkey: receiverPubkey,
            balancePda: balPda,
            ownerCommitment: Buffer.from(rBal.ownerCommitment as number[]),
          });
        } catch {
          spin.fail(`Receiver ${addr.slice(0, 8)}... not initialized`);
          fail(`That wallet has not run: veilpay init-balance`);
          process.exit(1);
        }
      }

      spin.succeed("All accounts loaded");

      const currentNonce = (senderBal.nonce as anchor.BN).toNumber();
      const senderNewBal = newEncryptedBalance(2);

      // Build transfers array
      const transfers = receiverAccounts.map(({ pubkey, ownerCommitment }) => {
        const encAmt = encryptAmount(amount);
        const encTag = encryptTag(pubkey.toBuffer());
        const commitHash = transferCommitment(encAmt, currentNonce, ownerCommitment);
        return {
          encryptedAmount: [...encAmt],
          commitmentHash: [...commitHash],
          encryptedReceiverTag: [...encTag],
        };
      });

      section("Batch Transfer");
      row("From", sender.toBase58());
      row("Recipients", recipients.length.toString());
      row("Amount each", `${amount} tokens (encrypted)`, true);
      row("Total", `${amount * recipients.length} tokens`);
      row("Nonce", currentNonce.toString());
      recipients.forEach((r, i) => row(`  Recipient ${i + 1}`, r.slice(0, 20) + "..."));

      const remainingAccounts = receiverAccounts.map(({ balancePda }) => ({
        pubkey: balancePda,
        isWritable: true,
        isSigner: false,
      }));

      const spin2 = spinner("Sending batch transfer...");

      try {
        const sig = await program.methods
          .batchTransfer(
            transfers as any,
            [...senderNewBal] as any,
            new anchor.BN(currentNonce)
          )
          .accounts({
            senderBalance: senderBalancePda,
            sender,
          })
          .remainingAccounts(remainingAccounts)
          .rpc();

        spin2.succeed("Batch transfer confirmed");

        section("Result");
        row("Recipients", recipients.length.toString());
        row("Amount each", `${amount} tokens`);
        row("New nonce", (currentNonce + 1).toString());
        txRow(sig);
        success(`Sent ${amount} tokens privately to ${recipients.length} recipients`);
        info("Each recipient must run: veilpay apply");
      } catch (e: any) {
        spin2.fail("Failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
