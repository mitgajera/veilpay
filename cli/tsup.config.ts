import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs"],
  target: "node20",
  clean: true,
  sourcemap: true,
  // Prepend a shebang so the built file is directly executable as `veilpay`.
  banner: { js: "#!/usr/bin/env node" },
  // Keep runtime deps external; the CLI ships with its node_modules.
  external: [
    "@veilpay/sdk",
    "@anchor-lang/core",
    "@arcium-hq/client",
    "@solana/spl-token",
    "@solana/web3.js",
    "commander",
    "picocolors",
  ],
});
