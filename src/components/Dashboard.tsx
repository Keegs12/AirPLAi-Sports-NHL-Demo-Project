"use client";

import { useMemo, useState } from "react";
import type { Team, Skater, Shot, ShotType, Meta } from "@/lib/types";
import { summarizeShots, shotTypeBreakdown, topSkaters } from "@/lib/stats";
import type { PlaiAnswer } from "@/lib/query-engine";
import ShotMap from "./ShotMap";
import PlaiChat from "./PlaiChat";
import { KpiRow, ShotTypeBars, Leaderboard } from "./Panels";

interface Props {
  teams: Team[];
  skaters: Skater[];
  shots: Shot[];
  meta: Meta;
}

type Filter = { shotType?: ShotType; highDangerOnly?: boolean };

const LB_METRICS: Array<{ key: keyof Skater; label: string; short: string }> = [
  { key: "I_F_points", label: "Points", short: "PTS" },
  { key: "I_F_goals", label: "Goals", short: "G" },
  { key: "I_F_xGoals", label: "Expected goals", short: "xG" },
  { key: "goalsAboveExpected", label: "Finishing", short: "G–xG" },
];

const SHOT_TYPES: ShotType[] = ["WRIST", "SNAP", "SLAP", "BACKHAND", "TIP", "WRAP"];

export default function Dashboard({ teams, skaters, shots, meta }: Props) {
  const ranked = useMemo(() => [...teams].sort((a, b) => b.points - a.points), [teams]);
  const [teamAbbr, setTeamAbbr] = useState(ranked[0].team);
  const [filter, setFilter] = useState<Filter>({});
  const [lbMetric, setLbMetric] = useState<keyof Skater>("goalsAboveExpected");

  const team = teams.find((t) => t.team === teamAbbr)!;
  const teamShots = useMemo(() => shots.filter((s) => s.team === teamAbbr), [shots, teamAbbr]);
  const summary = useMemo(() => summarizeShots(teamShots), [teamShots]);
  const typeRows = useMemo(() => shotTypeBreakdown(teamShots), [teamShots]);

  const lbRows = useMemo(() => {
    const metricForSort = lbMetric as Parameters<typeof topSkaters>[1];
    return topSkaters(skaters, metricForSort, 10).map((s) => ({
      name: s.name,
      team: s.team,
      value: s[lbMetric] as number,
    }));
  }, [skaters, lbMetric]);

  function handlePlai(a: PlaiAnswer) {
    if (a.viz?.kind === "filter_shots") {
      if (a.viz.team) setTeamAbbr(a.viz.team);
      setFilter({ shotType: a.viz.shotType, highDangerOnly: a.viz.highDangerOnly });
    } else {
      setFilter({});
    }
  }

  const lbLabel = LB_METRICS.find((m) => m.key === lbMetric)!.short;

  return (
    <>
      {/* hero header */}
      <header style={{ padding: "30px 0 18px" }} className="fade-in">
        <div className="kicker">Domain expansion · Hockey</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
          <h1 className="display" style={{ fontSize: 40, margin: 0, maxWidth: 640 }}>
            See the danger in every shift.
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="chip">{meta.season}</span>
            <select className="select" value={teamAbbr} onChange={(e) => { setTeamAbbr(e.target.value); setFilter({}); }} aria-label="Select team">
              {ranked.map((t) => (
                <option key={t.team} value={t.team}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ color: "var(--muted)", maxWidth: 680, marginTop: 10 }}>
          Every shot from {team.name}&rsquo;s season, placed on the ice and weighted by expected goals —
          the same hot-zone intelligence AirPLAi extracts from basketball film, now reading the slot.
        </p>
      </header>

      <div style={{ marginBottom: 16 }}>
        <KpiRow summary={summary} points={team.points} />
      </div>

      {/* hero grid: shot map + PLAiChat */}
      <div className="grid-main" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{team.name} · shot map</span>
            <span className="chip">{filter.highDangerOnly ? "high-danger" : filter.shotType ? filter.shotType.toLowerCase() : "all shots"}</span>
          </div>
          <div className="toggle-row" style={{ paddingTop: 12 }}>
            <button className="pill" onClick={() => setFilter({})}
              style={!filter.shotType && !filter.highDangerOnly ? activePill : undefined}>All</button>
            <button className="pill" onClick={() => setFilter({ highDangerOnly: true })}
              style={filter.highDangerOnly ? activePill : undefined}>High-danger</button>
            {SHOT_TYPES.map((t) => (
              <button key={t} className="pill" onClick={() => setFilter({ shotType: t })}
                style={filter.shotType === t ? activePill : undefined}>{t.toLowerCase()}</button>
            ))}
          </div>
          <ShotMap shots={teamShots} shotType={filter.shotType} highDangerOnly={filter.highDangerOnly} />
          <div className="rink-legend">
            <span>Low xG</span>
            <span className="legend-bar" />
            <span>High xG</span>
            <span style={{ marginLeft: "auto" }}>○ shot &nbsp; ● goal &nbsp; ▢ home-plate slot</span>
          </div>
        </div>

        <PlaiChat onResult={handlePlai} />
      </div>

      {/* leaderboard + shot types */}
      <div className="grid-main">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">League leaders</span>
            <div style={{ display: "flex", gap: 6 }}>
              {LB_METRICS.map((m) => (
                <button key={String(m.key)} className="pill" onClick={() => setLbMetric(m.key)}
                  style={lbMetric === m.key ? activePill : undefined}>{m.label}</button>
              ))}
            </div>
          </div>
          <div style={{ paddingTop: 6 }}>
            <Leaderboard rows={lbRows} metricLabel={lbLabel} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Shot profile · {team.name}</span>
            <span className="chip">by type</span>
          </div>
          <div style={{ paddingTop: 12 }}>
            <ShotTypeBars rows={typeRows} />
          </div>
        </div>
      </div>

      <div className="wrap" style={{ padding: 0 }}>
        <div className="foot">
          <strong style={{ color: "var(--text)" }}>About this demo.</strong> {meta.source} Built as an AirPLAi
          domain-expansion concept: AirPLAi&rsquo;s computer-vision pipeline would produce this shot-and-tracking
          layer directly from game film; here it is reconstructed from public season data so the experience is
          fully reproducible without any CV. {meta.counts.shots.toLocaleString()} shot events · {meta.counts.skaters} skaters · {meta.counts.teams} teams.
        </div>
      </div>
    </>
  );
}

const activePill: React.CSSProperties = {
  color: "var(--text)",
  borderColor: "var(--blue)",
  background: "rgba(91,200,255,0.10)",
};
