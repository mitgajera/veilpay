"use client";

import { motion, useReducedMotion } from "motion/react";
import { Lock, ArrowUpRight } from "lucide-react";

/** A faux "confidential balance" card that floats in — the product's signature object. */
export function HeroCard() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.2, 1], delay: 0.2 }}
      className="relative mx-auto w-full max-w-sm"
      style={{ perspective: 1000 }}
    >
      <div className="glass-card rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="label-caps">Confidential balance</span>
          <span className="privacy-pill">
            <Lock className="h-3 w-3" /> encrypted
          </span>
        </div>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-mono text-4xl font-bold tracking-[0.12em] tabular-nums">••••••</span>
          <span className="font-mono text-lg text-text-secondary">USDC</span>
        </div>
        <p className="mt-1.5 font-mono text-xs text-text-secondary">
          Enc&lt;Mxe, u64&gt; · readable only via MPC
        </p>

        <div className="mt-6 space-y-2">
          {[
            { label: "Transfer · to 7xKX…p2aB", tone: "out" },
            { label: "Deposit · vault on-ramp", tone: "in" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border border-border bg-white/[0.02] px-3 py-2.5"
            >
              <span className="text-xs text-text-secondary">{row.label}</span>
              <span className="font-mono text-xs text-text-muted">
                {row.tone === "out" ? <ArrowUpRight className="h-3.5 w-3.5" /> : "•••"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-4 left-1/2 h-12 w-3/4 -translate-x-1/2 rounded-full bg-white/20 opacity-40 blur-3xl" />
    </motion.div>
  );
}
