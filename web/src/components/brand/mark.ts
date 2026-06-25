/**
 * Shared geometry for the VeilMark "dithered coin" so the React component and
 * the downloadable SVG/PNG assets stay identical. Dots grow left→right (value
 * coming into focus), eased down near the rim.
 */
export type Dot = { x: number; y: number; r: number };

export function markDots(): Dot[] {
  const cx = 12;
  const cy = 12;
  const R = 10.5;
  const step = 2.7;
  const dots: Dot[] = [];
  for (let y = cx - R; y <= cx + R + 0.001; y += step) {
    for (let x = cx - R; x <= cx + R + 0.001; x += step) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > R) continue;
      const t = (x - (cx - R)) / (2 * R); // 0 at left, 1 at right
      const r = (0.34 + t * 1.12) * (1 - 0.18 * (d / R));
      dots.push({ x, y, r });
    }
  }
  return dots;
}

/** A standalone, self-contained mark SVG string (portable — no font, no currentColor). */
export function buildMarkSvg(opts?: { color?: string; bg?: string; framed?: boolean }): string {
  const color = opts?.color ?? "#F4F4F7";
  const frame = opts?.framed
    ? `<rect x="0.5" y="0.5" width="23" height="23" rx="6.5" fill="none" stroke="${color}" stroke-opacity="0.18"/>`
    : "";
  const bg = opts?.bg ? `<rect width="24" height="24" rx="6.5" fill="${opts.bg}"/>` : "";
  const circles = markDots()
    .map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(2)}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">${bg}${frame}<g fill="${color}">${circles}</g></svg>`;
}

/** The full lockup as a standalone SVG: mark + uppercase wordmark (references the brand font). */
export function buildLockupSvg(opts?: { color?: string; bg?: string }): string {
  const color = opts?.color ?? "#F4F4F7";
  const W = 240;
  const H = 48;
  const bg = opts?.bg ? `<rect width="${W}" height="${H}" fill="${opts.bg}"/>` : "";
  const circles = markDots()
    .map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(2)}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="${color}">${bg}<g transform="translate(8 12)" fill="${color}">${circles}</g><text x="48" y="31" font-family="'Space Grotesk', sans-serif" font-size="21" font-weight="500" letter-spacing="4.6" fill="${color}">VEILPAY</text></svg>`;
}
