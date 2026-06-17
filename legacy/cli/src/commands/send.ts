import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getBalancePda } from "../solana";
import { transferCommitment } from "../crypto";
import { encryptAmount, encryptTag, newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, info, spinner } from "../ui";

export function sendCmd(): Command {
  return new Command("send")
    .description("Send a private transfer to another wallet")
    .requiredOption("--to <pubkey>", "Recipient wallet public key")
    .requiredOption("--amount <number>", "Amount to transfer (e.g. 50)")
    .action(async (opts) => {
      const { program, provider } = getProgram();
      const sender = provider.wallet.publicKey;
      const receiverPubkey = new PublicKey(opts.to);
      const amount = Number(opts.amount);

      if (sender.equals(receiverPubkey)) {
        fail("Cannot send to yourself");
        process.exit(1);
      }

      const [senderBalancePda] = getBalancePda(sender, program.programId);
      const [receiverBalancePda] = getBalancePda(receiverPubkey, program.programId);

      const spin = spinner("Loading sender and receiver state...");

      let senderBal: any, receiverBal: any;
      try {
        senderBal = await program.account.confidentialBalance.fetch(senderBalancePda);
      } catch {
        spin.fail("Sender account not found");
        fail("Run: veilpay init-balance");
        process.exit(1);
      }
      try {
        receiverBal = await program.account.confidentialBalance.fetch(receiverBalancePda);
      } catch {
        spin.fail("Receiver account not found");
        fail(`Receiver ${opts.to.slice(0, 8)}... has not initialized a VeilPay balance.`);
        info("They must run: veilpay init-balance");
        process.exit(1);
      }

      spin.succeed("Accounts loaded");

      const currentNonce = (senderBal.nonce as anchor.BN).toNumber();
      const receiverCommitment = Buffer.from(receiverBal.ownerCommitment as number[]);
      const encAmt = encryptAmount(amount);
      const encTag = encryptTag(receiverPubkey.toBuffer());
      const senderNewBal = newEncryptedBalance(2);
      const commitHash = transferCommitment(encAmt, currentNonce, receiverCommitment);

      section("Private Transfer");
      row("From", sender.toBase58());
      row("To", receiverPubkey.toBase58());
      row("Amount", `${amount} tokens (encrypted)`, true);
      row("Nonce", currentNonce.toString());

      const spin2 = spinner("Sending private transfer...");

      try {
        const sig = await program.methods
          .privateTransfer(
            [...encAmt],
            [...senderNewBal],
            [...commitHash],
            [...encTag],
            new anchor.BN(currentNonce)
          )
          .accounts({
            senderBalance: senderBalancePda,
            receiverBalance: receiverBalancePda,
            sender,
          })
          .rpc();

        spin2.succeed("Transfer confirmed");

        section("Result");
        row("Amount sent", `${amount} tokens`);
        row("New nonce", (currentNonce + 1).toString());
        txRow(sig);
        success("Private transfer sent");
        info("Recipient must run: veilpay apply");
      } catch (e: any) {
        spin2.fail("Transaction failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
