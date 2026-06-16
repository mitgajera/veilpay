import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
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
  getLookupTableAddress,
  getArciumProgram,
  uploadCircuit,
} from "@arcium-hq/client";
import { Ctx, PROJECT_ROOT } from "./context";

/** Fixed account set every queued computation needs, keyed by circuit name. */
export function compAccounts(ctx: Ctx, circuitName: string, computationOffset: anchor.BN) {
  const { program, arciumEnv } = ctx;
  return {
    computationAccount: getComputationAccAddress(
      arciumEnv.arciumClusterOffset,
      computationOffset,
    ),
    clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
    mxeAccount: getMXEAccAddress(program.programId),
    mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
    executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
    compDefAccount: getCompDefAccAddress(
      program.programId,
      Buffer.from(getCompDefAccOffset(circuitName)).readUInt32LE(),
    ),
  };
}

/** A random 8-byte computation offset as a BN. */
export function randomOffset(): anchor.BN {
  return new anchor.BN(require("crypto").randomBytes(8), "hex");
}

/** Wait for a queued computation to finalize on-chain. */
export async function finalize(ctx: Ctx, off: anchor.BN) {
  await awaitComputationFinalization(ctx.provider, off, ctx.program.programId, "confirmed");
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
    } catch (_) {
      /* not ready yet */
    }
    if (attempt < maxRetries) await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

/**
 * Register a circuit's computation definition (if missing) and upload its
 * compiled `.arcis` bytecode. Idempotent: skips init when the comp-def PDA
 * already exists, but always re-uploads so a half-finished def gets finalized.
 */
export async function ensureCompDef(
  ctx: Ctx,
  circuitName: string,
  initMethod: string,
): Promise<void> {
  const { program, owner, provider } = ctx;
  const arciumProgram = getArciumProgram(provider);
  const offset = getCompDefAccOffset(circuitName);
  const compDefPDA = getCompDefAccAddress(
    program.programId,
    Buffer.from(offset).readUInt32LE(),
  );

  const existing = await provider.connection.getAccountInfo(compDefPDA);
  if (!existing) {
    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(program.programId, mxeAcc.lutOffsetSlot);

    await (program.methods as any)
      [initMethod]()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
  }

  const arcisPath = path.join(PROJECT_ROOT, "build", `${circuitName}.arcis`);
  const rawCircuit = fs.readFileSync(arcisPath);
  await uploadCircuit(provider, circuitName, program.programId, rawCircuit, true, 500, {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
}

/** PDA helpers for the program's own accounts. */
export function balancePda(program: { programId: PublicKey }, owner: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), owner.toBuffer(), mint.toBuffer()],
    program.programId,
  )[0];
}

export function mintConfigPda(program: { programId: PublicKey }, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_config"), mint.toBuffer()],
    program.programId,
  )[0];
}

export function vaultPda(program: { programId: PublicKey }, mintConfig: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mintConfig.toBuffer()],
    program.programId,
  )[0];
}
