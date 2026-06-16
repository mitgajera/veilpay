import { Command } from "commander";
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import pc from "picocolors";
import { loadContext } from "../context";
import { mintConfigPda } from "../arcium";

export function initMintCmd() {
  return new Command("init-mint")
    .description("Create a new SPL mint + vault config for confidential custody")
    .action(async () => {
      const ctx = loadContext();
      const mintKp = Keypair.generate();
      const mintConfig = mintConfigPda(ctx.program, mintKp.publicKey);

      const sig = await ctx.program.methods
        .initializeMint()
        .accountsPartial({
          mintConfig,
          mint: mintKp.publicKey,
          authority: ctx.owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKp])
        .rpc({ commitment: "confirmed" });

      console.log(pc.green("✔ mint + vault config created"));
      console.log("  mint:        ", mintKp.publicKey.toBase58());
      console.log("  mint_config: ", mintConfig.toBase58());
      console.log("  tx:          ", sig);
    });
}
