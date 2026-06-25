import Link from "next/link";
import { DocsSidebar } from "@/components/docs/sidebar";
import { OnThisPage } from "@/components/docs/on-this-page";
import { VeilMark } from "@/components/brand/veil-mark";
import { VeilWordmark } from "@/components/brand/veil-logo";
import { ConnectButton } from "@/components/connect-button";
import { Button } from "@/components/ui/button";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="border border-border bg-elevated flex h-8 w-8 items-center justify-center rounded-lg">
                <VeilMark className="h-5 w-5 text-foreground" />
              </div>
              <VeilWordmark className="text-lg" />
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/app">Open app</Link>
            </Button>
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-6 py-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-24">{children}</main>
        <aside className="hidden w-56 shrink-0 xl:block">
          <div className="sticky top-24">
            <OnThisPage />
          </div>
        </aside>
      </div>
    </div>
  );
}
