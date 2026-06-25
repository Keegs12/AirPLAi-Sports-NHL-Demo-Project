"use client";

import { toSvg, VIEW, lines } from "@/lib/rink";

// Stable per-player jitter so the map is the same every render (no runtime RNG).
function seeded(key: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * CV-generated "average ice position" heatmap — a believable density of where a
 * player lives in the offensive zone. Forwards cluster net-front/slot, D hold the
 * points. Pure mock (no public feed gives this), exactly the kind of positioning
 * surface AirPLAi's tracking produces.
 */
export default function PlayerHeatmap({ name, pos }: { name: string; pos: string }) {
  const rnd = seeded("pos:" + name);
  const isD = pos === "D";
  const base: Array<[number, number, number]> = isD
    ? [[64, -19, 1.1], [64, 19, 1.1], [56, 0, 0.8], [73, -9, 0.7], [79, 7, 0.6]]
    : [[83, -4, 1.1], [77, 9, 0.9], [70, -13, 0.8], [86, 2, 1.0], [62, 0, 0.7], [75, 15, 0.7]];
  const blobs = base.map(([x, y, w]) => {
    const jx = (rnd() - 0.5) * 7;
    const jy = (rnd() - 0.5) * 9;
    const jw = 0.8 + rnd() * 0.6;
    const p = toSvg(x + jx, y + jy);
    return { px: p.px, py: p.py, r: (9 + w * 7) * jw };
  });

  const W = VIEW.w;
  const H = 56; // crop to the attacking zone

  return (
    <svg viewBox={`-3 -3 ${W + 6} ${H + 6}`} width="100%" style={{ display: "block" }} role="img" aria-label={`${name} positioning heatmap`}>
      <defs>
        <radialGradient id="heatblob">
          <stop offset="0%" stopColor="rgba(255,77,94,0.55)" />
          <stop offset="55%" stopColor="rgba(250,170,60,0.26)" />
          <stop offset="100%" stopColor="rgba(250,170,60,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="3" fill="#0c1626" stroke="var(--line)" strokeWidth="0.5" />
      <line x1="0" y1={lines.blueLinePy} x2={W} y2={lines.blueLinePy} stroke="#3b6fd4" strokeWidth="0.8" opacity="0.65" />
      <line x1="6" y1={lines.goalLinePy} x2={W - 6} y2={lines.goalLinePy} stroke="#c8424f" strokeWidth="0.5" opacity="0.7" />
      {(() => { const net = toSvg(89, 0); return <rect x={net.px - 3} y={net.py - 1.2} width="6" height="2.4" fill="none" stroke="var(--muted)" strokeWidth="0.5" />; })()}
      {blobs.map((b, i) => <circle key={i} cx={b.px} cy={b.py} r={b.r} fill="url(#heatblob)" />)}
    </svg>
  );
}
