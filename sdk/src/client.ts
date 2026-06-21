import BN from "bn.js";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  buildContext,
  type Ctx,
  type VeilPayConfig,
  type VeilPayWallet,
} from "./context";
import {
  balancePda,
  compAccounts,
  finalize as finalizeComputation,
  getMXEPublicKeyWithRetry,
  mintConfigPda,
  randomOffset,
  vaultPda,
} from "./arcium";
import { encryptValue } from "./crypto";
import { normalizeAmount, normalizePubkey } from "./validate";
import { wrapSendError } from "./errors";
import {
  balanceExists,
  getConfidentialBalance,
  getMintConfig,
  getVaultTokenBalance,
  type ConfidentialBalanceState,
  type MintConfigState,
} from "./accounts";
import type {
  AccountPdas,
  Amount,
  BuiltInstruction,
  ComputationResult,
  DebitResult,
  InitBalanceResult,
  InitMintResult,
  MintLike,
  RevealResult,
  SendOptions,
} from "./types";

/**
 * Confidential token payments on Solana via Arcium MPC.
 *
 * Wraps the `veilpay` program: token deposits land in a vault while the
 * spendable balance stays encrypted on-chain, transfers move encrypted amounts
 * with nothing public, and withdrawals release tokens only if the hidden
 * balance covers them.
 *
 * Each operation comes in two forms: a high-level `method()` that submits and
 * waits for MPC finalization, and a `buildMethodIx()` that returns an unsent
 * instruction (plus the `computationOffset` to `finalize()` with) so callers
 * can batch, simulate, or set priority fees themselves.
 */
export class VeilPayClient {
  readonly ctx: Ctx;

  constructor(config: VeilPayConfig) {
    this.ctx = buildContext(config);
  }

  /**
   * Construct a client from a raw Keypair (Node/CLI convenience). The browser
   * path is the plain constructor with a wallet-adapter `wallet`.
   */
  static fromKeypair(
    keypair: Keypair,
    config: Omit<VeilPayConfig, "wallet">,
  ): VeilPayClient {
    const wallet: VeilPayWallet = {
      publicKey: keypair.publicKey,
      async signTransaction<T>(tx: T): Promise<T> {
        (tx as any).partialSign(keypair);
        return tx;
      },
      async signAllTransactions<T>(txs: T[]): Promise<T[]> {
        for (const tx of txs) (tx as any).partialSign(keypair);
        return txs;
      },
    };
    return new VeilPayClient({ ...config, wallet });
  }

  /** The program ID this client targets. */
  get programId(): PublicKey {
    return this.ctx.program.programId;
  }

  /** The acting wallet's public key. */
  get owner(): PublicKey {
    return this.ctx.wallet.publicKey;
  }

  /** Derive the program PDAs for `owner` (default: the acting wallet) + mint. */
  pdas(mint: MintLike, owner: PublicKey = this.owner): AccountPdas {
    const m = normalizePubkey(mint, "mint");
    const mintConfig = mintConfigPda(this.programId, m);
    return {
      balance: balancePda(this.programId, owner, m),
      mintConfig,
      vault: vaultPda(this.programId, mintConfig),
    };
  }

  // ----------------------------------------------------------------- internals

  /** Send a built instruction, wrapping program errors. Returns the signature. */
  private async send(built: BuiltInstruction, opts?: SendOptions): Promise<string> {
    const tx = new Transaction().add(built.instruction);
    try {
      return await this.ctx.provider.sendAndConfirm(tx, built.signers, {
        skipPreflight: opts?.skipPreflight ?? true,
        commitment: this.ctx.commitment,
      });
    } catch (e) {
      throw wrapSendError(e);
    }
  }

  /** Send an MPC instruction and await finalization. */
  private async sendAndFinalize(
    built: BuiltInstruction,
    opts?: SendOptions,
  ): Promise<ComputationResult> {
    const signature = await this.send(built, opts);
    await this.finalize(built.computationOffset!, opts?.finalizeTimeoutMs);
    return { signature, computationOffset: built.computationOffset! };
  }

  /** Await finalization of a previously queued computation offset. */
  finalize(computationOffset: BN, timeoutMs?: number): Promise<void> {
    return finalizeComputation(this.ctx, computationOffset, timeoutMs);
  }

  // ------------------------------------------------------------- read / query

  /** Fetch + decode an owner's confidential balance (ciphertext stays encrypted). */
  getConfidentialBalance(
    mint: MintLike,
    owner: PublicKey = this.owner,
  ): Promise<ConfidentialBalanceState> {
    return getConfidentialBalance(this.ctx, normalizePubkey(mint, "mint"), owner);
  }

