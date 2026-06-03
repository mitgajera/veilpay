import { Command } from "commander";
import { getProgram, getBalancePda } from "../solana";
import { sha256 } from "../crypto";
import { newEncryptedBalance } from "../arcium";
import { section, row, txRow, success, fail, info, spinner } from "../ui";

export function applyCmd(): Command {
  return new Command("apply")
    .description("Merge pending balance into your encrypted balance")
    .action(async () => {
      const { program, provider } = getProgram();
      const owner = provider.wallet.publicKey;

      const [balancePda] = getBalancePda(owner, program.programId);

      const spin = spinner("Checking pending balance...");
      const bal = await program.account.confidentialBalance.fetch(balancePda);
      const hasPending = !(bal.pendingBalance as number[]).every((b: number) => b === 0);
      spin.succeed("State loaded");

      if (!hasPending) {
        info("No pending balance to apply. Your balance is already up to date.");
        return;
      }

      section("Apply Pending Balance");
      row("Owner", owner.toBase58());
      row("Balance PDA", balancePda.toBase58());
      row("Pending", "⚠  has incoming transfers", true);

      const spin2 = spinner("Applying pending balance...");

      try {
        const sig = await program.methods
          .applyPendingBalance(
            [...newEncryptedBalance(3)],
            [...sha256(Buffer.alloc(32, 0x03))]
          )
          .accounts({
            confidentialBalance: balancePda,
            owner,
          })
          .rpc();

        spin2.succeed("Pending balance applied");

        section("Result");
        row("Pending", "cleared ✓");
        txRow(sig);
        success("Incoming transfers merged into your balance");
      } catch (e: any) {
        spin2.fail("Transaction failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
