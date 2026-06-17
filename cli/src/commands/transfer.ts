import { Command } from "commander";
import pc from "picocolors";
import { loadClient } from "../client";

export function transferCmd() {
  return new Command("transfer")
    .description("Confidentially transfer an encrypted amount to another owner's balance")
    .argument("<mint>", "mint address")
    .argument("<receiver>", "receiver wallet address")
    .argument("<amount>", "amount in base units (kept private)")
    .action(async (mintStr: string, receiverStr: string, amountStr: string) => {
      const { client } = loadClient();
      await client.transfer(mintStr, receiverStr, amountStr);

      console.log(pc.green(`✔ transferred ${amountStr} (private) → ${receiverStr}`));
    });
}
