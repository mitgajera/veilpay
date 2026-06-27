import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Program reference",
  description: "On-chain veilpay program: instructions, accounts, PDA seeds, circuits, and error codes.",
};

const pdas = `// PDA derivation (exported by @veilpay/sdk)
balancePda(programId, owner, mint);   // ["balance", owner, mint]
mintConfigPda(programId, mint);       // ["mint_config", mint]
vaultPda(programId, mintConfig);      // ["vault", mintConfig]`;

export default function ProgramPage() {
  return (
    <article>
      <DocTitle
        title="Program reference"
        lead="The on-chain veilpay Anchor + Arcium program — instructions, accounts, PDA seeds, MPC circuits, and error codes."
      />

      <Prose>
        <h2>Program</h2>
        <table>
          <tbody>
            <tr>
              <td>
                <strong>Program ID</strong>
              </td>
              <td>
                <code>6QPCy4uju8fKdzje3vkifX6YH6sRZ9ZuzyhdMjb25cGa</code>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Arcium program</strong>
              </td>
              <td>
                <code>Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ</code>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Framework</strong>
              </td>
              <td>Anchor + Arcium (MPC)</td>
            </tr>
          </tbody>
        </table>
        <p>
          The program ID and IDL ship with the SDK as <code>VEILPAY_PROGRAM_ID</code> and{" "}
          <code>VEILPAY_IDL</code>. Override either via the client <code>programId</code> /{" "}
          <code>idl</code> config.
        </p>

        <h2>Instructions</h2>
        <table>
          <thead>
            <tr>
              <th>Instruction</th>
              <th>SDK method</th>
              <th>MPC?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>initialize_mint</code>
              </td>
              <td>
                <code>initMint()</code>
              </td>
              <td>no</td>
            </tr>
            <tr>
              <td>
                <code>init_balance</code>
              </td>
              <td>
                <code>initBalance()</code>
              </td>
              <td>yes</td>
            </tr>
            <tr>
              <td>
                <code>deposit_to_account</code>
              </td>
              <td>
                <code>deposit()</code>
              </td>
              <td>yes</td>
            </tr>
            <tr>
              <td>
                <code>transfer_between_accounts</code>
              </td>
              <td>
                <code>transfer()</code>
              </td>
              <td>yes</td>
            </tr>
            <tr>
              <td>
                <code>debit_from_account</code>
              </td>
              <td>
                <code>debit()</code>
              </td>
              <td>yes</td>
            </tr>
            <tr>
              <td>
                <code>withdraw_from_account</code>
              </td>
              <td>
                <code>withdraw()</code>
              </td>
              <td>yes</td>
            </tr>
            <tr>
              <td>
                <code>reveal_account_balance</code>
              </td>
              <td>
                <code>reveal()</code>
              </td>
              <td>yes</td>
            </tr>
          </tbody>
        </table>

        <h2>Accounts</h2>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Fields</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>ConfidentialBalance</code>
              </td>
              <td>
                <code>owner</code>, <code>mint</code>, <code>encryptedBalance</code> (Enc&lt;Mxe,u64&gt;),{" "}
                <code>nonce</code>, <code>bump</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>MintConfig</code>
              </td>
              <td>
                <code>authority</code>, <code>mint</code>, <code>totalDeposited</code>,{" "}
                <code>totalWithdrawn</code>, <code>bump</code>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>PDA seeds</h2>
      </Prose>
      <div className="mt-4">
        <CodeBlock label="pdas.ts" code={pdas} />
      </div>

      <Prose>
        <h2>MPC circuits</h2>
        <p>
          Each MPC instruction has a compiled Arcis circuit and an on-chain computation definition.
          Register + upload all six once per program with <code>ensureCompDefs()</code> (SDK admin)
          or <code>veilpay init-comp-defs</code> (CLI).
        </p>
        <ul>
          <li>
            <code>init_balance</code>
          </li>
          <li>
            <code>deposit_to_account</code>
          </li>
          <li>
            <code>withdraw_from_account</code>
          </li>
          <li>
            <code>transfer_between_accounts</code>
          </li>
          <li>
            <code>debit_from_account</code>
          </li>
          <li>
            <code>reveal_account_balance</code>
          </li>
        </ul>

        <h2>Error codes</h2>
        <p>
          The SDK decodes these into a <code>VeilPayProgramError</code> with <code>.code</code> and{" "}
          <code>.codeName</code> (mapped in <code>VEILPAY_ERROR_CODES</code>).
        </p>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Meaning</th>
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
              <td>The MPC computation was aborted.</td>
            </tr>
            <tr>
              <td>
                <code>6001</code>
              </td>
              <td>
                <code>InvalidAmount</code>
              </td>
              <td>Amount is invalid (zero or out of range).</td>
            </tr>
            <tr>
              <td>
                <code>6002</code>
              </td>
              <td>
                <code>InsufficientFunds</code>
              </td>
              <td>Hidden balance does not cover the amount.</td>
            </tr>
            <tr>
              <td>
                <code>6003</code>
              </td>
              <td>
                <code>InvalidMint</code>
              </td>
              <td>Mint does not match the confidential balance.</td>
            </tr>
            <tr>
              <td>
                <code>6004</code>
              </td>
              <td>
                <code>Overflow</code>
              </td>
              <td>Arithmetic overflow.</td>
            </tr>
          </tbody>
        </table>

        <Callout variant="warn">
          MPC instructions are queued with a computation offset and finalized asynchronously by the
          cluster. They build and submit today; finalization completes once the Arcium cluster is
          live. See <a href="/docs/concepts">Concepts</a> for the offset/finalize model.
        </Callout>
      </Prose>

      <DocPager
        prev={{ href: "/docs/cli", label: "CLI" }}
        next={{ href: "/docs/errors", label: "Errors & troubleshooting" }}
      />
    </article>
  );
}
