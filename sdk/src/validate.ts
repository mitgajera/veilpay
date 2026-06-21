import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { VeilPayValidationError } from "./errors";
import type { Amount, MintLike } from "./types";

const U64_MAX = (1n << 64n) - 1n;

/**
 * Normalize an Amount to a u64 BN, validating range. `allowZero` defaults to
 * false (most flows require a positive amount).
 */
export function normalizeAmount(amount: Amount, label = "amount", allowZero = false): BN {
  let value: bigint;
  try {
    if (BN.isBN(amount)) value = BigInt(amount.toString());
    else if (typeof amount === "bigint") value = amount;
    else if (typeof amount === "number") {
      if (!Number.isInteger(amount)) {
        throw new VeilPayValidationError(`${label} must be an integer, got ${amount}`);
      }
      value = BigInt(amount);
    } else {
      value = BigInt(amount.trim());
    }
  } catch (e) {
    if (e instanceof VeilPayValidationError) throw e;
    throw new VeilPayValidationError(`${label} is not a valid integer: ${String(amount)}`);
  }

  if (value < 0n) throw new VeilPayValidationError(`${label} must not be negative`);
  if (!allowZero && value === 0n) throw new VeilPayValidationError(`${label} must be greater than 0`);
  if (value > U64_MAX) throw new VeilPayValidationError(`${label} exceeds u64 max`);

  return new BN(value.toString());
}

/** Parse a MintLike/address into a PublicKey with a clear error on failure. */
export function normalizePubkey(value: MintLike, label = "address"): PublicKey {
  if (value instanceof PublicKey) return value;
  try {
    return new PublicKey(value);
  } catch {
    throw new VeilPayValidationError(`${label} is not a valid public key: ${String(value)}`);
  }
}
