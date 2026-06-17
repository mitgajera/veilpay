import { Command } from "commander";
import { initMintCmd } from "./commands/init-mint";
import { initCompDefsCmd } from "./commands/init-comp-defs";
import { initBalanceCmd } from "./commands/init-balance";
import { depositCmd } from "./commands/deposit";
import { transferCmd } from "./commands/transfer";
import { withdrawCmd } from "./commands/withdraw";
import { revealCmd } from "./commands/reveal";

const cli = new Command();

cli
  .name("veilpay")
  .description("VeilPay MPC CLI - confidential payments on Solana via Arcium")
  .version("0.1.0");

cli.addCommand(initMintCmd());
cli.addCommand(initCompDefsCmd());
cli.addCommand(initBalanceCmd());
cli.addCommand(depositCmd());
cli.addCommand(transferCmd());
cli.addCommand(withdrawCmd());
cli.addCommand(revealCmd());

cli.parseAsync(process.argv).catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
