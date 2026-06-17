import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    admin: "src/admin.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Bundle the vendored IDL JSON; keep peer-ish runtime deps external.
  loader: { ".json": "json" },
  external: [
    "@anchor-lang/core",
    "@arcium-hq/client",
    "@solana/spl-token",
    "@solana/web3.js",
  ],
});
