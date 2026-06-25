import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Concepts",
  description: "Confidential balances, vaults, MXE encryption, MPC finalization, and the public/private boundary.",
};

const encrypt = `// What the SDK does for a transfer/debit, conceptually:
const mxeKey = await getMXEPublicKeyWithRetry(ctx); // cluster's x25519 public key
const enc = encryptValue(mxeKey, 250_000n);         // Rescue cipher over a shared secret

enc.ciphertext; // number[] — the encrypted u64
enc.publicKey;  // number[] — ephemeral x25519 pubkey for the cluster to derive the secret
enc.nonceBN;    // BN       — the encryption nonce
// Only enc.* goes on-chain. The plaintext 250_000n never leaves the device.`;

export default function ConceptsPage() {
  return (
    <article>
      <DocTitle
        title="Concepts"
        lead="The handful of ideas that make confidential payments work — what's encrypted, where the public/private line sits, and how the MPC cluster proves things over ciphertext."
      />

      <Prose>
        <h2>Confidential balance</h2>
        <p>
          Each owner has, per mint, a <strong>confidential balance</strong> account: a PDA holding an
          encrypted <code>u64</code> (<code>Enc&lt;Mxe, u64&gt;</code>) plus an encryption nonce and a
          bump. The ciphertext is decryptable only by the MPC cluster — reading the account on-chain
          tells you it <em>exists</em>, not what it holds.
        </p>
        <ul>
          <li>
            PDA seeds: <code>[&quot;balance&quot;, owner, mint]</code>.
          </li>
          <li>
            Holds <code>encryptedBalance</code> (the ciphertext), <code>nonce</code>, and{" "}
            <code>bump</code>.
          </li>
          <li>
            Create one with <code>initBalance(mint)</code> before depositing — it writes an{" "}
            encrypted zero.
          </li>
        </ul>

        <h2>Mint config &amp; vault</h2>
        <p>
          A <strong>mint config</strong> PDA records the vault authority and running totals; the{" "}
          <strong>vault</strong> is a token account (owned by the program) that custodies real SPL
          tokens. Deposits move tokens into the vault and credit your hidden balance; withdrawals do
          the reverse, gated by MPC on whether your hidden balance covers the amount.
        </p>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>PDA seeds</th>
              <th>Holds</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Confidential balance</td>
              <td>
                <code>[&quot;balance&quot;, owner, mint]</code>
              </td>
              <td>Encrypted u64, nonce, bump</td>
            </tr>
            <tr>
              <td>Mint config</td>
              <td>
                <code>[&quot;mint_config&quot;, mint]</code>
              </td>
              <td>authority, totalDeposited, totalWithdrawn</td>
            </tr>
            <tr>
              <td>Vault</td>
              <td>
                <code>[&quot;vault&quot;, mintConfig]</code>
              </td>
              <td>Real SPL tokens (a token account)</td>
            </tr>
          </tbody>
        </table>

        <h2>Public vs. private</h2>
        <p>
          The edges are public so tokens can physically move; the middle stays encrypted so amounts
          don&apos;t. The deposited <em>and</em> withdrawn totals are public per mint, but they
          can&apos;t be attributed to any individual hidden balance.
        </p>
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>Amount</th>
              <th>Tokens move?</th>
              <th>Needs MPC?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Deposit</td>
              <td>public</td>
              <td>yes — into the vault</td>
              <td>yes (credit ciphertext)</td>
            </tr>
            <tr>
              <td>Transfer</td>
              <td>encrypted</td>
              <td>no — balances re-encrypted</td>
              <td>yes</td>
            </tr>
            <tr>
              <td>Debit</td>
              <td>encrypted</td>
              <td>no — your balance only</td>
              <td>yes</td>
            </tr>
            <tr>
              <td>Withdraw</td>
              <td>public</td>
              <td>yes — out of the vault</td>
              <td>yes (cover check)</td>
            </tr>
            <tr>
              <td>Reveal</td>
              <td>decrypted to you</td>
              <td>no</td>
              <td>yes</td>
            </tr>
          </tbody>
        </table>

        <h2>MXE &amp; MPC</h2>
        <p>
          Amounts are encrypted against the <strong>MXE public key</strong> — the cluster&apos;s
          shared x25519 key — client-side, so plaintext never leaves your device. Encryption uses a
          Rescue cipher over an x25519 shared secret; the SDK sends the ciphertext, an ephemeral
          public key, and a nonce.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="encrypt.ts" code={encrypt} />
      </div>
      <Prose>
        <p>
          Operations that compare or mutate hidden values — a transfer, a withdraw cover-check, a
          reveal — run as an <strong>Arcium MPC computation</strong>: the cluster computes over
          ciphertext and no single node sees the cleartext.
        </p>

        <h2>Computation offsets &amp; finalization</h2>
        <p>
          Each MPC operation is <em>queued</em> with a random 8-byte <strong>computation offset</strong>,
          then <em>finalized</em> asynchronously by the cluster. The high-level SDK methods queue and
          await finalization for you; the <code>build*Ix</code> builders hand you the offset so you
          can send the instruction yourself and call <code>finalize(offset)</code> later. A configurable
          timeout (<code>finalizeTimeoutMs</code>) bounds the wait.
        </p>

        <Callout>
          <strong>Not anonymous, confidential.</strong> Addresses and the fact that a transfer
          happened are public; the <em>amounts</em> are hidden. Auditability is opt-in — you can
          disclose to an auditor when you choose.
        </Callout>

        <h2>Amounts are base units</h2>
        <p>
          Every amount in the SDK and CLI is an integer in the token&apos;s smallest unit (base
          units), passed as a <code>bigint</code> in TypeScript. A USDC value of 1.50 with 6 decimals
          is <code>1_500_000n</code>. No floats — ever. Invalid amounts (zero, negative, out of range)
          fail fast as a <code>VeilPayValidationError</code> before anything is sent.
        </p>

        <h2>Where to go next</h2>
        <ul>
          <li>
            <a href="/docs/sdk">SDK reference</a> — every method, type, and error.
          </li>
          <li>
            <a href="/docs/cli">CLI reference</a> — commands, flags, and JSON output.
          </li>
          <li>
            <a href="/docs/program">Program reference</a> — instructions, accounts, PDA seeds, and
            error codes.
          </li>
        </ul>
      </Prose>

      <DocPager
        prev={{ href: "/docs/quickstart", label: "Quickstart" }}
        next={{ href: "/docs/architecture", label: "Architecture" }}
      />
    </article>
  );
}
