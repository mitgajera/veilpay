import { Command } from "commander";
import { Keypair, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getMintConfigPda } from "../solana";
import { TOKEN_PROGRAM_ID } from "../tokens";
import { section, row, txRow, success, fail, spinner } from "../ui";

export function initMintCmd(): Command {
  return new Command("init-mint")
    .description("One-time setup: create a new VeilPay SPL mint")
    .action(async () => {
      const { program, provider } = getProgram();

      const mintKeypair = Keypair.generate();
      const [mintConfigPda] = getMintConfigPda(program.programId, mintKeypair.publicKey);

      section("Initialize New Mint");
      row("Mint keypair", mintKeypair.publicKey.toBase58());
      row("MintConfig PDA", mintConfigPda.toBase58());
      row("Authority", provider.wallet.publicKey.toBase58());

      const spin = spinner("Creating mint on-chain...");

      try {
        const sig = await program.methods
          .initializeMint()
          .accounts({
            mintConfig: mintConfigPda,
            mint: mintKeypair.publicKey,
            authority: provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mintKeypair])
          .rpc();

        spin.succeed("Mint created");
        section("Result");
        row("Mint", mintKeypair.publicKey.toBase58());
        row("MintConfig", mintConfigPda.toBase58());
        txRow(sig);
        success("VeilPay mint ready — use --mint flag with other commands");
        console.log(`\n  Example: veilpay deposit --mint ${mintKeypair.publicKey.toBase58()} --amount 100\n`);
      } catch (e: any) {
        spin.fail("Failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
