import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { section, row, success, fail, info } from "../ui";

const CONFIG_PATH = path.join(os.homedir(), ".veilpay", "config.json");

interface VeilPayConfig {
  rpc?: string;
  wallet?: string;
  cluster?: string;
}

function readConfig(): VeilPayConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(cfg: VeilPayConfig) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export function configCmd(): Command {
  const cmd = new Command("config").description(
    "Manage VeilPay CLI configuration"
  );

  cmd
    .command("show")
    .description("Show current config")
    .action(() => {
      const cfg = readConfig();
      section("VeilPay Config");
      row("Config file", CONFIG_PATH);
      row("RPC", cfg.rpc ?? "(env: ANCHOR_PROVIDER_URL)");
      row("Wallet", cfg.wallet ?? "(env: ANCHOR_WALLET or ~/.config/solana/id.json)");
      row("Cluster", cfg.cluster ?? "devnet");
      console.log();
      info("Set values with: veilpay config set rpc <url>");
    });

  cmd
    .command("set")
    .description("Set a config value")
    .argument("<key>", "Key: rpc | wallet | cluster")
    .argument("<value>", "Value to set")
    .action((key: string, value: string) => {
      const valid = ["rpc", "wallet", "cluster"];
      if (!valid.includes(key)) {
        fail(`Invalid key '${key}'. Valid: ${valid.join(", ")}`);
        process.exit(1);
      }
      const cfg = readConfig();
      (cfg as any)[key] = value;
      writeConfig(cfg);
      success(`Set ${key} = ${value}`);
    });

  cmd
    .command("reset")
    .description("Reset config to defaults")
    .action(() => {
      if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
      success("Config reset to defaults");
    });

  return cmd;
}
