import { cn } from "@/lib/utils";

/**
 * Typographic wrapper for doc content. Styles raw HTML children via arbitrary
 * variants so we don't need the typography plugin. Use <CodeBlock> for code.
 */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-none text-[15px] leading-7 text-foreground/90",
        "[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
        "[&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:mt-4",
        "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
        "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
        "[&_li]:marker:text-muted-foreground",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-80",
        "[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
        "[&_td]:border-b [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
        "[&_hr]:my-10 [&_hr]:border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Highlighted aside for notes/warnings inside docs. */
export function Callout({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warn";
}) {
  return (
    <div
      className={cn(
        "mt-6 rounded-lg border px-4 py-3 text-sm",
        variant === "warn"
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border bg-secondary/50 text-foreground/90",
      )}
    >
      {children}
    </div>
  );
}
