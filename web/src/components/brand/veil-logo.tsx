import { cn } from "@/lib/utils";
import { VeilMark } from "./veil-mark";

/**
 * The VeilPay wordmark — clean, uppercase, widely tracked Space Grotesk: a
 * minimal geometric logotype in the spirit of premium crypto marks. Monochrome,
 * single weight, inherits currentColor.
 */
export function VeilWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-medium uppercase leading-none tracking-[0.22em]", className)}>
      VeilPay
    </span>
  );
}

/** Mark + wordmark lockup. The default brand signature. */
export function VeilLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <VeilMark className={cn("h-6 w-6 shrink-0", markClassName)} />
      <VeilWordmark className={cn("text-lg", wordmarkClassName)} />
    </span>
  );
}
