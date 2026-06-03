import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getMintConfigPda, getBalancePda, getVaultPda } from "../solana";
import { FROM_TOKENS } from "../crypto";
import { section, row, spinner, fail, warn, explorerAddr } from "../ui";
import pc from "picocolors";

export function balanceCmd(): Command {
  return new Command("balance")
    .description("Show your VeilPay on-chain balance state")
    .action(async () => {
      const { program, provider, connection } = getProgram();
      const owner = provider.wallet.publicKey;

      const [mintConfigPda] = getMintConfigPda(program.programId);
      const [balancePda] = getBalancePda(owner, program.programId);
      const [vaultPda] = getVaultPda(mintConfigPda, program.programId);

      const spin = spinner("Fetching balance state...");

      let bal: any, cfg: any;

      try {
        bal = await program.account.confidentialBalance.fetch(balancePda);
      } catch {
        spin.fail("Balance account not found");
        fail("Run: veilpay init-balance");
        process.exit(1);
      }

      try {
        cfg = await program.account.mintConfig.fetch(mintConfigPda);
      } catch {
        // mintConfig missing — show partial info
      }

      const lamports = await connection.getBalance(owner);
      spin.succeed("Balance state loaded");

      const nonce = (bal.nonce as anchor.BN).toNumber();
      const depositCount = (bal.depositCount as anchor.BN).toNumber();
      const withdrawCount = (bal.withdrawCount as anchor.BN).toNumber();
      const hasPending = !(bal.pendingBalance as number[]).every((b: number) => b === 0);

      section("Wallet");
      row("Address", owner.toBase58());
      row("Explorer", explorerAddr(owner.toBase58()));
      row("Balance PDA", balancePda.toBase58());

      section("Confidential Balance");
      row("Nonce", nonce.toString());
      row("Deposits", depositCount.toString());
      row("Withdrawals", withdrawCount.toString());
      row(
        "Pending",
        hasPending ? "⚠  YES — run: veilpay apply" : "none ✓",
        hasPending
      );
      row("Frozen", bal.isFrozen ? "⛔ YES" : "no ✓", bal.isFrozen);

      if (cfg) {
        const totalDeposited = (cfg.totalDeposited as anchor.BN).toNumber();
        const totalWithdrawn = (cfg.totalWithdrawn as anchor.BN).toNumber();
        const vaultBalance = totalDeposited - totalWithdrawn;

        section("Program Stats");
        row("Mint", (cfg.mint as any).toBase58());
        row("Total Deposited", `${FROM_TOKENS(totalDeposited).toLocaleString()} tokens`);
        row("Total Withdrawn", `${FROM_TOKENS(totalWithdrawn).toLocaleString()} tokens`);
        row("Vault Balance", `${FROM_TOKENS(vaultBalance).toLocaleString()} tokens`, true);
      }

      section("SOL");
      row("Balance", `${(lamports / 1e9).toFixed(4)} SOL`, lamports < 0.05 * 1e9);
      if (lamports < 0.05 * 1e9) {
        warn("Low SOL — transactions may fail. Run: solana airdrop 1 --url devnet");
      }

      console.log();
    });
}
