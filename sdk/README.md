# @veilpay/sdk

TypeScript client for **VeilPay** — confidential token payments on Solana via [Arcium](https://arcium.com) MPC.

Token deposits land in an on-chain vault while the spendable balance stays **encrypted on-chain**. Transfers move encrypted amounts with nothing public; withdrawals release tokens only if the hidden balance covers them. Built on the `veilpay` Arcium program.

> **Status:** pre-release. Instruction-building, encryption, and PDA derivation are cluster-independent and usable now. MPC computations build and submit but only *finalize* once the Arcium cluster is live.

## Install

```bash
npm install @veilpay/sdk
```

Peer runtime: `@solana/web3.js`, `@solana/spl-token`, `@anchor-lang/core`, `@arcium-hq/client`.

## Quick start

```ts
import { Connection } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";

// Browser: pass a wallet-adapter wallet.
const vp = new VeilPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  wallet,                 // { publicKey, signTransaction, signAllTransactions }
  clusterOffset: 1116522, // Arcium cluster offset (required in the browser)
});

const { mint } = await vp.initMint();   // create mint + vault config
await vp.initBalance(mint);             // encrypted-0 balance for this wallet
await vp.deposit(mint, 1_000n);        // public on-ramp → credits hidden balance
await vp.transfer(mint, receiver, 250n); // private: amount encrypted, no tokens move
await vp.withdraw(mint, 500n);          // public off-ramp, iff hidden balance covers it

const { balance } = await vp.reveal(mint); // decrypt own balance via MPC
console.log(balance); // bigint
```

### Node / CLI

```ts
import { Keypair, Connection } from "@solana/web3.js";
import { VeilPayClient } from "@veilpay/sdk";

const vp = VeilPayClient.fromKeypair(keypair, {
  connection: new Connection(process.env.RPC_URL!, "confirmed"),
  // clusterOffset falls back to getArciumEnv() (env vars) in Node
});
```

## API

`new VeilPayClient(config)` — `config`:

| field          | type                          | notes                                              |
| -------------- | ----------------------------- | -------------------------------------------------- |
| `connection`   | `Connection`                  | required                                           |
| `wallet`       | `VeilPayWallet`               | required; wallet-adapter compatible                |
| `programId`    | `PublicKey \| string`         | optional; defaults to the IDL's baked address      |
| `idl`          | `Idl`                         | optional; defaults to the vendored IDL             |
| `clusterOffset`| `number`                      | required for MPC ops in browser; falls back to env in Node; **not needed for read-only** |
| `commitment`   | `Commitment`                  | default `"confirmed"`                              |
| `finalizeTimeoutMs` | `number`                 | max wait for MPC finalization; `0` = wait forever (default) |

### Mutations (all amounts accept `bigint | number | string | BN`)

| method                              | returns                | privacy                          |
| ----------------------------------- | ---------------------- | -------------------------------- |
| `initMint()`                        | `InitMintResult`       | —                                |
| `initBalance(mint)`                 | `InitBalanceResult`    | —                                |
| `deposit(mint, amount)`             | `ComputationResult`    | amount **public** (on-ramp)      |
| `transfer(mint, receiver, amount)`  | `ComputationResult`    | amount **encrypted client-side** |
| `withdraw(mint, amount)`            | `ComputationResult`    | amount **public** (off-ramp)     |
| `debit(mint, amount)`               | `DebitResult`          | amount **encrypted**; no tokens move |
| `reveal(mint)`                      | `RevealResult`         | decrypts own balance via MPC     |

### Reads (no cluster required)

| method                       | returns                      |
| ---------------------------- | ---------------------------- |
| `getConfidentialBalance(mint, owner?)` | `ConfidentialBalanceState` (exists, owner, mint, ciphertext, nonce) |
| `balanceExists(mint, owner?)` | `boolean`                   |
| `getMintConfig(mint)`        | `MintConfigState` (authority, totals) |
| `getVaultTokenBalance(mint)` | `bigint` (vault token amount) |
| `pdas(mint, owner?)`         | `AccountPdas`                |

### Composability (build vs send)

Every mutation has a `buildXIx()` that returns an unsent instruction plus the
`computationOffset` to finalize with — for batching, simulation, or custom fees:

```ts
const { instruction, signers, computationOffset } = await vp.buildDepositIx(mint, 1000n);
// ...add to your own Transaction, set priority fees, simulate, send...
await vp.finalize(computationOffset!); // await MPC finalization yourself
```

### Errors

Failures throw typed errors: `VeilPayValidationError` (bad input, thrown before any RPC),
`VeilPayProgramError` (decoded on-chain error with `.code`/`.codeName`, e.g. `InsufficientFunds`),
`VeilPayTimeoutError` (finalize/MXE-key timeout) — all extend `VeilPayError`.

Also exported: `buildContext`, validation (`normalizeAmount`, `normalizePubkey`), read helpers,
PDA helpers (`balancePda`, `mintConfigPda`, `vaultPda`), Arcium helpers (`compAccounts`,
`randomOffset`, `finalize`, `getMXEPublicKeyWithRetry`), crypto (`newCipher`, `encryptValue`),
and `VEILPAY_IDL` / `VEILPAY_PROGRAM_ID`.

## Admin (Node only)

One-time circuit setup reads compiled `.arcis` bytecode from disk, so it lives behind a separate, node-only entry to keep the browser bundle free of `fs`:

```ts
import { ensureCompDefs } from "@veilpay/sdk/admin";
import { buildContext } from "@veilpay/sdk";

const ctx = buildContext({ connection, wallet });
await ensureCompDefs(ctx, "/path/to/arcium-mpc/build", (c, s) => console.log(c, s));
```

## Develop

```bash
npm run sync-idl   # re-vendor IDL + types from ../arcium-mpc/target after a program build
npm run typecheck
npm run test       # cluster-independent unit tests (crypto, PDAs, validation, errors)
npm run build      # dual ESM + CJS + .d.ts via tsup
```
