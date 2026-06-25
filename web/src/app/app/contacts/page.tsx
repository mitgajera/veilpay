"use client";

import * as React from "react";
import { Plus, Trash2, Send } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { shortAddress } from "@/lib/utils";

type Contact = { id: string; label: string; address: string };

export default function ContactsPage() {
  const toast = useToast();
  const [contacts, setContacts] = React.useState<Contact[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    api<{ contacts: Contact[] }>("/api/contacts")
      .then((d) => setContacts(d.contacts))
      .catch(() => setContacts([]));
  }, []);

  React.useEffect(load, [load]);

  const add = async () => {
    setSaving(true);
    try {
      await api("/api/contacts", { method: "POST", body: JSON.stringify({ label, address }) });
      toast.success("Contact added");
      setOpen(false);
      setLabel("");
      setAddress("");
      load();
    } catch (e) {
      toast.error("Could not add", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/contacts/${id}`, { method: "DELETE" });
      setContacts((c) => c?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      toast.error("Could not remove", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Contacts"
        description="Your private address book — labels stay on your account."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="veil">
                <Plus className="h-4 w-4" /> Add contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Alice" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Solana address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="7xKX…"
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={add} disabled={saving || !label || !address} variant="veil">
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          {contacts === null ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No contacts yet. Add one to send to them faster.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{shortAddress(c.address, 6)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label="Send">
                      <Link href={`/app/send?to=${c.address}`}>
                        <Send className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
