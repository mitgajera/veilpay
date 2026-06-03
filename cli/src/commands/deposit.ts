import { Command } from "commander";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { getProgram, getMintConfigPda, getBalancePda, getVaultPda } from "../solana";
import { TOKENS, FROM_TOKENS, sha256 } from "../crypto";
import { newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, warn, spinner } from "../ui";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export function depositCmd(): Command {
  return new Command("deposit")
    .description("Deposit SPL tokens into the VeilPay vault")
    .requiredOption("--amount <number>", "Amount of tokens to deposit (e.g. 100)")
    .action(async (opts) => {
      const { program, provider, keypair, connection } = getProgram();
      const owner = provider.wallet.publicKey;
      const amount = TOKENS(Number(opts.amount));

      const [mintConfigPda] = getMintConfigPda(program.programId);
      const [balancePda] = getBalancePda(owner, program.programId);
      const [vaultPda] = getVaultPda(mintConfigPda, program.programId);

      const spin = spinner("Loading account info...");
      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      const mint = cfg.mint as PublicKey;

      const ata = await getOrCreateAssociatedTokenAccount(
        connection, keypair, mint, owner
      );
      spin.succeed("Account info loaded");

      section("Deposit");
      row("Owner", owner.toBase58());
      row("Mint", mint.toBase58());
      row("ATA Balance", `${FROM_TOKENS(Number(ata.amount)).toLocaleString()} tokens`);
      row("Depositing", `${FROM_TOKENS(amount).toLocaleString()} tokens`, true);
      row("Vault", vaultPda.toBase58());

      if (Number(ata.amount) < amount) {
        warn(`Insufficient balance: have ${FROM_TOKENS(Number(ata.amount))} tokens, need ${FROM_TOKENS(amount)}`);
        fail("Not enough tokens. Run: veilpay mint-tokens --amount <n>");
        process.exit(1);
      }

      const spin2 = spinner("Sending deposit transaction...");

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
            mint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        spin2.succeed("Deposit confirmed");

        const bal = await program.account.confidentialBalance.fetch(balancePda);
        section("Result");
        row("Deposited", `${FROM_TOKENS(amount).toLocaleString()} tokens`);
        row("Deposit #", (bal.depositCount as anchor.BN).toString());
        txRow(sig);
        success(`${FROM_TOKENS(amount)} tokens deposited into vault`);
      } catch (e: any) {
        spin2.fail("Transaction failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
