"use client";

import * as React from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type State = "idle" | "loading" | "done" | "error";

/**
 * Pre-launch waitlist capture. Inline email + submit in a frosted pill, with
 * loading / success / error states. Posts to /api/waitlist (idempotent).
 */
export function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<State>("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading" || state === "done") return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState("error");
        setError(data.error || "Something went wrong. Try again.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("Network error. Try again.");
    }
  }

  if (state === "done") {
    return (
      <div
        role="status"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-sm text-foreground backdrop-blur-md"
      >
        <Check className="h-4 w-4" />
        You&apos;re on the list — we&apos;ll email you the moment it&apos;s live.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] py-1.5 pl-5 pr-1.5 backdrop-blur-md focus-within:border-white/30">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          aria-invalid={state === "error"}
          className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          aria-busy={state === "loading"}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors duration-150 ease-out hover:bg-accent-lo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 motion-safe:active:translate-y-px"
        >
          {state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Joining
            </>
          ) : (
            <>
              Join waitlist <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      {state === "error" && (
        <p role="alert" className="mt-2 px-5 text-left text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
