import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function revealCmd() {
  return new Command("reveal")
    .description("Reveal your own confidential balance (decrypts via MPC, emits plaintext)")
    .argument("<mint>", "mint address")
    .action(
      action(async ({ client, json }, mint) => {
        const r = await client.reveal(mint);
        emit(json, { balance: r.balance.toString(), signature: r.signature }, () => {
          console.log(pc.green("✔ balance revealed"));
          console.log("  balance:", r.balance.toString());
        });
      }),
    );
}
