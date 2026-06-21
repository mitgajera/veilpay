import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function withdrawCmd() {
  return new Command("withdraw")
    .description("Withdraw real tokens from the vault if the hidden balance covers it")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (public off-ramp)")
    .action(
      action(async ({ client, json }, mint, amount) => {
        const r = await client.withdraw(mint, amount);
        emit(json, { signature: r.signature, amount }, () => {
          console.log(
            pc.green(`✔ withdraw of ${amount} requested — released iff hidden balance covered it`),
          );
          console.log("  tx:", r.signature);
        });
      }),
    );
}
