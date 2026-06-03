import pc from "picocolors";

// ── Explorer ───────────────────────────────────────────────────────────

const CLUSTER = process.env.ANCHOR_PROVIDER_URL?.includes("devnet")
  ? "devnet"
  : process.env.ANCHOR_PROVIDER_URL?.includes("mainnet")
  ? "mainnet"
  : "devnet";

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
}
export function explorerAddr(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;
}

// ── Spinner ────────────────────────────────────────────────────────────

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  start(): this {
    process.stdout.write("\x1B[?25l"); // hide cursor
    this.render();
    this.timer = setInterval(() => this.render(), 80);
    return this;
  }

  private render() {
    const frame = pc.cyan(FRAMES[this.frame++ % FRAMES.length]);
    process.stdout.write(`\r  ${frame}  ${this.text} `);
  }

  succeed(msg: string) {
    this.stop();
    console.log(`  ${pc.green("✓")}  ${msg}`);
  }

  fail(msg: string) {
    this.stop();
    console.log(`  ${pc.red("✗")}  ${msg}`);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    process.stdout.write("\r\x1B[K\x1B[?25h"); // clear line, show cursor
  }
}

export function spinner(text: string): Spinner {
  return new Spinner(text).start();
}

// ── Layout helpers ─────────────────────────────────────────────────────

export function banner() {
  console.log();
  console.log(
    pc.bold(pc.magenta("  ██╗   ██╗███████╗██╗██╗     ██████╗  █████╗ ██╗   ██╗"))
  );
  console.log(
    pc.bold(pc.magenta("  ██║   ██║██╔════╝██║██║     ██╔══██╗██╔══██╗╚██╗ ██╔╝"))
  );
  console.log(
    pc.bold(pc.magenta("  ██║   ██║█████╗  ██║██║     ██████╔╝███████║ ╚████╔╝ "))
  );
  console.log(
    pc.bold(pc.magenta("  ╚██╗ ██╔╝██╔══╝  ██║██║     ██╔═══╝ ██╔══██║  ╚██╔╝  "))
  );
  console.log(
    pc.bold(pc.magenta("   ╚████╔╝ ███████╗██║███████╗██║     ██║  ██║   ██║   "))
  );
  console.log(
    pc.bold(pc.magenta("    ╚═══╝  ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝   ╚═╝   "))
  );
  console.log(
    pc.dim("  Privacy-first payments on Solana\n")
  );
}

export function section(title: string) {
  console.log();
  console.log(`  ${pc.bold(pc.cyan(title))}`);
  console.log(`  ${pc.dim("─".repeat(45))}`);
}

export function row(label: string, value: string, highlight = false) {
  const w = 18;
  const lbl = pc.dim(label.padEnd(w));
  const val = highlight ? pc.yellow(value) : pc.white(value);
  console.log(`  ${lbl} ${val}`);
}

export function txRow(sig: string) {
  const short = sig.slice(0, 8) + "..." + sig.slice(-8);
  console.log(`  ${pc.dim("Signature".padEnd(18))} ${pc.green(short)}`);
  console.log(`  ${pc.dim("Explorer".padEnd(18))} ${pc.cyan(explorerTx(sig))}`);
}

export function success(msg: string) {
  console.log(`\n  ${pc.bgGreen(pc.black(" DONE "))} ${pc.green(msg)}\n`);
}

export function fail(msg: string) {
  console.error(`\n  ${pc.bgRed(pc.white(" ERROR "))} ${pc.red(msg)}\n`);
}

export function warn(msg: string) {
  console.log(`  ${pc.yellow("⚠")}  ${pc.yellow(msg)}`);
}

export function info(msg: string) {
  console.log(`  ${pc.cyan("ℹ")}  ${pc.dim(msg)}`);
}

export function divider() {
  console.log(`\n  ${pc.dim("─".repeat(55))}\n`);
}
