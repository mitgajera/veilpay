import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { Veilpay } from "../target/types/veilpay";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getArciumProgram,
  uploadCircuit,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getLookupTableAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

describe("Veilpay", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Veilpay as Program<Veilpay>;
  const provider = anchor.getProvider();
  const arciumProgram = getArciumProgram(provider as anchor.AnchorProvider);

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E,
  ): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => res(event));
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);
  const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

  // helpers

  // Register a circuit's computation definition + upload its compiled bytecode.
  async function initCompDef(
    circuitName: string,
    initMethod: string,
  ): Promise<void> {
    const offset = getCompDefAccOffset(circuitName);
    const compDefPDA = PublicKey.findProgramAddressSync(
      [
        getArciumAccountBaseSeed("ComputationDefinitionAccount"),
        program.programId.toBuffer(),
        offset,
      ],
      getArciumProgramId(),
    )[0];

    // On a persistent chain (devnet) the comp def account may already exist from
    // a prior (possibly interrupted) run. Skip re-init if so (it fails with
    // "account already in use"), but ALWAYS run the circuit upload below — a
    // half-uploaded comp def causes error 6300 (ComputationDefinitionNotCompleted)
    // at compute time, so re-uploading finalizes it. Localnet starts fresh each
    // run, so init always runs there.
    const existing = await provider.connection.getAccountInfo(compDefPDA);
    if (!existing) {
      const mxeAccount = getMXEAccAddress(program.programId);
      const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
      const lutAddress = getLookupTableAddress(program.programId, mxeAcc.lutOffsetSlot);

      await (program.methods as any)
        [initMethod]()
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount,
          addressLookupTable: lutAddress,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
    } else {
      console.log(`comp def "${circuitName}" exists — skipping init, ensuring circuit upload`);
    }

    const rawCircuit = fs.readFileSync(`build/${circuitName}.arcis`);
    await uploadCircuit(
      provider as anchor.AnchorProvider,
      circuitName,
      program.programId,
      rawCircuit,
      true,
      500,
      { skipPreflight: true, preflightCommitment: "confirmed", commitment: "confirmed" },
    );
  }

  // Fresh cipher + keypair per call.
  function newCipher(mxePublicKey: Uint8Array) {
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    return { cipher: new RescueCipher(sharedSecret), publicKey };
  }

  // Common accountsPartial for a queued computation against a given circuit.
  function compAccounts(circuitName: string, computationOffset: anchor.BN) {
    return {
      computationAccount: getComputationAccAddress(
        arciumEnv.arciumClusterOffset,
        computationOffset,
      ),
      clusterAccount,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset(circuitName)).readUInt32LE(),
      ),
    };
  }

  let mxePublicKey: Uint8Array;

  before("fetch MXE public key", async () => {
    mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId,
    );
    console.log("MXE x25519 pubkey:", Buffer.from(mxePublicKey).toString("hex"));
  });

  // debit

  it("debit: 100 - 30 = 70", async () => {
    await initCompDef("debit", "initDebitCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(100), BigInt(30)], nonce);

    const ev = awaitEvent("debitEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .debit(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("debit", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(cipher.decrypt([e.newBalance], Uint8Array.from(e.nonce))[0]).to.equal(BigInt(70));
  });

  it("debit: overdraft (20 - 50) leaves 20 unchanged", async () => {
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(20), BigInt(50)], nonce);

    const ev = awaitEvent("debitEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .debit(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("debit", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(cipher.decrypt([e.newBalance], Uint8Array.from(e.nonce))[0]).to.equal(BigInt(20));
  });

  // deposit

  it("deposit: 50 + 30 = 80", async () => {
    await initCompDef("deposit", "initDepositCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(50), BigInt(30)], nonce);

    const ev = awaitEvent("depositEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .deposit(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("deposit", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(cipher.decrypt([e.newBalance], Uint8Array.from(e.nonce))[0]).to.equal(BigInt(80));
  });

  // withdraw

  it("withdraw: 100 - 40 = 60", async () => {
    await initCompDef("withdraw", "initWithdrawCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(100), BigInt(40)], nonce);

    const ev = awaitEvent("withdrawEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .withdraw(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("withdraw", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(cipher.decrypt([e.newBalance], Uint8Array.from(e.nonce))[0]).to.equal(BigInt(60));
  });

  // transfer

  it("transfer: sender 100 -> receiver 50, amount 30 => 70 / 80", async () => {
    await initCompDef("transfer", "initTransferCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(100), BigInt(50), BigInt(30)], nonce);

    const ev = awaitEvent("transferEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .transfer(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(ct[2]),
        Array.from(publicKey), new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("transfer", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    const dec = cipher.decrypt(
      [e.newSenderBalance, e.newReceiverBalance],
      Uint8Array.from(e.nonce),
    );
    expect(dec[0]).to.equal(BigInt(70));
    expect(dec[1]).to.equal(BigInt(80));
  });

  // view_balance

  it("view_balance: re-encrypts 42 back to the owner", async () => {
    await initCompDef("view_balance", "initViewBalanceCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(42)], nonce);

    const ev = awaitEvent("viewBalanceEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .viewBalance(off, Array.from(ct[0]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("view_balance", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(cipher.decrypt([e.balance], Uint8Array.from(e.nonce))[0]).to.equal(BigInt(42));
  });

  // prove_threshold

  it("prove_threshold: 100 >= 50 => true", async () => {
    await initCompDef("prove_threshold", "initProveThresholdCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(100), BigInt(50)], nonce);

    const ev = awaitEvent("proveThresholdEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .proveThreshold(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("prove_threshold", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(e.meetsThreshold).to.equal(true);
  });

  it("prove_threshold: 30 >= 50 => false", async () => {
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = cipher.encrypt([BigInt(30), BigInt(50)], nonce);

    const ev = awaitEvent("proveThresholdEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .proveThreshold(off, Array.from(ct[0]), Array.from(ct[1]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("prove_threshold", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(e.meetsThreshold).to.equal(false);
  });

  // reveal_to_auditor

  it("reveal_to_auditor: discloses 77 only to the auditor key", async () => {
    await initCompDef("reveal_to_auditor", "initRevealToAuditorCompDef");
    // The "auditor" holds this cipher's key; the owner encrypts under it.
    const { cipher: auditorCipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    const ct = auditorCipher.encrypt([BigInt(77)], nonce);

    const ev = awaitEvent("auditorRevealEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .revealToAuditor(off, Array.from(ct[0]), Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()))
      .accountsPartial(compAccounts("reveal_to_auditor", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    expect(auditorCipher.decrypt([e.balance], Uint8Array.from(e.nonce))[0]).to.equal(BigInt(77));
  });

  // batch_transfer

  it("batch_transfer: sender 100 -> [r1=10,r2=20,r3=30] amts [5,10,15]", async () => {
    await initCompDef("batch_transfer", "initBatchTransferCompDef");
    const { cipher, publicKey } = newCipher(mxePublicKey);
    const nonce = randomBytes(16);
    // sender, r1, r2, r3, a1, a2, a3
    const ct = cipher.encrypt(
      [BigInt(100), BigInt(10), BigInt(20), BigInt(30), BigInt(5), BigInt(10), BigInt(15)],
      nonce,
    );

    const ev = awaitEvent("batchTransferEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .batchTransfer(
        off,
        Array.from(ct[0]), Array.from(ct[1]), Array.from(ct[2]), Array.from(ct[3]),
        Array.from(ct[4]), Array.from(ct[5]), Array.from(ct[6]),
        Array.from(publicKey), new anchor.BN(deserializeLE(nonce).toString()),
      )
      .accountsPartial(compAccounts("batch_transfer", off))
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    const dec = cipher.decrypt(
      [e.newSender, e.newR1, e.newR2, e.newR3],
      Uint8Array.from(e.nonce),
    );
    expect(dec[0]).to.equal(BigInt(70)); // 100 - 30
    expect(dec[1]).to.equal(BigInt(15)); // 10 + 5
    expect(dec[2]).to.equal(BigInt(30)); // 20 + 10
    expect(dec[3]).to.equal(BigInt(45)); // 30 + 15
  });

  // Stage 3: persistent on-chain Enc<Mxe> balance

  it("persists an on-chain balance: init 0 -> +100 -> +50 -> reveal 150", async () => {
    await initCompDef("init_balance", "initInitBalanceCompDef");
    await initCompDef("deposit_to_account", "initDepositToAccountCompDef");
    await initCompDef("reveal_account_balance", "initRevealAccountBalanceCompDef");

    const payer = (provider as anchor.AnchorProvider).wallet.publicKey;
    // Dummy mint for now (no SPL yet) — just keys the PDA.
    const mint = anchor.web3.Keypair.generate().publicKey;
    const [balancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), payer.toBuffer(), mint.toBuffer()],
      program.programId,
    );

    // 1. init_balance -> account created with encrypted 0
    {
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .initBalance(off)
        .accountsPartial({
          mint,
          confidentialBalance: balancePda,
          ...compAccounts("init_balance", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    }

    // 2. deposit 100, then 50 — each reads the stored ciphertext + writes back
    for (const amount of [BigInt(100), BigInt(50)]) {
      const { cipher, publicKey } = newCipher(mxePublicKey);
      const nonce = randomBytes(16);
      const ct = cipher.encrypt([amount], nonce);
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .depositToAccount(off, Array.from(ct[0]), Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({
          mint,
          confidentialBalance: balancePda,
          ...compAccounts("deposit_to_account", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    }

    // 3. reveal the persisted balance -> 150
    const ev = awaitEvent("accountBalanceRevealedEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .revealAccountBalance(off)
      .accountsPartial({
        mint,
        confidentialBalance: balancePda,
        ...compAccounts("reveal_account_balance", off),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    console.log("Persisted on-chain balance revealed:", e.balance.toString());
    // e.balance is an Anchor BN (u64), not a bigint — compare as strings.
    expect(e.balance.toString()).to.equal("150");
  });

  it("spends from a persistent balance: +100 -> overdraft 999 (no-op) -> debit 30 -> reveal 70", async () => {
    await initCompDef("init_balance", "initInitBalanceCompDef");
    await initCompDef("deposit_to_account", "initDepositToAccountCompDef");
    await initCompDef("debit_from_account", "initDebitFromAccountCompDef");
    await initCompDef("reveal_account_balance", "initRevealAccountBalanceCompDef");

    const payer = (provider as anchor.AnchorProvider).wallet.publicKey;
    const mint = anchor.web3.Keypair.generate().publicKey;
    const [balancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), payer.toBuffer(), mint.toBuffer()],
      program.programId,
    );

    // init -> 0
    {
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .initBalance(off)
        .accountsPartial({ mint, confidentialBalance: balancePda, ...compAccounts("init_balance", off) })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    }

    // deposit 100
    {
      const { cipher, publicKey } = newCipher(mxePublicKey);
      const nonce = randomBytes(16);
      const ct = cipher.encrypt([BigInt(100)], nonce);
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .depositToAccount(off, Array.from(ct[0]), Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({ mint, confidentialBalance: balancePda, ...compAccounts("deposit_to_account", off) })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    }

    // debit helper — balance is read from the account, client only provides the amount
    const debit = async (amount: bigint) => {
      const { cipher, publicKey } = newCipher(mxePublicKey);
      const nonce = randomBytes(16);
      const ct = cipher.encrypt([amount], nonce);
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .debitFromAccount(off, Array.from(ct[0]), Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({ mint, confidentialBalance: balancePda, ...compAccounts("debit_from_account", off) })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    };

    await debit(BigInt(999)); // overdraft: 999 > 100 -> balance unchanged (no-op)
    await debit(BigInt(30));  // 100 - 30 -> 70

    // reveal -> 70 (proves overdraft was a no-op and the debit applied)
    const ev = awaitEvent("accountBalanceRevealedEvent");
    const off = new anchor.BN(randomBytes(8), "hex");
    await program.methods
      .revealAccountBalance(off)
      .accountsPartial({ mint, confidentialBalance: balancePda, ...compAccounts("reveal_account_balance", off) })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");

    const e = await ev;
    console.log("Balance after +100, overdraft 999 (no-op), -30:", e.balance.toString());
    expect(e.balance.toString()).to.equal("70");
  });

  it("transfers between persistent balances: +100 sender -> transfer 40 -> sender 60 / receiver 40", async () => {
    await initCompDef("init_balance", "initInitBalanceCompDef");
    await initCompDef("deposit_to_account", "initDepositToAccountCompDef");
    await initCompDef("transfer_between_accounts", "initTransferBetweenAccountsCompDef");
    await initCompDef("reveal_account_balance", "initRevealAccountBalanceCompDef");

    const sender = (provider as anchor.AnchorProvider).wallet.publicKey;
    const receiverKp = anchor.web3.Keypair.generate();
    const receiver = receiverKp.publicKey;
    const mint = anchor.web3.Keypair.generate().publicKey;

    // fund the receiver so it can pay rent for its own balance account
    const air = await provider.connection.requestAirdrop(receiver, 1_000_000_000);
    await provider.connection.confirmTransaction(air, "confirmed");

    const [senderBal] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), sender.toBuffer(), mint.toBuffer()], program.programId);
    const [receiverBal] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), receiver.toBuffer(), mint.toBuffer()], program.programId);

    const initBal = async (bal: PublicKey, ownerKp?: anchor.web3.Keypair) => {
      const off = new anchor.BN(randomBytes(8), "hex");
      let m = program.methods.initBalance(off).accountsPartial({
        payer: ownerKp ? ownerKp.publicKey : sender, mint,
        confidentialBalance: bal, ...compAccounts("init_balance", off),
      });
      if (ownerKp) m = m.signers([ownerKp]);
      await m.rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    };
    await initBal(senderBal);
    await initBal(receiverBal, receiverKp);

    // deposit 100 to sender
    {
      const { cipher, publicKey } = newCipher(mxePublicKey);
      const nonce = randomBytes(16);
      const ct = cipher.encrypt([BigInt(100)], nonce);
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .depositToAccount(off, Array.from(ct[0]), Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({ mint, confidentialBalance: senderBal, ...compAccounts("deposit_to_account", off) })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    }

    // transfer 40 sender -> receiver (sender signs; both balances read on-chain)
    {
      const { cipher, publicKey } = newCipher(mxePublicKey);
      const nonce = randomBytes(16);
      const ct = cipher.encrypt([BigInt(40)], nonce);
      const off = new anchor.BN(randomBytes(8), "hex");
      await program.methods
        .transferBetweenAccounts(off, Array.from(ct[0]), Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({
          mint, receiver, senderBalance: senderBal, receiverBalance: receiverBal,
          ...compAccounts("transfer_between_accounts", off),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
    }

    const reveal = async (bal: PublicKey, ownerKp?: anchor.web3.Keypair) => {
      const ev = awaitEvent("accountBalanceRevealedEvent");
      const off = new anchor.BN(randomBytes(8), "hex");
      let m = program.methods.revealAccountBalance(off).accountsPartial({
        payer: ownerKp ? ownerKp.publicKey : sender, mint,
        confidentialBalance: bal, ...compAccounts("reveal_account_balance", off),
      });
      if (ownerKp) m = m.signers([ownerKp]);
      await m.rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, off, program.programId, "confirmed");
      return (await ev).balance.toString();
    };
    const senderAfter = await reveal(senderBal);
    const receiverAfter = await reveal(receiverBal, receiverKp);
    console.log("after transfer 40 -> sender:", senderAfter, "receiver:", receiverAfter);
    expect(senderAfter).to.equal("60");
    expect(receiverAfter).to.equal("40");
  });
});

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  // Fresh keygen (without a cached MXE) can take several minutes on a 2-node
  // localnet before the MXE x25519 pubkey is published — wait up to 5 minutes.
  maxRetries: number = 300,
  retryDelayMs: number = 1000,
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) return mxePublicKey;
    } catch (_) {
      // not ready yet
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString())),
  );
}
