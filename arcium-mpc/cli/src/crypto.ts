import * as anchor from "@anchor-lang/core";
import { randomBytes } from "crypto";
import { RescueCipher, x25519, deserializeLE } from "@arcium-hq/client";

/** Fresh x25519 keypair + Rescue cipher bound to the MXE public key. */
export function newCipher(mxePublicKey: Uint8Array) {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  return { cipher: new RescueCipher(sharedSecret), publicKey };
}

/**
 * Encrypt a single u64 value for the MXE. Returns the ciphertext, the ephemeral
 * x25519 pubkey, and the nonce both as raw bytes and as the BN the program wants.
 */
export function encryptValue(mxePublicKey: Uint8Array, value: bigint) {
  const { cipher, publicKey } = newCipher(mxePublicKey);
  const nonce = randomBytes(16);
  const ct = cipher.encrypt([value], nonce);
  return {
    cipher,
    ciphertext: Array.from(ct[0]) as number[],
    publicKey: Array.from(publicKey) as number[],
    nonce,
    nonceBN: new anchor.BN(deserializeLE(nonce).toString()),
  };
}
