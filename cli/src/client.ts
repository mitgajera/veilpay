import { Connection, Keypair } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Repo root (this CLI lives at `<root>/cli`). */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Directory holding the compiled `<circuit>.arcis` bytecode (the program's build/). */
export const BUILD_DIR = path.join(REPO_ROOT, "arcium-mpc", "build");

export function readKpJson(p: string): Keypair {
  const expanded = p.replace(/^~/, os.homedir());
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(expanded).toString())),
  );
}

/**
 * Build a VeilPayClient from env:
 *   ANCHOR_PROVIDER_URL  (default http://127.0.0.1:8899)
 *   ANCHOR_WALLET        (default ~/.config/solana/id.json)
 * The Arcium cluster offset falls back to getArciumEnv() inside the SDK.
 */
export function loadClient(): { client: VeilPayClient; owner: Keypair } {
  const url = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
  const walletPath =
    process.env.ANCHOR_WALLET ?? `${os.homedir()}/.config/solana/id.json`;

  const owner = readKpJson(walletPath);
  const connection = new Connection(url, "confirmed");
  const client = VeilPayClient.fromKeypair(owner, { connection });
  return { client, owner };
}
