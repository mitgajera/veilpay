import * as anchor from "@anchor-lang/core";
import { RescueCipher, x25519, deserializeLE } from "@arcium-hq/client";

/** 16-byte random nonce, usable in both Node and the browser. */
function randomNonce(): Uint8Array {
  const n = new Uint8Array(16);
  globalThis.crypto.getRandomValues(n);
  return n;
}

/** Fresh x25519 keypair + Rescue cipher bound to the MXE public key. */
export function newCipher(mxePublicKey: Uint8Array) {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  return { cipher: new RescueCipher(sharedSecret), publicKey };
}

/** The wire-ready pieces of an encrypted u64, in the shapes the program wants. */
export interface EncryptedValue {
  cipher: RescueCipher;
  ciphertext: number[];
  publicKey: number[];
  nonce: Uint8Array;
  nonceBN: anchor.BN;
}

/**
 * Encrypt a single u64 value for the MXE. Returns the ciphertext, the ephemeral
 * x25519 pubkey, and the nonce both as raw bytes and as the BN the program wants.
 */
export function encryptValue(mxePublicKey: Uint8Array, value: bigint): EncryptedValue {
  const { cipher, publicKey } = newCipher(mxePublicKey);
  const nonce = randomNonce();
  const ct = cipher.encrypt([value], nonce);
  return {
    cipher,
    ciphertext: Array.from(ct[0]) as number[],
    publicKey: Array.from(publicKey) as number[],
    nonce,
    nonceBN: new anchor.BN(deserializeLE(nonce).toString()),
  };
}
