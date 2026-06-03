import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import { getProgram, getBalancePda } from "../solana";
import { section, row, txRow, success, fail, warn, spinner } from "../ui";
import * as anchor from "@coral-xyz/anchor";

export function closeCmd(): Command {
  return new Command("close")
    .description("Close your confidential balance account and reclaim rent")
    .action(async () => {
      const { program, provider, connection } = getProgram();
      const owner = provider.wallet.publicKey;
      const [balancePda] = getBalancePda(owner, program.programId);

      const spin = spinner("Checking account state...");
      let bal: any;
      try {
        bal = await program.account.confidentialBalance.fetch(balancePda);
      } catch {
        spin.fail("Account not found");
        fail("No balance account to close. Run: veilpay init-balance first.");
        process.exit(1);
      }
      spin.succeed("State loaded");

      const encZero = (bal.encryptedBalance as number[]).every((b: number) => b === 0);
      const pendingZero = (bal.pendingBalance as number[]).every((b: number) => b === 0);

      section("Close Balance Account");
      row("Owner", owner.toBase58());
      row("Balance PDA", balancePda.toBase58());
      row("Encrypted balance", encZero ? "zero ✓" : "NON-ZERO ✗", !encZero);
      row("Pending balance", pendingZero ? "zero ✓" : "NON-ZERO ✗", !pendingZero);

      if (!encZero) {
        warn("Encrypted balance is not zero — withdraw all funds first.");
        fail("Run: veilpay withdraw --token <token> --amount <n>");
        process.exit(1);
      }
      if (!pendingZero) {
        warn("Pending balance is not zero — apply pending first.");
        fail("Run: veilpay apply");
        process.exit(1);
      }

      const lamportsBefore = await connection.getBalance(owner);
      const spin2 = spinner("Closing account...");

      try {
        const sig = await program.methods
          .closeAccount()
          .accounts({
            confidentialBalance: balancePda,
            owner,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        spin2.succeed("Account closed");

        const lamportsAfter = await connection.getBalance(owner);
        const refunded = (lamportsAfter - lamportsBefore) / 1e9;

        section("Result");
        row("Status", "closed ✓");
        row("Rent refunded", `~${refunded.toFixed(4)} SOL`);
        txRow(sig);
        success("Balance account closed and rent reclaimed");
      } catch (e: any) {
        spin2.fail("Failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
