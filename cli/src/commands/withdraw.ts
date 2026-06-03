import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { getProgram, getMintConfigPda, getBalancePda, getVaultPda } from "../solana";
import { resolveMint, TOKEN_PROGRAM_ID } from "../tokens";
import { sha256, ownerCommitment, withdrawalProofHash } from "../crypto";
import { newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, spinner } from "../ui";

export function withdrawCmd(): Command {
  return new Command("withdraw")
    .description("Withdraw tokens from the VeilPay vault")
    .requiredOption("--amount <number>", "Amount to withdraw (e.g. 50)")
    .option("--token <name>", "Token: usdc | wsol | usdt")
    .option("--mint <pubkey>", "Custom mint address")
    .action(async (opts) => {
      const { program, provider, keypair, connection } = getProgram();
      const owner = provider.wallet.publicKey;
      const { mintPubkey, decimals, symbol } = resolveMint(opts.token, opts.mint);
      const amount = Math.round(Number(opts.amount) * 10 ** decimals);

      const [mintConfigPda] = getMintConfigPda(program.programId, mintPubkey);
      const [balancePda] = getBalancePda(owner, program.programId);
      const [vaultPda] = getVaultPda(mintConfigPda, program.programId);

      const spin = spinner("Loading state...");
      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      const bal = await program.account.confidentialBalance.fetch(balancePda);
      const ata = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, owner);
      spin.succeed("State loaded");

      const currentNonce = (bal.nonce as anchor.BN).toNumber();
      const commitment = ownerCommitment(owner);
      const proof = withdrawalProofHash(commitment, amount, currentNonce);

      const vaultBalance = (cfg.totalDeposited as anchor.BN).toNumber()
        - (cfg.totalWithdrawn as anchor.BN).toNumber();

      section(`Withdraw ${symbol}`);
      row("Owner", owner.toBase58());
      row("Token", symbol);
      row("Withdrawing", `${opts.amount} ${symbol}`, true);
      row("Vault Balance", `${vaultBalance / 10 ** decimals} ${symbol}`);
      row("Nonce", currentNonce.toString());

      if (amount > vaultBalance) {
        fail(`Vault only has ${vaultBalance / 10 ** decimals} ${symbol}`);
        process.exit(1);
      }

      const spin2 = spinner("Sending withdrawal...");
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
            mint: mintPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        spin2.succeed("Withdrawal confirmed");
        const updated = await program.account.confidentialBalance.fetch(balancePda);
        section("Result");
        row("Withdrawn", `${opts.amount} ${symbol}`);
        row("Withdraw #", (updated.withdrawCount as anchor.BN).toString());
        row("New nonce", (updated.nonce as anchor.BN).toString());
        txRow(sig);
        success(`${opts.amount} ${symbol} returned to your wallet`);
      } catch (e: any) {
        spin2.fail("Failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
