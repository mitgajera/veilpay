import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getArciumEnv } from "@arcium-hq/client";
import idl from "../../target/idl/veilpay.json";
import type { Veilpay } from "../../target/types/veilpay";

/** Absolute path to the arcium-mpc project root (where `build/` lives). */
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

export function readKpJson(p: string): Keypair {
  const expanded = p.replace(/^~/, os.homedir());
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(expanded).toString())),
  );
}

export interface Ctx {
  owner: Keypair;
  connection: Connection;
  provider: anchor.AnchorProvider;
  program: Program<Veilpay>;
  arciumEnv: ReturnType<typeof getArciumEnv>;
}

/**
 * Build the runtime context from env:
 *   ANCHOR_PROVIDER_URL  (default http://127.0.0.1:8899)
 *   ANCHOR_WALLET        (default ~/.config/solana/id.json)
 */
export function loadContext(): Ctx {
  const url = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
  const walletPath =
    process.env.ANCHOR_WALLET ?? `${os.homedir()}/.config/solana/id.json`;

  const owner = readKpJson(walletPath);
  const connection = new Connection(url, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(owner), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new Program(idl as anchor.Idl, provider) as Program<Veilpay>;
  const arciumEnv = getArciumEnv();

  return { owner, connection, provider, program, arciumEnv };
}
