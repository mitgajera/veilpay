import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Veilpay } from "./types/veilpay";

export function getProgram() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Veilpay as Program<Veilpay>;
  return { provider, program };
}