import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getMintConfigPda, getBalancePda, getVaultPda } from "../solana";
import { resolveMint } from "../tokens";
import { section, row, spinner, fail, warn, explorerAddr } from "../ui";

export function balanceCmd(): Command {
  return new Command("balance")
    .description("Show your VeilPay balance state")
    .option("--token <name>", "Token: usdc | wsol | usdt")
    .option("--mint <pubkey>", "Custom mint address")
    .action(async (opts) => {
      const { program, provider, connection } = getProgram();
      const owner = provider.wallet.publicKey;

      // If no token specified, try to show SOL balance + info about supported tokens
      if (!opts.token && !opts.mint) {
        const spin = spinner("Fetching wallet state...");
        const [balancePda] = getBalancePda(owner, program.programId);
        let bal: any;
        try {
          bal = await program.account.confidentialBalance.fetch(balancePda);
        } catch { /* not initialized */ }
        const lamports = await connection.getBalance(owner);
        spin.succeed("Loaded");

        section("Wallet");
        row("Address", owner.toBase58());
        row("Explorer", explorerAddr(owner.toBase58()));

        section("SOL");
        row("Balance", `${(lamports / 1e9).toFixed(4)} SOL`);
        if (lamports < 0.05 * 1e9) warn("Low SOL — transactions may fail");

        section("VeilPay Balance Account");
        if (bal) {
          row("PDA", balancePda.toBase58());
          row("Nonce", (bal.nonce as anchor.BN).toString());
          row("Deposits", (bal.depositCount as anchor.BN).toString());
          row("Withdrawals", (bal.withdrawCount as anchor.BN).toString());
          const hasPending = !(bal.pendingBalance as number[]).every((b: number) => b === 0);
          row("Pending", hasPending ? "⚠  YES — run: veilpay apply" : "none ✓", hasPending);
          row("Frozen", bal.isFrozen ? "⛔ YES" : "no ✓");
        } else {
          row("Status", "Not initialized — run: veilpay init-balance");
        }

        section("Supported Tokens");
        row("USDC", "veilpay balance --token usdc");
        row("wSOL", "veilpay balance --token wsol");
        console.log();
        return;
      }

      const { mintPubkey, decimals, symbol } = resolveMint(opts.token, opts.mint);
      const [mintConfigPda] = getMintConfigPda(program.programId, mintPubkey);
      const [balancePda] = getBalancePda(owner, program.programId);

      const spin = spinner(`Fetching ${symbol} balance state...`);

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
      } catch { /* not yet initialized for this token */ }

      const lamports = await connection.getBalance(owner);
      spin.succeed("Loaded");

      section(`Wallet — ${symbol}`);
      row("Address", owner.toBase58());
      row("Balance PDA", balancePda.toBase58());

      section("Confidential Balance");
      row("Nonce", (bal.nonce as anchor.BN).toString());
      row("Deposits", (bal.depositCount as anchor.BN).toString());
      row("Withdrawals", (bal.withdrawCount as anchor.BN).toString());
      const hasPending = !(bal.pendingBalance as number[]).every((b: number) => b === 0);
      row("Pending", hasPending ? "⚠  YES — run: veilpay apply" : "none ✓", hasPending);
      row("Frozen", bal.isFrozen ? "⛔ YES" : "no ✓");

      if (cfg) {
        const totalDep = (cfg.totalDeposited as anchor.BN).toNumber();
        const totalWith = (cfg.totalWithdrawn as anchor.BN).toNumber();
        section(`${symbol} Vault Stats`);
        row("Mint", mintPubkey.toBase58());
        row("Total Deposited", `${totalDep / 10 ** decimals} ${symbol}`);
        row("Total Withdrawn", `${totalWith / 10 ** decimals} ${symbol}`);
        row("Vault Balance", `${(totalDep - totalWith) / 10 ** decimals} ${symbol}`, true);
      } else {
        section(`${symbol} Vault`);
        row("Status", `Not initialized — run: veilpay init-existing-mint --token ${opts.token ?? symbol.toLowerCase()}`);
      }

      section("SOL");
      row("Balance", `${(lamports / 1e9).toFixed(4)} SOL`);
      if (lamports < 0.05 * 1e9) warn("Low SOL — transactions may fail");
      console.log();
    });
}
