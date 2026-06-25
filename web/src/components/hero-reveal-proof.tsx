"use client";

import * as React from "react";
import { Lock, Eye } from "lucide-react";
import { Decrypt } from "@/components/motion/decrypt";

/**
 * The product's magic trick, inline in the hero. A masked confidential balance
 * that decrypts on hover / focus / tap and re-hides on leave — the decrypt-reveal
 * motion as a live, self-explaining demo. Monospace + fixed width so nothing
 * shifts; keyboard-focusable; reduced-motion handled by Decrypt.
 */
export function HeroRevealProof() {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      onClick={() => setRevealed((r) => !r)}
      aria-label="Demo — reveal a confidential balance"
      className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] py-2 pl-4 pr-3 backdrop-blur-md transition-[border-color,box-shadow] duration-200 ease-out hover:border-white/25 hover:shadow-glow-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="label-caps">Confidential balance</span>

      <span className="inline-flex w-[8.5rem] justify-center font-num text-sm font-semibold text-foreground">
        {revealed ? (
          <Decrypt value="1,250.00 USDC" />
        ) : (
          <span className="tracking-[0.18em] text-text-secondary">••••••</span>
        )}
      </span>

      <span className="flex items-center gap-1.5 text-text-muted">
        {revealed ? <Eye className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        <span className="hidden text-[11px] sm:inline">{revealed ? "decrypted" : "hover to decrypt"}</span>
      </span>
    </button>
  );
}
