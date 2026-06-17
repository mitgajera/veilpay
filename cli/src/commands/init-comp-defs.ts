import { Command } from "commander";
import pc from "picocolors";
import { ensureCompDefs } from "@veilpay/sdk/admin";
import { loadClient, BUILD_DIR } from "../client";

export function initCompDefsCmd() {
  return new Command("init-comp-defs")
    .description("Register + upload the circuit computation definitions (one-time per program)")
    .action(async () => {
      const { client } = loadClient();
      await ensureCompDefs(client.ctx, BUILD_DIR, (circuit, status) => {
        if (status === "start") process.stdout.write(`  ${circuit} … `);
        else console.log(pc.green("ok"));
      });
      console.log(pc.green("✔ all computation definitions ready"));
    });
}
