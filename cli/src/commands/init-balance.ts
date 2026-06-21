import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function initBalanceCmd() {
  return new Command("init-balance")
    .description("Create a fresh confidential balance (encrypted 0) for a mint")
    .argument("<mint>", "mint address")
    .action(
      action(async ({ client, json }, mint) => {
        const r = await client.initBalance(mint);
        emit(json, { balance: r.balance.toBase58(), signature: r.signature }, () => {
          console.log(pc.green("✔ confidential balance initialized"));
          console.log("  balance:", r.balance.toBase58());
        });
      }),
    );
}
