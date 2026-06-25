"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled code block with a copy button and a dependency-free, brand-monochrome
 * highlighter: tokens are differentiated by luminance (comments dim, keywords
 * bright/bold, strings + numbers mid) rather than hue, so it reads like real
 * syntax highlighting while staying greyscale. Handles JS/TS and shell.
 */

const KEYWORDS = new Set([
  "import", "export", "from", "const", "let", "var", "async", "await", "return",
  "new", "function", "class", "extends", "implements", "interface", "type", "enum",
  "if", "else", "for", "while", "do", "switch", "case", "try", "catch", "finally",
  "throw", "typeof", "instanceof", "in", "of", "as", "default", "void", "yield",
  "null", "true", "false", "undefined", "this", "super",
]);

type Tok = { t: string; k: "plain" | "comment" | "string" | "number" | "keyword" | "fn" };

// Order matters: comment, string, number, identifier. The `(?<![:/])` guard
// keeps `://` in URLs from being read as a line comment.
const RE =
  /(\/\*[\s\S]*?\*\/|(?<![:/])\/\/[^\n]*|#[^\n]*)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d[\d_]*n?\b)|([A-Za-z_$][\w$]*)/g;

function tokenize(code: string): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), k: "plain" });
    if (m[1]) out.push({ t: m[1], k: "comment" });
    else if (m[2]) out.push({ t: m[2], k: "string" });
    else if (m[3]) out.push({ t: m[3], k: "number" });
    else if (m[4]) {
      const isCall = code[RE.lastIndex] === "(";
      out.push({ t: m[4], k: KEYWORDS.has(m[4]) ? "keyword" : isCall ? "fn" : "plain" });
    }
    last = RE.lastIndex;
  }
  if (last < code.length) out.push({ t: code.slice(last), k: "plain" });
  return out;
}

// Monochrome luminance tiers.
const STYLE: Record<Tok["k"], React.CSSProperties> = {
  plain: { color: "#c9c9c9" },
  comment: { color: "#666", fontStyle: "italic" },
  string: { color: "#a6a6a6" },
  number: { color: "#cfcfcf" },
  keyword: { color: "#ffffff", fontWeight: 600 },
  fn: { color: "#ededed" },
};

export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const trimmed = code.trim();
  const tokens = React.useMemo(() => tokenize(trimmed), [trimmed]);

  const copy = () => {
    navigator.clipboard.writeText(trimmed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-[#0a0a0b]", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{label ?? "shell"}</span>
        <button
          onClick={copy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-accent" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono">
          {tokens.map((tok, i) => (
            <span key={i} style={STYLE[tok.k]}>
              {tok.t}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
