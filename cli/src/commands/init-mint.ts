import { Command } from "commander";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, getMintConfigPda } from "../solana";
import { section, row, txRow, success, fail, spinner } from "../ui";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export function initMintCmd(): Command {
  return new Command("init-mint")
    .description("One-time setup: initialize VeilPay mint config and SPL mint")
    .action(async () => {
      const { program, provider } = getProgram();

      const [mintConfigPda] = getMintConfigPda(program.programId);
      const mintKeypair = Keypair.generate();

      section("Initialize Mint");
      row("Authority", provider.wallet.publicKey.toBase58());
      row("Mint keypair", mintKeypair.publicKey.toBase58());
      row("MintConfig PDA", mintConfigPda.toBase58());

      const spin = spinner("Sending transaction...");

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

        spin.succeed("Mint initialized");
        section("Result");
        row("Mint", mintKeypair.publicKey.toBase58());
        row("MintConfig", mintConfigPda.toBase58());
        txRow(sig);
        success("VeilPay mint is live on devnet");
        console.log("  Save the mint address — needed for deposit/withdraw.\n");
      } catch (e: any) {
        spin.fail("Transaction failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
