import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { DitherBackground } from "@/components/dither/background";
import { Reveal } from "@/components/motion/reveal";
import { HeroRevealProof } from "@/components/hero-reveal-proof";
import { ArciumWordmark } from "@/components/brand/arcium-wordmark";
import { WaitlistForm } from "@/components/waitlist-form";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1">
        {/* Hero — the whole page. The dither fills one screen; content floats over it. */}
        <section className="relative isolate flex flex-1 items-center justify-center overflow-hidden">
          <DitherBackground position="absolute" intensity="full" interactive />

          {/* Readability scrim: darkens behind the centered content so text stays
              legible over the busy dither, while the field stays loud at the edges. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_58%_66%_at_50%_44%,rgba(0,0,0,0.86),rgba(0,0,0,0.45)_50%,transparent_80%)]"
          />

          <Reveal className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-28 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5 text-xs text-text-secondary backdrop-blur-md">
              <span className="flex h-4 items-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                NEW
              </span>
              Confidential token payments on Solana
            </span>

            <h1 className="mt-7 font-dot text-balance text-5xl leading-[1.12] [text-shadow:0_1px_22px_rgba(0,0,0,0.6)] sm:text-6xl md:text-7xl">
              Payments that <span className="veil-text">nobody watches</span>.
            </h1>

            <p className="mt-6 max-w-xl text-balance text-lg text-foreground/85">
              Your balance stays encrypted on-chain and amounts move privately through secure
              multi-party computation — wallet-like UX, real auditability, without leaking what you
              hold or send.
            </p>

            <div
              id="waitlist"
              className="mt-9 flex w-full max-w-md scroll-mt-28 flex-col items-center gap-4"
            >
              <WaitlistForm />
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>

            {/* The product's magic trick, live in the hero */}
            <div className="mt-10">
              <HeroRevealProof />
            </div>

            <p className="mt-6 font-mono text-xs text-text-secondary">
              Not anonymous — confidential. Amounts hidden, accountability intact.
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} VeilPay · confidential SPL payments</span>

          <a
            href="https://www.arcium.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Powered by Arcium"
            className="group inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            Powered by
            <ArciumWordmark className="h-4 w-auto text-text-secondary transition-colors group-hover:text-foreground" />
          </a>

          <nav className="flex items-center gap-5">
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <Link href="/docs/sdk" className="transition-colors hover:text-foreground">
              SDK
            </Link>
            <Link href="/docs/cli" className="transition-colors hover:text-foreground">
              CLI
            </Link>
            <Link href="/brand" className="transition-colors hover:text-foreground">
              Brand
            </Link>
            {/* <a
              href="https://github.com/mitgajera/veilpay"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a> */}
          </nav>
        </div>
      </footer>
    </div>
  );
}
