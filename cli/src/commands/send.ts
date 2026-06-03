import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../solana";
import { initArcium, encryptAmount, encryptTag } from "../arcium";

new Command("send")
  .requiredOption("--to <pubkey>")
  .requiredOption("--amount <number>")
  .description("Send private payment")
  .action(async (opts) => {
    const { program, provider } = getProgram();
    const sender = provider.wallet.publicKey;
    initArcium(sender.toBytes());

    const amount = Number(opts.amount);
    const encryptedAmount = encryptAmount(amount);
    const encryptedTag = encryptTag();
    const commitmentHash = new Array(32).fill(1);

    const [senderBal] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), sender.toBuffer()],
      program.programId
    );

    const receiverPubkey = new anchor.web3.PublicKey(opts.to);

    const [receiverBal] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), receiverPubkey.toBuffer()],
      program.programId
    );

    await program.methods
      .privateTransfer(
        encryptedAmount,
        new anchor.BN(0),
        commitmentHash,
        encryptedTag
      )
      .accounts({
        senderBalance: senderBal,
        receiverBalance: receiverBal,
        sender,
      })
      .rpc();

    console.log("Private transfer sent");
  })
  .parse(process.argv);
