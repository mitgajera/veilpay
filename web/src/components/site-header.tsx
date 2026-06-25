"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VeilLogo } from "@/components/brand/veil-logo";

const links = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/sdk", label: "SDK" },
  { href: "/docs/cli", label: "CLI" },
];

/**
 * Floating glass-capsule navbar — even frosted glass over the dither.
 * Logo left, nav centered, a single white CTA right; collapses to a menu on mobile.
 */
export function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-white/12 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-brightness-[1.5]">
          <div className="flex items-center gap-4 py-3 pl-5 pr-3">
            <Link href="/" onClick={() => setOpen(false)}>
              <VeilLogo />
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-1 sm:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <Button asChild variant="veil" className="ml-auto hidden rounded-full sm:inline-flex">
              <Link href="/#waitlist">
                Join waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="border-t border-white/10 p-3 sm:hidden">
              <nav className="flex flex-col">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
                <Button asChild variant="veil" className="mt-2 rounded-full">
                  <Link href="/#waitlist" onClick={() => setOpen(false)}>
                    Join waitlist <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
