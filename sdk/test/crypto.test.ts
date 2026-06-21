import { test } from "node:test";
import assert from "node:assert/strict";
import { RescueCipher, x25519 } from "@arcium-hq/client";
import { encryptValue, newCipher } from "../src/crypto";

// Full encrypt -> decrypt roundtrip with a stand-in "MXE" keypair. Proves the
// x25519 key exchange + RescueCipher wiring is correct, no cluster needed.
test("encryptValue roundtrips through a stand-in MXE key", () => {
  const mxePriv = x25519.utils.randomSecretKey();
  const mxePub = x25519.getPublicKey(mxePriv);

  for (const value of [0n, 1n, 42n, 1_000_000n, (1n << 63n) + 7n]) {
    const enc = encryptValue(mxePub, value);

    assert.equal(enc.ciphertext.length, 32, "ciphertext is one 32-byte field");
    assert.equal(enc.publicKey.length, 32, "ephemeral pubkey is 32 bytes");
    assert.equal(enc.nonce.length, 16, "nonce is 16 bytes");

    // The MXE side derives the same shared secret from its private key + the
    // ephemeral public key, and decrypts.
    const shared = x25519.getSharedSecret(mxePriv, Uint8Array.from(enc.publicKey));
    const cipher = new RescueCipher(shared);
    const [decrypted] = cipher.decrypt([Uint8Array.from(enc.ciphertext)], enc.nonce);

    assert.equal(decrypted, value, `decrypts back to ${value}`);
  }
});

test("each encryption uses a fresh ephemeral key + nonce", () => {
  const mxePub = x25519.getPublicKey(x25519.utils.randomSecretKey());
  const a = encryptValue(mxePub, 100n);
  const b = encryptValue(mxePub, 100n);
  assert.notDeepEqual(a.publicKey, b.publicKey, "ephemeral pubkey differs");
  assert.notDeepEqual(Array.from(a.nonce), Array.from(b.nonce), "nonce differs");
});

test("newCipher returns a usable cipher + 32-byte pubkey", () => {
  const mxePub = x25519.getPublicKey(x25519.utils.randomSecretKey());
  const { cipher, publicKey } = newCipher(mxePub);
  assert.ok(cipher instanceof RescueCipher);
  assert.equal(publicKey.length, 32);
});
