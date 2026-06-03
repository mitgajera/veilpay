import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../solana";
import { SystemProgram, PublicKey } from "@solana/web3.js";

new Command("init-mint")
  .description("Initialize VeilPay mint")
  .action(async () => {
    const { program, provider } = getProgram();

    const [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId
    );

    const csplConfig = new Array(64).fill(0);

    await program.methods
      .initializeMint(csplConfig)
      .accounts({
        veilpayMint: mintPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Mint initialized:", mintPda.toBase58());
  })
  .parse(process.argv);
