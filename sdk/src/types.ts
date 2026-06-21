import type BN from "bn.js";
import type { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";

/** Anything accepted where a u64 token amount is expected. */
export type Amount = bigint | number | string | BN;

/** A mint accepted as a base58 string or PublicKey. */
export type MintLike = PublicKey | string;

/** Result of a plain (non-MPC) transaction. */
export interface TxResult {
  signature: string;
}

/** Result of a queued+finalized MPC computation. */
export interface ComputationResult extends TxResult {
  /** The 8-byte computation offset used for this queue. */
  computationOffset: BN;
}

export interface InitMintResult extends TxResult {
  mint: PublicKey;
  mintConfig: PublicKey;
  vault: PublicKey;
}

export interface InitBalanceResult extends ComputationResult {
  balance: PublicKey;
}

export interface RevealResult extends ComputationResult {
  /** The decrypted plaintext balance. */
  balance: bigint;
}

export interface DebitResult extends ComputationResult {}

/** The program PDAs derived for a given owner + mint. */
export interface AccountPdas {
  balance: PublicKey;
  mintConfig: PublicKey;
  vault: PublicKey;
}

/**
 * A built-but-unsent instruction. Callers can batch, simulate, or set priority
 * fees, then send it themselves. MPC instructions also carry the
 * `computationOffset` needed to await finalization (via `client.finalize`).
 */
export interface BuiltInstruction {
  instruction: TransactionInstruction;
  /** Extra signers the instruction requires (e.g. a fresh mint keypair). */
  signers: Keypair[];
  /** Present for MPC instructions: the offset to await finalization with. */
  computationOffset?: BN;
}

/** Tunables for the high-level send+finalize methods. */
export interface SendOptions {
  /** Skip preflight simulation (default true for MPC queue txs). */
  skipPreflight?: boolean;
  /** Override the finalize timeout (ms) for this call. */
  finalizeTimeoutMs?: number;
}
