import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../solana";

new Command("init-balance")
  .description("Initialize confidential balance")
  .action(async () => {
    const { program, provider } = getProgram();
    const owner = provider.wallet.publicKey;

    const [balancePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), owner.toBuffer()],
      program.programId
    );

    await program.methods
      .initBalance()
      .accounts({
        confidentialBalance: balancePda,
        owner,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Balance initialized:", balancePda.toBase58());
  })
  .parse(process.argv);
