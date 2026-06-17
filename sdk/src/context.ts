import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import { getArciumEnv } from "@arcium-hq/client";
import { VEILPAY_IDL, type Veilpay } from "./idl";

/** Minimal Anchor-compatible wallet (browser wallet-adapters satisfy this). */
export interface VeilPayWallet {
  publicKey: PublicKey;
  signTransaction<T>(tx: T): Promise<T>;
  signAllTransactions<T>(txs: T[]): Promise<T[]>;
}

export interface VeilPayConfig {
  connection: Connection;
  wallet: VeilPayWallet;
  /** Override the program ID. Defaults to the one baked into the IDL. */
  programId?: PublicKey | string;
  /** Override the IDL (e.g. a newer build). Defaults to the vendored IDL. */
  idl?: anchor.Idl;
  /**
   * Arcium cluster offset. Required in the browser, where `getArciumEnv()`
   * (which reads process.env) is unavailable. Falls back to the env in Node.
   */
  clusterOffset?: number;
  /** Commitment for the provider and confirmations. Default "confirmed". */
  commitment?: anchor.web3.Commitment;
}

/** Resolved runtime context shared by every SDK operation. */
export interface Ctx {
  connection: Connection;
  wallet: VeilPayWallet;
  provider: anchor.AnchorProvider;
  program: Program<Veilpay>;
  clusterOffset: number;
  commitment: anchor.web3.Commitment;
}

function resolveClusterOffset(cfg: VeilPayConfig): number {
  if (cfg.clusterOffset !== undefined) return cfg.clusterOffset;
  try {
    return getArciumEnv().arciumClusterOffset;
  } catch {
    throw new Error(
      "clusterOffset is required: getArciumEnv() is unavailable here. " +
        "Pass `clusterOffset` in the VeilPayClient config.",
    );
  }
}

/** Build the runtime context from a connection + wallet (no filesystem). */
export function buildContext(cfg: VeilPayConfig): Ctx {
  const commitment = cfg.commitment ?? "confirmed";
  const provider = new anchor.AnchorProvider(cfg.connection, cfg.wallet as anchor.Wallet, {
    commitment,
  });

  const idl = cfg.idl ?? VEILPAY_IDL;
  const program = new Program(idl, provider) as Program<Veilpay>;
  if (cfg.programId) {
    // Anchor keys the program by its IDL `address`; honor an explicit override.
    const pid = new PublicKey(cfg.programId);
    if (!pid.equals(program.programId)) {
      const patched = { ...idl, address: pid.toBase58() } as anchor.Idl;
      return {
        connection: cfg.connection,
        wallet: cfg.wallet,
        provider,
        program: new Program(patched, provider) as Program<Veilpay>,
        clusterOffset: resolveClusterOffset(cfg),
        commitment,
      };
    }
  }

  return {
    connection: cfg.connection,
    wallet: cfg.wallet,
    provider,
    program,
    clusterOffset: resolveClusterOffset(cfg),
    commitment,
  };
}
