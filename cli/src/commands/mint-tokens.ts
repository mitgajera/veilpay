import { Command } from "commander";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { getProgram, getMintConfigPda } from "../solana";
import { resolveMint, TOKEN_PROGRAM_ID } from "../tokens";
import { section, row, txRow, success, fail, info, spinner } from "../ui";

export function mintTokensCmd(): Command {
  return new Command("mint-tokens")
    .description("Mint test tokens to a wallet (custom mint only — authority must be you)")
    .requiredOption("--amount <number>", "Amount to mint (e.g. 1000)")
    .option("--token <name>", "Token: usdc | wsol | usdt (uses known mint)")
    .option("--mint <pubkey>", "Custom mint address you control")
    .option("--to <pubkey>", "Recipient wallet (defaults to your wallet)")
    .action(async (opts) => {
      const { program, provider, keypair, connection } = getProgram();
      const authority = provider.wallet.publicKey;
      const recipient = opts.to ? new PublicKey(opts.to) : authority;

      let mintPubkey: PublicKey;
      let decimals: number;
      let symbol: string;

      // If using a known token like USDC — user cannot mint it (not the authority)
      // Only custom mints created by init-mint can be minted here
      if (opts.token || !opts.mint) {
        const resolved = resolveMint(opts.token, opts.mint);
        mintPubkey = resolved.mintPubkey;
        decimals = resolved.decimals;
        symbol = resolved.symbol;

        if (opts.token) {
          fail(`You cannot mint ${symbol} — you don't own that mint.`);
          info(`Get devnet ${symbol}:`);
          if (opts.token === "usdc") info("  https://faucet.circle.com");
          if (opts.token === "wsol") info("  solana airdrop 1 --url devnet, then spl-token wrap 1");
          process.exit(1);
        }
      } else {
        mintPubkey = new PublicKey(opts.mint);
        decimals = 6;
        symbol = "Token";
      }

      const amount = Math.round(Number(opts.amount) * 10 ** decimals);

      const spin = spinner(`Minting ${opts.amount} ${symbol}...`);
      const ata = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, recipient);

      try {
        const sig = await mintTo(connection, keypair, mintPubkey, ata.address, authority, amount);
        spin.succeed("Minted");

        section("Result");
        row("Minted", `${opts.amount} ${symbol}`);
        row("Recipient", recipient.toBase58());
        row("ATA", ata.address.toBase58());
        txRow(sig);
        success(`${opts.amount} ${symbol} added to wallet`);
      } catch (e: any) {
        spin.fail("Failed");
        fail(e.message?.includes("owner") ? `You are not the mint authority for this token.` : (e.message ?? String(e)));
        process.exit(1);
      }
    });
}
