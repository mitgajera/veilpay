import { Connection, Keypair } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Repo root (this CLI lives at `<root>/cli`). */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Directory holding the compiled `<circuit>.arcis` bytecode (the program's build/). */
export const BUILD_DIR = path.join(REPO_ROOT, "arcium-mpc", "build");

/** Global CLI options (flags override env). */
export interface GlobalOpts {
  url?: string;
  keypair?: string;
  clusterOffset?: string;
  json?: boolean;
}

export function readKpJson(p: string): Keypair {
  const expanded = p.replace(/^~/, os.homedir());
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(expanded).toString())),
  );
}

/**
 * Build a VeilPayClient from flags, falling back to env:
 *   --url / ANCHOR_PROVIDER_URL  (default http://127.0.0.1:8899)
 *   --keypair / ANCHOR_WALLET    (default ~/.config/solana/id.json)
 *   --cluster-offset             (else getArciumEnv() in the SDK)
 */
export function loadClient(opts: GlobalOpts): { client: VeilPayClient; owner: Keypair } {
  const url = opts.url ?? process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
  const walletPath =
    opts.keypair ?? process.env.ANCHOR_WALLET ?? `${os.homedir()}/.config/solana/id.json`;

  const owner = readKpJson(walletPath);
  const connection = new Connection(url, "confirmed");
  const clusterOffset =
    opts.clusterOffset !== undefined ? Number(opts.clusterOffset) : undefined;
  const client = VeilPayClient.fromKeypair(owner, { connection, clusterOffset });
  return { client, owner };
}
