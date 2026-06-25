"use client";

import * as React from "react";
import { Plus, Copy, X, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/fetcher";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime, shortAddress } from "@/lib/utils";

type Req = {
  id: string;
  mint: string;
  amount: string | null;
  memo: string | null;
  status: string;
  createdAt: string;
};

const statusVariant: Record<string, "default" | "accent" | "secondary" | "destructive"> = {
  open: "default",
  paid: "accent",
  cancelled: "secondary",
  expired: "secondary",
};

export default function RequestsPage() {
  const toast = useToast();
  const [sent, setSent] = React.useState<Req[] | null>(null);
  const [received, setReceived] = React.useState<Req[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [mint, setMint] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    api<{ sent: Req[]; received: Req[] }>("/api/requests")
      .then((d) => {
        setSent(d.sent);
        setReceived(d.received);
      })
      .catch(() => {
        setSent([]);
        setReceived([]);
      });
  }, []);

  React.useEffect(load, [load]);

  const create = async () => {
    setSaving(true);
    try {
      await api("/api/requests", {
        method: "POST",
        body: JSON.stringify({ mint, amount: amount || undefined, memo: memo || undefined }),
      });
      toast.success("Request created");
      setOpen(false);
      setMint("");
      setAmount("");
      setMemo("");
      load();
    } catch (e) {
      toast.error("Could not create", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await api(`/api/requests/${id}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      toast.error("Could not cancel", e instanceof Error ? e.message : undefined);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/pay/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const renderList = (items: Req[] | null, mine: boolean) => {
    if (items === null) return <Skeleton className="h-24 w-full" />;
    if (items.length === 0)
      return (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {mine ? "You haven't created any requests." : "No requests addressed to you."}
        </p>
      );
    return (
      <ul className="divide-y divide-border">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{shortAddress(r.mint)}</span>
                <Badge variant={statusVariant[r.status] ?? "secondary"}>{r.status}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {r.amount ? `${r.amount} base units` : "any amount"}
                {r.memo ? ` · ${r.memo}` : ""} · {formatRelativeTime(r.createdAt)}
              </p>
            </div>
            {mine && (
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => copyLink(r.id)} aria-label="Copy link">
                  {copied === r.id ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                </Button>
                {r.status === "open" && (
                  <Button variant="ghost" size="icon" onClick={() => cancel(r.id)} aria-label="Cancel">
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Payment requests"
        description="Create a shareable link to get paid. The amount is a hint; transfers stay confidential."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="veil">
                <Plus className="h-4 w-4" /> New request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New payment request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="mint">Mint address</Label>
                  <Input id="mint" value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Token mint" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (base units, optional)</Label>
                  <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" inputMode="numeric" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (optional)</Label>
                  <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Invoice #42" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving || !mint} variant="veil">
                  {saving ? "Creating…" : "Create link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="sent">
            <TabsList>
              <TabsTrigger value="sent">Created</TabsTrigger>
              <TabsTrigger value="received">Addressed to me</TabsTrigger>
            </TabsList>
            <TabsContent value="sent">{renderList(sent, true)}</TabsContent>
            <TabsContent value="received">{renderList(received, false)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
