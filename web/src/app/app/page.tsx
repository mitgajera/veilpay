"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Lock } from "lucide-react";
import { BalanceCard } from "@/components/balance-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/fetcher";
import { useAuth } from "@/components/providers/auth-provider";
import { formatRelativeTime, shortAddress } from "@/lib/utils";

type Tx = {
  signature: string;
  kind: string;
  publicAmount: string | null;
  encrypted: boolean;
  blockTime: string | null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [activity, setActivity] = React.useState<Tx[] | null>(null);

  React.useEffect(() => {
    api<{ activity: Tx[] }>("/api/activity")
      .then((d) => setActivity(d.activity))
      .catch(() => setActivity([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        {user && (
          <p className="mt-1 font-mono text-xs text-text-muted">{shortAddress(user.address, 6)}</p>
        )}
      </div>

      <BalanceCard />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="label-caps">Activity</p>
        </div>

        {activity === null ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Lock className="h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-secondary">No activity yet</p>
            <p className="text-xs text-text-muted">
              Send or receive a private payment to get started.
            </p>
          </div>
        ) : (
          <ul>
            {activity.map((t) => {
              const inbound = t.kind === "deposit";
              return (
                <li
                  key={t.signature}
                  className="flex items-center justify-between border-b border-border py-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        inbound ? "bg-success-bg" : "bg-accent-bg"
                      }`}
                    >
                      {inbound ? (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium capitalize">{t.kind}</p>
                      <p className="font-mono text-xs text-text-muted">
                        {t.blockTime ? formatRelativeTime(t.blockTime) : shortAddress(t.signature, 6)}
                        {t.encrypted || t.publicAmount == null ? (
                          <span className="ml-2 text-private">● Amount hidden</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {!t.encrypted && t.publicAmount != null && (
                    <span className="font-mono text-sm">{t.publicAmount}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
