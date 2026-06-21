import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import pc from "picocolors";
import { action } from "../run";
import { emit } from "../output";

export function balanceCmd() {
  return new Command("balance")
    .description("Show the on-chain confidential balance account (ciphertext stays encrypted)")
    .argument("<mint>", "mint address")
    .option("--owner <pubkey>", "inspect another owner's balance (default: your wallet)")
    .action(
      action(async ({ client, json, opts }, mint) => {
        const owner = (opts as { owner?: string }).owner
          ? new PublicKey((opts as { owner?: string }).owner!)
          : client.owner;
        const b = await client.getConfidentialBalance(mint, owner);
        emit(
          json,
          {
            exists: b.exists,
            address: b.address.toBase58(),
            owner: b.owner.toBase58(),
            mint: b.mint.toBase58(),
            nonce: b.nonce.toString(),
            ciphertext: b.ciphertext,
          },
          () => {
            if (!b.exists) {
              console.log(pc.yellow("• no confidential balance account yet"));
              console.log("  address:", b.address.toBase58());
              return;
            }
            console.log(pc.green("✔ confidential balance account"));
            console.log("  address:   ", b.address.toBase58());
            console.log("  owner:     ", b.owner.toBase58());
            console.log("  ciphertext:", pc.dim("(encrypted — use `reveal` to decrypt)"));
            console.log("  nonce:     ", b.nonce.toString());
          },
        );
      }),
    );
}
