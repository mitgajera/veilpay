/**
 * Server + client config. Public values are prefixed NEXT_PUBLIC_.
 * The on-chain program id is fixed; everything else is environment-driven.
 */
import { VEILPAY_PROGRAM_ID } from "@veilpay/sdk";

export const PROGRAM_ID = VEILPAY_PROGRAM_ID;

export const publicConfig = {
  programId: PROGRAM_ID,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
  cluster: process.env.NEXT_PUBLIC_CLUSTER ?? "devnet",
  clusterOffset: Number(process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET ?? "1116522"),
  // Payments depend on a live Arcium cluster (#456). Flip on when deployed.
  paymentsEnabled: process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true",
  mockMode: process.env.NEXT_PUBLIC_MOCK_MODE !== "false",
} as const;

export type PublicConfig = typeof publicConfig;

/** Server-only secrets. Read lazily so the client bundle never trips on them. */
export const serverConfig = {
  databaseUrl: () => process.env.DATABASE_URL ?? "",
  jwtSecret: () => process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  heliusWebhookSecret: () => process.env.HELIUS_WEBHOOK_SECRET ?? "",
  vapidPublicKey: () => process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: () => process.env.VAPID_PRIVATE_KEY ?? "",
};
