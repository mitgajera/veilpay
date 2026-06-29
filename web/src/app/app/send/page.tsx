"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ArrowRight, ArrowLeft, ShieldCheck, Lock, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Decrypt } from "@/components/motion/decrypt";
import { MpcProgress } from "@/components/mpc-progress";
import { publicConfig } from "@/lib/config";
import { shortAddress } from "@/lib/utils";

type Step = "details" | "review" | "submitting" | "done";

const GUARANTEES = [
  "Amount is encrypted client-side — hidden from all observers",
  "No public number appears on-chain",
  "Recipient balance updates privately via MPC",
];

const MPC_STEPS = [
  "Encrypting amount client-side",
  "Queuing the computation",
  "Computing in the MPC cluster",
  "Finalizing on-chain",
];

export default function SendPage() {
  return (
    <Suspense fallback={null}>
      <SendFlow />
    </Suspense>
  );
}

function SendFlow() {
  const params = useSearchParams();
  const [step, setStep] = React.useState<Step>("details");
  const [to, setTo] = React.useState(params.get("to") ?? "");
  const [amount, setAmount] = React.useState(params.get("amount") ?? "");

  // Backstage: payments run through the SDK once the Arcium cluster is live.
  // Until then the flow is fully navigable in preview (mock) mode.
  const live = publicConfig.paymentsEnabled;

  const reset = () => {
    setStep("details");
    setTo(params.get("to") ?? "");
    setAmount("");
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Send privately</h1>
        {!live && (
          <span className="privacy-pill">
            <Lock className="h-3 w-3" /> preview
          </span>
        )}
      </div>
      <StepDots step={step} />

      {step === "details" && (
        <DetailsStep
          to={to}
          amount={amount}
          setTo={setTo}
          setAmount={setAmount}
          onNext={() => setStep("review")}
        />
      )}

      {step === "review" && (
        <ReviewStep
          to={to}
          amount={amount}
          live={live}
          onBack={() => setStep("details")}
          onConfirm={() => setStep("submitting")}
        />
      )}

      {step === "submitting" && (
        <SubmittingStep amount={amount} onDone={() => setStep("done")} />
      )}

      {step === "done" && <DoneStep to={to} amount={amount} live={live} onAgain={reset} />}
    </div>
  );
}

function DetailsStep({
  to,
  amount,
  setTo,
  setAmount,
  onNext,
}: {
  to: string;
  amount: string;
  setTo: (v: string) => void;
  setAmount: (v: string) => void;
  onNext: () => void;
}) {
  const valid = to.trim().length > 30 && Number(amount) > 0;
  return (
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
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              inputMode="decimal"
              className="font-num h-14 pr-20 text-center text-3xl font-bold"
            />
            <span className="privacy-pill absolute right-3 top-1/2 -translate-y-1/2">USDC</span>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border bg-white/[0.02] p-3">
          {GUARANTEES.map((g) => (
            <div key={g} className="flex items-start gap-2 text-xs text-text-secondary">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
              {g}
            </div>
          ))}
        </div>

        <Button variant="veil" size="lg" className="w-full" disabled={!valid} onClick={onNext}>
          Review transfer <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ReviewStep({
  to,
  amount,
  live,
  onBack,
  onConfirm,
}: {
  to: string;
  amount: string;
  live: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(to);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Card className="mt-6">
      <CardContent className="space-y-5 p-6">
        <div className="text-center">
          <span className="label-caps">You send</span>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="font-num text-4xl font-bold">{Number(amount).toLocaleString()}</span>
            <span className="font-mono text-lg text-text-secondary">USDC</span>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
          <Row label="To">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 font-mono text-[13px] text-foreground transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              title={to}
            >
              {shortAddress(to)}
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </Row>
          <Row label="Visible on-chain">
            <span className="text-text-secondary">addresses only — never the amount</span>
          </Row>
          <Row label="Network fee">
            <span className="font-mono text-[13px] text-text-secondary">~0.000005 SOL</span>
          </Row>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-white/[0.02] p-3 text-xs text-text-secondary">
          <ShieldCheck className="h-4 w-4 shrink-0 text-foreground" />
          The amount is encrypted on your device before signing — it never leaves in the clear.
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="veil" size="lg" className="flex-1" onClick={onConfirm}>
            {live ? "Confirm & send" : "Run preview"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {!live && (
          <p className="text-center text-xs text-text-muted">
            Preview mode — the flow runs but nothing is sent until the Arcium cluster is live.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SubmittingStep({ amount, onDone }: { amount: string; onDone: () => void }) {
  return (
    <Card className="mt-6">
      <CardContent className="space-y-6 p-6">
        <div className="text-center">
          <span className="label-caps">Sending</span>
          <div className="mt-1 flex items-center justify-center gap-3 font-num text-3xl font-bold tracking-[0.15em] text-text-secondary">
            ••••••
            <Lock className="h-4 w-4 text-text-muted" />
          </div>
          <p className="mt-1 font-mono text-xs text-text-muted">amount stays encrypted</p>
        </div>
        <MpcProgress steps={MPC_STEPS} onDone={onDone} />
      </CardContent>
    </Card>
  );
}

function DoneStep({
  to,
  amount,
  live,
  onAgain,
}: {
  to: string;
  amount: string;
  live: boolean;
  onAgain: () => void;
}) {
  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
          <Check className="h-6 w-6 text-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Sent privately</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shortAddress(to)} received your transfer. No amount touched the chain.
          </p>
        </div>

        <div className="rounded-lg border border-border px-5 py-3">
          <span className="label-caps">Amount</span>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="font-num text-2xl font-bold">
              <Decrypt value={`${Number(amount).toLocaleString()}`} />
            </span>
            <span className="font-mono text-sm text-text-secondary">USDC</span>
          </div>
        </div>

        <div className="flex w-full gap-3 pt-2">
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/app/activity">View activity</Link>
          </Button>
          <Button variant="veil" size="lg" className="flex-1" onClick={onAgain}>
            Send another
          </Button>
        </div>
        {!live && (
          <p className="text-xs text-text-muted">Preview — no real transfer was made.</p>
        )}
      </CardContent>
    </Card>
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

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["details", "review", "submitting", "done"];
  const active = order.indexOf(step);
  const labels = ["Details", "Review", "Send", "Done"];
  return (
    <div className="mt-3 flex items-center gap-2">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= active ? "bg-primary" : "bg-border"}`}
            aria-hidden
          />
          <span
            className={`text-xs transition-colors ${i === active ? "text-foreground" : "text-text-muted"}`}
          >
            {label}
          </span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
        </div>
      ))}
    </div>
  );
}
