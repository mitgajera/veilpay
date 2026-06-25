"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { VeilMark } from "@/components/brand/veil-mark";
import { VeilLogo, VeilWordmark } from "@/components/brand/veil-logo";
import { buildMarkSvg, buildLockupSvg } from "@/components/brand/mark";
import { cn } from "@/lib/utils";

// ---- asset helpers (client) ------------------------------------------------

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadSvg(name: string, svg: string) {
  downloadBlob(name, new Blob([svg], { type: "image/svg+xml" }));
}

async function svgToPng(svg: string, w: number, h: number, bg?: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- small UI --------------------------------------------------------------

function AssetButton({
  onClick,
  done,
  children,
}: {
  onClick: () => void;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-hi hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-14">
      <p className="label-caps mb-3">{eyebrow}</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

// ---- data ------------------------------------------------------------------

const COLORS = [
  { name: "Background", hex: "#000000" },
  { name: "Foreground", hex: "#EDEDED" },
  { name: "Primary", hex: "#FFFFFF" },
  { name: "Surface", hex: "#0D0D0D" },
  { name: "Elevated", hex: "#161616" },
  { name: "Secondary", hex: "#9A9A9A" },
  { name: "Muted", hex: "#5E5E5E" },
  { name: "Error", hex: "#D65A5A" },
];

const FONTS = [
  { role: "Display / headings / logo", name: "Space Grotesk", cls: "font-display", sample: "Payments that nobody watches" },
  { role: "Body / UI", name: "Inter", cls: "", sample: "Balances stay encrypted on-chain." },
  { role: "Numbers / code / addresses", name: "JetBrains Mono", cls: "font-mono", sample: "1,250.00 USDC · 7xKX…p2aB" },
  { role: "Dotted display accent", name: "Codystar", cls: "font-dot", sample: "VEILPAY" },
];

// ---- page ------------------------------------------------------------------

export default function BrandPage() {
  const [copied, setCopied] = React.useState<string>("");
  const flash = (id: string) => {
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? "" : c)), 1500);
  };
  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    flash(id);
  };

  // Mark assets in both modes.
  const markWhite = buildMarkSvg({ color: "#F4F4F7" });
  const markBlack = buildMarkSvg({ color: "#0B0B0F" });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 pb-28 pt-36">
        {/* Intro */}
        <div className="flex flex-col items-start gap-6">
          <VeilLogo markClassName="h-8 w-8" wordmarkClassName="text-2xl" />
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">Brand kit</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Everything you need to represent VeilPay — the logo, colors, and type. Monochrome by
              design. Copy or download any asset in black or white, as SVG or PNG.
            </p>
          </div>
        </div>

        {/* Logo */}
        <Section eyebrow="Logo" title="The mark & wordmark">
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
            The <strong className="text-foreground">VeilMark</strong> is a “dithered coin” — a disc of
            ordered halftone dots that resolve left to right, echoing the dither backdrop the whole
            brand is built on. Pair it with the wordmark for the full lockup, or use it alone as an
            icon. Keep clear space of at least the dot grid around it; never recolor it outside the
            greyscale palette.
          </p>

          {/* Lockup on both modes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-black p-8">
              <div className="flex flex-1 items-center justify-center py-6">
                <VeilLogo markClassName="h-9 w-9" wordmarkClassName="text-2xl" />
              </div>
              <div className="flex flex-wrap gap-2">
                <AssetButton
                  done={copied === "lockup-d-svg"}
                  onClick={() => {
                    copyText("lockup-d-svg", buildLockupSvg({ color: "#F4F4F7" }));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy SVG
                </AssetButton>
                <AssetButton
                  onClick={() => downloadSvg("veilpay-logo-white.svg", buildLockupSvg({ color: "#F4F4F7" }))}
                >
                  <Download className="h-3.5 w-3.5" /> SVG
                </AssetButton>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-8">
              <div className="flex flex-1 items-center justify-center py-6 text-[#0B0B0F]">
                <span className="inline-flex items-center gap-2">
                  <VeilMark className="h-9 w-9 text-[#0B0B0F]" />
                  <VeilWordmark className="text-xl" />
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <AssetButton
                  done={copied === "lockup-l-svg"}
                  onClick={() => copyText("lockup-l-svg", buildLockupSvg({ color: "#0B0B0F" }))}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy SVG
                </AssetButton>
                <AssetButton
                  onClick={() => downloadSvg("veilpay-logo-black.svg", buildLockupSvg({ color: "#0B0B0F" }))}
                >
                  <Download className="h-3.5 w-3.5" /> SVG
                </AssetButton>
              </div>
            </div>
          </div>

          {/* Mark only — SVG + PNG, both modes */}
          <h3 className="mb-4 mt-10 text-sm font-semibold">Mark only</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-black p-8">
              <div className="flex flex-1 items-center justify-center py-4">
                <VeilMark className="h-16 w-16" />
              </div>
              <div className="flex flex-wrap gap-2">
                <AssetButton done={copied === "mark-d"} onClick={() => copyText("mark-d", markWhite)}>
                  <Copy className="h-3.5 w-3.5" /> Copy SVG
                </AssetButton>
                <AssetButton onClick={() => downloadSvg("veilmark-white.svg", markWhite)}>
                  <Download className="h-3.5 w-3.5" /> SVG
                </AssetButton>
                <AssetButton
                  onClick={async () => downloadBlob("veilmark-white.png", await svgToPng(markWhite, 512, 512))}
                >
                  <Download className="h-3.5 w-3.5" /> PNG
                </AssetButton>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-8">
              <div className="flex flex-1 items-center justify-center py-4 text-[#0B0B0F]">
                <VeilMark className="h-16 w-16 text-[#0B0B0F]" />
              </div>
              <div className="flex flex-wrap gap-2">
                <AssetButton done={copied === "mark-l"} onClick={() => copyText("mark-l", markBlack)}>
                  <Copy className="h-3.5 w-3.5" /> Copy SVG
                </AssetButton>
                <AssetButton onClick={() => downloadSvg("veilmark-black.svg", markBlack)}>
                  <Download className="h-3.5 w-3.5" /> SVG
                </AssetButton>
                <AssetButton
                  onClick={async () => downloadBlob("veilmark-black.png", await svgToPng(markBlack, 512, 512))}
                >
                  <Download className="h-3.5 w-3.5" /> PNG
                </AssetButton>
              </div>
            </div>
          </div>
        </Section>

        {/* Colors */}
        <Section eyebrow="Palette" title="Monochrome, dark-first">
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
            Pure greyscale — no hue anywhere, except a single muted red reserved for genuine errors.
            Click any swatch to copy its hex.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => copyText(`color-${c.hex}`, c.hex)}
                className="group overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-border-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="h-16 w-full" style={{ background: c.hex }} />
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="font-mono text-xs text-text-muted">{c.hex}</div>
                  </div>
                  {copied === `color-${c.hex}` ? (
                    <Check className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section eyebrow="Typography" title="Three faces + a dotted accent">
          <div className="space-y-px overflow-hidden rounded-xl border border-border">
            {FONTS.map((f) => (
              <div key={f.name} className="flex flex-col gap-3 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="shrink-0 sm:w-56">
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="text-xs text-text-muted">{f.role}</div>
                </div>
                <div className={cn("min-w-0 truncate text-2xl text-foreground", f.cls)}>{f.sample}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-muted">
            All loaded via next/font. The dotted accent is display-only — never body or amounts.
          </p>
        </Section>

        {/* Voice */}
        <Section eyebrow="Voice" title="Plain, exact, reassuring">
          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="rounded-lg border border-border p-4">
              Say <strong className="text-foreground">private</strong>,{" "}
              <strong className="text-foreground">encrypted</strong>,{" "}
              <strong className="text-foreground">on-chain</strong> — never “anonymous” (it isn’t).
            </li>
            <li className="rounded-lg border border-border p-4">
              Never invent amounts in copy; balances are confidential.
            </li>
            <li className="rounded-lg border border-border p-4">
              Errors are calm and actionable, never alarming.
            </li>
            <li className="rounded-lg border border-border p-4">
              Not anonymous — <strong className="text-foreground">confidential</strong>. Amounts
              hidden, accountability intact.
            </li>
          </ul>
        </Section>

        <div className="border-t border-border pt-8 text-sm text-text-muted">
          <Link href="/" className="transition-colors hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