  /** Whether an owner's confidential balance account exists for a mint. */
  balanceExists(mint: MintLike, owner: PublicKey = this.owner): Promise<boolean> {
    return balanceExists(this.ctx, normalizePubkey(mint, "mint"), owner);
  }

  /** Fetch + decode a mint's vault config. */
  getMintConfig(mint: MintLike): Promise<MintConfigState> {
    return getMintConfig(this.ctx, normalizePubkey(mint, "mint"));
  }

  /** Token balance held in a mint's vault, in base units. */
  getVaultTokenBalance(mint: MintLike): Promise<bigint> {
    return getVaultTokenBalance(this.ctx, normalizePubkey(mint, "mint"));
  }

  // ------------------------------------------------------------------ initMint

  /** Build the (unsent) instruction to create a mint + vault config. */
  async buildInitMintIx(): Promise<BuiltInstruction & { mint: PublicKey }> {
    const mintKp = Keypair.generate();
    const mintConfig = mintConfigPda(this.programId, mintKp.publicKey);
    const instruction = await this.ctx.program.methods
      .initializeMint()
      .accountsPartial({
        mintConfig,
        mint: mintKp.publicKey,
        authority: this.owner,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
    return { instruction, signers: [mintKp], mint: mintKp.publicKey };
  }

  /** Create a new SPL mint + vault config for confidential custody. */
  async initMint(opts?: SendOptions): Promise<InitMintResult> {
    const built = await this.buildInitMintIx();
    const mintConfig = mintConfigPda(this.programId, built.mint);
    const signature = await this.send(built, { skipPreflight: false, ...opts });
    return {
      mint: built.mint,
      mintConfig,
      vault: vaultPda(this.programId, mintConfig),
      signature,
    };
  }

  // --------------------------------------------------------------- initBalance

  /** Build the (unsent) instruction to create an encrypted-0 balance. */
  async buildInitBalanceIx(mint: MintLike): Promise<BuiltInstruction & { balance: PublicKey }> {
    const m = normalizePubkey(mint, "mint");
    const balance = balancePda(this.programId, this.owner, m);
    const off = randomOffset();
    const instruction = await this.ctx.program.methods
      .initBalance(off)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balance,
        ...compAccounts(this.ctx, "init_balance", off),
      })
      .instruction();
    return { instruction, signers: [], computationOffset: off, balance };
  }

  /** Create a fresh confidential balance (encrypted 0) for a mint. */
  async initBalance(mint: MintLike, opts?: SendOptions): Promise<InitBalanceResult> {
    const built = await this.buildInitBalanceIx(mint);
    const res = await this.sendAndFinalize(built, opts);
    return { ...res, balance: built.balance };
  }

  // ------------------------------------------------------------------- deposit

