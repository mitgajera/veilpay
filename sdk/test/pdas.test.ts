import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { balancePda, mintConfigPda, vaultPda } from "../src/arcium";
import { VEILPAY_PROGRAM_ID } from "../src/idl";

const programId = new PublicKey(VEILPAY_PROGRAM_ID);
const owner = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;

test("PDA derivation is deterministic", () => {
  assert.ok(balancePda(programId, owner, mint).equals(balancePda(programId, owner, mint)));
  assert.ok(mintConfigPda(programId, mint).equals(mintConfigPda(programId, mint)));
});

test("balancePda matches manual seed derivation", () => {
  const [expected] = PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), owner.toBuffer(), mint.toBuffer()],
    programId,
  );
  assert.ok(balancePda(programId, owner, mint).equals(expected));
});

test("PDAs are distinct across owners and mints", () => {
  const owner2 = Keypair.generate().publicKey;
  const mint2 = Keypair.generate().publicKey;
  assert.ok(!balancePda(programId, owner, mint).equals(balancePda(programId, owner2, mint)));
  assert.ok(!balancePda(programId, owner, mint).equals(balancePda(programId, owner, mint2)));
  assert.ok(!mintConfigPda(programId, mint).equals(mintConfigPda(programId, mint2)));
});

test("vault is derived from the mint config", () => {
  const mc = mintConfigPda(programId, mint);
  const [expected] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mc.toBuffer()],
    programId,
  );
  assert.ok(vaultPda(programId, mc).equals(expected));
});
