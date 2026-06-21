/** Base class for every error the SDK throws deliberately. */
export class VeilPayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "VeilPayError";
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

/** Invalid caller input (bad amount, unparseable pubkey, etc.). Thrown before any RPC. */
export class VeilPayValidationError extends VeilPayError {
  constructor(message: string) {
    super(message);
    this.name = "VeilPayValidationError";
  }
}

/** A queued MPC computation (or MXE key fetch) did not finish in time. */
export class VeilPayTimeoutError extends VeilPayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VeilPayTimeoutError";
  }
}

/** Maps the program's `#[error_code]` discriminants to readable context. */
export const VEILPAY_ERROR_CODES: Record<number, { name: string; msg: string }> = {
  6000: { name: "AbortedComputation", msg: "The MPC computation was aborted" },
  6001: { name: "InvalidAmount", msg: "Amount is invalid (zero or out of range)" },
  6002: { name: "InsufficientFunds", msg: "Hidden balance does not cover the amount" },
  6003: { name: "InvalidMint", msg: "Mint does not match the confidential balance" },
  6004: { name: "Overflow", msg: "Arithmetic overflow" },
};

/** A decoded on-chain program error. */
export class VeilPayProgramError extends VeilPayError {
  constructor(
    readonly code: number | undefined,
    readonly codeName: string | undefined,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "VeilPayProgramError";
  }
}

/** Try to recognise an Anchor/program error and wrap it; otherwise pass through a VeilPayError. */
export function wrapSendError(err: unknown): VeilPayError {
  if (err instanceof VeilPayError) return err;

  const anyErr = err as any;
  // Anchor surfaces program errors as { error: { errorCode: { code, number }, errorMessage } }.
  const code: number | undefined =
    anyErr?.error?.errorCode?.number ?? anyErr?.code ?? undefined;
  if (typeof code === "number" && VEILPAY_ERROR_CODES[code]) {
    const known = VEILPAY_ERROR_CODES[code];
    return new VeilPayProgramError(code, known.name, `${known.name}: ${known.msg}`, {
      cause: err,
    });
  }

  const message =
    anyErr?.error?.errorMessage ?? anyErr?.message ?? "transaction failed";
  return new VeilPayError(message, { cause: err });
}
