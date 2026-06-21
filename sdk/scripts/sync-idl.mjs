// Re-vendor the IDL + generated types from the built program into the SDK.
// Run after `arcium build` / `anchor build` regenerates target/.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "..", "target");
const dest = resolve(here, "..", "src", "idl");

const files = [
  ["idl/veilpay.json", "veilpay.json"],
  ["types/veilpay.ts", "veilpay.ts"],
];

for (const [from, to] of files) {
  const src = resolve(target, from);
  if (!existsSync(src)) {
    console.error(`✗ missing ${src} — run the program build first`);
    process.exit(1);
  }
  copyFileSync(src, resolve(dest, to));
  console.log(`✔ synced ${to}`);
}