  /** Build the (unsent) deposit instruction (public on-ramp amount). */
  async buildDepositIx(mint: MintLike, amount: Amount): Promise<BuiltInstruction> {
    const m = normalizePubkey(mint, "mint");
    const amt = normalizeAmount(amount, "amount");
    const { balance, mintConfig, vault } = this.pdas(m);
    const ownerTokenAccount = getAssociatedTokenAddressSync(m, this.owner);
    const off = randomOffset();
    const instruction = await this.ctx.program.methods
      .depositToAccount(off, amt)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balance,
        ownerTokenAccount,
        vault,
        mintConfig,
        tokenProgram: TOKEN_PROGRAM_ID,
        ...compAccounts(this.ctx, "deposit_to_account", off),
      })
      .instruction();
    return { instruction, signers: [], computationOffset: off };
  }

  /** Deposit real tokens into the vault and credit the confidential balance. */
  async deposit(mint: MintLike, amount: Amount, opts?: SendOptions): Promise<ComputationResult> {
    return this.sendAndFinalize(await this.buildDepositIx(mint, amount), opts);
  }

  // ------------------------------------------------------------------ transfer

  /** Build the (unsent) confidential-transfer instruction (encrypted amount). */
  async buildTransferIx(
    mint: MintLike,
    receiver: MintLike,
    amount: Amount,
  ): Promise<BuiltInstruction> {
    const m = normalizePubkey(mint, "mint");
    const to = normalizePubkey(receiver, "receiver");
    const amt = normalizeAmount(amount, "amount");
    const senderBalance = balancePda(this.programId, this.owner, m);
    const receiverBalance = balancePda(this.programId, to, m);

    const mxeKey = await getMXEPublicKeyWithRetry(this.ctx);
    const enc = encryptValue(mxeKey, BigInt(amt.toString()));
    const off = randomOffset();
    const instruction = await this.ctx.program.methods
      .transferBetweenAccounts(off, enc.ciphertext, enc.publicKey, enc.nonceBN)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        receiver: to,
        senderBalance,
        receiverBalance,
        ...compAccounts(this.ctx, "transfer_between_accounts", off),
      })
      .instruction();
    return { instruction, signers: [], computationOffset: off };
  }

  /** Confidentially transfer an encrypted amount to another owner's balance. */
  async transfer(
    mint: MintLike,
    receiver: MintLike,
    amount: Amount,
    opts?: SendOptions,
  ): Promise<ComputationResult> {
    return this.sendAndFinalize(await this.buildTransferIx(mint, receiver, amount), opts);
  }

  // ------------------------------------------------------------------ withdraw

  /** Build the (unsent) withdraw instruction (public off-ramp amount). */
  async buildWithdrawIx(mint: MintLike, amount: Amount): Promise<BuiltInstruction> {
    const m = normalizePubkey(mint, "mint");
    const amt = normalizeAmount(amount, "amount");
    const { balance, mintConfig, vault } = this.pdas(m);
    const ownerTokenAccount = getAssociatedTokenAddressSync(m, this.owner);
    const off = randomOffset();
    const instruction = await this.ctx.program.methods
      .withdrawFromAccount(off, amt)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balance,
        ownerTokenAccount,
        vault,
        mintConfig,
        ...compAccounts(this.ctx, "withdraw_from_account", off),
      })
      .instruction();
    return { instruction, signers: [], computationOffset: off };
  }

  /** Withdraw real tokens from the vault if the hidden balance covers it. */
  async withdraw(mint: MintLike, amount: Amount, opts?: SendOptions): Promise<ComputationResult> {
    return this.sendAndFinalize(await this.buildWithdrawIx(mint, amount), opts);
  }

  // --------------------------------------------------------------------- debit

  /** Build the (unsent) instruction to debit an encrypted amount from your balance. */
  async buildDebitIx(mint: MintLike, amount: Amount): Promise<BuiltInstruction> {
    const m = normalizePubkey(mint, "mint");
    const amt = normalizeAmount(amount, "amount");
    const balance = balancePda(this.programId, this.owner, m);

    const mxeKey = await getMXEPublicKeyWithRetry(this.ctx);
    const enc = encryptValue(mxeKey, BigInt(amt.toString()));
    const off = randomOffset();
    const instruction = await this.ctx.program.methods
      .debitFromAccount(off, enc.ciphertext, enc.publicKey, enc.nonceBN)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balance,
        ...compAccounts(this.ctx, "debit_from_account", off),
      })
      .instruction();
    return { instruction, signers: [], computationOffset: off };
  }

  /** Debit a hidden amount from your own confidential balance (no tokens move). */
  async debit(mint: MintLike, amount: Amount, opts?: SendOptions): Promise<DebitResult> {
    return this.sendAndFinalize(await this.buildDebitIx(mint, amount), opts);
  }

  // -------------------------------------------------------------------- reveal

  /** Build the (unsent) reveal instruction. Pair with an event listener to read the result. */
  async buildRevealIx(mint: MintLike): Promise<BuiltInstruction> {
    const m = normalizePubkey(mint, "mint");
    const balanceAccount = balancePda(this.programId, this.owner, m);
    const off = randomOffset();
    const instruction = await this.ctx.program.methods
      .revealAccountBalance(off)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balanceAccount,
        ...compAccounts(this.ctx, "reveal_account_balance", off),
      })
      .instruction();
    return { instruction, signers: [], computationOffset: off };
  }

  /**
   * Reveal your own confidential balance: decrypts via MPC and resolves the
   * plaintext from the emitted event. Listener is attached before queuing.
   */
  async reveal(mint: MintLike, opts?: SendOptions): Promise<RevealResult> {
    const built = await this.buildRevealIx(mint);

    let listenerId: number | undefined;
    const revealed = new Promise<bigint>((resolve) => {
      listenerId = this.ctx.program.addEventListener(
        "accountBalanceRevealedEvent",
        (ev: any) => resolve(BigInt(ev.balance.toString())),
      );
    });

    try {
      const res = await this.sendAndFinalize(built, opts);
      const balance = await revealed;
      return { ...res, balance };
    } finally {
      if (listenerId !== undefined) {
        await this.ctx.program.removeEventListener(listenerId);
      }
    }
  }
}
