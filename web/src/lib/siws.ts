import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";

const DOMAIN = "VeilPay";

/**
 * Build the human-readable Sign-In With Solana message a wallet signs.
 * Kept deterministic so the server can reconstruct and verify it.
 */
export function buildSiwsMessage(params: { address: string; nonce: string; issuedAt: string }): string {
  return [
    `${DOMAIN} wants you to sign in with your Solana account:`,
    params.address,
    "",
    "Sign in to VeilPay. This request will not trigger a blockchain transaction or cost any fees.",
    "",
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
  ].join("\n");
}

/** Verify an ed25519 signature over the SIWS message for the given address. */
export function verifySiwsSignature(params: {
  message: string;
  signature: string; // base58
  address: string; // base58 pubkey
}): boolean {
  try {
    const pubkey = new PublicKey(params.address);
    const messageBytes = new TextEncoder().encode(params.message);
    const signatureBytes = bs58.decode(params.signature);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubkey.toBytes());
  } catch {
    return false;
  }
}

export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
