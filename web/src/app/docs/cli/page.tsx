import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — CLI",
  description: "veilpay-mpc-cli — the complete command reference for the confidential payment program.",
};

const setup = `npm install -g veilpay-mpc-cli

# Configure via env (or per-command flags below)
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json

veilpay address          # confirm the active wallet + program addresses`;

const example = `# one-time setup
veilpay init-comp-defs                     # upload circuits (once per program)
MINT=$(veilpay init-mint --json | jq -r .mint)
veilpay init-balance $MINT                 # encrypted-0 balance

# move value (amounts are integer base units)
veilpay deposit  $MINT 1000000             # public on-ramp
veilpay transfer $MINT <receiver> 250000   # private — amount hidden
veilpay debit    $MINT 50000               # reduce your own balance
veilpay withdraw $MINT 500000              # public off-ramp
veilpay reveal   $MINT                     # decrypt via MPC

# inspect
veilpay balance  $MINT                      # your ciphertext balance account
veilpay inspect  $MINT --json               # vault config + PDAs + tokens held`;

const jsonOut = `$ veilpay inspect <mint> --json
{
  "mint": "5x…",
  "balance": "9aB…",
  "mintConfig": "Hk2…",
  "vault": "3pQ…",
  "configInitialized": true,
  "authority": "7xK…",
  "totalDeposited": "1000000",
  "totalWithdrawn": "0",
  "vaultTokenBalance": "1000000"
}`;

export default function CliPage() {
  return (
    <article>
      <DocTitle
        title="CLI"
        lead="veilpay-mpc-cli — drive the same program from the terminal for setup, scripting, and ops. Every command supports --json for machine-readable output and non-zero exit codes on failure."
      />

      <Prose>
        <h2>Install &amp; configure</h2>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="shell" code={setup} />
      </div>

      <Prose>
        <h3>Configuration precedence</h3>
        <p>For each setting, a flag wins over an env var, which wins over the default:</p>
        <table>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Flag</th>
              <th>Env</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>RPC endpoint</td>
              <td>
                <code>--url</code>
              </td>
              <td>
                <code>ANCHOR_PROVIDER_URL</code>
              </td>
              <td>
                <code>http://127.0.0.1:8899</code>
              </td>
            </tr>
            <tr>
              <td>Wallet keypair</td>
              <td>
                <code>--keypair</code>
              </td>
              <td>
                <code>ANCHOR_WALLET</code>
              </td>
              <td>
                <code>~/.config/solana/id.json</code>
              </td>
            </tr>
            <tr>
              <td>Cluster offset</td>
              <td>
                <code>--cluster-offset</code>
              </td>
              <td>Arcium env</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>

        <h3>Global flags</h3>
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>--url &lt;rpc&gt;</code>
              </td>
              <td>RPC endpoint.</td>
            </tr>
            <tr>
              <td>
                <code>--keypair &lt;path&gt;</code>
              </td>
              <td>
                Wallet keypair file (supports <code>~</code>).
              </td>
            </tr>
            <tr>
              <td>
                <code>--cluster-offset &lt;n&gt;</code>
              </td>
              <td>Arcium cluster offset.</td>
            </tr>
            <tr>
              <td>
                <code>--json</code>
              </td>
              <td>Machine-readable JSON output for scripting.</td>
            </tr>
          </tbody>
        </table>

        <h2>Commands</h2>
        <h3>Setup &amp; mutations</h3>
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>init-comp-defs</code>
              </td>
              <td>Register + upload all circuit computation definitions (once per program).</td>
            </tr>
            <tr>
              <td>
                <code>init-mint</code>
              </td>
              <td>Create a new SPL mint + vault config for confidential custody.</td>
            </tr>
            <tr>
              <td>
                <code>init-balance &lt;mint&gt;</code>
              </td>
              <td>Create a fresh confidential balance (encrypted 0) for a mint.</td>
            </tr>
            <tr>
              <td>
                <code>deposit &lt;mint&gt; &lt;amount&gt;</code>
              </td>
              <td>Deposit real tokens into the vault and credit the hidden balance.</td>
            </tr>
            <tr>
              <td>
                <code>transfer &lt;mint&gt; &lt;receiver&gt; &lt;amount&gt;</code>
              </td>
              <td>Confidentially transfer an encrypted amount to another owner.</td>
            </tr>
            <tr>
              <td>
                <code>debit &lt;mint&gt; &lt;amount&gt;</code>
              </td>
              <td>Debit a hidden amount from your own balance (no tokens move).</td>
            </tr>
            <tr>
              <td>
                <code>withdraw &lt;mint&gt; &lt;amount&gt;</code>
              </td>
              <td>Withdraw real tokens from the vault if the hidden balance covers it.</td>
            </tr>
            <tr>
              <td>
                <code>reveal &lt;mint&gt;</code>
              </td>
              <td>Reveal your own balance (decrypts via MPC, emits plaintext).</td>
            </tr>
          </tbody>
        </table>

        <h3>Reads</h3>
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>balance &lt;mint&gt; [--owner &lt;pubkey&gt;]</code>
              </td>
              <td>Show the on-chain confidential balance account (ciphertext stays encrypted).</td>
            </tr>
            <tr>
              <td>
                <code>inspect &lt;mint&gt;</code>
              </td>
              <td>Show a mint&apos;s PDAs, vault config, and tokens held in the vault.</td>
            </tr>
            <tr>
              <td>
                <code>address</code>
              </td>
              <td>Show the active wallet and program addresses.</td>
            </tr>
          </tbody>
        </table>

        <h2>JSON output</h2>
        <p>
          With <code>--json</code>, every command prints a single JSON object — bigint fields are
          stringified — and exits non-zero on error with <code>{`{ "error": "…" }`}</code>. Pipe to{" "}
          <code>jq</code> for scripting.
        </p>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="terminal" code={jsonOut} />
      </div>

      <Prose>
        <h2>End-to-end example</h2>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="terminal" code={example} />
      </div>

      <Callout variant="warn">
        Amounts are integer <strong>base units</strong> (the token&apos;s smallest unit). MPC commands
        (<code>init-balance</code>, <code>deposit</code>, <code>transfer</code>, <code>debit</code>,{" "}
        <code>withdraw</code>, <code>reveal</code>) build and submit now but only finalize once the
        Arcium cluster is live. <code>init-comp-defs</code> reads compiled <code>.arcis</code> files
        from the program&apos;s <code>build/</code> directory.
      </Callout>

      <DocPager
        prev={{ href: "/docs/sdk", label: "SDK" }}
        next={{ href: "/docs/program", label: "Program reference" }}
      />
    </article>
  );
}
