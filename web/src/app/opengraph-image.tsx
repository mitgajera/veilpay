import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VeilPay — confidential payments on Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Monochrome branded OG card matching the landing aesthetic.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: 80,
          color: "#ededed",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>VeilPay</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            <span>Payments that</span>
            <span>nobody watches.</span>
          </div>
          <div style={{ fontSize: 30, color: "#9a9a9a", maxWidth: 900 }}>
            Confidential token payments on Solana, via Arcium MPC.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 22, color: "#5e5e5e", fontFamily: "monospace" }}>
          <span>Solana</span>
          <span>·</span>
          <span>Arcium MPC</span>
          <span>·</span>
          <span>Not anonymous — confidential</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
