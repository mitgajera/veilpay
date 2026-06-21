import { Command } from "commander";
import { initMintCmd } from "./commands/init-mint";
import { initCompDefsCmd } from "./commands/init-comp-defs";
import { initBalanceCmd } from "./commands/init-balance";
import { depositCmd } from "./commands/deposit";
import { transferCmd } from "./commands/transfer";
import { withdrawCmd } from "./commands/withdraw";
import { debitCmd } from "./commands/debit";
import { revealCmd } from "./commands/reveal";
import { balanceCmd } from "./commands/balance";
import { inspectCmd } from "./commands/inspect";
import { addressCmd } from "./commands/address";

const cli = new Command();

cli
  .name("veilpay")
  .description("VeilPay MPC CLI - confidential payments on Solana via Arcium")
  .version("0.1.0")
  .option("--url <rpc>", "RPC endpoint (overrides ANCHOR_PROVIDER_URL)")
  .option("--keypair <path>", "wallet keypair file (overrides ANCHOR_WALLET)")
  .option("--cluster-offset <n>", "Arcium cluster offset (else from env)")
  .option("--json", "machine-readable JSON output", false);

// Mutations
cli.addCommand(initMintCmd());
cli.addCommand(initCompDefsCmd());
cli.addCommand(initBalanceCmd());
cli.addCommand(depositCmd());
cli.addCommand(transferCmd());
cli.addCommand(withdrawCmd());
cli.addCommand(debitCmd());
cli.addCommand(revealCmd());

// Reads
cli.addCommand(balanceCmd());
cli.addCommand(inspectCmd());
cli.addCommand(addressCmd());

cli.parseAsync(process.argv).catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
