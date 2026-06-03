import { Command } from "commander";
import { getProgram } from "../solana";
import { ArciumEnabled } from "../arcium";
import { section, row, warn, info } from "../ui";
import pc from "picocolors";

export function infoCmd(): Command {
  return new Command("info")
    .description("Show runtime environment, SDK status, and program info")
    .action(async () => {
      const { program, provider, connection } = getProgram();

      section("VeilPay Runtime Info");
      row("Program ID", program.programId.toBase58());
      row("RPC", connection.rpcEndpoint);
      row("Wallet", provider.wallet.publicKey.toBase58());

      section("Encryption");
      if (ArciumEnabled) {
        row("Arcium SDK", pc.green("✓ loaded  (@arcium-hq/client)"));
        row("Mode", pc.green("Real encryption — Aes256Cipher"));
      } else {
        row("Arcium SDK", pc.yellow("✗ not installed"));
        row("Mode", pc.yellow("Fallback — Node.js AES-256-CTR (still real encryption)"));
        info("Install Arcium: cd cli && yarn add @arcium-hq/client");
      }

      section("Supported Tokens");
      row("Custom mint", "veilpay init-mint");
      row("USDC (devnet)", "veilpay init-existing-mint --token usdc");
      row("wSOL", "veilpay init-existing-mint --token wsol");

      section("CLI Commands");
      const cmds = [
        ["init-mint", "Create a new VeilPay SPL mint"],
        ["init-existing-mint", "Use USDC, wSOL, or any existing mint"],
        ["init-balance", "Create your confidential balance account"],
        ["wrap-sol", "Wrap SOL → wSOL for private deposits"],
        ["deposit", "Deposit tokens into the vault"],
        ["send", "Private transfer to one recipient"],
        ["batch-send", "Private transfer to up to 5 recipients"],
        ["apply", "Merge incoming pending balance"],
        ["withdraw", "Withdraw tokens from vault"],
        ["close", "Close balance account and reclaim rent"],
        ["balance", "Show on-chain balance state"],
        ["mint-tokens", "Mint test tokens (custom mint only)"],
        ["activity", "Show program activity (requires HELIUS_API_KEY)"],
        ["config", "Manage CLI settings (rpc, wallet)"],
      ];
      cmds.forEach(([cmd, desc]) => row(`  ${cmd}`, desc));
      console.log();
    });
}
