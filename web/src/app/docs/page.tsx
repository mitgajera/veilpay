import type { Metadata } from "next";
import { Prose, Callout } from "@/components/docs/prose";
import { CodeBlock } from "@/components/ui/code-block";
import { DocTitle, DocPager } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "VeilPay Docs — Overview",
  description: "Confidential token payments on Solana via Arcium MPC.",
};

export default function DocsOverview() {
  return (
    <article>
      <DocTitle
        title="Overview"
        lead="VeilPay is confidential token payments on Solana. Balances stay encrypted on-chain; transfers move hidden amounts through Arcium MPC."
      />

      <Prose>
        <p>
          Token deposits land in an on-chain vault while your spendable balance stays{" "}
          <strong>encrypted on-chain</strong>. Transfers move encrypted amounts with nothing public;
          withdrawals release tokens only if the hidden balance covers them — proven inside
          multi-party computation, so no single party ever sees plaintext.
        </p>

        <Callout variant="warn">
          <strong>Status:</strong> instruction-building, encryption, and PDA derivation are
          cluster-independent and usable now. MPC computations build and submit but only{" "}
          <em>finalize</em> once the Arcium cluster is live.
        </Callout>

        <h2>The pieces</h2>
        <ul>
          <li>
            <strong>Program</strong> — the on-chain <code>veilpay</code> Anchor + Arcium program that
            holds vault config, confidential balances, and the MPC circuits.
          </li>
          <li>
            <strong>@veilpay/sdk</strong> — a typed TypeScript client: build instructions, encrypt
            inputs, derive PDAs, read accounts, and run the deposit / transfer / withdraw / reveal
            flows. <a href="/docs/sdk">SDK reference →</a>
          </li>
          <li>
            <strong>veilpay-mpc-cli</strong> — drive the same program from the terminal for setup,
            scripting, and ops. <a href="/docs/cli">CLI reference →</a>
          </li>
          <li>
            <strong>Web app</strong> — wallet-like UX with SIWS auth, contacts, payment requests, and
            notifications, with payments behind the SDK boundary.
          </li>
        </ul>

        <h2>Install</h2>
      </Prose>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CodeBlock label="SDK" code={`npm install @veilpay/sdk`} />
        <CodeBlock label="CLI" code={`npm install -g veilpay-mpc-cli`} />
      </div>

      <Prose>
        <h2>Architecture at a glance</h2>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Program</strong> (on-chain)
              </td>
              <td>Holds vault config, confidential balances, and the MPC circuits.</td>
            </tr>
            <tr>
              <td>
                <strong>Arcium MPC cluster</strong>
              </td>
              <td>Computes over ciphertext — the only party that can decrypt.</td>
            </tr>
            <tr>
              <td>
                <strong>@veilpay/sdk</strong>
              </td>
              <td>Encrypts inputs, builds instructions, derives PDAs, reads state.</td>
            </tr>
            <tr>
              <td>
                <strong>CLI / web app</strong>
              </td>
              <td>Drive the SDK from the terminal or a wallet-like UI.</td>
            </tr>
          </tbody>
        </table>

        <h2>The privacy rule</h2>
        <p>
          Transactions are <strong>built, encrypted, signed, and submitted client-side</strong> and
          sent straight to the RPC. No backend ever sees plaintext amounts or private keys — servers
          only index what is already public on-chain. Keep that boundary and the guarantees hold.
        </p>

        <h2>Read on</h2>
        <ul>
          <li>
            <a href="/docs/quickstart">Quickstart</a> — install to confidential transfer, end to end.
          </li>
          <li>
            <a href="/docs/concepts">Concepts</a> — balances, vaults, MXE/MPC, the public/private line.
          </li>
          <li>
            <a href="/docs/sdk">SDK</a> · <a href="/docs/cli">CLI</a> ·{" "}
            <a href="/docs/program">Program</a> — full reference.
          </li>
        </ul>
      </Prose>

      <DocPager next={{ href: "/docs/quickstart", label: "Quickstart" }} />
    </article>
  );
}
