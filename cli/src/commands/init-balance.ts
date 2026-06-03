import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import { getProgram, getBalancePda } from "../solana";
import { ownerCommitment } from "../crypto";
import { section, row, txRow, success, fail, spinner } from "../ui";

export function initBalanceCmd(): Command {
  return new Command("init-balance")
    .description("Initialize your confidential balance account")
    .action(async () => {
      const { program, provider } = getProgram();
      const owner = provider.wallet.publicKey;

      const [balancePda] = getBalancePda(owner, program.programId);
      const commitment = ownerCommitment(owner);

      section("Initialize Balance Account");
      row("Owner", owner.toBase58());
      row("Balance PDA", balancePda.toBase58());

      const spin = spinner("Creating account on-chain...");

      try {
        const sig = await program.methods
          .initBalance([...commitment])
          .accounts({
            confidentialBalance: balancePda,
            owner,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        spin.succeed("Account created");
        section("Result");
        row("PDA", balancePda.toBase58());
        txRow(sig);
        success("Confidential balance account ready");
      } catch (e: any) {
        spin.fail("Transaction failed");
        if (e.message?.includes("already in use")) {
          fail("Balance account already exists for this wallet.");
        } else {
          fail(e.message ?? String(e));
        }
        process.exit(1);
      }
    });
}
