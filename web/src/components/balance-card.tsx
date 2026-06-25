"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Decrypt } from "@/components/motion/decrypt";

/**
 * The signature surface. Default shows a masked balance; "Reveal" blurs the dots
 * out and dissolves the real number in with a single border glow-pulse — the
 * product promise made tangible. In mock mode the value is illustrative; once
 * the cluster is live this calls the SDK's reveal (MPC).
 */
export function BalanceCard({
  symbol = "USDC",
  mockValue = "1,250.00",
  revealable = true,
}: {
  symbol?: string;
  mockValue?: string;
  revealable?: boolean;
}) {
  const [revealed, setRevealed] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);

  const toggle = () => {
    if (!revealable) return;
    if (!revealed) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
    setRevealed((r) => !r);
  };

  return (
    <div
      className={cn(
        "glass-card relative overflow-hidden rounded-xl p-8",
        pulse && "motion-safe:animate-glow-pulse",
      )}
    >
      <div className="flex items-start justify-between">
        <span className="label-caps">Confidential balance</span>
        {revealable && (
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-2.5">
        {revealed ? (
          <>
            <span
              key="revealed"
              className="font-mono text-4xl font-bold tabular-nums motion-safe:animate-reveal-in"
            >
              <Decrypt value={mockValue} />
            </span>
            <span className="font-mono text-xl text-text-secondary">{symbol}</span>
          </>
        ) : (
          <span className="flex items-center gap-3 font-mono text-4xl font-bold tracking-[0.15em] text-text-muted">
            ••••••
            <Lock className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="privacy-pill">● Amount hidden</span>
        <span className="privacy-pill">● Sender hidden</span>
        <span className="privacy-pill">● Recipient hidden</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <QuickAction href="/app/send" icon={<ArrowUp className="h-4 w-4" />} label="Send" />
        <QuickAction href="/app/deposit" icon={<Plus className="h-4 w-4" />} label="Deposit" />
        <QuickAction href="/app/withdraw" icon={<ArrowDown className="h-4 w-4" />} label="Withdraw" />
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-medium text-foreground transition-[border-color,box-shadow] duration-150 hover:border-primary hover:shadow-glow-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {icon}
      {label}
    </Link>
  );
}
