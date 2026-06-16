import { Command } from "commander";
import pc from "picocolors";
import { loadContext } from "../context";
import { ensureCompDef } from "../arcium";

/** Circuits the vault flows use, with their on-chain init methods. */
const DEFS: [string, string][] = [
  ["init_balance", "initInitBalanceCompDef"],
  ["deposit_to_account", "initDepositToAccountCompDef"],
  ["withdraw_from_account", "initWithdrawFromAccountCompDef"],
  ["transfer_between_accounts", "initTransferBetweenAccountsCompDef"],
  ["reveal_account_balance", "initRevealAccountBalanceCompDef"],
];

export function initCompDefsCmd() {
  return new Command("init-comp-defs")
    .description("Register + upload the circuit computation definitions (one-time per program)")
    .action(async () => {
      const ctx = loadContext();
      for (const [circuit, method] of DEFS) {
        process.stdout.write(`  ${circuit} … `);
        await ensureCompDef(ctx, circuit, method);
        console.log(pc.green("ok"));
      }
      console.log(pc.green("✔ all computation definitions ready"));
    });
}
