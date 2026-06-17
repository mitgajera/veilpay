import { Command } from "commander";
import pc from "picocolors";
import { loadClient } from "../client";

export function depositCmd() {
  return new Command("deposit")
    .description("Deposit real tokens into the vault and credit the confidential balance")
    .argument("<mint>", "mint address")
    .argument("<amount>", "amount in base units (public on-ramp)")
    .action(async (mintStr: string, amountStr: string) => {
      const { client } = loadClient();
      await client.deposit(mintStr, amountStr);

      console.log(pc.green(`✔ deposited ${amountStr} (public) → confidential balance credited`));
    });
}
