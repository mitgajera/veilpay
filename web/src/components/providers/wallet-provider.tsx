"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { publicConfig } from "@/lib/config";

import "@solana/wallet-adapter-react-ui/styles.css";

// Wallet-Standard wallets (Phantom, Backpack, etc.) auto-register and show as
// "Installed". We additionally list these so users without them still get
// options in the modal. We import each adapter directly rather than via the
// `wallet-adapter-wallets` barrel, which would drag in the WalletConnect →
// @reown/appkit → viem/ox tree.
export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={publicConfig.rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
