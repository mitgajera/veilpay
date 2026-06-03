import { Command } from "commander";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { getProgram, getMintConfigPda, getBalancePda, getVaultPda } from "../solana";
import { TOKENS, FROM_TOKENS, sha256, ownerCommitment, withdrawalProofHash } from "../crypto";
import { newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, spinner } from "../ui";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export function withdrawCmd(): Command {
  return new Command("withdraw")
    .description("Withdraw tokens from the VeilPay vault to your wallet")
    .requiredOption("--amount <number>", "Amount of tokens to withdraw (e.g. 100)")
    .action(async (opts) => {
      const { program, provider, keypair, connection } = getProgram();
      const owner = provider.wallet.publicKey;
      const amount = TOKENS(Number(opts.amount));

      const [mintConfigPda] = getMintConfigPda(program.programId);
      const [balancePda] = getBalancePda(owner, program.programId);
      const [vaultPda] = getVaultPda(mintConfigPda, program.programId);

      const spin = spinner("Loading account state...");
      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      const mint = cfg.mint as PublicKey;
      const bal = await program.account.confidentialBalance.fetch(balancePda);

      const currentNonce = (bal.nonce as anchor.BN).toNumber();
      const commitment = ownerCommitment(owner);
      const proof = withdrawalProofHash(commitment, amount, currentNonce);

      const ata = await getOrCreateAssociatedTokenAccount(
        connection, keypair, mint, owner
      );
      spin.succeed("State loaded");

      section("Withdraw");
      row("Owner", owner.toBase58());
      row("Amount", `${FROM_TOKENS(amount).toLocaleString()} tokens`, true);
      row("Nonce", currentNonce.toString());
      row("ATA", ata.address.toBase58());

      const vaultRemaining = (cfg.totalDeposited as anchor.BN).toNumber()
        - (cfg.totalWithdrawn as anchor.BN).toNumber();

      if (amount > vaultRemaining) {
        fail(`Vault only has ${FROM_TOKENS(vaultRemaining)} tokens available.`);
        process.exit(1);
      }

      const spin2 = spinner("Sending withdrawal transaction...");

      try {
        const sig = await program.methods
          .withdraw(
            new anchor.BN(amount),
            [...newEncryptedBalance(4)],
            [...sha256(Buffer.alloc(32, 0x04))],
            [...proof]
          )
          .accounts({
            confidentialBalance: balancePda,
            owner,
            ownerTokenAccount: ata.address,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        spin2.succeed("Withdrawal confirmed");

        const updatedBal = await program.account.confidentialBalance.fetch(balancePda);
        section("Result");
        row("Withdrawn", `${FROM_TOKENS(amount).toLocaleString()} tokens`);
        row("Withdraw #", (updatedBal.withdrawCount as anchor.BN).toString());
        row("New nonce", (updatedBal.nonce as anchor.BN).toString());
        txRow(sig);
        success(`${FROM_TOKENS(amount)} tokens returned to your wallet`);
      } catch (e: any) {
        spin2.fail("Transaction failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
