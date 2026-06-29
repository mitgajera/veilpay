"use client";

import * as React from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The signature "computing in MPC" moment. A vertical timeline that steps a
 * confidential operation through encrypt → queue → compute → finalize, with the
 * active step pulsing. In mock mode it self-advances on a timer; the parent is
 * told when it finishes via onDone. Reduced-motion → no pulse, instant steps.
 */
export function MpcProgress({
  steps,
  stepMs = 1100,
  onDone,
}: {
  steps: string[];
  stepMs?: number;
  onDone?: () => void;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const done = React.useRef(false);

  React.useEffect(() => {
    if (active >= steps.length) {
      if (!done.current) {
        done.current = true;
        const t = setTimeout(() => onDone?.(), 400);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => setActive((a) => a + 1), reduce ? 120 : stepMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, steps.length, stepMs, reduce]);

  return (
    <ul className="space-y-1">
      {steps.map((label, i) => {
        const state = i < active ? "done" : i === active ? "active" : "pending";
        return (
          <li key={label} className="flex items-center gap-3 py-1.5">
            <span
              className={cn(
                "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                state === "done" && "border-foreground/30 bg-white/10 text-foreground",
                state === "active" && "border-white/30 bg-white/[0.06] text-foreground",
                state === "pending" && "border-border text-text-muted",
              )}
            >
              {state === "done" ? (
                <Check className="h-3.5 w-3.5" />
              ) : state === "active" ? (
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {state === "active" && !reduce && (
                <span className="absolute inset-0 rounded-full motion-safe:animate-ping border border-white/25" />
              )}
            </span>
            <span
              className={cn(
                "text-sm transition-colors",
                state === "pending" ? "text-text-muted" : "text-foreground",
                state === "active" && "font-medium",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
