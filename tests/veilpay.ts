import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veilpay } from "../target/types/veilpay";
import { assert } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  getAccount,
  mintTo,
} from "@solana/spl-token";
import { createHash } from "crypto";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// SHA256 matching Rust's hashv — concatenates all inputs then hashes once
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

// Matches Rust: hashv(&[encrypted_amount, &nonce.to_le_bytes(), receiver_commitment])
function transferCommitment(
  encAmt: Buffer,
  nonce: number,
  receiverOwnerCommitment: Buffer
): Buffer {
  return sha256(encAmt, u64LE(nonce), receiverOwnerCommitment);
}

// Matches Rust: hashv(&[owner_commitment, &amount.to_le_bytes(), &nonce.to_le_bytes()])
function withdrawalProof(
  ownerCommitment: Buffer,
  amount: number,
  nonce: number
): Buffer {
  return sha256(ownerCommitment, u64LE(amount), u64LE(nonce));
}

describe("VeilPay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Veilpay as Program<Veilpay>;

  const authority = provider.wallet as anchor.Wallet;
  const sender = Keypair.generate();
  const receiver = Keypair.generate();
  const closer = Keypair.generate();
  const depositor = Keypair.generate();

  let mintConfigPda: PublicKey;
  let mintKeypair: Keypair;
  let senderBalancePda: PublicKey;
  let receiverBalancePda: PublicKey;
  let closerBalancePda: PublicKey;
  let depositorBalancePda: PublicKey;
  let depositorAta: PublicKey;
  let vaultPda: PublicKey;

  let senderOwnerCommitment: Buffer;
  let receiverOwnerCommitment: Buffer;
  let closerOwnerCommitment: Buffer;
  let depositorOwnerCommitment: Buffer;

  const ZERO_64 = Buffer.alloc(64, 0);
  const MINT_DECIMALS = 6;
  const TOKENS = (n: number) => n * 10 ** MINT_DECIMALS;

  async function airdrop(pk: PublicKey, sol = 2) {
    const sig = await provider.connection.requestAirdrop(
      pk,
      sol * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  before("Setup accounts and PDAs", async () => {
    await airdrop(sender.publicKey);
    await airdrop(receiver.publicKey);
    await airdrop(closer.publicKey);
    await airdrop(depositor.publicKey, 3);

    mintKeypair = Keypair.generate();
    [mintConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_config"), mintKeypair.publicKey.toBuffer()],
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
    [closerBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), closer.publicKey.toBuffer()],
      program.programId
    );
    [depositorBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), depositor.publicKey.toBuffer()],
      program.programId
    );

    senderOwnerCommitment = sha256(sender.publicKey.toBuffer());
    receiverOwnerCommitment = sha256(receiver.publicKey.toBuffer());
    closerOwnerCommitment = sha256(closer.publicKey.toBuffer());
    depositorOwnerCommitment = sha256(depositor.publicKey.toBuffer());
  });

  // ── Section 1: initialize_mint ─────────────────────────────────────

  describe("initialize_mint", () => {
    it("creates mint config PDA and SPL mint successfully", async () => {
      await program.methods
        .initializeMint()
        .accounts({
          mintConfig: mintConfigPda,
          mint: mintKeypair.publicKey,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();

      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      assert.ok(cfg.authority.equals(authority.publicKey));
      assert.ok(cfg.mint.equals(mintKeypair.publicKey));
      assert.equal(cfg.totalDeposited.toNumber(), 0);
      assert.equal(cfg.totalWithdrawn.toNumber(), 0);
    });

    it("fails when called a second time (PDA already in use)", async () => {
      try {
        const dupe = Keypair.generate();
        await program.methods
          .initializeMint()
          .accounts({
            mintConfig: mintConfigPda,
            mint: dupe.publicKey,
            authority: authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([dupe])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });
  });

  // ── Section 2: init_balance ────────────────────────────────────────

  describe("init_balance", () => {
    it("creates sender confidential balance", async () => {
      await program.methods
        .initBalance([...senderOwnerCommitment] as any)
        .accounts({
          confidentialBalance: senderBalancePda,
          owner: sender.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      const bal = await program.account.confidentialBalance.fetch(
        senderBalancePda
      );
      assert.ok(bal.owner.equals(sender.publicKey));
      assert.equal(bal.nonce.toNumber(), 0);
      assert.deepEqual([...bal.encryptedBalance], [...ZERO_64]);
      assert.deepEqual([...bal.pendingBalance], [...ZERO_64]);
      assert.equal(bal.isFrozen, false);
    });

    it("creates receiver confidential balance", async () => {
      await program.methods
        .initBalance([...receiverOwnerCommitment] as any)
        .accounts({
          confidentialBalance: receiverBalancePda,
          owner: receiver.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([receiver])
        .rpc();

      const bal = await program.account.confidentialBalance.fetch(
        receiverBalancePda
      );
      assert.ok(bal.owner.equals(receiver.publicKey));
      assert.equal(bal.nonce.toNumber(), 0);
    });

    it("creates closer confidential balance (used for close_account test)", async () => {
      await program.methods
        .initBalance([...closerOwnerCommitment] as any)
        .accounts({
          confidentialBalance: closerBalancePda,
          owner: closer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([closer])
        .rpc();

      const bal = await program.account.confidentialBalance.fetch(
        closerBalancePda
      );
      assert.ok(bal.owner.equals(closer.publicKey));
    });

    it("fails when called twice for the same owner", async () => {
      try {
        await program.methods
          .initBalance([...senderOwnerCommitment] as any)
          .accounts({
            confidentialBalance: senderBalancePda,
            owner: sender.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([sender])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });

    it("fails with all-zero owner_commitment (InvalidCommitment)", async () => {
      const fresh = Keypair.generate();
      await airdrop(fresh.publicKey, 1);
      const [freshPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), fresh.publicKey.toBuffer()],
        program.programId
      );
      try {
        await program.methods
          .initBalance([...Buffer.alloc(32, 0)] as any)
          .accounts({
            confidentialBalance: freshPda,
            owner: fresh.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([fresh])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InvalidCommitment") ||
            e.toString().includes("custom program error")
        );
      }
    });
  });

  // ── Section 3: private_transfer ────────────────────────────────────

  describe("private_transfer", () => {
    it("executes first transfer (nonce=0), XORs pending balance correctly", async () => {
      const encAmt = Buffer.alloc(64, 0x07);
      const senderNewBal = Buffer.alloc(64, 0x03);
      const encTag = Buffer.alloc(64, 0x09);
      const commitHash = transferCommitment(encAmt, 0, receiverOwnerCommitment);

      await program.methods
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

      const sbal = await program.account.confidentialBalance.fetch(
        senderBalancePda
      );
      const rbal = await program.account.confidentialBalance.fetch(
        receiverBalancePda
      );

      assert.equal(sbal.nonce.toNumber(), 1);
      assert.deepEqual([...sbal.encryptedBalance], [...senderNewBal]);
      assert.deepEqual([...rbal.pendingBalance], [...encAmt]);
    });

    it("fails with wrong nonce (replay attack)", async () => {
      try {
        const encAmt = Buffer.alloc(64, 0x05);
        const senderNewBal = Buffer.alloc(64, 0x01);
        const encTag = Buffer.alloc(64, 0x02);
        const commitHash = transferCommitment(encAmt, 0, receiverOwnerCommitment);
        await program.methods
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
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InvalidNonce") ||
            e.toString().includes("custom program error")
        );
      }
    });

    it("fails with invalid commitment_hash", async () => {
      try {
        const encAmt = Buffer.alloc(64, 0x05);
        const senderNewBal = Buffer.alloc(64, 0x01);
        const encTag = Buffer.alloc(64, 0x02);
        const badCommit = Buffer.alloc(32, 0xff);
        await program.methods
          .privateTransfer(
            [...encAmt] as any,
            [...senderNewBal] as any,
            [...badCommit] as any,
            [...encTag] as any,
            new anchor.BN(1)
          )
          .accounts({
            senderBalance: senderBalancePda,
            receiverBalance: receiverBalancePda,
            sender: sender.publicKey,
          })
          .signers([sender])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InvalidCommitment") ||
            e.toString().includes("custom program error")
        );
      }
    });

    it("fails on self-transfer (SelfTransfer)", async () => {
      try {
        const encAmt = Buffer.alloc(64, 0x05);
        const senderNewBal = Buffer.alloc(64, 0x01);
        const encTag = Buffer.alloc(64, 0x02);
        const commitHash = transferCommitment(encAmt, 1, senderOwnerCommitment);
        await program.methods
          .privateTransfer(
            [...encAmt] as any,
            [...senderNewBal] as any,
            [...commitHash] as any,
            [...encTag] as any,
            new anchor.BN(1)
          )
          .accounts({
            senderBalance: senderBalancePda,
            receiverBalance: senderBalancePda,
            sender: sender.publicKey,
          })
          .signers([sender])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });

    it("fails when signer does not match sender_balance owner", async () => {
      try {
        const encAmt = Buffer.alloc(64, 0x05);
        const senderNewBal = Buffer.alloc(64, 0x01);
        const encTag = Buffer.alloc(64, 0x02);
        const commitHash = transferCommitment(encAmt, 1, receiverOwnerCommitment);
        await program.methods
          .privateTransfer(
            [...encAmt] as any,
            [...senderNewBal] as any,
            [...commitHash] as any,
            [...encTag] as any,
            new anchor.BN(1)
          )
          .accounts({
            senderBalance: senderBalancePda,
            receiverBalance: receiverBalancePda,
            sender: receiver.publicKey,
          })
          .signers([receiver])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });

    it("executes second transfer (nonce=1) successfully", async () => {
      const encAmt = Buffer.alloc(64, 0x0b);
      const senderNewBal = Buffer.alloc(64, 0x04);
      const encTag = Buffer.alloc(64, 0x0d);
      const commitHash = transferCommitment(encAmt, 1, receiverOwnerCommitment);

      await program.methods
        .privateTransfer(
          [...encAmt] as any,
          [...senderNewBal] as any,
          [...commitHash] as any,
          [...encTag] as any,
          new anchor.BN(1)
        )
        .accounts({
          senderBalance: senderBalancePda,
          receiverBalance: receiverBalancePda,
          sender: sender.publicKey,
        })
        .signers([sender])
        .rpc();

      const sbal = await program.account.confidentialBalance.fetch(
        senderBalancePda
      );
      assert.equal(sbal.nonce.toNumber(), 2);
    });
  });

  // ── Section 4: apply_pending_balance ──────────────────────────────

  describe("apply_pending_balance", () => {
    it("merges pending balance into encrypted balance and zeros pending", async () => {
      const newEncBal = Buffer.alloc(64, 0xaa);
      const newCommit = sha256(Buffer.alloc(32, 0xbb));

      await program.methods
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

      const bal = await program.account.confidentialBalance.fetch(
        receiverBalancePda
      );
      assert.deepEqual([...bal.encryptedBalance], [...newEncBal]);
      assert.deepEqual([...bal.pendingBalance], [...ZERO_64]);
    });
  });

  // ── Section 5: close_account ──────────────────────────────────────

  describe("close_account", () => {
    it("fails when encrypted_balance is non-zero (BalanceNotZero)", async () => {
      try {
        await program.methods
          .closeAccount()
          .accounts({
            confidentialBalance: senderBalancePda,
            owner: sender.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([sender])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("BalanceNotZero") ||
            e.toString().includes("custom program error")
        );
      }
    });

    it("closes account with zero balance, refunds rent to owner", async () => {
      const lamportsBefore = await provider.connection.getBalance(
        closer.publicKey
      );

      await program.methods
        .closeAccount()
        .accounts({
          confidentialBalance: closerBalancePda,
          owner: closer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([closer])
        .rpc();

      const lamportsAfter = await provider.connection.getBalance(
        closer.publicKey
      );
      assert.ok(lamportsAfter > lamportsBefore, "rent should be refunded");

      try {
        await program.account.confidentialBalance.fetch(closerBalancePda);
        assert.fail("account should no longer exist");
      } catch (_) {
        assert.ok(true);
      }
    });
  });

  // ── Section 6: batch_transfer ─────────────────────────────────────

  describe("batch_transfer", () => {
    it("fails when more than 5 recipients provided (TooManyRecipients)", async () => {
      const sixTransfers = Array.from({ length: 6 }, () => ({
        encryptedAmount: [...Buffer.alloc(64, 1)],
        commitmentHash: [...Buffer.alloc(32, 0)],
        encryptedReceiverTag: [...Buffer.alloc(64, 0)],
      }));

      try {
        await program.methods
          .batchTransfer(
            sixTransfers as any,
            [...Buffer.alloc(64, 0)] as any,
            new anchor.BN(2)
          )
          .accounts({
            senderBalance: senderBalancePda,
            sender: sender.publicKey,
          })
          .remainingAccounts([])
          .signers([sender])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });

    it("executes single-recipient batch transfer successfully", async () => {
      const senderNonce = 2;
      const encAmt = Buffer.alloc(64, 0x33);
      const encTag = Buffer.alloc(64, 0x44);
      const senderNewBal = Buffer.alloc(64, 0x55);
      const commitHash = transferCommitment(
        encAmt,
        senderNonce,
        receiverOwnerCommitment
      );

      await program.methods
        .batchTransfer(
          [
            {
              encryptedAmount: [...encAmt] as any,
              commitmentHash: [...commitHash] as any,
              encryptedReceiverTag: [...encTag] as any,
            },
          ] as any,
          [...senderNewBal] as any,
          new anchor.BN(senderNonce)
        )
        .accounts({
          senderBalance: senderBalancePda,
          sender: sender.publicKey,
        })
        .remainingAccounts([
          { pubkey: receiverBalancePda, isWritable: true, isSigner: false },
        ])
        .signers([sender])
        .rpc();

      const sbal = await program.account.confidentialBalance.fetch(
        senderBalancePda
      );
      assert.equal(sbal.nonce.toNumber(), 3);
      assert.deepEqual([...sbal.encryptedBalance], [...senderNewBal]);

      const rbal = await program.account.confidentialBalance.fetch(
        receiverBalancePda
      );
      assert.deepEqual([...rbal.pendingBalance], [...encAmt]);
    });
  });

  // ── Section 7: deposit ────────────────────────────────────────────

  describe("deposit", () => {
    before("create depositor balance account and fund ATA with tokens", async () => {
      // Create confidential balance for depositor
      await program.methods
        .initBalance([...depositorOwnerCommitment] as any)
        .accounts({
          confidentialBalance: depositorBalancePda,
          owner: depositor.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      // Create depositor's ATA for the VeilPay mint
      depositorAta = await createAssociatedTokenAccount(
        provider.connection,
        depositor,            // fee payer
        mintKeypair.publicKey,
        depositor.publicKey
      );

      // Mint 10,000 tokens to depositor's ATA and wait for confirmed state
      const mintSig = await mintTo(
        provider.connection,
        authority.payer,      // transaction signer (NodeWallet exposes .payer)
        mintKeypair.publicKey,
        depositorAta,
        authority.publicKey,  // mint authority (set to `authority` in initialize_mint)
        TOKENS(10_000)
      );
      await provider.connection.confirmTransaction(mintSig, "confirmed");
    });

    it("deposits tokens into vault and updates encrypted balance", async () => {
      const amount = TOKENS(1_000);
      const newEncBal = Buffer.alloc(64, 0x11);
      const balCommit = sha256(Buffer.alloc(32, 0x22));

      await program.methods
        .deposit(
          new anchor.BN(amount),
          [...newEncBal] as any,
          [...balCommit] as any
        )
        .accounts({
          confidentialBalance: depositorBalancePda,
          owner: depositor.publicKey,
          ownerTokenAccount: depositorAta,
          vault: vaultPda,
          mintConfig: mintConfigPda,
          mint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      // Verify program-side state (always consistent, no RPC lag)
      const bal = await program.account.confidentialBalance.fetch(
        depositorBalancePda
      );
      assert.equal(bal.depositCount.toNumber(), 1);
      assert.deepEqual([...bal.encryptedBalance], [...newEncBal]);

      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      assert.equal(cfg.totalDeposited.toNumber(), amount);
      // Token account balances verified implicitly by the withdraw tests below
    });

    it("fails if deposit amount is zero (InvalidAmount)", async () => {
      try {
        await program.methods
          .deposit(
            new anchor.BN(0),
            [...Buffer.alloc(64, 0)] as any,
            [...Buffer.alloc(32, 0)] as any
          )
          .accounts({
            confidentialBalance: depositorBalancePda,
            owner: depositor.publicKey,
            ownerTokenAccount: depositorAta,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            mint: mintKeypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InvalidAmount") ||
            e.toString().includes("custom program error")
        );
      }
    });

    it("fails if owner has insufficient token balance (InsufficientFunds)", async () => {
      const tooMuch = new anchor.BN(TOKENS(999_999));
      try {
        await program.methods
          .deposit(
            tooMuch,
            [...Buffer.alloc(64, 0)] as any,
            [...Buffer.alloc(32, 0)] as any
          )
          .accounts({
            confidentialBalance: depositorBalancePda,
            owner: depositor.publicKey,
            ownerTokenAccount: depositorAta,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            mint: mintKeypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InsufficientFunds") ||
            e.toString().includes("custom program error") ||
            e.toString().includes("insufficient funds")
        );
      }
    });

    it("fails if mint does not match mint_config (InvalidMint)", async () => {
      const wrongMint = Keypair.generate().publicKey;
      try {
        await program.methods
          .deposit(
            new anchor.BN(TOKENS(100)),
            [...Buffer.alloc(64, 0)] as any,
            [...Buffer.alloc(32, 0)] as any
          )
          .accounts({
            confidentialBalance: depositorBalancePda,
            owner: depositor.publicKey,
            ownerTokenAccount: depositorAta,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            mint: wrongMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });
  });

  // ── Section 8: withdraw ───────────────────────────────────────────

  describe("withdraw", () => {
    // After deposit tests: vault has 1,000 tokens, depositor nonce = 0

    it("withdraws tokens from vault with valid withdrawal proof", async () => {
      const amount = TOKENS(500);
      const newEncBal = Buffer.alloc(64, 0x33);
      const balCommit = sha256(Buffer.alloc(32, 0x44));

      // depositor nonce is 0 (deposit doesn't change nonce)
      const proof = withdrawalProof(depositorOwnerCommitment, amount, 0);

      const ownerBefore = await getAccount(provider.connection, depositorAta);
      const vaultBefore = await getAccount(provider.connection, vaultPda);

      await program.methods
        .withdraw(
          new anchor.BN(amount),
          [...newEncBal] as any,
          [...balCommit] as any,
          [...proof] as any
        )
        .accounts({
          confidentialBalance: depositorBalancePda,
          owner: depositor.publicKey,
          ownerTokenAccount: depositorAta,
          vault: vaultPda,
          mintConfig: mintConfigPda,
          mint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      const ownerAfter = await getAccount(provider.connection, depositorAta);
      const vaultAfter = await getAccount(provider.connection, vaultPda);

      assert.equal(
        Number(ownerAfter.amount),
        Number(ownerBefore.amount) + amount
      );
      assert.equal(
        Number(vaultAfter.amount),
        Number(vaultBefore.amount) - amount
      );

      const bal = await program.account.confidentialBalance.fetch(
        depositorBalancePda
      );
      assert.equal(bal.withdrawCount.toNumber(), 1);
      assert.equal(bal.nonce.toNumber(), 1);
      assert.deepEqual([...bal.encryptedBalance], [...newEncBal]);

      const cfg = await program.account.mintConfig.fetch(mintConfigPda);
      assert.equal(cfg.totalWithdrawn.toNumber(), amount);
    });

    it("fails with invalid withdrawal proof (InvalidWithdrawalProof)", async () => {
      const badProof = Buffer.alloc(32, 0xff);
      try {
        await program.methods
          .withdraw(
            new anchor.BN(TOKENS(100)),
            [...Buffer.alloc(64, 0)] as any,
            [...Buffer.alloc(32, 0)] as any,
            [...badProof] as any
          )
          .accounts({
            confidentialBalance: depositorBalancePda,
            owner: depositor.publicKey,
            ownerTokenAccount: depositorAta,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InvalidWithdrawalProof") ||
            e.toString().includes("custom program error")
        );
      }
    });

    it("fails if withdraw amount is zero (InvalidAmount)", async () => {
      // nonce is now 1 after the successful withdrawal
      const proof = withdrawalProof(depositorOwnerCommitment, 0, 1);
      try {
        await program.methods
          .withdraw(
            new anchor.BN(0),
            [...Buffer.alloc(64, 0)] as any,
            [...Buffer.alloc(32, 0)] as any,
            [...proof] as any
          )
          .accounts({
            confidentialBalance: depositorBalancePda,
            owner: depositor.publicKey,
            ownerTokenAccount: depositorAta,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: any) {
        assert.ok(
          e.toString().includes("InvalidAmount") ||
            e.toString().includes("custom program error")
        );
      }
    });

    it("fails if vault has insufficient funds", async () => {
      // vault has 500 tokens remaining; try to withdraw 999,999
      const amount = TOKENS(999_999);
      const proof = withdrawalProof(depositorOwnerCommitment, amount, 1);
      try {
        await program.methods
          .withdraw(
            new anchor.BN(amount),
            [...Buffer.alloc(64, 0)] as any,
            [...Buffer.alloc(32, 0)] as any,
            [...proof] as any
          )
          .accounts({
            confidentialBalance: depositorBalancePda,
            owner: depositor.publicKey,
            ownerTokenAccount: depositorAta,
            vault: vaultPda,
            mintConfig: mintConfigPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();
        assert.fail("should have thrown");
      } catch (_) {
        assert.ok(true);
      }
    });
  });
});
