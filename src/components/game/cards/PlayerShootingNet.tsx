"use client";

import { useReplay } from "@/components/game/GameReplayProvider";
import { LAYOUT } from "@/components/game/GoalieSaveMap";
import { playerNetMap, type NetZone } from "@/lib/game-stats";

type Zone = { zone: NetZone; shots: number; goals: number };

/**
 * Net-zone grid (CV-generated): which part of the net a shooter targets and beats
 * goalies in. Hot = goals scored there, cool = shots that didn't beat the goalie.
 * Pass pre-aggregated `zones` (e.g. a season fingerprint) or let it derive the
 * single-game map from the player's shots.
 */
export default function PlayerShootingNet({ name, zones: provided }: { name: string; zones?: Zone[] }) {
  const { game } = useReplay();
  const zones = provided ?? playerNetMap(game, name);
  const totalShots = zones.reduce((s, z) => s + z.shots, 0);
  if (totalShots === 0) return <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>No shots on net yet.</div>;

  const maxGoals = Math.max(1, ...zones.map((z) => z.goals));
  const maxShots = Math.max(1, ...zones.map((z) => z.shots));
  const W = 100, H = 72;

  return (
    <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} width="100%" role="img" aria-label={`${name} shooting net map`}>
      <rect x="0" y="0" width={W} height={H} rx="2" fill="#0c1626" stroke="var(--line-2)" strokeWidth="1" />
      {zones.map((z) => {
        const L = LAYOUT[z.zone];
        const x = L.x * W, y = L.y * H, w = L.w * W, h = L.h * H;
        const fill =
          z.goals > 0
            ? `rgba(255,77,94,${0.2 + 0.55 * (z.goals / maxGoals)})`     // scored here → hot
            : z.shots > 0
            ? `rgba(91,200,255,${0.06 + 0.16 * (z.shots / maxShots)})`   // aimed here → cool
            : "rgba(255,255,255,0.02)";
        return (
          <g key={z.zone}>
            <rect x={x + 0.6} y={y + 0.6} width={w - 1.2} height={h - 1.2} rx="1.5" fill={fill} stroke="var(--line)" strokeWidth="0.4">
              <title>{`${L.label}: ${z.goals}G on ${z.shots} shots`}</title>
            </rect>
            <text x={x + w / 2} y={y + h / 2 - 1} textAnchor="middle" fontSize="5" fontFamily="var(--mono)" fill="var(--muted)">{L.label}</text>
            <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fontSize="6.5" fontFamily="var(--display)" fill={z.goals > 0 ? "#fff" : "var(--muted)"}>
              {z.goals > 0 ? `${z.goals}G` : `${z.shots}`}
            </text>
          </g>
        );
      })}
      <rect x="0" y="0" width={W} height={H} rx="2" fill="none" stroke="#c8424f" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}
