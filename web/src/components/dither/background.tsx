"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { DitherProps } from "./dither";

// WebGL canvas — never SSR it.
const Dither = dynamic(() => import("./dither"), { ssr: false });

/**
 * Dithered backdrop. By default it's `absolute inset-0`, so it fills its
 * positioned parent (e.g. a `relative` hero section that's one screen tall) and
 * scrolls away with it. Pass `position="fixed"` to pin it behind the whole page.
 * Honors prefers-reduced-motion (static gradient fallback) and dims via `intensity`.
 */
export function DitherBackground({
  intensity = "full",
  interactive = true,
  position = "absolute",
  ...props
}: DitherProps & {
  intensity?: "full" | "muted";
  interactive?: boolean;
  position?: "absolute" | "fixed";
}) {
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Unmount the WebGL canvas when scrolled out of view — no GPU work off-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const opacity = intensity === "muted" ? "opacity-60" : "opacity-90";

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none ${position} inset-0 -z-10 overflow-hidden bg-background`}
    >
      {/* Static fallback (also the SSR/first-paint and reduced-motion view). */}
      <div className="veil-aurora absolute inset-0" />

      {mounted && !reduced && inView && (
        <div className={`absolute inset-0 ${opacity} ${interactive ? "pointer-events-auto" : ""}`}>
          <Dither
            // Monochrome grey waves on black, tuned to the lively ReactBits reference:
            // a faster flow + crisper dithering (lower colorNum) so the waves visibly move.
            waveColor={[0.5, 0.5, 0.5]}
            waveSpeed={0.05}
            waveFrequency={3}
            waveAmplitude={0.3}
            colorNum={4}
            pixelSize={2}
            mouseRadius={0}
            disableAnimation={false}
            enableMouseInteraction={interactive}
            {...props}
          />
        </div>
      )}

      {/* Scrim to guarantee text contrast over the shader. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background/80" />
    </div>
  );
}
