import { PublicKey } from "@solana/web3.js";
import { getAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import type { Ctx } from "./context";
import { balancePda, mintConfigPda, vaultPda } from "./arcium";

/** Decoded on-chain confidential balance (the ciphertext stays encrypted). */
export interface ConfidentialBalanceState {
  exists: boolean;
  address: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  /** Enc<Mxe, u64> ciphertext bytes (decryptable only by the MPC cluster). */
  ciphertext: number[];
  /** Encryption nonce as a bigint. */
  nonce: bigint;
  bump: number;
}

/** Decoded mint vault config. */
export interface MintConfigState {
  exists: boolean;
  address: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  bump: number;
}

/** Fetch + decode an owner's confidential balance account. */
export async function getConfidentialBalance(
  ctx: Ctx,
  mint: PublicKey,
  owner: PublicKey,
): Promise<ConfidentialBalanceState> {
  const address = balancePda(ctx.program.programId, owner, mint);
  const acc = await ctx.program.account.confidentialBalance.fetchNullable(address);
  if (!acc) {
    return { exists: false, address, owner, mint, ciphertext: [], nonce: 0n, bump: 0 };
  }
  const ct = acc.encryptedBalance as unknown as number[][];
  return {
    exists: true,
    address,
    owner: acc.owner,
    mint: acc.mint,
    ciphertext: Array.from(ct[0] ?? []),
    nonce: BigInt(acc.nonce.toString()),
    bump: acc.bump,
  };
}

/** Whether an owner's confidential balance account exists for a mint. */
export async function balanceExists(
  ctx: Ctx,
  mint: PublicKey,
  owner: PublicKey,
): Promise<boolean> {
  const address = balancePda(ctx.program.programId, owner, mint);
  return (await ctx.program.account.confidentialBalance.fetchNullable(address)) !== null;
}

/** Fetch + decode a mint's vault config. */
export async function getMintConfig(ctx: Ctx, mint: PublicKey): Promise<MintConfigState> {
  const address = mintConfigPda(ctx.program.programId, mint);
  const acc = await ctx.program.account.mintConfig.fetchNullable(address);
  if (!acc) {
    return {
      exists: false,
      address,
      authority: PublicKey.default,
      mint,
      totalDeposited: 0n,
      totalWithdrawn: 0n,
      bump: 0,
    };
  }
  return {
    exists: true,
    address,
    authority: acc.authority,
    mint: acc.mint,
    totalDeposited: BigInt(acc.totalDeposited.toString()),
    totalWithdrawn: BigInt(acc.totalWithdrawn.toString()),
    bump: acc.bump,
  };
}

/** The token balance currently held in a mint's vault, in base units. */
export async function getVaultTokenBalance(ctx: Ctx, mint: PublicKey): Promise<bigint> {
  const mintConfig = mintConfigPda(ctx.program.programId, mint);
  const vault = vaultPda(ctx.program.programId, mintConfig);
  try {
    const acc = await getAccount(ctx.connection, vault, ctx.commitment);
    return acc.amount;
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) return 0n;
    throw e;
  }
}
