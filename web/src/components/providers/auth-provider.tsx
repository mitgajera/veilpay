"use client";

import * as React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useToast } from "@/components/ui/toast";

type AuthUser = { address: string; displayName?: string | null; avatarUrl?: string | null };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const toast = useToast();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [signingIn, setSigningIn] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = React.useCallback(async () => {
    if (!publicKey || !signMessage) {
      toast.error("Connect a wallet first");
      return;
    }
    const address = publicKey.toBase58();
    setSigningIn(true);
    try {
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error("Could not start sign-in");
      const { nonce, message } = await nonceRes.json();

      const signatureBytes = await signMessage(new TextEncoder().encode(message));
      const signature = bs58.encode(signatureBytes);

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message, signature, nonce }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Verification failed");
      }
      await refresh();
      toast.success("Signed in", "Welcome to VeilPay");
    } catch (e) {
      toast.error("Sign-in failed", e instanceof Error ? e.message : undefined);
    } finally {
      setSigningIn(false);
    }
  }, [publicKey, signMessage, refresh, toast]);

  const signOut = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    await disconnect().catch(() => {});
  }, [disconnect]);

  // If the wallet disconnects, drop the local user view (cookie cleared on logout).
  React.useEffect(() => {
    if (!connected && user) setUser(null);
  }, [connected, user]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, signingIn, signIn, signOut, refresh }),
    [user, loading, signingIn, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
