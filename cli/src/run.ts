import { Command } from "commander";
import type { VeilPayClient } from "@veilpay/sdk";
import { loadClient, type GlobalOpts } from "./client";
import { printError } from "./output";

export interface Ctx {
  client: VeilPayClient;
  owner: ReturnType<typeof loadClient>["owner"];
  opts: GlobalOpts;
  json: boolean;
}

/**
 * Wrap a command action: resolve global options, build the client, run the
 * handler, and turn any error into clean (or JSON) output + a non-zero exit.
 */
export function action(
  handler: (ctx: Ctx, ...args: string[]) => Promise<void>,
) {
  return async (...args: unknown[]) => {
    // Commander calls actions with (...positionals, options, command).
    const command = args[args.length - 1] as Command;
    const positionals = args.slice(0, -2) as string[];
    const opts = command.optsWithGlobals() as GlobalOpts;
    const json = Boolean(opts.json);
    try {
      const { client, owner } = loadClient(opts);
      await handler({ client, owner, opts, json }, ...positionals);
    } catch (e) {
      process.exitCode = printError(e, json);
    }
  };
}
