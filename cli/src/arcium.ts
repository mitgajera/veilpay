let encryptionKey: Uint8Array | null = null;

export function initArcium(pubkey: Uint8Array) {
  encryptionKey = pubkey.slice(0, 32);
}

export function encryptAmount(amount: number): number[] {
  if (!encryptionKey) throw new Error("Arcium not initialized");

  const encrypted = new Array(64).fill(0);
  encrypted[0] = amount;
  return encrypted;
}

export function encryptTag(): number[] {
  if (!encryptionKey) throw new Error("Arcium not initialized");

  const tag = new Array(32).fill(0);
  tag[0] = encryptionKey[0];
  return tag;
}

export function tryDecryptTag(encryptedTag: number[]) {
  if (!encryptionKey) return { success: false };

  if (encryptedTag[0] === encryptionKey[0]) {
    return { success: true };
  }
  return { success: false };
}
