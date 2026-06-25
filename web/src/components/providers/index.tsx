"use client";

import { ThemeProvider } from "next-themes";
import { SolanaWalletProvider } from "./wallet-provider";
import { AuthProvider } from "./auth-provider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ToastProvider>
        <SolanaWalletProvider>
          <AuthProvider>{children}</AuthProvider>
        </SolanaWalletProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
