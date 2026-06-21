import { Command } from "commander";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function inspectCmd() {
  return new Command("inspect")
    .description("Show a mint's PDAs, vault config, and the tokens held in the vault")
    .argument("<mint>", "mint address")
    .action(
      action(async ({ client, json }, mint) => {
        const pdas = client.pdas(mint);
        const config = await client.getMintConfig(mint);
        const vaultTokens = await client.getVaultTokenBalance(mint);

        emit(
          json,
          {
            mint,
            balance: pdas.balance.toBase58(),
            mintConfig: pdas.mintConfig.toBase58(),
            vault: pdas.vault.toBase58(),
            configInitialized: config.exists,
            authority: config.exists ? config.authority.toBase58() : null,
            totalDeposited: config.totalDeposited.toString(),
            totalWithdrawn: config.totalWithdrawn.toString(),
            vaultTokenBalance: vaultTokens.toString(),
          },
          () => {
            console.log(pc.green("✔ mint inspection"));
            console.log("  mint:           ", mint);
            console.log("  your balance:   ", pdas.balance.toBase58());
            console.log("  mint_config:    ", pdas.mintConfig.toBase58());
            console.log("  vault:          ", pdas.vault.toBase58());
            console.log("  config init'd:  ", config.exists ? pc.green("yes") : pc.yellow("no"));
            if (config.exists) {
              console.log("  authority:      ", config.authority.toBase58());
              console.log("  total deposited:", config.totalDeposited.toString());
              console.log("  total withdrawn:", config.totalWithdrawn.toString());
            }
            console.log("  vault tokens:   ", vaultTokens.toString());
          },
        );
      }),
    );
}
