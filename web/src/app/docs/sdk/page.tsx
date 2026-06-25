import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — SDK",
  description: "@veilpay/sdk — the complete TypeScript client reference for confidential payments.",
};

const install = `npm install @veilpay/sdk

# peer runtime
npm install @solana/web3.js @solana/spl-token @anchor-lang/core @arcium-hq/client`;

const browser = `import { Connection } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";

const vp = new VeilPayClient({
  connection: new Connection(rpc, "confirmed"),
  wallet,                   // wallet-adapter: { publicKey, signTransaction, signAllTransactions }
  clusterOffset: 1116522,   // Arcium cluster — required in the browser
});`;

const node = `import { Connection, Keypair } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";

// fromKeypair signs with a raw Keypair; clusterOffset falls back to getArciumEnv()
const vp = VeilPayClient.fromKeypair(keypair, {
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
});`;

const flow = `// One-time setup
const { mint } = await vp.initMint();   // create SPL mint + vault config
await vp.initBalance(mint);             // encrypted-0 balance for this wallet+mint

// Move value (amounts are bigint base units)
await vp.deposit(mint, 1_000_000n);            // public on-ramp → credits hidden balance
await vp.transfer(mint, receiver, 250_000n);   // confidential — amount encrypted
await vp.debit(mint, 50_000n);                 // reduce your own hidden balance, no tokens move
await vp.withdraw(mint, 500_000n);             // public off-ramp, iff balance covers it

// Decrypt your own balance via MPC
const { balance } = await vp.reveal(mint);     // bigint`;

const composable = `// Each method has a build*Ix counterpart that returns an unsent instruction.
// Batch, simulate, or set priority fees yourself, then finalize the MPC offset.
const built = await vp.buildTransferIx(mint, receiver, 250_000n);

const tx = new Transaction().add(priorityFeeIx, built.instruction);
const sig = await provider.sendAndConfirm(tx, built.signers);

// MPC instructions carry the offset to await finalization with:
await vp.finalize(built.computationOffset!);`;

const reads = `// Reads need no signing — a connection + wallet is enough, no clusterOffset.
const bal = await vp.getConfidentialBalance(mint);      // ConfidentialBalanceState
bal.exists;      // boolean
bal.nonce;       // bigint
bal.ciphertext;  // number[] — Enc<Mxe,u64>, stays encrypted

const cfg = await vp.getMintConfig(mint);               // MintConfigState
cfg.totalDeposited; // bigint
cfg.totalWithdrawn; // bigint

await vp.balanceExists(mint);          // boolean
await vp.getVaultTokenBalance(mint);   // bigint — tokens in the vault

// Standalone (no client): import the same helpers
import { getConfidentialBalance, balancePda } from "@veilpay/sdk";`;

const admin = `// @veilpay/sdk/admin — Node only, reads compiled .arcis bytecode from disk.
import { ensureCompDefs } from "@veilpay/sdk/admin";

// Register + upload every vault circuit. Run once per program.
await ensureCompDefs(vp.ctx, "./build", (circuit, status) =>
  console.log(circuit, status),
);`;

const errors = `import {
  VeilPayValidationError,  // bad input — thrown before any RPC
  VeilPayProgramError,     // decoded on-chain #[error_code]
  VeilPayTimeoutError,     // MPC finalize / MXE key fetch timed out
  VeilPayError,            // base class
} from "@veilpay/sdk";

try {
  await vp.withdraw(mint, 999_999_999n);
} catch (e) {
  if (e instanceof VeilPayProgramError) {
    e.code;     // 6002
    e.codeName; // "InsufficientFunds"
  } else if (e instanceof VeilPayValidationError) {
    // amount <= 0, unparseable pubkey, etc.
  }
}`;

