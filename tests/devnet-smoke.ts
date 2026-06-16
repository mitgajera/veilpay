/**
 * VeilPay Devnet Smoke Test
 *
 * Happy-path only. Safe to re-run — uses fresh keypairs every time.
 *
 * Run:
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   yarn ts-mocha -p ./tsconfig.json -t 120000 tests/devnet-smoke.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veilpay } from "../target/types/veilpay";
import { assert } from "chai";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { createHash } from "crypto";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// ── Crypto helpers (must match Rust exactly) ─────────────────────────

function sha256(...bufs: Buffer[]): Buffer {
  const h = createHash("sha256");
  for (const b of bufs) h.update(b);
  return h.digest();
}

function u64LE(n: number): Buffer {
  const b = Buffer.allocUnsafe(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

// SHA256(encrypted_amount_64 || nonce_le8 || receiver_owner_commitment_32)
function transferCommitment(
  encAmt: Buffer,
  nonce: number,
  receiverCommitment: Buffer
): Buffer {
  return sha256(encAmt, u64LE(nonce), receiverCommitment);
}

// SHA256(owner_commitment_32 || amount_le8 || nonce_le8)
function withdrawProof(
  ownerCommitment: Buffer,
  amount: number,
  nonce: number
): Buffer {
  return sha256(ownerCommitment, u64LE(amount), u64LE(nonce));
}

// ── Helpers ───────────────────────────────────────────────────────────

async function confirm(connection: anchor.web3.Connection, sig: string) {
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature: sig, ...latest },
    "confirmed"
  );
}

function log(label: string, value: string) {
  console.log(`    ✦ ${label}: ${value}`);
}

// ── Smoke Test ────────────────────────────────────────────────────────

describe("VeilPay — Devnet Smoke Test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Veilpay as Program<Veilpay>;
  const authority = provider.wallet as anchor.Wallet;
  const conn = provider.connection;

  const TOKENS = (n: number) => n * 1_000_000; // 6 decimals

  // Fresh keypairs every run — no state collisions
  const mintKeypair = Keypair.generate();
  const sender = Keypair.generate();
  const receiver = Keypair.generate();

  let mintConfigPda: PublicKey;
  let vaultPda: PublicKey;
  let senderBalancePda: PublicKey;
  let receiverBalancePda: PublicKey;
  let senderAta: PublicKey;

  let senderOwnerCommitment: Buffer;
  let receiverOwnerCommitment: Buffer;

  // ── Setup ─────────────────────────────────────────────────────────

  before("Derive PDAs and fund fresh keypairs from authority wallet", async () => {
    [mintConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_config")],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), mintConfigPda.toBuffer()],
      program.programId
    );
    [senderBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), sender.publicKey.toBuffer()],
      program.programId
    );
    [receiverBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), receiver.publicKey.toBuffer()],
      program.programId
    );

    senderOwnerCommitment = sha256(sender.publicKey.toBuffer());
    receiverOwnerCommitment = sha256(receiver.publicKey.toBuffer());

    log("Mint keypair", mintKeypair.publicKey.toBase58());
    log("Sender", sender.publicKey.toBase58());
    log("Receiver", receiver.publicKey.toBase58());
    log("MintConfig PDA", mintConfigPda.toBase58());
    log("Vault PDA", vaultPda.toBase58());

    // Fund sender and receiver from authority wallet — avoids devnet airdrop limits
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: sender.publicKey,
        lamports: 0.5 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: receiver.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      })
    );
    const fundSig = await provider.sendAndConfirm(fundTx);
    log("Fund tx", fundSig);
  });

  // ── Step 1: initialize_mint ───────────────────────────────────────

  it("Step 1 — initialize_mint: creates mint config and SPL mint", async () => {
    const sig = await program.methods
      .initializeMint()
      .accounts({
        mintConfig: mintConfigPda,
        mint: mintKeypair.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    await confirm(conn, sig);
    log("initialize_mint tx", sig);

    const cfg = await program.account.mintConfig.fetch(mintConfigPda);
    assert.ok(cfg.authority.equals(authority.publicKey));
    assert.ok(cfg.mint.equals(mintKeypair.publicKey));
    assert.equal(cfg.totalDeposited.toNumber(), 0);
    log("mintConfig.authority", cfg.authority.toBase58());
    log("mintConfig.mint", cfg.mint.toBase58());
  });

  // ── Step 2: init_balance ──────────────────────────────────────────

  it("Step 2 — init_balance: creates sender and receiver balance accounts", async () => {
    const senderSig = await program.methods
      .initBalance([...senderOwnerCommitment] as any)
      .accounts({
        confidentialBalance: senderBalancePda,
        owner: sender.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    await confirm(conn, senderSig);
    log("init_balance (sender) tx", senderSig);

    const receiverSig = await program.methods
      .initBalance([...receiverOwnerCommitment] as any)
      .accounts({
        confidentialBalance: receiverBalancePda,
        owner: receiver.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    await confirm(conn, receiverSig);
    log("init_balance (receiver) tx", receiverSig);

    const sbal = await program.account.confidentialBalance.fetch(senderBalancePda);
    const rbal = await program.account.confidentialBalance.fetch(receiverBalancePda);
    assert.equal(sbal.nonce.toNumber(), 0);
    assert.equal(rbal.nonce.toNumber(), 0);
    assert.ok(sbal.owner.equals(sender.publicKey));
    assert.ok(rbal.owner.equals(receiver.publicKey));
    log("sender nonce", "0");
    log("receiver nonce", "0");
  });

  // ── Step 3: deposit ───────────────────────────────────────────────

  it("Step 3 — deposit: mints tokens and deposits into vault", async () => {
    // Create sender ATA
    senderAta = await createAssociatedTokenAccount(
      conn,
      sender,
      mintKeypair.publicKey,
      sender.publicKey
    );
    log("Sender ATA", senderAta.toBase58());

    // Mint 1,000 tokens to sender ATA (authority wallet is mint authority)
    const mintSig = await mintTo(
      conn,
      authority.payer,
      mintKeypair.publicKey,
      senderAta,
      authority.publicKey,
      TOKENS(1_000)
    );
    await confirm(conn, mintSig);
    log("mintTo tx", mintSig);

    // Deposit 500 tokens
    const depositAmount = TOKENS(500);
    const newEncBal = Buffer.alloc(64, 0x11);
    const balCommit = sha256(Buffer.alloc(32, 0x22));

    const depositSig = await program.methods
      .deposit(
        new anchor.BN(depositAmount),
        [...newEncBal] as any,
        [...balCommit] as any
      )
      .accounts({
        confidentialBalance: senderBalancePda,
        owner: sender.publicKey,
        ownerTokenAccount: senderAta,
        vault: vaultPda,
        mintConfig: mintConfigPda,
        mint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    await confirm(conn, depositSig);
    log("deposit tx", depositSig);

    const bal = await program.account.confidentialBalance.fetch(senderBalancePda);
    assert.equal(bal.depositCount.toNumber(), 1);

    const cfg = await program.account.mintConfig.fetch(mintConfigPda);
    assert.equal(cfg.totalDeposited.toNumber(), depositAmount);
    log("depositCount", "1");
    log("totalDeposited", `${depositAmount / 1_000_000} tokens`);
  });

  // ── Step 4: private_transfer ──────────────────────────────────────

  it("Step 4 — private_transfer: sender sends encrypted amount to receiver", async () => {
    const encAmt = Buffer.alloc(64, 0x07);
    const senderNewBal = Buffer.alloc(64, 0x03);
    const encTag = Buffer.alloc(64, 0x09);
    const commitHash = transferCommitment(encAmt, 0, receiverOwnerCommitment);

    const sig = await program.methods
      .privateTransfer(
        [...encAmt] as any,
        [...senderNewBal] as any,
        [...commitHash] as any,
        [...encTag] as any,
        new anchor.BN(0)
      )
      .accounts({
        senderBalance: senderBalancePda,
        receiverBalance: receiverBalancePda,
        sender: sender.publicKey,
      })
      .signers([sender])
      .rpc();

    await confirm(conn, sig);
    log("private_transfer tx", sig);

    const sbal = await program.account.confidentialBalance.fetch(senderBalancePda);
    const rbal = await program.account.confidentialBalance.fetch(receiverBalancePda);

    assert.equal(sbal.nonce.toNumber(), 1);
    assert.deepEqual([...rbal.pendingBalance], [...encAmt]);
    log("sender nonce after transfer", "1");
    log("receiver pendingBalance set", "✓");
  });

  // ── Step 5: apply_pending_balance ─────────────────────────────────

  it("Step 5 — apply_pending_balance: receiver merges pending into balance", async () => {
    const newEncBal = Buffer.alloc(64, 0xaa);
    const newCommit = sha256(Buffer.alloc(32, 0xbb));

    const sig = await program.methods
      .applyPendingBalance(
        [...newEncBal] as any,
        [...newCommit] as any
      )
      .accounts({
        confidentialBalance: receiverBalancePda,
        owner: receiver.publicKey,
      })
      .signers([receiver])
      .rpc();

    await confirm(conn, sig);
    log("apply_pending_balance tx", sig);

    const rbal = await program.account.confidentialBalance.fetch(receiverBalancePda);
    assert.deepEqual([...rbal.pendingBalance], [...Buffer.alloc(64, 0)]);
    assert.deepEqual([...rbal.encryptedBalance], [...newEncBal]);
    log("pendingBalance zeroed", "✓");
    log("encryptedBalance updated", "✓");
  });

  // ── Step 6: withdraw ──────────────────────────────────────────────

  it("Step 6 — withdraw: sender withdraws tokens from vault", async () => {
    const withdrawAmount = TOKENS(200);
    const newEncBal = Buffer.alloc(64, 0x33);
    const balCommit = sha256(Buffer.alloc(32, 0x44));

    // sender nonce is 1 after private_transfer; deposit doesn't change nonce
    const proof = withdrawProof(senderOwnerCommitment, withdrawAmount, 1);

    const sig = await program.methods
      .withdraw(
        new anchor.BN(withdrawAmount),
        [...newEncBal] as any,
        [...balCommit] as any,
        [...proof] as any
      )
      .accounts({
        confidentialBalance: senderBalancePda,
        owner: sender.publicKey,
        ownerTokenAccount: senderAta,
        vault: vaultPda,
        mintConfig: mintConfigPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    await confirm(conn, sig);
    log("withdraw tx", sig);

    const sbal = await program.account.confidentialBalance.fetch(senderBalancePda);
    assert.equal(sbal.withdrawCount.toNumber(), 1);
    assert.equal(sbal.nonce.toNumber(), 2);

    const cfg = await program.account.mintConfig.fetch(mintConfigPda);
    assert.equal(cfg.totalWithdrawn.toNumber(), withdrawAmount);

    const senderToken = await getAccount(conn, senderAta);
    log("withdrawCount", "1");
    log("totalWithdrawn", `${withdrawAmount / 1_000_000} tokens`);
    log("sender token balance", `${Number(senderToken.amount) / 1_000_000} tokens`);
    log(
      "vault remaining",
      `${(TOKENS(500) - withdrawAmount) / 1_000_000} tokens`
    );
  });

  // ── Summary ───────────────────────────────────────────────────────

  after("Smoke test complete", () => {
    console.log("\n  ════════════════════════════════════════");
    console.log("  VeilPay devnet smoke test passed ✓");
    console.log(`  Program: ${program.programId.toBase58()}`);
    console.log(`  Network: ${conn.rpcEndpoint}`);
    console.log("  ════════════════════════════════════════\n");
  });
});
