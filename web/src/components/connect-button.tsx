"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { shortAddress } from "@/lib/utils";

/**
 * One control for the whole connect → SIWS → session lifecycle:
 *  - no wallet:      "Connect wallet" (opens adapter modal)
 *  - wallet, no auth: "Sign in" (SIWS)
 *  - authed:          address + sign out
 */
export function ConnectButton() {
  const { connected, publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { user, signIn, signOut, signingIn } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden rounded-md bg-secondary px-3 py-2 font-mono text-sm sm:inline">
          {shortAddress(user.address)}
        </span>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <Button variant="veil" onClick={signIn} disabled={signingIn}>
        {signingIn ? "Signing…" : "Sign in"}
      </Button>
    );
  }

  return (
    <Button variant="veil" onClick={() => setVisible(true)} disabled={connecting}>
      <Wallet className="h-4 w-4" />
      {connecting ? "Connecting…" : "Connect wallet"}
    </Button>
  );
}
