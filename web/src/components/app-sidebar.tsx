"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Users,
  FileText,
  Settings,
} from "lucide-react";
import { cn, shortAddress } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

const sections = [
  {
    label: "Wallet",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/send", label: "Send", icon: Send },
      { href: "/app/deposit", label: "Deposit", icon: ArrowDownToLine },
      { href: "/app/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/app/activity", label: "Activity", icon: Receipt },
      { href: "/app/contacts", label: "Contacts", icon: Users },
      { href: "/app/requests", label: "Requests", icon: FileText },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="glass-panel hidden w-56 shrink-0 flex-col p-4 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-accent" />
        <span className="font-display text-lg font-semibold">VeilPay</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="label-caps mb-2 px-3">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                        active
                          ? "border-l-2 border-primary bg-elevated pl-[10px] text-foreground"
                          : "text-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="glass-card mt-4 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-glow-success" />
            <span className="label-caps">Connected</span>
          </div>
          <p className="mt-1.5 font-mono text-xs text-text-secondary">
            {shortAddress(user.address, 6)}
          </p>
        </div>
      )}
    </aside>
  );
}
