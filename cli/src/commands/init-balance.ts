import { Command } from "commander";
import pc from "picocolors";
import { loadClient } from "../client";

export function initBalanceCmd() {
  return new Command("init-balance")
    .description("Create a fresh confidential balance (encrypted 0) for a mint")
    .argument("<mint>", "mint address")
    .action(async (mintStr: string) => {
      const { client } = loadClient();
      const { balance } = await client.initBalance(mintStr);

      console.log(pc.green("✔ confidential balance initialized"));
      console.log("  balance:", balance.toBase58());
    });
}
