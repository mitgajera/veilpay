"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const GLYPHS = "0123456789";

/**
 * Decrypt — the brand's signature motion. Characters scramble through random
 * glyphs and resolve left→right, echoing a value being decrypted. Pair with
 * `font-mono tabular-nums` so width never shifts. Separators (commas, dots,
 * spaces) stay fixed; only alphanumerics scramble.
 *
 * Honors prefers-reduced-motion: the final value appears instantly. The real
 * value is always exposed to assistive tech via aria-label.
 */
export function Decrypt({
  value,
  className,
  durationMs = 480,
}: {
  value: string;
  className?: string;
  durationMs?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const chars = value.split("");
    // Each scrambleable char locks at a staggered moment across the duration.
    const settleAt = chars.map((c, i) =>
      /[0-9A-Za-z]/.test(c) ? durationMs * (0.2 + (0.7 * (i + 1)) / chars.length) : 0,
    );
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = now - start;
      setDisplay(
        chars
          .map((c, i) =>
            !/[0-9A-Za-z]/.test(c) || t >= settleAt[i]
              ? c
              : GLYPHS[(Math.random() * GLYPHS.length) | 0],
          )
          .join(""),
      );
      if (t < durationMs) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, durationMs]);

  return (
    <span className={cn(className)} aria-label={value}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
