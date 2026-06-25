import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Placeholder shown on payment-dependent screens while the MPC cluster is down. */
export function PaymentsPaused({ action }: { action: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{action} is paused</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {action} runs through the Arcium MPC cluster, which is currently offline (cluster #456).
          This screen lights up automatically once the cluster is live — no action needed. Your
          contacts, requests, and balances stay available meanwhile.
        </p>
      </CardContent>
    </Card>
  );
}
