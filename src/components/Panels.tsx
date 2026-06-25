"use client";

import type { TeamShotSummary } from "@/lib/stats";
import { xgColor } from "@/lib/colors";
import type { ShotType } from "@/lib/types";

export function KpiRow({ summary, points }: { summary: TeamShotSummary; points: number }) {
  const fin = summary.finishing;
  return (
    <div className="kpis">
      <div className="kpi panel">
        <div className="label">Expected goals</div>
        <div className="value num">{summary.xGoals}</div>
        <div className="sub">{summary.shots} tracked shots</div>
      </div>
      <div className="kpi panel">
        <div className="label">Finishing</div>
        <div className={`value num ${fin >= 0 ? "pos" : "neg"}`}>
          {fin >= 0 ? "+" : ""}
          {fin}
        </div>
        <div className="sub">goals vs expected</div>
      </div>
      <div className="kpi panel">
        <div className="label">High-danger</div>
        <div className="value num">{summary.highDangerPct}%</div>
        <div className="sub">{summary.highDangerGoals} goals from the slot</div>
      </div>
      <div className="kpi panel">
        <div className="label">Standings pts</div>
        <div className="value num">{points}</div>
        <div className="sub">{summary.shootingPct}% shooting</div>
      </div>
    </div>
  );
}

export function ShotTypeBars({
  rows,
}: {
  rows: Array<{ type: ShotType; shots: number; goals: number; xGoals: number; shootingPct: number }>;
}) {
  const max = Math.max(...rows.map((r) => r.shots), 1);
  return (
    <div style={{ paddingBottom: 10 }}>
      {rows.map((r) => (
        <div className="bar-row" key={r.type}>
          <div className="bar-label">{r.type.toLowerCase()}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(100 * r.shots) / max}%`,
                background: xgColor(r.xGoals / Math.max(r.shots, 1)),
              }}
            />
          </div>
          <div className="bar-val">
            {r.goals}G · {r.shootingPct}%
          </div>
        </div>
      ))}
    </div>
  );
}

export function Leaderboard({
  rows,
  metricLabel,
}: {
  rows: Array<{ name: string; team: string; value: number }>;
  metricLabel: string;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: 28 }}>#</th>
          <th>Skater</th>
          <th>Team</th>
          <th style={{ textAlign: "right" }}>{metricLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name}>
            <td className="mono" style={{ color: "var(--muted)" }}>
              {i + 1}
            </td>
            <td>{r.name}</td>
            <td className="mono" style={{ color: "var(--muted)" }}>
              {r.team}
            </td>
            <td className="tdnum">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
