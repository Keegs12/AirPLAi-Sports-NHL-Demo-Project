"use client";

import { useReplay } from "@/components/game/GameReplayProvider";
import type { GoalieZone } from "@/lib/game-types";

// Net-front zones laid out as the shooter sees them. Glove left, blocker right,
// five-hole low-center. This is the flagship CV-only surface — which PART of the
// net a goalie was beaten in is exactly what public feeds never provide.
export const LAYOUT: Record<GoalieZone["zone"], { x: number; y: number; w: number; h: number; label: string }> = {
  "glove-high": { x: 0, y: 0, w: 0.5, h: 0.55, label: "Glove ↑" },
  "blocker-high": { x: 0.5, y: 0, w: 0.5, h: 0.55, label: "Blocker ↑" },
  "glove-low": { x: 0, y: 0.55, w: 0.38, h: 0.45, label: "Glove ↓" },
  "five-hole": { x: 0.38, y: 0.55, w: 0.24, h: 0.45, label: "5-hole" },
  "blocker-low": { x: 0.62, y: 0.55, w: 0.38, h: 0.45, label: "Blocker ↓" },
};

function zoneColor(ga: number, maxGa: number): string {
  if (ga <= 0) return "rgba(56,189,248,0.10)"; // cool = held
  const f = maxGa > 0 ? ga / maxGa : 0;
  return `rgba(255,77,94,${0.18 + 0.5 * f})`; // hotter = beaten more
}

export default function GoalieSaveMap({ goalie }: { goalie: string }) {
  const { game } = useReplay();
  const g = game.goalieZones[goalie];
  if (!g) return <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>No net data</div>;
  const maxGa = Math.max(1, ...g.zones.map((z) => z.ga));
  const W = 100, H = 72;

  return (
    <div>
      <svg viewBox={`-2 -2 ${W + 4} ${H + 18}`} width="100%" role="img" aria-label={`${goalie} net-zone save map`}>
        {/* goal frame */}
        <rect x="0" y="0" width={W} height={H} rx="2" fill="#0c1626" stroke="var(--line-2)" strokeWidth="1" />
        {g.zones.map((z) => {
          const L = LAYOUT[z.zone];
          const x = L.x * W, y = L.y * H, w = L.w * W, h = L.h * H;
          return (
            <g key={z.zone}>
              <rect x={x + 0.6} y={y + 0.6} width={w - 1.2} height={h - 1.2} rx="1.5" fill={zoneColor(z.ga, maxGa)} stroke="var(--line)" strokeWidth="0.4">
                <title>{`${L.label}: ${z.sv}/${z.sa} saved · ${z.ga} GA`}</title>
              </rect>
              <text x={x + w / 2} y={y + h / 2 - 1} textAnchor="middle" fontSize="5" fontFamily="var(--mono)" fill="var(--muted)">{L.label}</text>
              <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fontSize="6.5" fontFamily="var(--display)" fill={z.ga > 0 ? "#fff" : "var(--muted)"}>
                {z.ga > 0 ? `${z.ga} GA` : `${z.sv}/${z.sa}`}
              </text>
            </g>
          );
        })}
        {/* posts + crossbar accent */}
        <rect x="0" y="0" width={W} height={H} rx="2" fill="none" stroke="#c8424f" strokeWidth="0.8" opacity="0.5" />
      </svg>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
        {g.SV}/{g.SA} saves · {(g.SVpct * 100).toFixed(1)}% · GSAx {g.GSAx >= 0 ? "+" : ""}{g.GSAx}
      </div>
    </div>
  );
}
