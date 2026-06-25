"use client";

import { Fragment } from "react";
import { useScore, useActiveGoalies } from "@/lib/useGameReplay";
import { useReplay } from "@/components/game/GameReplayProvider";
import { eventAbsT } from "@/lib/game-replay";
import { absToPeriodClock, periodLabel } from "@/lib/game-time";
import { teamTheme } from "@/lib/team-theme";
import GameClock from "./GameClock";

function TeamBlock({ abbr, score, align }: { abbr: string; score: number; align: "left" | "right" }) {
  const th = teamTheme(abbr);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      <span style={{ width: 6, height: 30, borderRadius: 3, background: th.primary, boxShadow: `0 0 12px ${th.primary}66` }} />
      <span className="display" style={{ fontSize: 17, letterSpacing: "0.06em" }}>{abbr}</span>
      <span className="num" style={{ fontSize: 30, minWidth: 26, textAlign: "center" }}>{score}</span>
    </div>
  );
}

/** Broadcast-style score bug: away · score · clock · score · home + line score. */
export default function ScoreBug() {
  const { game } = useReplay();
  const score = useScore();
  const goalies = useActiveGoalies();
  const { away, home } = game.meta;

  return (
    <div style={{ background: "rgba(9,13,21,0.66)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, padding: "10px 16px 8px" }}>
        <div style={{ justifySelf: "start" }}>
          <TeamBlock abbr={away} score={score[away] ?? 0} align="left" />
          <div className="mono" style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 2 }}>G: {goalies[away]}</div>
        </div>
        <GameClock />
        <div style={{ justifySelf: "end", textAlign: "right" }}>
          <TeamBlock abbr={home} score={score[home] ?? 0} align="right" />
          <div className="mono" style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 2 }}>G: {goalies[home]}</div>
        </div>
      </div>
      <LineScore />
    </div>
  );
}

/** Goals-by-period table (1·2·3·OT·… · Total) — the classic line score. */
function LineScore() {
  const { game, t } = useReplay();
  const score = useScore();
  const { away, home } = game.meta;
  const curPeriod = absToPeriodClock(t).period;
  // Reveal OT columns only once they're reached (no spoilers; standard format).
  const periods = game.meta.periods.filter((p) => p <= Math.max(3, curPeriod));
  const goals = (team: string, p: number) =>
    game.events.filter((e) => e.type === "goal" && e.team === team && e.period === p && eventAbsT(e) <= t).length;

  const cols = `42px repeat(${periods.length}, minmax(20px, 1fr)) 34px`;
  const head: React.CSSProperties = { textAlign: "center", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" };
  const cell: React.CSSProperties = { textAlign: "center", fontFamily: "var(--display)", fontVariantNumeric: "tabular-nums", fontSize: 13 };

  return (
    <div style={{ padding: "0 16px 8px" }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", rowGap: 1, columnGap: 4, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
        <span />
        {periods.map((p) => <span key={p} style={head}>{periodLabel(p)}</span>)}
        <span style={{ ...head, color: "var(--blue)" }}>T</span>

        {[away, home].map((team) => (
          <Fragment key={team}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: teamTheme(team).primary, flex: "none" }} />
              <span className="mono" style={{ fontSize: 11 }}>{team}</span>
            </span>
            {periods.map((p) => {
              const g = goals(team, p);
              return <span key={p} style={{ ...cell, color: g ? "var(--text)" : "var(--muted)" }}>{g}</span>;
            })}
            <span style={{ ...cell, fontSize: 14, color: teamTheme(team).primary }}>{score[team] ?? 0}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
