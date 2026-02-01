import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veilpay } from "../target/types/veilpay";

/**
 * Anchor migration script.
 * Executed automatically by `anchor deploy`.
 *
 * Responsibility:
 * - Initialize the global VeilPay mint PDA.
 * - Must be safe to run multiple times.
 */
module.exports = async function (provider: anchor.AnchorProvider) {
  // Use the provider injected by Anchor.toml
  anchor.setProvider(provider);

  const program = anchor.workspace.Veilpay as Program<Veilpay>;
  const wallet = provider.wallet;

  // Derive the VeilPay mint PDA
  const [mintPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  );

  // Placeholder Arcium c-SPL configuration
  // In production, this should be generated via Arcium SDK
  const csplConfig = new Array(64).fill(0);

  // Initialize the mint if it does not already exist
  try {
    await program.methods
      .initializeMint(csplConfig)
      .accounts({
        veilpayMint: mintPda,
        authority: wallet.publicKey,
      })
      .rpc();
  } catch {
    // Mint already initialized; safe to ignore
  }

  // Fetch mint to confirm deployment state
  await program.account.veilPayMint.fetch(mintPda);
};
