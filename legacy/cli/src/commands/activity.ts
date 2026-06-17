import { Command } from "commander";
import { getProgram } from "../solana";
import { tryDecryptTag } from "../arcium";
import { fetchProgramEvents } from "../helius";
import { section, row, fail, info, spinner } from "../ui";
import pc from "picocolors";

export function activityCmd(): Command {
  return new Command("activity")
    .description("Show recent VeilPay program activity (requires HELIUS_API_KEY)")
    .option("--limit <number>", "Number of transactions to fetch", "20")
    .action(async (opts) => {
      if (!process.env.HELIUS_API_KEY) {
        fail("HELIUS_API_KEY environment variable not set");
        info("Get a free key at: https://helius.dev");
        process.exit(1);
      }

      const { program, provider } = getProgram();
      const myPubkey = provider.wallet.publicKey.toBuffer();

      const spin = spinner(`Fetching last ${opts.limit} transactions...`);
      const events = await fetchProgramEvents(
        program.programId.toBase58(),
        Number(opts.limit)
      );
      spin.succeed(`${events.length} transactions fetched`);

      if (!events || events.length === 0) {
        info("No recent activity found.");
        return;
      }

      section("Recent Activity");

      let mine = 0;
      for (const e of events) {
        const isMine = tryDecryptTag(e.encrypted_tag ?? [], myPubkey);
        const short = (e.signature as string)?.slice(0, 12) + "...";
        const tag = isMine ? pc.bgGreen(pc.black(" MINE ")) : pc.dim("      ");
        const err = e.err ? pc.red(" FAILED") : pc.green(" OK");
        console.log(`  ${tag} ${pc.dim(short)}${err}`);
        if (isMine) mine++;
      }

      section("Summary");
      row("Total fetched", events.length.toString());
      row("Tagged as yours", mine.toString(), mine > 0);
      console.log();
      info("Activity tagging is stub — real privacy requires Arcium SDK.");
    });
}
