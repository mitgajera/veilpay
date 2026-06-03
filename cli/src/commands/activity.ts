import { Command } from "commander";
import { getProgram } from "../solana";
import { initArcium, tryDecryptTag } from "../arcium";
import { fetchProgramEvents } from "../helius";

new Command("activity")
  .description("Show private activity")
  .action(async () => {
    const { program, provider } = getProgram();
    initArcium(provider.wallet.publicKey.toBytes());

    const events = await fetchProgramEvents(program.programId.toBase58());

    for (const e of events) {
      const decoded = tryDecryptTag(e.encrypted_tag ?? []);
      if (decoded.success) {
        console.log("Private activity detected:", e.signature);
      }
    }
  })
  .parse(process.argv);
