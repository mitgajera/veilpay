/**
 * Live end-to-end test against Arcium devnet — exercises every MPC circuit and
 * asserts the *decrypted* balances, so a silent abort can't pass.
 *
 *   init_balance → deposit_to_account → reveal → withdraw_from_account
 *                → transfer_between_accounts → reveal (recipient)
 *
 * Run (from cli/):  npm run test:e2e
 * Env:  ANCHOR_PROVIDER_URL (devnet RPC), ANCHOR_WALLET (funded payer),
 *       ARCIUM_CLUSTER_OFFSET (default 456)
 */
import * as fs from "node:fs";
import * as os from "node:os";
import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";
// @solana/spl-token v0.4 is ESM-only — load it via dynamic import() so this
// CommonJS (ts-node) script can use it without an ESM build.

const DECIMALS = 6;
const ONE = 10 ** DECIMALS; // 1 token in base units
const FINALIZE_TIMEOUT_MS = 180_000;

const RPC = process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";
const WALLET = process.env.ANCHOR_WALLET ?? `${os.homedir()}/.config/solana/id.json`;
const CLUSTER_OFFSET = Number(process.env.ARCIUM_CLUSTER_OFFSET ?? 456);

function loadKp(path: string): Keypair {
  const expanded = path.replace(/^~/, os.homedir());
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(expanded, "utf8"))));
}

let passed = 0;
let failed = 0;
function assert(label: string, got: bigint, want: bigint) {
  if (got === want) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}: ${got}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}: got ${got}, want ${want}`);
    failed++;
  }
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  process.stdout.write(`\n▶ ${label} … `);
  const t0 = Date.now();
  const r = await fn();
  console.log(`done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  return r;
}

async function main() {
  const owner = loadKp(WALLET);
  const connection = new Connection(RPC, "confirmed");
  const alice = VeilPayClient.fromKeypair(owner, {
    connection,
    clusterOffset: CLUSTER_OFFSET,
    finalizeTimeoutMs: FINALIZE_TIMEOUT_MS,
  });

  console.log("VeilPay devnet E2E");
  console.log("  program:", alice.programId.toBase58());
  console.log("  payer:  ", owner.publicKey.toBase58());
  console.log("  cluster:", CLUSTER_OFFSET);

  // ---- setup: fresh mint + 1000 tokens to the payer ------------------------
  const mint = await step("init-mint", async () => {
    const r = await alice.initMint();
    return r.mint;
  });
  console.log("  mint:", mint.toBase58());

  await step("mint 1000 tokens to payer", async () => {
    const { getOrCreateAssociatedTokenAccount, mintTo } = await import("@solana/spl-token");
    const ata = await getOrCreateAssociatedTokenAccount(connection, owner, mint, owner.publicKey);
    await mintTo(connection, owner, mint, ata.address, owner, BigInt(1000 * ONE));
  });

  // ---- core flow: init → deposit → reveal → withdraw → reveal --------------
  await step("init-balance (init_balance circuit)", () => alice.initBalance(mint));

  await step("deposit 100 (deposit_to_account circuit)", () =>
    alice.deposit(mint, String(100 * ONE)),
  );
  {
    const r = await step("reveal after deposit", () => alice.reveal(mint));
    assert("balance == 100", r.balance, BigInt(100 * ONE));
  }

  await step("withdraw 40 (withdraw_from_account circuit)", () =>
    alice.withdraw(mint, String(40 * ONE)),
  );
  {
    const r = await step("reveal after withdraw", () => alice.reveal(mint));
    assert("balance == 60", r.balance, BigInt(60 * ONE));
  }

  // ---- transfer: alice → bob (transfer_between_accounts circuit) -----------
  const bob = Keypair.generate();
  await step("fund bob with 0.1 SOL (rent)", async () => {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: owner.publicKey,
        toPubkey: bob.publicKey,
        lamports: 100_000_000,
      }),
    );
    await connection.sendTransaction(tx, [owner]);
    // small settle wait
    await new Promise((r) => setTimeout(r, 4000));
  });

  const bobClient = VeilPayClient.fromKeypair(bob, {
    connection,
    clusterOffset: CLUSTER_OFFSET,
    finalizeTimeoutMs: FINALIZE_TIMEOUT_MS,
  });
  await step("bob init-balance", () => bobClient.initBalance(mint));

  await step("alice transfer 25 → bob (transfer_between_accounts circuit)", () =>
    alice.transfer(mint, bob.publicKey, String(25 * ONE)),
  );
  {
    const ra = await step("reveal alice after transfer", () => alice.reveal(mint));
    assert("alice == 35", ra.balance, BigInt(35 * ONE));
    const rb = await step("reveal bob after transfer", () => bobClient.reveal(mint));
    assert("bob == 25", rb.balance, BigInt(25 * ONE));
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Result: \x1b[32m${passed} passed\x1b[0m, ${failed ? `\x1b[31m${failed} failed\x1b[0m` : "0 failed"}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("\n\x1b[31mE2E FAILED:\x1b[0m", e?.message ?? e);
  process.exit(1);
});
