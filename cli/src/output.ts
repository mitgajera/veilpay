import pc from "picocolors";
import { VeilPayError, VeilPayProgramError } from "@veilpay/sdk";

/** Emit a result as pretty JSON (when --json) or via the human formatter. */
export function emit(json: boolean, payload: unknown, human: () => void): void {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else human();
}

/** Print an error in the chosen format and return the process exit code. */
export function printError(err: unknown, json: boolean): number {
  const name = err instanceof Error ? err.name : "Error";
  const message = err instanceof Error ? err.message : String(err);
  const code = err instanceof VeilPayProgramError ? err.code : undefined;

  if (json) {
    console.log(JSON.stringify({ ok: false, error: name, code, message }, null, 2));
  } else {
    console.error(pc.red(`✗ ${name}: ${message}`));
    if (!(err instanceof VeilPayError)) {
      // Unexpected (non-SDK) error — show a hint that this is uncaught.
      console.error(pc.dim("  (unexpected error)"));
    }
  }
  return 1;
}
