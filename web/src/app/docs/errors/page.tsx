import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Errors & troubleshooting",
  description: "Every error the SDK throws, the program error codes, and how to diagnose and fix common failures.",
};

const branch = `import {
  VeilPayValidationError,
  VeilPayProgramError,
  VeilPayTimeoutError,
  VeilPayError,
} from "@veilpay/sdk";

try {
  await vp.withdraw(mint, amount);
} catch (e) {
  if (e instanceof VeilPayValidationError) {
    // bad input — fix before retrying (never sent)
  } else if (e instanceof VeilPayProgramError) {
    switch (e.code) {
      case 6002: /* InsufficientFunds */ break;
      case 6001: /* InvalidAmount */ break;
    }
  } else if (e instanceof VeilPayTimeoutError) {
    // queued but not finalized — resume with vp.finalize(offset)
  } else if (e instanceof VeilPayError) {
    // e.g. "No Arcium cluster configured"
  }
  throw e;
}`;

export default function ErrorsPage() {
  return (
    <article>
      <DocTitle
        title="Errors & troubleshooting"
        lead="The SDK throws typed errors so you can branch on cause and recover precisely. Here's the full taxonomy, the on-chain error codes, and fixes for the failures you'll actually hit."
      />

      <Prose>
        <h2>Error types</h2>
        <p>Every deliberate failure extends <code>VeilPayError</code>.</p>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Thrown when</th>
              <th>Recovery</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>VeilPayValidationError</code>
              </td>
              <td>Invalid input — amount ≤ 0 or out of range, unparseable pubkey. Before any RPC.</td>
              <td>Fix the input. Nothing was sent.</td>
            </tr>
            <tr>
              <td>
                <code>VeilPayProgramError</code>
              </td>
              <td>
                The program rejected the transaction. Carries <code>.code</code> + <code>.codeName</code>.
              </td>
              <td>Branch on the code (table below).</td>
            </tr>
            <tr>
              <td>
                <code>VeilPayTimeoutError</code>
              </td>
              <td>
                MPC finalization or the MXE key fetch exceeded <code>finalizeTimeoutMs</code>.
              </td>
              <td>
                Already queued — resume with <code>finalize(offset)</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>VeilPayError</code>
              </td>
              <td>
                Base class. e.g. <code>&quot;No Arcium cluster configured&quot;</code> when an MPC op
                runs without a <code>clusterOffset</code>.
              </td>
              <td>Configure the client; inspect <code>.cause</code>.</td>
            </tr>
          </tbody>
        </table>

        <h2>Program error codes</h2>
        <p>
          Decoded into <code>VeilPayProgramError</code> (mapped in <code>VEILPAY_ERROR_CODES</code>).
        </p>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Cause &amp; fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>6000</code>
              </td>
              <td>
                <code>AbortedComputation</code>
              </td>
              <td>The MPC computation was aborted. Retry; if it persists, the cluster/circuit is unhealthy.</td>
            </tr>
            <tr>
              <td>
                <code>6001</code>
              </td>
              <td>
                <code>InvalidAmount</code>
              </td>
              <td>Zero or out-of-range amount. Send a positive <code>bigint</code> in base units.</td>
            </tr>
            <tr>
              <td>
                <code>6002</code>
              </td>
              <td>
                <code>InsufficientFunds</code>
              </td>
              <td>Hidden balance doesn&apos;t cover the amount. Deposit more or send less.</td>
            </tr>
            <tr>
              <td>
                <code>6003</code>
              </td>
              <td>
                <code>InvalidMint</code>
              </td>
              <td>Mint doesn&apos;t match the confidential balance. Check you&apos;re using the right mint.</td>
            </tr>
            <tr>
              <td>
                <code>6004</code>
              </td>
              <td>
                <code>Overflow</code>
              </td>
              <td>Arithmetic overflow. The amount or resulting balance exceeds <code>u64</code>.</td>
            </tr>
          </tbody>
        </table>

        <h2>Branching on errors</h2>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="handle.ts" code={branch} />
      </div>

      <Prose>
        <h2>Common failures</h2>

        <h3>“No Arcium cluster configured”</h3>
        <p>
          An MPC operation (init-balance, deposit, transfer, debit, withdraw, reveal) ran without a
          cluster. In the browser, pass <code>clusterOffset</code> in the config; in Node, set the
          Arcium env. Read-only methods don&apos;t need it.
        </p>

        <h3>MXE key fetch times out</h3>
        <p>
          <code>transfer</code>/<code>debit</code> fetch the cluster&apos;s public key to encrypt the
          amount. If the cluster is mid-keygen or unreachable this throws a{" "}
          <code>VeilPayTimeoutError</code> after retrying. Confirm the cluster offset and RPC, and
          that the cluster is live.
        </p>

        <h3>Finalize hangs</h3>
        <p>
          By default the SDK waits indefinitely for finalization. Set <code>finalizeTimeoutMs</code>{" "}
          to bound it. A timeout means the computation is queued on-chain but not finalized — keep the{" "}
          <code>computationOffset</code> and call <code>finalize(offset)</code> later.
        </p>

        <h3>Wallet rejection</h3>
        <p>
          If the user declines the signature, that&apos;s their choice — return to idle quietly, no
          error toast. The rejection surfaces as a thrown error; treat user-cancel distinctly from a
          real failure.
        </p>

        <h3>“Balance does not exist”</h3>
        <p>
          Reads against a wallet+mint with no balance account return <code>exists: false</code>. Call{" "}
          <code>initBalance(mint)</code> once before depositing.
        </p>

        <Callout variant="warn">
          MPC operations build and submit today but only <em>finalize</em> once the Arcium cluster is
          live. Until then, expect <code>VeilPayTimeoutError</code> on finalize even when everything
          else succeeds — the transactions are valid and queued.
        </Callout>
      </Prose>

      <DocPager prev={{ href: "/docs/program", label: "Program" }} />
    </article>
  );
}
