"use client";

import * as React from "react";
import { Info, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicConfig } from "@/lib/config";

export default function DepositPage() {
  const [amount, setAmount] = React.useState("");
  const paused = !publicConfig.paymentsEnabled;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Deposit</h1>

      <Card>
        <CardContent className="flex gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[13px] text-text-secondary">
            Depositing moves tokens from your public wallet into your private VeilPay balance. The
            deposit amount is visible on-chain, but your balance from this point on is private.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="label-caps">
              Amount
            </Label>
            <div className="relative">
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="h-14 pr-20 text-center font-mono text-3xl font-bold"
              />
              <span className="privacy-pill absolute right-3 top-1/2 -translate-y-1/2">USDC</span>
            </div>
          </div>

          <Button variant="veil" size="lg" className="w-full" disabled={paused || !amount}>
            Deposit to private balance <ArrowRight className="h-4 w-4" />
          </Button>

          {paused && (
            <p className="text-center text-xs text-text-muted">
              Deposits unlock when the Arcium MPC cluster is live. The form is ready; nothing is sent
              yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
