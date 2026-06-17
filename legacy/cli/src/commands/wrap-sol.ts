import { Command } from "commander";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { getProgram } from "../solana";
import { section, row, txRow, success, fail, info, spinner } from "../ui";

export function wrapSolCmd(): Command {
  return new Command("wrap-sol")
    .description("Wrap native SOL into wSOL for use with VeilPay deposit")
    .requiredOption("--amount <number>", "Amount of SOL to wrap (e.g. 0.5)")
    .action(async (opts) => {
      const { provider, keypair, connection } = getProgram();
      const owner = provider.wallet.publicKey;
      const lamports = Math.round(Number(opts.amount) * LAMPORTS_PER_SOL);

      const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, owner);

      section("Wrap SOL → wSOL");
      row("Owner", owner.toBase58());
      row("Amount", `${opts.amount} SOL`);
      row("wSOL ATA", wsolAta.toBase58());

      const spin = spinner("Wrapping SOL...");

      try {
        const ataInfo = await connection.getAccountInfo(wsolAta);
        const tx = new Transaction();

        if (!ataInfo) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              owner,
              wsolAta,
              owner,
              NATIVE_MINT
            )
          );
        }

        // Transfer SOL into the wSOL ATA
        tx.add(
          SystemProgram.transfer({
            fromPubkey: owner,
            toPubkey: wsolAta,
            lamports,
          })
        );

        // Sync native — tells token program to update wSOL balance
        tx.add(createSyncNativeInstruction(wsolAta));

        const sig = await provider.sendAndConfirm(tx, [keypair]);
        spin.succeed("Wrapped");

        section("Result");
        row("Wrapped", `${opts.amount} SOL → wSOL`);
        row("wSOL ATA", wsolAta.toBase58());
        txRow(sig);
        success(`${opts.amount} SOL wrapped into wSOL`);
        info("Now run: veilpay deposit --token wsol --amount " + opts.amount);
      } catch (e: any) {
        spin.fail("Failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
