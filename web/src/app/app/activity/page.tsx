"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Eye, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/fetcher";
import { formatRelativeTime, shortAddress } from "@/lib/utils";

type Tx = {
  signature: string;
  kind: string;
  mint: string | null;
  publicAmount: string | null;
  encrypted: boolean;
  blockTime: string | null;
};

const kindIcon: Record<string, React.ReactNode> = {
  deposit: <ArrowDownLeft className="h-4 w-4 text-accent" />,
  withdraw: <ArrowUpRight className="h-4 w-4 text-primary" />,
  transfer: <Receipt className="h-4 w-4 text-muted-foreground" />,
  reveal: <Eye className="h-4 w-4 text-muted-foreground" />,
};

export default function ActivityPage() {
  const [txs, setTxs] = React.useState<Tx[] | null>(null);

  React.useEffect(() => {
    api<{ activity: Tx[] }>("/api/activity")
      .then((d) => setTxs(d.activity))
      .catch(() => setTxs([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Activity"
        description="Indexed on-chain events. Confidential transfers carry no amount."
      />
      <Card>
        <CardContent className="p-0">
          {txs === null ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : txs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No activity yet. Events appear here once the indexer sees your on-chain transactions.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {txs.map((t) => (
                <li key={t.signature} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {kindIcon[t.kind] ?? <Receipt className="h-4 w-4" />}
                    <div>
                      <p className="font-medium capitalize">{t.kind}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {shortAddress(t.signature, 6)}
                        {t.blockTime ? ` · ${formatRelativeTime(t.blockTime)}` : ""}
                      </p>
                    </div>
                  </div>
                  {t.encrypted || t.publicAmount == null ? (
                    <Badge variant="secondary">confidential</Badge>
                  ) : (
                    <span className="font-mono text-sm">{t.publicAmount}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
