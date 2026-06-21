import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function initMintCmd() {
  return new Command("init-mint")
    .description("Create a new SPL mint + vault config for confidential custody")
    .action(
      action(async ({ client, json }) => {
        const r = await client.initMint();
        emit(
          json,
          {
            mint: r.mint.toBase58(),
            mintConfig: r.mintConfig.toBase58(),
            vault: r.vault.toBase58(),
            signature: r.signature,
          },
          () => {
            console.log(pc.green("✔ mint + vault config created"));
            console.log("  mint:        ", r.mint.toBase58());
            console.log("  mint_config: ", r.mintConfig.toBase58());
            console.log("  vault:       ", r.vault.toBase58());
            console.log("  tx:          ", r.signature);
          },
        );
      }),
    );
}
