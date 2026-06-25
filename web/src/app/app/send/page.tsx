"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicConfig } from "@/lib/config";

const guarantees = [
  "Amount will be hidden from all observers",
  "Your identity will not appear on-chain",
  "Recipient identity will not appear on-chain",
];

export default function SendPage() {
  return (
    <Suspense fallback={null}>
      <SendForm />
    </Suspense>
  );
}

function SendForm() {
  const params = useSearchParams();
  const [to, setTo] = React.useState(params.get("to") ?? "");
  const [amount, setAmount] = React.useState("");
  const paused = !publicConfig.paymentsEnabled;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Send private payment</h1>
      <StepDots active={0} />

      <Card className="mt-6">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="to" className="label-caps">
              Recipient address
            </Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Enter Solana address…"
              className="font-mono text-[13px]"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

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

          <div className="space-y-2 rounded-md border border-border bg-deep/60 p-3">
            {guarantees.map((g) => (
              <div key={g} className="flex items-center gap-2 text-xs text-success">
                <Check className="h-3.5 w-3.5 shrink-0" />
                {g}
              </div>
            ))}
          </div>

          <Button variant="veil" size="lg" className="w-full" disabled={paused || !to || !amount}>
            Preview transfer <ArrowRight className="h-4 w-4" />
          </Button>

          {paused && (
            <p className="text-center text-xs text-text-muted">
              Transfers unlock when the Arcium MPC cluster is live. The form is ready; nothing is sent
              yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepDots({ active }: { active: number }) {
  const steps = ["Details", "Review", "Done"];
  return (
    <div className="mt-3 flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${i <= active ? "bg-primary" : "bg-border"}`}
            aria-hidden
          />
          <span className={`text-xs ${i === active ? "text-foreground" : "text-text-muted"}`}>
            {label}
          </span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
        </div>
      ))}
    </div>
  );
}
