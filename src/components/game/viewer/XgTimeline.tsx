"use client";

import { useMemo } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import { eventAbsT } from "@/lib/game-replay";
import { teamTheme } from "@/lib/team-theme";
import type { GameEvent } from "@/lib/game-types";

// Cumulative-xG curve for both teams across the whole game — the "pressure" line.
// It draws the story at a glance: Vegas's early xG wall, then Carolina's surge.
// The playhead shows where the replay is; goal dots punctuate the curve.
function cumulativePoints(events: GameEvent[], team: string): Array<{ t: number; xg: number }> {
  const pts = [{ t: 0, xg: 0 }];
  let acc = 0;
  for (const e of events) {
    if (e.team !== team) continue;
    const xg = e.type === "goal" || e.type === "shot" ? e.xG : e.type === "penalty_shot" ? e.xG ?? 0 : 0;
    if (!xg) continue;
    acc += xg;
    pts.push({ t: eventAbsT(e), xg: acc });
  }
  return pts;
}

export default function XgTimeline() {
  const { game, t, duration, seek } = useReplay();
  const { away, home } = game.meta;

  const { paths, maxXg, goals } = useMemo(() => {
    const sorted = [...game.events].sort((a, b) => eventAbsT(a) - eventAbsT(b));
    const a = cumulativePoints(sorted, away);
    const h = cumulativePoints(sorted, home);
    const maxXg = Math.max(1, a.at(-1)?.xg ?? 0, h.at(-1)?.xg ?? 0);
    // extend each curve flat to the end so both span the full width
    a.push({ t: duration, xg: a.at(-1)?.xg ?? 0 });
    h.push({ t: duration, xg: h.at(-1)?.xg ?? 0 });
    const goals = sorted.filter((e) => e.type === "goal");
    return { paths: { [away]: a, [home]: h }, maxXg, goals };
  }, [game, duration, away, home]);

  const W = 100, H = 26;
  const px = (tt: number) => (tt / duration) * W;
  const py = (xg: number) => H - (xg / maxXg) * H;
  const toPath = (pts: Array<{ t: number; xg: number }>) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.t).toFixed(2)},${py(p.xg).toFixed(2)}`).join(" ");

  return (
    <div style={{ padding: "8px 16px 4px", background: "rgba(9,13,21,0.5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span className="kicker" style={{ fontSize: 9 }}>cumulative xG · pressure</span>
        <span className="mono" style={{ fontSize: 9.5 }}>
          <span style={{ color: teamTheme(away).primary }}>{away}</span> · <span style={{ color: teamTheme(home).primary }}>{home}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="46"
        preserveAspectRatio="none"
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          seek(((e.clientX - r.left) / r.width) * duration);
        }}
        style={{ cursor: "pointer", display: "block" }}
      >
        <path d={toPath(paths[away])} fill="none" stroke={teamTheme(away).primary} strokeWidth="0.8" />
        <path d={toPath(paths[home])} fill="none" stroke={teamTheme(home).primary} strokeWidth="0.8" />
        {goals.map((g) => (
          <circle key={g.id} cx={px(eventAbsT(g))} cy={py(cumAt(paths[(g as any).team], eventAbsT(g)))} r="0.9" fill={teamTheme((g as any).team).primary} />
        ))}
        {/* playhead */}
        <line x1={px(t)} y1="0" x2={px(t)} y2={H} stroke="#fff" strokeWidth="0.4" opacity="0.8" />
      </svg>
    </div>
  );
}

function cumAt(pts: Array<{ t: number; xg: number }>, tt: number): number {
  let v = 0;
  for (const p of pts) { if (p.t <= tt) v = p.xg; else break; }
  return v;
}
