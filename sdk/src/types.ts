import type * as anchor from "@anchor-lang/core";
import type { PublicKey } from "@solana/web3.js";

/** Anything accepted where a u64 token amount is expected. */
export type Amount = bigint | number | string | anchor.BN;

/** A mint accepted as a base58 string or PublicKey. */
export type MintLike = PublicKey | string;

/** Result of a plain (non-MPC) transaction. */
export interface TxResult {
  signature: string;
}

/** Result of a queued+finalized MPC computation. */
export interface ComputationResult extends TxResult {
  /** The 8-byte computation offset used for this queue. */
  computationOffset: anchor.BN;
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

/** The program PDAs derived for a given owner + mint. */
export interface AccountPdas {
  balance: PublicKey;
  mintConfig: PublicKey;
  vault: PublicKey;
}
