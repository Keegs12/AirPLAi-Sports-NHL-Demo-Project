"use client";

import { useState } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import { eventAbsT } from "@/lib/game-replay";
import { absToPeriodClock } from "@/lib/game-time";
import { teamTheme } from "@/lib/team-theme";
import type { GameEvent } from "@/lib/game-types";

const activePill: React.CSSProperties = { color: "var(--text)", borderColor: "var(--blue)", background: "rgba(91,200,255,0.08)" };
const PENALTY_AMBER = "#e0a64d";

/** Compact one-liner for the dense "All plays" shot rows. */
function compactDescribe(e: GameEvent): { head: string; sub?: string } {
  if (e.type === "shot")
    return { head: `${e.team} ${e.event.toLowerCase()} · ${e.shooter}`, sub: `${e.shotType.toLowerCase()} · ${(e.xG * 100).toFixed(0)}% xG` };
  // non-shot fallbacks (key plays normally render as rich cards instead)
  if (e.type === "goal") return { head: `GOAL · ${e.team} ${e.scorer}` };
  if (e.type === "penalty") return { head: `Penalty · ${e.team} ${e.player}`, sub: e.infraction };
  if (e.type === "penalty_shot") return { head: `Penalty shot (${e.result}) · ${e.shooter}` };
  return { head: `Goalie change · ${e.team}` };
}

export default function PlaysTab() {
  const { game, seekToEvent, t } = useReplay();
  // Auto-populated full-game log (like the pickleball demo): the complete play-by-
  // play is listed from the start, with the current play highlighted as the clock
  // moves. Clicking any play seeks the replay (and the video) to that moment.
  const [view, setView] = useState<"key" | "all">("key");

  const rows = game.events.filter((e) => (view === "all" ? true : e.type !== "shot")).slice().reverse();
  const numOf = (team: string, name: string) => game.boxscore[team]?.skaters.find((s) => s.name === name)?.number;
  const numFor = (e: GameEvent) =>
    e.type === "goal" ? numOf(e.team, e.scorer)
    : e.type === "penalty_shot" ? numOf(e.team, e.shooter)
    : e.type === "penalty" ? numOf(e.team, e.player)
    : undefined;

  return (
    <div style={{ paddingTop: 14 }}>
      <div className="toggle-row">
        <button className="pill" onClick={() => setView("key")} style={view === "key" ? activePill : undefined}>★ Key plays</button>
        <button className="pill" onClick={() => setView("all")} style={view === "all" ? activePill : undefined}>All plays</button>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)", alignSelf: "center", marginLeft: "auto" }}>
          {rows.length} {view === "key" ? "key plays" : "plays"}
        </span>
      </div>

      <div>
        {rows.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No plays yet — press play.</div>}
        {rows.map((e) =>
          // In "All plays" the dense shot attempts stay compact; the key plays
          // (goals, penalties, penalty shots, goalie changes) still render as the
          // rich cards so highlights pop out of the feed.
          view === "all" && e.type === "shot" ? (
            <CompactRow key={e.id} e={e} t={t} onSeek={() => seekToEvent(e.id)} />
          ) : (
            <KeyPlayRow key={e.id} e={e} t={t} num={numFor(e)} onSeek={() => seekToEvent(e.id)} />
          )
        )}
      </div>
    </div>
  );
}

/** Jersey-number "sweater" avatar in the team color. */
function Avatar({ team, num }: { team?: string; num?: number }) {
  const th = team ? teamTheme(team) : null;
  const dark = team === "VGK"; // gold sweater reads better with dark digits
  return (
    <span
      style={{
        width: 38, height: 38, flex: "none", borderRadius: "50%",
        background: th ? th.primary : "var(--ice-3)",
        boxShadow: "0 0 0 1px var(--line-2)",
        display: "grid", placeItems: "center", color: dark ? "#161616" : "#fff",
      }}
    >
      <span className="num" style={{ fontSize: num != null ? 16 : 12 }}>{num != null ? num : team ?? "•"}</span>
    </span>
  );
}

/** Emphasized highlight row: avatar · headline · detail · clock · play button. */
function KeyPlayRow({ e, t, num, onSeek }: { e: GameEvent; t: number; num?: number; onSeek: () => void }) {
  const pc = absToPeriodClock(eventAbsT(e));
  const team = (e as any).team as string | undefined;
  const th = team ? teamTheme(team) : null;
  const isCurrent = Math.abs(eventAbsT(e) - t) < 6;

  const v =
    e.type === "goal" ? { kicker: "GOAL", accent: th ? th.primary : "var(--blue)" }
    : e.type === "penalty" ? { kicker: "PENALTY", accent: PENALTY_AMBER }
    : e.type === "penalty_shot" ? { kicker: "PENALTY SHOT", accent: "var(--blue)" }
    : { kicker: "", accent: "var(--blue)" }; // goalie change

  const title =
    e.type === "goal" ? e.scorer
    : e.type === "penalty" ? e.player
    : e.type === "penalty_shot" ? e.shooter
    : e.type === "goalie_change" ? `Goalie change · ${e.team}`
    : "";
  const sub =
    e.type === "goal" ? (e.assists.length ? `assists: ${e.assists.join(", ")}` : "unassisted")
    : e.type === "penalty" ? `${e.infraction} · ${e.pim} min`
    : e.type === "penalty_shot" ? `penalty shot · ${e.result}`
    : e.type === "goalie_change" ? `${e.in} in for ${(e as any).out}`
    : "";
  const tag =
    e.type === "goal" ? `${e.strength} · ${(e.xG * 100).toFixed(0)}% xG${e.detail ? ` — ${e.detail}` : ""}`
    : e.type === "penalty" || e.type === "penalty_shot" ? e.detail ?? ""
    : "";

  return (
    <button
      onClick={onSeek}
      style={{
        display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", cursor: "pointer",
        background: isCurrent ? "rgba(91,200,255,0.08)" : "transparent",
        border: "none", borderBottom: "1px solid var(--line)", borderLeft: `3px solid ${v.accent}`,
        padding: "12px 14px",
      }}
    >
      <Avatar team={team} num={num} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {v.kicker && <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.16em", color: v.accent, fontWeight: 600 }}>{v.kicker}</span>}
          <span style={{ fontSize: 14.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
        {tag && <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tag}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7, flex: "none" }}>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>{pc.label} {pc.clock}</span>
        <span
          aria-hidden
          style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(91,200,255,0.12)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", color: "var(--blue)", fontSize: 11 }}
        >
          ▶
        </span>
      </div>
    </button>
  );
}

/** Dense one-line row for the shot attempts in the full "All plays" feed. */
function CompactRow({ e, t, onSeek }: { e: GameEvent; t: number; onSeek: () => void }) {
  const pc = absToPeriodClock(eventAbsT(e));
  const d = compactDescribe(e);
  const isCurrent = Math.abs(eventAbsT(e) - t) < 6;
  return (
    <button
      onClick={onSeek}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: "pointer",
        background: isCurrent ? "rgba(91,200,255,0.08)" : "transparent",
        border: "none", borderBottom: "1px solid var(--line)", borderLeft: "3px solid var(--line-2)",
        padding: "8px 13px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{d.head}</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted)", flex: "none" }}>{pc.label} {pc.clock}</span>
      </div>
      {d.sub && <div className="mono" style={{ fontSize: 10.5, color: "var(--line-2)", marginTop: 1 }}>{d.sub}</div>}
    </button>
  );
}
