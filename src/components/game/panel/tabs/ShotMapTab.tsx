"use client";

import { useMemo, useState } from "react";
import ShotMap from "@/components/ShotMap";
import { useShotsUpToNow, useActiveGoalies } from "@/lib/useGameReplay";
import { useReplay } from "@/components/game/GameReplayProvider";
import { summarizeShots } from "@/lib/stats";
import { teamTheme } from "@/lib/team-theme";
import GoalieSaveMap from "@/components/game/GoalieSaveMap";
import CvBadge from "@/components/CvBadge";
import { useCards } from "@/components/game/cards/CardContext";

type TeamFilter = "both" | string;

export default function ShotMapTab() {
  const { game } = useReplay();
  const { openGoalie } = useCards();
  const shots = useShotsUpToNow();
  const goalies = useActiveGoalies();
  const { away, home } = game.meta;
  const [surface, setSurface] = useState<"ice" | "net">("ice");
  const [team, setTeam] = useState<TeamFilter>("both");
  const [hd, setHd] = useState(false);

  const teamShots = useMemo(
    () => (team === "both" ? shots : shots.filter((s) => s.team === team)),
    [shots, team]
  );
  const summary = useMemo(() => summarizeShots(teamShots), [teamShots]);

  return (
    <div>
      <div className="toggle-row" style={{ paddingTop: 14 }}>
        <button className="pill" onClick={() => setSurface("ice")} style={surface === "ice" ? activePill : undefined}>Ice</button>
        <button className="pill" onClick={() => setSurface("net")} style={surface === "net" ? activePill : undefined}>Net (goalie zones)</button>
      </div>

      {surface === "ice" ? (
        <>
          <div className="toggle-row" style={{ paddingTop: 0 }}>
            <button className="pill" onClick={() => setTeam("both")} style={team === "both" ? activePill : undefined}>Both</button>
            <button className="pill" onClick={() => setTeam(away)} style={team === away ? teamPill(away) : undefined}>{away}</button>
            <button className="pill" onClick={() => setTeam(home)} style={team === home ? teamPill(home) : undefined}>{home}</button>
            <button className="pill" onClick={() => setHd((v) => !v)} style={hd ? activePill : undefined}>High-danger</button>
          </div>
          {teamShots.length === 0 && (
            <div className="mono" style={{ margin: "0 16px", padding: "8px 12px", borderRadius: 10, background: "rgba(91,200,255,0.06)", border: "1px solid var(--line)", fontSize: 11.5, color: "var(--muted)" }}>
              <span style={{ color: "var(--blue)" }}>▶</span> Shots fill the map live as the game runs — press play.
            </div>
          )}
          <ShotMap shots={teamShots} highDangerOnly={hd} />
          <div className="rink-legend">
            <span>low xG</span>
            <span className="legend-bar" />
            <span>high xG</span>
            <span style={{ marginLeft: "auto" }} className="mono">
              {summary.shots} shots · {summary.goals} G · {summary.xGoals} xG · {summary.highDangerPct}% HD
            </span>
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "4px 16px 14px" }}>
          {[away, home].map((tm) => {
            const g = goalieFacing(game, tm);
            return (
              <button key={tm} onClick={() => openGoalie(tm, g)} style={{ textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                  {tm} net · {g} <span style={{ color: "var(--blue)" }}>↗ card</span>
                </div>
                <GoalieSaveMap goalie={g} />
              </button>
            );
          })}
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <CvBadge />
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
              Where each goalie was beaten (glove / blocker / five-hole). No clean public feed exists for net location — this is the gap AirPLAi fills.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const activePill: React.CSSProperties = { color: "var(--text)", borderColor: "var(--blue)" };
function teamPill(abbr: string): React.CSSProperties {
  return { color: "var(--text)", borderColor: teamTheme(abbr).primary };
}
// the goalie whose net the Net view should show for a team column is that team's
// own goalie (the one who FACED the opponent's shots).
function goalieFacing(game: ReturnType<typeof useReplay>["game"], team: string): string {
  // for the static net view we show the starter's full-game zone map; the goalie
  // card handles per-goalie detail.
  const gs = game.boxscore[team]?.goalies ?? [];
  // prefer the goalie with the most shots faced (the primary)
  return gs.slice().sort((a, b) => b.SA - a.SA)[0]?.name ?? "";
}