export default function SdkPage() {
  return (
    <article>
      <DocTitle
        title="SDK"
        lead="@veilpay/sdk — a typed TypeScript client. Build instructions, encrypt inputs client-side, derive PDAs, read on-chain state, and run the confidential flows from any wallet adapter or a raw keypair."
      />

      <Prose>
        <h2>Install</h2>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="shell" code={install} />
      </div>
      <Prose>
        <p>
          The package is browser-safe. The admin entry (<code>@veilpay/sdk/admin</code>) is Node-only
          because it reads compiled circuit bytecode from disk — keep it out of client bundles.
        </p>

        <h2>Creating a client</h2>
        <p>
          The constructor takes a <code>connection</code>, a <code>wallet</code>, and — for MPC
          operations — an Arcium <code>clusterOffset</code>. In the browser the offset is required;
          in Node it falls back to <code>getArciumEnv()</code>.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="browser.ts" code={browser} />
      </div>
      <Prose>
        <p>
          For scripts and the CLI, <code>VeilPayClient.fromKeypair(keypair, config)</code> wires a raw{" "}
          <code>Keypair</code> as the signer:
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="node.ts" code={node} />
      </div>

      <Prose>
        <h3>Config options</h3>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Default</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>connection</code>
              </td>
              <td>
                <code>Connection</code>
              </td>
              <td>—</td>
              <td>Required. A web3.js connection.</td>
            </tr>
            <tr>
              <td>
                <code>wallet</code>
              </td>
              <td>
                <code>VeilPayWallet</code>
              </td>
              <td>—</td>
              <td>
                Required. <code>publicKey</code> + <code>signTransaction</code> +{" "}
                <code>signAllTransactions</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>clusterOffset</code>
              </td>
              <td>
                <code>number</code>
              </td>
              <td>env</td>
              <td>Arcium cluster. Required in the browser; MPC ops only.</td>
            </tr>
            <tr>
              <td>
                <code>commitment</code>
              </td>
              <td>
                <code>Commitment</code>
              </td>
              <td>
                <code>&quot;confirmed&quot;</code>
              </td>
              <td>Provider + confirmation commitment.</td>
            </tr>
            <tr>
              <td>
                <code>finalizeTimeoutMs</code>
              </td>
              <td>
                <code>number</code>
              </td>
              <td>
                <code>0</code>
              </td>
              <td>Max wait for MPC finalize. 0 = wait indefinitely.</td>
            </tr>
            <tr>
              <td>
                <code>programId</code>
              </td>
              <td>
                <code>PublicKey | string</code>
              </td>
              <td>IDL</td>
              <td>Override the target program.</td>
            </tr>
            <tr>
              <td>
                <code>idl</code>
              </td>
              <td>
                <code>Idl</code>
              </td>
              <td>vendored</td>
              <td>Override with a newer build.</td>
            </tr>
          </tbody>
        </table>

        <h3>Client properties</h3>
        <ul>
          <li>
            <code>vp.programId</code> — the target program ID.
          </li>
          <li>
            <code>vp.owner</code> — the acting wallet&apos;s public key.
          </li>
          <li>
            <code>vp.ctx</code> — the resolved runtime context (provider, program, cluster).
          </li>
          <li>
            <code>vp.pdas(mint, owner?)</code> — derive <code>{`{ balance, mintConfig, vault }`}</code>{" "}
            for an owner + mint.
          </li>
        </ul>

        <h2>The payment flow</h2>
        <p>
          Each high-level method builds, signs, sends, and — for MPC operations — waits for
          finalization before resolving. Amounts accept a <code>bigint</code>, <code>number</code>,{" "}
          <code>string</code>, or <code>BN</code> and are normalized to base units.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="flow.ts" code={flow} />
      </div>

      <Prose>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Kind</th>
              <th>Returns</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>initMint()</code>
              </td>
              <td>tx</td>
              <td>
                <code>InitMintResult</code>
              </td>
              <td>Create an SPL mint + vault config. Generates a fresh mint keypair.</td>
            </tr>
            <tr>
              <td>
                <code>initBalance(mint)</code>
              </td>
              <td>MPC</td>
              <td>
                <code>InitBalanceResult</code>
              </td>
              <td>Encrypted-0 balance for this wallet + mint.</td>
            </tr>
            <tr>
              <td>
                <code>deposit(mint, amount)</code>
              </td>
              <td>MPC</td>
              <td>
                <code>ComputationResult</code>
              </td>
              <td>Public on-ramp; tokens to vault, hidden balance credited.</td>
            </tr>
            <tr>
              <td>
                <code>transfer(mint, receiver, amount)</code>
              </td>
              <td>MPC</td>
              <td>
                <code>ComputationResult</code>
              </td>
              <td>Confidential transfer; amount encrypted client-side.</td>
            </tr>
            <tr>
              <td>
                <code>debit(mint, amount)</code>
              </td>
              <td>MPC</td>
              <td>
                <code>DebitResult</code>
              </td>
              <td>Reduce your own hidden balance; no tokens move.</td>
            </tr>
            <tr>
              <td>
                <code>withdraw(mint, amount)</code>
              </td>
              <td>MPC</td>
              <td>
                <code>ComputationResult</code>
              </td>
              <td>Public off-ramp, iff the hidden balance covers it.</td>
            </tr>
            <tr>
              <td>
                <code>reveal(mint)</code>
              </td>
              <td>MPC</td>
              <td>
                <code>RevealResult</code>
              </td>
              <td>
                Decrypt your balance. Attaches an event listener, resolves{" "}
                <code>{`{ balance: bigint }`}</code>.
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Composable instructions</h2>
        <p>
          Every method has a <code>build*Ix</code> counterpart that returns a{" "}
          <code>BuiltInstruction</code> — an unsent instruction plus any extra <code>signers</code>{" "}
          and (for MPC ops) the <code>computationOffset</code>. Send it yourself, then await
          finalization with <code>vp.finalize(offset)</code>.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="composable.ts" code={composable} />
      </div>
      <Callout>
        For <code>transfer</code> and <code>debit</code>, the amount is encrypted against the MXE key{" "}
        <em>inside</em> <code>build*Ix</code> (an async call that fetches the cluster key). The
        plaintext never leaves the builder.
      </Callout>

      <Prose>
        <h2>Reads</h2>
        <p>
          Read helpers fetch + decode on-chain state without signing or a cluster offset. Ciphertext
          stays encrypted — only <code>reveal</code> (MPC) yields plaintext. They&apos;re available
          as client methods and as standalone functions.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="reads.ts" code={reads} />
      </div>
      <Prose>
        <p>
          <code>ConfidentialBalanceState</code> = <code>{`{ exists, address, owner, mint, ciphertext: number[], nonce: bigint, bump }`}</code>.{" "}
          <code>MintConfigState</code> ={" "}
          <code>{`{ exists, address, authority, mint, totalDeposited: bigint, totalWithdrawn: bigint, bump }`}</code>.
        </p>

        <h2>Encryption helpers</h2>
        <p>
          Under the hood, amounts are encrypted with a Rescue cipher over an x25519 shared secret to
          the MXE key. You rarely call these directly — the client does — but they&apos;re exported:{" "}
          <code>encryptValue(mxeKey, value)</code> → <code>EncryptedValue</code>, and{" "}
          <code>newCipher(mxeKey)</code>. Fetch the key with{" "}
          <code>getMXEPublicKeyWithRetry(ctx)</code>; PDA helpers <code>balancePda</code>,{" "}
          <code>mintConfigPda</code>, <code>vaultPda</code> are exported too.
        </p>

        <h2>Admin — circuit setup</h2>
        <p>
          One-time per program: register each circuit&apos;s computation definition and upload its
          compiled <code>.arcis</code> bytecode. Node only.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="admin.ts" code={admin} />
      </div>

      <Prose>
        <h2>Errors</h2>
        <p>
          Failures throw typed errors so you can branch on cause. Validation fails fast, before
          anything is sent.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="errors.ts" code={errors} />
      </div>
      <Prose>
        <table>
          <thead>
            <tr>
              <th>Error</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>VeilPayValidationError</code>
              </td>
              <td>Invalid input (amount ≤ 0, bad pubkey). Thrown before any RPC.</td>
            </tr>
            <tr>
              <td>
                <code>VeilPayProgramError</code>
              </td>
              <td>
                Decoded on-chain error with <code>.code</code> + <code>.codeName</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>VeilPayTimeoutError</code>
              </td>
              <td>MPC finalize or MXE key fetch exceeded the timeout.</td>
            </tr>
            <tr>
              <td>
                <code>VeilPayError</code>
              </td>
              <td>Base class — any other deliberate failure.</td>
            </tr>
          </tbody>
        </table>
        <p>
          Program error codes are mapped in <code>VEILPAY_ERROR_CODES</code> — see the{" "}
          <a href="/docs/program">Program reference</a> for the full table.
        </p>
      </Prose>

      <DocPager
        prev={{ href: "/docs/recipes", label: "Recipes" }}
        next={{ href: "/docs/cli", label: "CLI" }}
      />
    </article>
  );
}
