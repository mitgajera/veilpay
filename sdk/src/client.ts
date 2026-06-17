import * as anchor from "@anchor-lang/core";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
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
  finalize,
  getMXEPublicKeyWithRetry,
  mintConfigPda,
  randomOffset,
  vaultPda,
} from "./arcium";
import { encryptValue } from "./crypto";
import type {
  AccountPdas,
  Amount,
  ComputationResult,
  InitBalanceResult,
  InitMintResult,
  MintLike,
  RevealResult,
} from "./types";

function toBN(amount: Amount): anchor.BN {
  if (amount instanceof anchor.BN) return amount;
  if (typeof amount === "bigint") return new anchor.BN(amount.toString());
  return new anchor.BN(amount);
}

function toPubkey(mint: MintLike): PublicKey {
  return mint instanceof PublicKey ? mint : new PublicKey(mint);
}

/**
 * Confidential token payments on Solana via Arcium MPC.
 *
 * Wraps the `veilpay` program: token deposits land in a vault while the
 * spendable balance stays encrypted on-chain, transfers move encrypted amounts
 * with nothing public, and withdrawals release tokens only if the hidden
 * balance covers them. The amount in `transfer` is encrypted client-side; the
 * amounts in `deposit`/`withdraw` are public on/off-ramps by design.
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
    const m = toPubkey(mint);
    const mintConfig = mintConfigPda(this.programId, m);
    return {
      balance: balancePda(this.programId, owner, m),
      mintConfig,
      vault: vaultPda(this.programId, mintConfig),
    };
  }

  /** Create a new SPL mint + vault config for confidential custody. */
  async initMint(): Promise<InitMintResult> {
    const mintKp = Keypair.generate();
    const mintConfig = mintConfigPda(this.programId, mintKp.publicKey);
    const vault = vaultPda(this.programId, mintConfig);

    const signature = await this.ctx.program.methods
      .initializeMint()
      .accountsPartial({
        mintConfig,
        mint: mintKp.publicKey,
        authority: this.owner,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKp])
      .rpc({ commitment: this.ctx.commitment });

    return { mint: mintKp.publicKey, mintConfig, vault, signature };
  }

  /** Create a fresh confidential balance (encrypted 0) for a mint. */
  async initBalance(mint: MintLike): Promise<InitBalanceResult> {
    const m = toPubkey(mint);
    const balance = balancePda(this.programId, this.owner, m);
    const off = randomOffset();

    const signature = await this.ctx.program.methods
      .initBalance(off)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balance,
        ...compAccounts(this.ctx, "init_balance", off),
      })
      .rpc({ skipPreflight: true, commitment: this.ctx.commitment });
    await finalize(this.ctx, off);

    return { balance, signature, computationOffset: off };
  }

  /**
   * Deposit real tokens into the vault and credit the confidential balance.
   * `amount` is a PUBLIC on-ramp (it must equal the tokens moved).
   */
  async deposit(mint: MintLike, amount: Amount): Promise<ComputationResult> {
    const m = toPubkey(mint);
    const { balance, mintConfig, vault } = this.pdas(m);
    const ownerTokenAccount = getAssociatedTokenAddressSync(m, this.owner);
    const off = randomOffset();

    const signature = await this.ctx.program.methods
      .depositToAccount(off, toBN(amount))
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
      .rpc({ skipPreflight: true, commitment: this.ctx.commitment });
    await finalize(this.ctx, off);

    return { signature, computationOffset: off };
  }

  /**
   * Confidentially transfer an encrypted amount to another owner's balance.
   * Nothing about the amount is public; no tokens move.
   */
  async transfer(
    mint: MintLike,
    receiver: PublicKey | string,
    amount: Amount,
  ): Promise<ComputationResult> {
    const m = toPubkey(mint);
    const to = toPubkey(receiver);
    const senderBalance = balancePda(this.programId, this.owner, m);
    const receiverBalance = balancePda(this.programId, to, m);

    const mxeKey = await getMXEPublicKeyWithRetry(this.ctx);
    const enc = encryptValue(mxeKey, BigInt(toBN(amount).toString()));
    const off = randomOffset();

    const signature = await this.ctx.program.methods
      .transferBetweenAccounts(off, enc.ciphertext, enc.publicKey, enc.nonceBN)
      .accountsPartial({
        payer: this.owner,
        mint: m,
        receiver: to,
        senderBalance,
        receiverBalance,
        ...compAccounts(this.ctx, "transfer_between_accounts", off),
      })
      .rpc({ skipPreflight: true, commitment: this.ctx.commitment });
    await finalize(this.ctx, off);

    return { signature, computationOffset: off };
  }

  /**
   * Withdraw real tokens from the vault if the hidden balance covers it.
   * `amount` is a PUBLIC off-ramp; the circuit releases exactly it, or 0.
   */
  async withdraw(mint: MintLike, amount: Amount): Promise<ComputationResult> {
    const m = toPubkey(mint);
    const { balance, mintConfig, vault } = this.pdas(m);
    const ownerTokenAccount = getAssociatedTokenAddressSync(m, this.owner);
    const off = randomOffset();

    const signature = await this.ctx.program.methods
      .withdrawFromAccount(off, toBN(amount))
      .accountsPartial({
        payer: this.owner,
        mint: m,
        confidentialBalance: balance,
        ownerTokenAccount,
        vault,
        mintConfig,
        ...compAccounts(this.ctx, "withdraw_from_account", off),
      })
      .rpc({ skipPreflight: true, commitment: this.ctx.commitment });
    await finalize(this.ctx, off);

    return { signature, computationOffset: off };
  }

  /**
   * Reveal your own confidential balance: decrypts via MPC and resolves the
   * plaintext from the emitted event. Listener is attached before queuing.
   */
  async reveal(mint: MintLike): Promise<RevealResult> {
    const m = toPubkey(mint);
    const balanceAccount = balancePda(this.programId, this.owner, m);
    const off = randomOffset();

    let listenerId: number | undefined;
    const revealed = new Promise<bigint>((resolve) => {
      listenerId = this.ctx.program.addEventListener(
        "accountBalanceRevealedEvent",
        (ev: any) => resolve(BigInt(ev.balance.toString())),
      );
    });

    try {
      const signature = await this.ctx.program.methods
        .revealAccountBalance(off)
        .accountsPartial({
          payer: this.owner,
          mint: m,
          confidentialBalance: balanceAccount,
          ...compAccounts(this.ctx, "reveal_account_balance", off),
        })
        .rpc({ skipPreflight: true, commitment: this.ctx.commitment });
      await finalize(this.ctx, off);

      const balance = await revealed;
      return { balance, signature, computationOffset: off };
    } finally {
      if (listenerId !== undefined) {
        await this.ctx.program.removeEventListener(listenerId);
      }
    }
  }
}
