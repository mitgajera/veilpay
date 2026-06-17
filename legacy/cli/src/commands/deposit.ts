import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { getProgram, getMintConfigPda, getBalancePda, getVaultPda } from "../solana";
import { resolveMint, TOKEN_PROGRAM_ID } from "../tokens";
import { sha256 } from "../crypto";
import { newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, warn, spinner } from "../ui";

export function depositCmd(): Command {
  return new Command("deposit")
    .description("Deposit tokens into the VeilPay vault")
    .requiredOption("--amount <number>", "Amount to deposit (e.g. 10)")
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

      const spin = spinner(`Loading ${symbol} accounts...`);
      const ata = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, owner);
      spin.succeed("Accounts loaded");

      section(`Deposit ${symbol}`);
      row("Owner", owner.toBase58());
      row("Token", symbol);
      row("Mint", mintPubkey.toBase58());
      row("ATA Balance", `${Number(ata.amount) / 10 ** decimals} ${symbol}`);
      row("Depositing", `${opts.amount} ${symbol}`, true);

      if (Number(ata.amount) < amount) {
        warn(`Insufficient balance: have ${Number(ata.amount) / 10 ** decimals}, need ${opts.amount}`);
        fail(`Not enough ${symbol}.`);
        process.exit(1);
      }

      const spin2 = spinner("Sending deposit...");
      try {
        const sig = await program.methods
          .deposit(
            new anchor.BN(amount),
            [...newEncryptedBalance(1)],
            [...sha256(Buffer.alloc(32, 0x01))]
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

        spin2.succeed("Deposit confirmed");
        const bal = await program.account.confidentialBalance.fetch(balancePda);
        section("Result");
        row("Deposited", `${opts.amount} ${symbol}`);
        row("Deposit #", (bal.depositCount as anchor.BN).toString());
        txRow(sig);
        success(`${opts.amount} ${symbol} deposited into vault`);
      } catch (e: any) {
        spin2.fail("Failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
