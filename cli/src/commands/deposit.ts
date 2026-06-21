import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function depositCmd() {
  return new Command("deposit")
    .description("Deposit real tokens into the vault and credit the confidential balance")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (public on-ramp)")
    .action(
      action(async ({ client, json }, mint, amount) => {
        const r = await client.deposit(mint, amount);
        emit(json, { signature: r.signature, amount }, () => {
          console.log(pc.green(`✔ deposited ${amount} (public) → confidential balance credited`));
          console.log("  tx:", r.signature);
        });
      }),
    );
}
