import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon: the VeilMark "dithered coin" — white halftone on black, matching the
// monochrome brand. Dots grow left→right, eased down near the rim.
export default function Icon() {
  const cx = 16;
  const cy = 16;
  const R = 13;
  const step = 3.4;
  const dots: { x: number; y: number; r: number }[] = [];
  for (let y = cx - R; y <= cx + R; y += step) {
    for (let x = cx - R; x <= cx + R; x += step) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > R) continue;
      const t = (x - (cx - R)) / (2 * R);
      const r = (0.5 + t * 1.5) * (1 - 0.18 * (d / R));
      dots.push({ x, y, r });
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          background: "#000000",
          borderRadius: 7,
        }}
      >
        {dots.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - p.r,
              top: p.y - p.r,
              width: p.r * 2,
              height: p.r * 2,
              borderRadius: p.r,
              background: "#ffffff",
              display: "flex",
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
