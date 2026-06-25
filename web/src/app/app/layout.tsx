"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { VeilMark } from "@/components/brand/veil-mark";
import { ConnectButton } from "@/components/connect-button";
import { NotificationBell } from "@/components/notification-bell";
import { StatusBanner } from "@/components/status-banner";
import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <StatusBanner />
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="md:hidden">
            <span className="font-semibold">VeilPay</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <ConnectButton />
          </div>
        </header>

        <main className="flex-1 p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : user ? (
            children
          ) : (
            <SignInGate />
          )}
        </main>
      </div>
    </div>
  );
}

function SignInGate() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <div className="border border-border bg-elevated flex h-12 w-12 items-center justify-center rounded-xl">
        <VeilMark className="h-7 w-7 text-foreground" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold">Sign in to VeilPay</h2>
      <p className="mt-2 text-muted-foreground">
        Connect your Solana wallet and sign a message to access your confidential dashboard. No
        transaction, no fees.
      </p>
      <div className="mt-8">
        <ConnectButton />
      </div>
    </div>
  );
}
