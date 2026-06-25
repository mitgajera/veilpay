import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, DotGothic16 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
// Dotted display accent (LED dot-matrix) — display moments only, never body or amounts.
const dotGothic = DotGothic16({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dot",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veilpay.app";
const description =
  "Privacy-first SPL payments on Solana. Balances stay encrypted on-chain; amounts move privately through Arcium MPC. Not anonymous — confidential.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VeilPay | Confidential payments on Solana",
    template: "%s · VeilPay",
  },
  description,
  keywords: [
    "Solana",
    "confidential payments",
    "Arcium",
    "MPC",
    "privacy",
    "SPL token",
    "encrypted balance",
  ],
  authors: [{ name: "Mit Gajera" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "VeilPay",
    title: "VeilPay | Confidential payments on Solana",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "VeilPay | Confidential payments on Solana",
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${dotGothic.variable} min-h-screen antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
