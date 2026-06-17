import { Command } from "commander";
import pc from "picocolors";
import { loadClient } from "../client";

export function initMintCmd() {
  return new Command("init-mint")
    .description("Create a new SPL mint + vault config for confidential custody")
    .action(async () => {
      const { client } = loadClient();
      const { mint, mintConfig, signature } = await client.initMint();

      console.log(pc.green("✔ mint + vault config created"));
      console.log("  mint:        ", mint.toBase58());
      console.log("  mint_config: ", mintConfig.toBase58());
      console.log("  tx:          ", signature);
    });
}
