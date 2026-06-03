import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { getProgram, getMintConfigPda } from "../solana";
import { TOKENS, FROM_TOKENS } from "../crypto";
import { section, row, txRow, success, fail, spinner } from "../ui";

export function mintTokensCmd(): Command {
  return new Command("mint-tokens")
    .description("Mint test tokens to your wallet ATA (authority wallet only)")
    .requiredOption("--amount <number>", "Amount of tokens to mint (e.g. 1000)")
    .option("--to <pubkey>", "Recipient wallet (defaults to your wallet)")
    .action(async (opts) => {
      const { program, provider, keypair, connection } = getProgram();
      const authority = provider.wallet.publicKey;
      const recipient = opts.to ? new PublicKey(opts.to) : authority;
      const amount = TOKENS(Number(opts.amount));

      const spin = spinner("Loading mint config...");
      const [mintConfigPda] = getMintConfigPda(program.programId);
      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      const mint = cfg.mint as PublicKey;

      const ata = await getOrCreateAssociatedTokenAccount(
        connection, keypair, mint, recipient
      );
      spin.succeed("Mint config loaded");

      section("Mint Tokens");
      row("Mint", mint.toBase58());
      row("Recipient", recipient.toBase58());
      row("ATA", ata.address.toBase58());
      row("Amount", `${FROM_TOKENS(amount).toLocaleString()} tokens`, true);

      const spin2 = spinner("Minting tokens...");

      try {
        const sig = await mintTo(
          connection,
          keypair,
          mint,
          ata.address,
          authority,
          amount
        );

        spin2.succeed("Tokens minted");

        section("Result");
        row("Minted", `${FROM_TOKENS(amount).toLocaleString()} tokens`);
        row("ATA", ata.address.toBase58());
        txRow(sig);
        success(`${FROM_TOKENS(amount)} tokens added to your wallet`);
      } catch (e: any) {
        spin2.fail("Minting failed");
        fail(e.message ?? String(e));
        process.exit(1);
      }
    });
}
