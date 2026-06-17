import { Command } from "commander";
import pc from "picocolors";
import { loadClient } from "../client";

export function revealCmd() {
  return new Command("reveal")
    .description("Reveal your own confidential balance (decrypts via MPC, emits plaintext)")
    .argument("<mint>", "mint address")
    .action(async (mintStr: string) => {
      const { client } = loadClient();
      const { balance } = await client.reveal(mintStr);

      console.log(pc.green("✔ balance revealed"));
      console.log("  balance:", balance.toString());
    });
}
