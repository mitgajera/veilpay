import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import { getProgram, getMintConfigPda } from "../solana";
import { resolveMint, TOKEN_PROGRAM_ID } from "../tokens";
import { section, row, txRow, success, fail, info, spinner } from "../ui";

export function initUsdcCmd(): Command {
  return new Command("init-existing-mint")
    .description("Initialize VeilPay with an existing SPL mint (USDC, wSOL, etc.)")
    .option("--token <name>", "Token name: usdc | wsol | usdt")
    .option("--mint <pubkey>", "Custom SPL mint address")
    .action(async (opts) => {
      const { program, provider } = getProgram();
      const { mintPubkey, symbol } = resolveMint(opts.token, opts.mint);

      const [mintConfigPda] = getMintConfigPda(program.programId, mintPubkey);

      section(`Initialize VeilPay — ${symbol}`);
      row("Token", symbol);
      row("Mint", mintPubkey.toBase58());
      row("MintConfig PDA", mintConfigPda.toBase58());
      row("Authority", provider.wallet.publicKey.toBase58());

      const spin = spinner("Initializing...");

      try {
        const sig = await program.methods
          .initializeExistingMint()
          .accounts({
            mintConfig: mintConfigPda,
            mint: mintPubkey,
            authority: provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        spin.succeed("Initialized");
        section("Result");
        row("Token", symbol);
        row("Mint", mintPubkey.toBase58());
        row("MintConfig", mintConfigPda.toBase58());
        txRow(sig);
        success(`VeilPay ready for ${symbol}`);
        info(`Next: veilpay deposit --token ${opts.token ?? "usdc"} --amount 10`);
      } catch (e: any) {
        spin.fail("Failed");
        if (e.message?.includes("already in use")) {
          fail(`${symbol} MintConfig already initialized.`);
        } else {
          fail(e.message ?? String(e));
        }
        process.exit(1);
      }
    });
}
