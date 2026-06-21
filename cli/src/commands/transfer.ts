import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function transferCmd() {
  return new Command("transfer")
    .description("Confidentially transfer an encrypted amount to another owner's balance")
    .argument("<mint>", "mint address")
    .argument("<receiver>", "receiver wallet address")
    .argument("<amount>", "amount in base units (kept private)")
    .action(
      action(async ({ client, json }, mint, receiver, amount) => {
        const r = await client.transfer(mint, receiver, amount);
        emit(json, { signature: r.signature, receiver }, () => {
          console.log(pc.green(`✔ transferred (private) → ${receiver}`));
          console.log("  tx:", r.signature);
        });
      }),
    );
}
