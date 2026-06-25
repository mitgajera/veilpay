"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/fetcher";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/providers/auth-provider";

type Prefs = {
  transferReceived: boolean;
  depositConfirmed: boolean;
  requestPaid: boolean;
  auditGranted: boolean;
  webPushEnabled: boolean;
};

const prefLabels: { key: keyof Prefs; label: string }[] = [
  { key: "transferReceived", label: "Transfer received" },
  { key: "depositConfirmed", label: "Deposit confirmed" },
  { key: "requestPaid", label: "Payment request paid" },
  { key: "auditGranted", label: "Audit access granted" },
];

export default function SettingsPage() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = React.useState(user?.displayName ?? "");
  const [prefs, setPrefs] = React.useState<Prefs | null>(null);

  React.useEffect(() => {
    api<{ preferences: Partial<Prefs> }>("/api/notifications/preferences")
      .then((d) =>
        setPrefs({
          transferReceived: d.preferences.transferReceived ?? true,
          depositConfirmed: d.preferences.depositConfirmed ?? true,
          requestPaid: d.preferences.requestPaid ?? true,
          auditGranted: d.preferences.auditGranted ?? true,
          webPushEnabled: d.preferences.webPushEnabled ?? false,
        }),
      )
      .catch(() => {});
  }, []);

  const saveProfile = async () => {
    try {
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ displayName }) });
      await refresh();
      toast.success("Profile saved");
    } catch (e) {
      toast.error("Could not save", e instanceof Error ? e.message : undefined);
    }
  };

  const togglePref = async (key: keyof Prefs, value: boolean) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    try {
      await api("/api/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      toast.error("Could not update preference");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Profile and notification preferences." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wallet address</Label>
            <Input value={user?.address ?? ""} readOnly className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={saveProfile} variant="veil">
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!prefs ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {prefLabels.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Switch
                    id={key}
                    checked={prefs[key]}
                    onCheckedChange={(v) => togglePref(key, v)}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <Label htmlFor="webPushEnabled">Browser push notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts even when the tab is closed.</p>
                </div>
                <Switch
                  id="webPushEnabled"
                  checked={prefs.webPushEnabled}
                  onCheckedChange={(v) => togglePref("webPushEnabled", v)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
