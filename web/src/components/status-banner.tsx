"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { api } from "@/lib/fetcher";

type Status = {
  rpc: string;
  program: string;
  arciumCluster: string;
  paymentsAvailable: boolean;
  mockMode: boolean;
};

/** Slim banner shown app-wide when live payments are unavailable (cluster #456). */
export function StatusBanner() {
  const [status, setStatus] = React.useState<Status | null>(null);

  React.useEffect(() => {
    api<Status>("/api/status").then(setStatus).catch(() => setStatus(null));
  }, []);

  if (!status || status.paymentsAvailable) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-primary/10 px-4 py-2 text-center text-xs text-foreground">
      <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
      <span>
        Live payments are paused while the Arcium MPC cluster comes online.
        {status.mockMode ? " Running in demo mode with sample data." : ""} Reads, contacts, and
        requests work now.
      </span>
    </div>
  );
}
