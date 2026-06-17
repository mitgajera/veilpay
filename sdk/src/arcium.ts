import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import {
  awaitComputationFinalization,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getCompDefAccOffset,
} from "@arcium-hq/client";
import type { Ctx } from "./context";

/** Fixed account set every queued computation needs, keyed by circuit name. */
export function compAccounts(ctx: Ctx, circuitName: string, computationOffset: anchor.BN) {
  const { program, clusterOffset } = ctx;
  return {
    computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
    clusterAccount: getClusterAccAddress(clusterOffset),
    mxeAccount: getMXEAccAddress(program.programId),
    mempoolAccount: getMempoolAccAddress(clusterOffset),
    executingPool: getExecutingPoolAccAddress(clusterOffset),
    compDefAccount: getCompDefAccAddress(
      program.programId,
      Buffer.from(getCompDefAccOffset(circuitName)).readUInt32LE(),
    ),
  };
}

/** A random 8-byte computation offset as a BN (browser + Node safe). */
export function randomOffset(): anchor.BN {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return new anchor.BN(bytes);
}

/** Wait for a queued computation to finalize on-chain. */
export async function finalize(ctx: Ctx, off: anchor.BN): Promise<void> {
  // Finalization only accepts a Finality; map anything weaker to "confirmed".
  const finality: anchor.web3.Finality =
    ctx.commitment === "finalized" ? "finalized" : "confirmed";
  await awaitComputationFinalization(ctx.provider, off, ctx.program.programId, finality);
}

/**
 * Fetch the MXE x25519 public key, retrying while a fresh keygen publishes it.
 */
export async function getMXEPublicKeyWithRetry(
  ctx: Ctx,
  maxRetries = 120,
  retryDelayMs = 1000,
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const key = await getMXEPublicKey(ctx.provider, ctx.program.programId);
      if (key) return key;
    } catch {
      /* not ready yet */
    }
    if (attempt < maxRetries) await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

/** PDA of an owner's confidential balance for a mint. */
export function balancePda(programId: PublicKey, owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), owner.toBuffer(), mint.toBuffer()],
    programId,
  )[0];
}

/** PDA of a mint's vault config (vault authority). */
export function mintConfigPda(programId: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_config"), mint.toBuffer()],
    programId,
  )[0];
}

/** PDA of the token vault holding deposited tokens for a mint config. */
export function vaultPda(programId: PublicKey, mintConfig: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mintConfig.toBuffer()],
    programId,
  )[0];
}
