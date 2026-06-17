import { Command } from "commander";
import pc from "picocolors";
import { loadClient } from "../client";

export function withdrawCmd() {
  return new Command("withdraw")
    .description("Withdraw real tokens from the vault if the hidden balance covers it")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (public off-ramp)")
    .action(async (mintStr: string, amountStr: string) => {
      const { client } = loadClient();
      await client.withdraw(mintStr, amountStr);

      console.log(
        pc.green(`✔ withdraw of ${amountStr} requested — released iff hidden balance covered it`),
      );
    });
}
