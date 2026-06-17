/**
 * @veilpay/sdk/admin — node-only, one-time circuit setup.
 *
 * Registers each circuit's computation definition and uploads its compiled
 * `.arcis` bytecode. This reads files from disk and is meant for deploy/admin
 * tooling (the CLI, scripts), not the browser. Run once per program.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getMXEAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getLookupTableAddress,
  getArciumProgram,
  uploadCircuit,
} from "@arcium-hq/client";
import type { Ctx } from "./context";

/** Circuits the vault flows use, with their on-chain init methods. */
export const COMP_DEFS: ReadonlyArray<readonly [circuit: string, initMethod: string]> = [
  ["init_balance", "initInitBalanceCompDef"],
  ["deposit_to_account", "initDepositToAccountCompDef"],
  ["withdraw_from_account", "initWithdrawFromAccountCompDef"],
  ["transfer_between_accounts", "initTransferBetweenAccountsCompDef"],
  ["reveal_account_balance", "initRevealAccountBalanceCompDef"],
];

/**
 * Register a circuit's computation definition (if missing) and upload its
 * compiled `.arcis` bytecode. Idempotent: skips init when the comp-def PDA
 * already exists, but always re-uploads so a half-finished def gets finalized.
 *
 * @param buildDir directory holding `<circuit>.arcis` (the program's `build/`).
 */
export async function ensureCompDef(
  ctx: Ctx,
  circuitName: string,
  initMethod: string,
  buildDir: string,
): Promise<void> {
  const { program, provider, wallet } = ctx;
  const arciumProgram = getArciumProgram(provider);
  const offset = getCompDefAccOffset(circuitName);
  const compDefPDA = getCompDefAccAddress(
    program.programId,
    Buffer.from(offset).readUInt32LE(),
  );

  const existing = await provider.connection.getAccountInfo(compDefPDA);
  if (!existing) {
    const mxeAccount = getMXEAccAddress(program.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(program.programId, mxeAcc.lutOffsetSlot);

    await (program.methods as any)
      [initMethod]()
      .accounts({
        compDefAccount: compDefPDA,
        payer: wallet.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .rpc({ commitment: ctx.commitment });
  }

  const arcisPath = path.join(buildDir, `${circuitName}.arcis`);
  const rawCircuit = fs.readFileSync(arcisPath);
  await uploadCircuit(provider, circuitName, program.programId, rawCircuit, true, 500, {
    skipPreflight: true,
    preflightCommitment: ctx.commitment,
    commitment: ctx.commitment,
  });
}

/**
 * Register + upload every vault-flow circuit. Call once per program.
 *
 * @param buildDir directory holding the compiled `.arcis` files.
 * @param onProgress optional per-circuit progress callback.
 */
export async function ensureCompDefs(
  ctx: Ctx,
  buildDir: string,
  onProgress?: (circuit: string, status: "start" | "done") => void,
): Promise<void> {
  for (const [circuit, method] of COMP_DEFS) {
    onProgress?.(circuit, "start");
    await ensureCompDef(ctx, circuit, method, buildDir);
    onProgress?.(circuit, "done");
  }
}
