import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Quickstart",
  description: "End-to-end: from install to a confidential transfer, in the SDK or the CLI.",
};

const sdkSetup = `npm install @veilpay/sdk

# peers: @solana/web3.js @solana/spl-token @anchor-lang/core @arcium-hq/client`;

const sdkClient = `import { Connection } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";

const vp = new VeilPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  wallet,                  // { publicKey, signTransaction, signAllTransactions }
  clusterOffset: 1116522,  // Arcium cluster (required in the browser)
});`;

const sdkFlow = `// One-time per mint — or skip if a mint already exists
const { mint } = await vp.initMint();

// One-time per wallet+mint: an encrypted-zero balance
await vp.initBalance(mint);

// 1 — public on-ramp: real tokens into the vault, hidden balance credited
await vp.deposit(mint, 1_000_000n);          // 1.00 token at 6 decimals

// 2 — confidential transfer: amount encrypted, nothing public
await vp.transfer(mint, receiver, 250_000n); // 0.25

// 3 — decrypt your own balance via MPC
const { balance } = await vp.reveal(mint);   // bigint, e.g. 750_000n

// 4 — public off-ramp, iff the hidden balance covers it
await vp.withdraw(mint, 500_000n);`;

const cliSetup = `npm install -g veilpay-mpc-cli

export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json

veilpay address                       # confirm wallet + program`;

const cliFlow = `# one-time setup
veilpay init-comp-defs                 # upload circuits (once per program)
MINT=$(veilpay init-mint --json | jq -r .mint)
veilpay init-balance $MINT             # encrypted-zero balance

# move value (amounts are integer base units)
veilpay deposit  $MINT 1000000         # public on-ramp
veilpay transfer $MINT <receiver> 250000   # private — amount hidden
veilpay reveal   $MINT                 # decrypt via MPC
veilpay withdraw $MINT 500000          # public off-ramp

# verify
veilpay balance  $MINT                 # ciphertext stays encrypted
veilpay inspect  $MINT --json          # vault config + PDAs`;

export default function QuickstartPage() {
  return (
    <article>
      <DocTitle
        title="Quickstart"
        lead="The whole happy path end to end — install, set up a mint, deposit, transfer privately, and reveal. Pick the SDK for apps or the CLI for the terminal; the program and guarantees are identical."
      />

      <Prose>
        <h2>What you&apos;ll do</h2>
        <ol>
          <li>Install the SDK or CLI and point it at a cluster + wallet.</li>
          <li>
            Create a mint + vault and an encrypted-zero balance (one-time setup).
          </li>
          <li>
            <strong>Deposit</strong> real tokens (public) → <strong>transfer</strong> a hidden amount
            (private) → <strong>reveal</strong> your balance → <strong>withdraw</strong> (public).
          </li>
        </ol>

        <h2>Before you start</h2>
        <ul>
          <li>A funded Solana wallet on your target cluster (devnet SOL for fees).</li>
          <li>An RPC endpoint.</li>
          <li>
            The Arcium <code>clusterOffset</code> for the browser SDK (the CLI can read it from the
            Arcium env).
          </li>
        </ul>

        <Callout>
          <strong>Amounts are base units.</strong> Every amount is an integer in the token&apos;s
          smallest unit — a <code>bigint</code> in the SDK. 1.00 of a 6-decimal token is{" "}
          <code>1_000_000n</code>. No floats, ever.
        </Callout>
      </Prose>

      <Prose>
        <h2>Track A — the SDK</h2>
        <p>Install and add the peer runtime:</p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="shell" code={sdkSetup} />
      </div>

      <Prose>
        <p>Create a client with a wallet-adapter wallet and the cluster offset:</p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="client.ts" code={sdkClient} />
      </div>

      <Prose>
        <p>
          Then run the flow. Each high-level method builds, signs, sends, and — for MPC operations —
          waits for finalization. Every method also has a composable <code>build*Ix</code> counterpart
          for batching or relayer flows.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="flow.ts" code={sdkFlow} />
      </div>

      <Prose>
        <h2>Track B — the CLI</h2>
        <p>Install globally and configure with env vars or global flags:</p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="shell" code={cliSetup} />
      </div>

      <Prose>
        <p>The same flow from the terminal, with JSON output for scripting:</p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="terminal" code={cliFlow} />
      </div>

      <Callout variant="warn">
        <strong>Cluster status.</strong> Instruction-building, encryption, and PDA derivation work
        today. The MPC operations — <code>transfer</code>, <code>withdraw</code>, <code>debit</code>,{" "}
        <code>reveal</code> — build and submit now but only <em>finalize</em> once the Arcium cluster
        is live. No code changes when it lights up.
      </Callout>

      <Prose>
        <h2>What just happened</h2>
        <p>
          The deposit and withdraw edges are public so real tokens can move through the vault. The
          transfer and your balance stay <strong>encrypted on-chain</strong> — decryptable only by
          you, through the MPC cluster, never a server. That&apos;s the whole model; the{" "}
          <a href="/docs/concepts">Concepts</a> page explains each piece, and the{" "}
          <a href="/docs/sdk">SDK</a> / <a href="/docs/cli">CLI</a> references cover every method and
          command.
        </p>
      </Prose>

      <DocPager
        prev={{ href: "/docs", label: "Overview" }}
        next={{ href: "/docs/concepts", label: "Concepts" }}
      />
    </article>
  );
}
