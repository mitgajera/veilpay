import { Command } from "commander";
import { initMintCmd } from "./commands/init-mint";
import { initBalanceCmd } from "./commands/init-balance";
import { depositCmd } from "./commands/deposit";
import { sendCmd } from "./commands/send";
import { applyCmd } from "./commands/apply";
import { withdrawCmd } from "./commands/withdraw";
import { balanceCmd } from "./commands/balance";
import { activityCmd } from "./commands/activity";
import { mintTokensCmd } from "./commands/mint-tokens";
import { initUsdcCmd } from "./commands/init-usdc";

const cli = new Command();

cli
  .name("veilpay")
  .description("VeilPay CLI — privacy-first payments on Solana")
  .version("0.1.0");

cli.addCommand(initMintCmd());
cli.addCommand(initBalanceCmd());
cli.addCommand(depositCmd());
cli.addCommand(sendCmd());
cli.addCommand(applyCmd());
cli.addCommand(withdrawCmd());
cli.addCommand(balanceCmd());
cli.addCommand(activityCmd());
cli.addCommand(mintTokensCmd());
cli.addCommand(initUsdcCmd());

cli.parseAsync(process.argv).catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
