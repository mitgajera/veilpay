import { PageHeader } from "@/components/page-header";
import { PaymentsPaused } from "@/components/payments-paused";

export default function WithdrawPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Withdraw" description="Off-ramp tokens from the vault — released only if your hidden balance covers it." />
      <PaymentsPaused action="Withdraw" />
    </div>
  );
}
