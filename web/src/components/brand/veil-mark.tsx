import { cn } from "@/lib/utils";
import { markDots } from "./mark";

/**
 * VeilMark — the VeilPay logo. A "dithered coin": a disc rendered as an
 * ordered-halftone dot field whose dots grow across the face, echoing the
 * Dither backdrop the whole brand is built on. Monochrome by design — dots
 * inherit `currentColor`, so it adopts whatever text color it sits in.
 *
 * Drop-in for an icon (no frame). Pass `framed` for the standalone app-icon /
 * favicon treatment (rounded "squircle" tile behind the disc).
 */
export function VeilMark({
  className,
  framed = false,
  title = "VeilPay",
}: {
  className?: string;
  framed?: boolean;
  title?: string;
}) {
  // Deterministic halftone shared with the downloadable SVG/PNG assets.
  const dots = markDots();

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("text-foreground", className)}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      {framed && (
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="23"
          rx="6.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
        />
      )}
      {dots.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={p.r.toFixed(2)} />
      ))}
    </svg>
  );
}
