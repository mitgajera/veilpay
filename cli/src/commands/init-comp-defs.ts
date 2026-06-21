import { Command } from "commander";
import pc from "picocolors";
import { ensureCompDefs } from "@veilpay/sdk/admin";
import { action } from "../run";
import { emit } from "../output";
import { BUILD_DIR } from "../client";

export function initCompDefsCmd() {
  return new Command("init-comp-defs")
    .description("Register + upload the circuit computation definitions (one-time per program)")
    .action(
      action(async ({ client, json }) => {
        const done: string[] = [];
        await ensureCompDefs(client.ctx, BUILD_DIR, (circuit, status) => {
          if (status === "done") done.push(circuit);
          if (json) return;
          if (status === "start") process.stdout.write(`  ${circuit} … `);
          else console.log(pc.green("ok"));
        });
        emit(json, { ready: done }, () =>
          console.log(pc.green("✔ all computation definitions ready")),
        );
      }),
    );
}
