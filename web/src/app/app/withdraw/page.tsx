"use client";

import * as React from "react";
import Link from "next/link";
import { Info, ArrowRight, ArrowLeft, Check, Lock, ArrowUpFromLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Decrypt } from "@/components/motion/decrypt";
import { MpcProgress } from "@/components/mpc-progress";
import { publicConfig } from "@/lib/config";

type Step = "details" | "review" | "submitting" | "done";

const MPC_STEPS = [
  "Queuing the computation",
  "Proving your hidden balance covers it in MPC",
  "Releasing tokens from the vault",
  "Finalizing on-chain",
];

export default function WithdrawPage() {
  const [step, setStep] = React.useState<Step>("details");
  const [amount, setAmount] = React.useState("");
  const live = publicConfig.paymentsEnabled;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Withdraw</h1>
        {!live && (
          <span className="privacy-pill">
            <Lock className="h-3 w-3" /> preview
          </span>
        )}
      </div>

      {step === "details" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardContent className="flex gap-3 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <p className="text-[13px] text-text-secondary">
                Withdrawing releases real tokens from the vault to your wallet — but only if your
                hidden balance covers it, proven inside MPC. The released amount becomes public.
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
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="font-num h-14 pr-20 text-center text-3xl font-bold"
                  />
                  <span className="privacy-pill absolute right-3 top-1/2 -translate-y-1/2">USDC</span>
                </div>
              </div>
              <Button
                variant="veil"
                size="lg"
                className="w-full"
                disabled={!(Number(amount) > 0)}
                onClick={() => setStep("review")}
              >
                Review withdrawal <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "review" && (
        <Card className="mt-6">
          <CardContent className="space-y-5 p-6">
            <div className="text-center">
              <span className="label-caps">You withdraw</span>
              <div className="mt-1 flex items-baseline justify-center gap-2">
                <span className="font-num text-4xl font-bold">
                  {Number(amount).toLocaleString()}
                </span>
                <span className="font-mono text-lg text-text-secondary">USDC</span>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
              <Row label="To">
                <span className="text-text-secondary">your connected wallet</span>
              </Row>
              <Row label="Coverage check">
                <span className="text-text-secondary">proven in MPC — balance stays hidden</span>
              </Row>
              <Row label="Released amount">
                <span className="text-foreground">public (tokens visibly leave the vault)</span>
              </Row>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep("details")}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                variant="veil"
                size="lg"
                className="flex-1"
                onClick={() => setStep("submitting")}
              >
                {live ? "Confirm withdrawal" : "Run preview"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {!live && (
              <p className="text-center text-xs text-text-muted">
                Preview mode — nothing moves until the Arcium cluster is live.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === "submitting" && (
        <Card className="mt-6">
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <ArrowUpFromLine className="h-6 w-6 text-foreground" />
              </div>
              <p className="mt-2 label-caps">Withdrawing {Number(amount).toLocaleString()} USDC</p>
            </div>
            <MpcProgress steps={MPC_STEPS} onDone={() => setStep("done")} />
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
              <Check className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Withdrawn</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tokens are on the way to your wallet. Your remaining balance stays private.
              </p>
            </div>
            <div className="rounded-lg border border-border px-5 py-3">
              <span className="label-caps">Released</span>
              <div className="mt-1 flex items-baseline justify-center gap-2">
                <span className="font-num text-2xl font-bold">
                  <Decrypt value={`${Number(amount).toLocaleString()}`} />
                </span>
                <span className="font-mono text-sm text-text-secondary">USDC</span>
              </div>
            </div>
            <div className="flex w-full gap-3 pt-2">
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link href="/app">Dashboard</Link>
              </Button>
              <Button
                variant="veil"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setStep("details");
                  setAmount("");
                }}
              >
                Withdraw more
              </Button>
            </div>
            {!live && (
              <p className="text-xs text-text-muted">Preview — no real withdrawal was made.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      {children}
    </div>
  );
}
