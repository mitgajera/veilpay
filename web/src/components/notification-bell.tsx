"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/fetcher";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

/** Bell with unread count + a dropdown list, fed live by the SSE stream. */
export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notif[]>([]);
  const [unread, setUnread] = React.useState(0);
  const toast = useToast();

  const load = React.useCallback(async () => {
    try {
      const data = await api<{ notifications: Notif[]; unread: number }>("/api/notifications");
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* not signed in */
    }
  }, []);

  React.useEffect(() => {
    load();
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("notification", (e) => {
      const n = JSON.parse((e as MessageEvent).data);
      setItems((prev) => [{ ...n, readAt: null }, ...prev].slice(0, 50));
      setUnread((u) => u + 1);
      toast.info(n.title, n.body ?? undefined);
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, [load, toast]);

  const markRead = async () => {
    if (unread === 0) return;
    await api("/api/notifications/read", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markRead();
        }}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-b border-border px-4 py-3 last:border-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
