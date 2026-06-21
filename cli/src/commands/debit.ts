import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function debitCmd() {
  return new Command("debit")
    .description("Debit a hidden amount from your own confidential balance (no tokens move)")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (kept private)")
    .action(
      action(async ({ client, json }, mint, amount) => {
        const r = await client.debit(mint, amount);
        emit(json, { signature: r.signature }, () => {
          console.log(pc.green("✔ debited (private) from your confidential balance"));
          console.log("  tx:", r.signature);
        });
      }),
    );
}
