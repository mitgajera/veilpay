/**
 * Arcium SDK stub — replace with real Arcium SDK when available.
 * The program stores balances as opaque [u8; 64] ciphertexts.
 * Currently uses deterministic placeholder bytes for testing.
 */

// Encrypt an amount into a 64-byte ciphertext (stub)
export function encryptAmount(amount: number): Buffer {
  const buf = Buffer.alloc(64, 0);
  buf.writeBigUInt64LE(BigInt(amount), 0);
  return buf;
}

// Generate a 64-byte encrypted receiver tag (stub)
export function encryptTag(receiverPubkey: Buffer): Buffer {
  const buf = Buffer.alloc(64, 0);
  receiverPubkey.subarray(0, 32).copy(buf, 0);
  return buf;
}

// Generate a new encrypted balance after a state change (stub)
// In production: re-encrypt the updated balance with Arcium
export function newEncryptedBalance(hint: number): Buffer {
  const buf = Buffer.alloc(64, 0);
  buf.writeUInt8(hint & 0xff, 0);
  return buf;
}

// Try to detect if an encrypted tag belongs to us (stub)
export function tryDecryptTag(
  encryptedTag: number[],
  myPubkey: Buffer
): boolean {
  if (!encryptedTag || encryptedTag.length < 32) return false;
  return encryptedTag[0] === myPubkey[0];
}
