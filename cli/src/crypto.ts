import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";

export function sha256(...bufs: Buffer[]): Buffer {
  const h = createHash("sha256");
  for (const b of bufs) h.update(b);
  return h.digest();
}

export function u64LE(n: number | bigint): Buffer {
  const b = Buffer.allocUnsafe(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

// SHA256(encrypted_amount_64 || nonce_le8 || receiver_owner_commitment_32)
// Must match Rust: transfer_commitment in utils/commitment.rs
export function transferCommitment(
  encAmt: Buffer,
  nonce: number,
  receiverOwnerCommitment: Buffer
): Buffer {
  return sha256(encAmt, u64LE(nonce), receiverOwnerCommitment);
}

// SHA256(owner_commitment_32 || amount_le8 || nonce_le8)
// Must match Rust: withdrawal_proof_hash in utils/commitment.rs
export function withdrawalProofHash(
  ownerCommitment: Buffer,
  amount: number,
  nonce: number
): Buffer {
  return sha256(ownerCommitment, u64LE(amount), u64LE(nonce));
}

// Derive owner commitment from wallet public key (non-zero, deterministic)
export function ownerCommitment(pubkey: PublicKey): Buffer {
  return sha256(pubkey.toBuffer());
}

export const TOKENS = (n: number) => n * 1_000_000; // 6 decimals
export const FROM_TOKENS = (lamports: number) => lamports / 1_000_000;
