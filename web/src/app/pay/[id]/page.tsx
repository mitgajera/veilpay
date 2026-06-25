"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VeilMark } from "@/components/brand/veil-mark";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectButton } from "@/components/connect-button";
import { PaymentsPaused } from "@/components/payments-paused";
import { api } from "@/lib/fetcher";
import { shortAddress } from "@/lib/utils";

type Req = {
  id: string;
  creatorAddress: string;
  mint: string;
  amount: string | null;
  memo: string | null;
  status: string;
};

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [req, setReq] = React.useState<Req | null | "error">(null);

  React.useEffect(() => {
    api<{ request: Req }>(`/api/requests/${id}`)
      .then((d) => setReq(d.request))
      .catch(() => setReq("error"));
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="border border-border bg-elevated flex h-8 w-8 items-center justify-center rounded-lg">
            <VeilMark className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-lg font-semibold">VeilPay</span>
        </Link>
        <ConnectButton />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        {req === null ? (
          <Skeleton className="h-48 w-full" />
        ) : req === "error" ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              This payment request could not be found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Payment request
                  <Badge variant={req.status === "open" ? "default" : "secondary"}>{req.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="To" value={shortAddress(req.creatorAddress, 6)} mono />
                <Row label="Token" value={shortAddress(req.mint, 6)} mono />
                <Row label="Amount" value={req.amount ? `${req.amount} base units` : "Any amount"} />
                {req.memo && <Row label="Memo" value={req.memo} />}
              </CardContent>
            </Card>

            {req.status === "open" ? (
              <PaymentsPaused action="Paying this request" />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  This request is {req.status} and can no longer be paid.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}
