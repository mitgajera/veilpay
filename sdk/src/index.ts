/**
 * @veilpay/sdk — confidential token payments on Solana via Arcium MPC.
 *
 * Browser-safe entry. For one-time circuit setup (reads compiled `.arcis`
 * bytecode from disk) import from `@veilpay/sdk/admin` in a Node environment.
 */
export { VeilPayClient } from "./client";

export {
  buildContext,
  type Ctx,
  type VeilPayConfig,
  type VeilPayWallet,
} from "./context";

export {
  balancePda,
  mintConfigPda,
  vaultPda,
  compAccounts,
  randomOffset,
  finalize,
  getMXEPublicKeyWithRetry,
} from "./arcium";

export { newCipher, encryptValue, type EncryptedValue } from "./crypto";

export {
  VEILPAY_IDL,
  VEILPAY_PROGRAM_ID,
  type Veilpay,
} from "./idl";

export type {
  Amount,
  MintLike,
  TxResult,
  ComputationResult,
  InitMintResult,
  InitBalanceResult,
  RevealResult,
  AccountPdas,
} from "./types";
