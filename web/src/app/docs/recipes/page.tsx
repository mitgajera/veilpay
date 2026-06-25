import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Recipes",
  description: "Practical patterns: wallet-adapter setup, reading balances, reveal, composing instructions, fee sponsorship, and Node scripts.",
};

const reactClient = `import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VeilPayClient } from "@veilpay/sdk";

export function useVeilPay() {
  const { connection } = useConnection();
  const wallet = useWallet();
  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    return new VeilPayClient({
      connection,
      wallet: {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      clusterOffset: 1116522,
    });
  }, [connection, wallet.publicKey]);
}`;

const readBalance = `// Render a masked balance, reveal on demand.
const state = await vp.getConfidentialBalance(mint);
if (!state.exists) return "—";          // no balance account yet

// masked: state.ciphertext stays encrypted, just show dots
const masked = "••••••";

// revealed: decrypt via MPC (this queues a computation)
const { balance } = await vp.reveal(mint);
const display = formatUnits(balance, decimals); // your formatter`;

const compose = `// Add a priority fee and send the instruction yourself.
import { Transaction, ComputeBudgetProgram } from "@solana/web3.js";

const built = await vp.buildTransferIx(mint, receiver, 250_000n);

const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }))
  .add(built.instruction);

const sig = await provider.sendAndConfirm(tx, built.signers);
await vp.finalize(built.computationOffset!);   // MPC ops only`;

const sponsor = `// Fee sponsorship: a relayer pays, the user authorizes.
// buildTransferIx already encrypted the amount client-side.
const built = await vp.buildTransferIx(mint, receiver, amount);

const tx = new Transaction().add(built.instruction);
tx.feePayer = sponsor.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

await userWallet.signTransaction(tx);   // user authorizes
sponsor.partialSign(tx);                // relayer pays the fee
await connection.sendRawTransaction(tx.serialize());`;

const timeout = `// Don't hang forever if the cluster is slow / not live yet.
import { VeilPayTimeoutError } from "@veilpay/sdk";

try {
  await vp.transfer(mint, receiver, 250_000n, { finalizeTimeoutMs: 60_000 });
} catch (e) {
  if (e instanceof VeilPayTimeoutError) {
    // queued on-chain but not finalized in time — surface a "pending" state,
    // and resume later with vp.finalize(offset).
  }
}`;

const node = `import { Connection, Keypair } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";
import fs from "node:fs";

const kp = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!, "utf8"))),
);
const vp = VeilPayClient.fromKeypair(kp, {
  connection: new Connection(process.env.ANCHOR_PROVIDER_URL!, "confirmed"),
});

const { mint } = await vp.initMint();
await vp.initBalance(mint);
await vp.deposit(mint, 1_000_000n);
console.log("vault:", (await vp.getVaultTokenBalance(mint)).toString());`;

export default function RecipesPage() {
  return (
    <article>
      <DocTitle
        title="Recipes"
        lead="Copy-paste patterns for common tasks — wiring a wallet adapter, reading and revealing balances, composing your own transactions, sponsoring fees, and scripting from Node."
      />

      <Prose>
        <h2>Wallet-adapter client (React)</h2>
        <p>Build a memoized client from the connected wallet. Re-creates when the wallet changes.</p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="useVeilPay.ts" code={reactClient} />
      </div>

      <Prose>
        <h2>Read &amp; reveal a balance</h2>
        <p>
          Reads are free and unsigned; reveal is an MPC operation. Show a masked value by default and
          decrypt only when the user asks.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="balance.ts" code={readBalance} />
      </div>
      <Callout>
        <code>getConfidentialBalance</code> returns <code>ciphertext: number[]</code> that{" "}
        <strong>stays encrypted</strong>. There is no client-side decrypt — only{" "}
        <code>reveal()</code> (through MPC) yields the plaintext, and only to the owner.
      </Callout>

      <Prose>
        <h2>Compose your own transaction</h2>
        <p>
          Use <code>build*Ix</code> to get an unsent instruction, add compute-budget or other
          instructions, send it yourself, then finalize the MPC offset.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="compose.ts" code={compose} />
      </div>

      <Prose>
        <h2>Fee sponsorship / relayer</h2>
        <p>
          Because the amount is encrypted inside <code>build*Ix</code>, a sponsor can pay the network
          fee without ever learning it. The user signs to authorize; the sponsor signs to pay.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="sponsor.ts" code={sponsor} />
      </div>

      <Prose>
        <h2>Bound the finalize wait</h2>
        <p>
          MPC finalization is asynchronous. Pass <code>finalizeTimeoutMs</code> (per call or on the
          client config) so a slow or offline cluster surfaces a timeout instead of hanging. The
          computation is already queued on-chain, so you can resume with <code>finalize(offset)</code>.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="timeout.ts" code={timeout} />
      </div>

      <Prose>
        <h2>Node script</h2>
        <p>
          <code>fromKeypair</code> signs with a raw keypair and reads the cluster from the Arcium env
          — ideal for setup scripts and ops.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="script.ts" code={node} />
      </div>

      <Callout variant="warn">
        Amounts are always <code>bigint</code> base units. Validate user input and convert from
        decimals before calling the SDK — and see <a href="/docs/errors">Errors &amp; troubleshooting</a>{" "}
        for handling failures.
      </Callout>

      <DocPager
        prev={{ href: "/docs/architecture", label: "Architecture" }}
        next={{ href: "/docs/sdk", label: "SDK" }}
      />
    </article>
  );
}
