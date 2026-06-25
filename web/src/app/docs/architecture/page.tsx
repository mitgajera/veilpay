import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Architecture",
  description: "How the program, MPC cluster, SDK, app, and indexer fit together — and where the trust boundaries sit.",
};

const lifecycle = `// Every MPC operation follows the same lifecycle:
const built = await vp.buildTransferIx(mint, to, 250_000n); // 1. encrypt + build (client)
const sig = await vp.send(built);                           //    (internal) queue with an offset
await vp.finalize(built.computationOffset);                 // 2. cluster computes → finalizes
// 3. for reveal, the program emits an event the SDK resolves`;

export default function ArchitecturePage() {
  return (
    <article>
      <DocTitle
        title="Architecture"
        lead="VeilPay is a thin, privacy-preserving stack: an on-chain program, the Arcium MPC cluster that computes over ciphertext, a typed SDK, and surfaces (CLI, web app) that drive it. Plaintext amounts live only on the client."
      />

      <Prose>
        <h2>The layers</h2>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Responsibility</th>
              <th>Sees plaintext?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Client</strong> (SDK in browser/Node)
              </td>
              <td>Encrypts amounts, builds + signs instructions, derives PDAs, reads state.</td>
              <td>Yes — it owns the data.</td>
            </tr>
            <tr>
              <td>
                <strong>Program</strong> (on-chain)
              </td>
              <td>Vault custody, confidential balances, queues MPC computations.</td>
              <td>No — stores ciphertext.</td>
            </tr>
            <tr>
              <td>
                <strong>Arcium MPC cluster</strong>
              </td>
              <td>Runs the circuits over ciphertext; the only party that can decrypt.</td>
              <td>No single node does.</td>
            </tr>
            <tr>
              <td>
                <strong>RPC</strong>
              </td>
              <td>Relays transactions; sees only what is on-chain.</td>
              <td>No.</td>
            </tr>
            <tr>
              <td>
                <strong>Web backend</strong>
              </td>
              <td>SIWS auth, address book, requests, notifications, public-event indexing.</td>
              <td>No — never touches keys or plaintext amounts.</td>
            </tr>
          </tbody>
        </table>

        <h2>Trust boundary</h2>
        <p>
          The single rule the whole design rests on:{" "}
          <strong>transactions are built, encrypted, signed, and submitted entirely client-side</strong>{" "}
          and sent straight to the RPC. The web backend only ever indexes data that is already public
          on-chain. There is no server in the path that could leak a plaintext amount or a private key
          — because none of them ever hold one.
        </p>

        <Callout>
          If you remember one thing: the backend is a convenience layer (auth, contacts, requests,
          notifications). Move it all to <code>/dev/null</code> and confidentiality is unchanged.
        </Callout>

        <h2>The computation lifecycle</h2>
        <p>
          Confidential operations can&apos;t complete in a single instruction — they need the cluster
          to compute over ciphertext. So each one is <strong>queued</strong> with a random offset, and
          the cluster <strong>finalizes</strong> it asynchronously.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="lifecycle.ts" code={lifecycle} />
      </div>
      <Prose>
        <ol>
          <li>
            <strong>Encrypt &amp; build</strong> — the client fetches the MXE key and encrypts the
            amount (for transfer/debit), then builds the instruction with a fresh{" "}
            <code>computationOffset</code>.
          </li>
          <li>
            <strong>Queue</strong> — the instruction is signed and sent; the program records the
            pending computation.
          </li>
          <li>
            <strong>Finalize</strong> — the cluster picks it up, runs the circuit, and writes the
            result back. The SDK&apos;s <code>finalize(offset)</code> awaits this.
          </li>
          <li>
            <strong>Resolve</strong> — for <code>reveal</code>, the program emits an{" "}
            <code>accountBalanceRevealedEvent</code> the SDK listens for to return the plaintext.
          </li>
        </ol>

        <h2>Data flow by operation</h2>
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Deposit</strong>
              </td>
              <td>
                SPL tokens move into the vault (public). MPC credits the encrypted balance by the
                public amount.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Transfer</strong>
              </td>
              <td>
                The amount is encrypted client-side. MPC subtracts it from the sender ciphertext and
                adds it to the receiver ciphertext. No tokens move; no amount is public.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Withdraw</strong>
              </td>
              <td>
                MPC proves the hidden balance covers the public amount, then the program releases
                tokens from the vault.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Reveal</strong>
              </td>
              <td>MPC decrypts your balance and the program emits it to you in an event.</td>
            </tr>
          </tbody>
        </table>

        <h2>The web app</h2>
        <p>
          The reference app (Next.js) is a wallet-like surface that never crosses the trust boundary:
        </p>
        <ul>
          <li>
            <strong>Auth</strong> — Sign-In With Solana (SIWS): a nonce is issued, the wallet signs,
            the server verifies. No passwords, no custody.
          </li>
          <li>
            <strong>Address book &amp; requests</strong> — contacts and payment requests are public
            metadata (addresses, memos, optional amounts), stored to make UX pleasant.
          </li>
          <li>
            <strong>Notifications</strong> — in-app + optional web push, driven by indexed public
            events.
          </li>
          <li>
            <strong>Indexer</strong> — a Helius webhook records on-chain events. Confidential
            transfers are indexed <em>without</em> amounts (they aren&apos;t public to index).
          </li>
        </ul>
        <p>
          Payments themselves always run through the <a href="/docs/sdk">SDK</a> on the client.
        </p>
      </Prose>

      <DocPager
        prev={{ href: "/docs/concepts", label: "Concepts" }}
        next={{ href: "/docs/recipes", label: "Recipes" }}
      />
    </article>
  );
}
