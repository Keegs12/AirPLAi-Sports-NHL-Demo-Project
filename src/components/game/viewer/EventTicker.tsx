"use client";

import { useEventsUpToNow } from "@/lib/useGameReplay";
import { useReplay } from "@/components/game/GameReplayProvider";
import { eventAbsT } from "@/lib/game-replay";
import { absToPeriodClock } from "@/lib/game-time";
import { teamTheme } from "@/lib/team-theme";
import type { GameEvent } from "@/lib/game-types";

function line(e: GameEvent): string {
  if (e.type === "goal") return `GOAL ${e.team} — ${e.scorer}${e.assists.length ? ` (${e.assists.join(", ")})` : " (unassisted)"}`;
  if (e.type === "penalty_shot") return `Penalty shot ${e.result} — ${e.shooter}`;
  if (e.type === "penalty") return `Penalty ${e.team} — ${e.infraction}`;
  if (e.type === "goalie_change") return `Goalie change — ${e.in} in`;
  return `${e.team} ${e.event.toLowerCase()} — ${e.shooter}`;
}

/** A compact, most-recent-first feed of notable events that have fired. */
export default function EventTicker() {
  const { seekToEvent } = useReplay();
  const fired = useEventsUpToNow();
  const notable = fired
    .filter((e) => e.type === "goal" || e.type === "goalie_change" || e.type === "penalty_shot" || e.type === "penalty")
    .slice()
    .reverse()
    .slice(0, 4);

  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 16px", overflowX: "auto", borderTop: "1px solid var(--line)", background: "rgba(9,13,21,0.5)" }}>
      {notable.length === 0 && <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Press play to start the replay…</span>}
      {notable.map((e) => {
        const pc = absToPeriodClock(eventAbsT(e));
        const color = e.type === "goal" ? teamTheme(e.team).primary : "var(--blue)";
        return (
          <button
            key={e.id}
            onClick={() => seekToEvent(e.id)}
            style={{ flex: "none", textAlign: "left", background: "var(--ice-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer" }}
          >
            <div className="mono" style={{ fontSize: 9.5, color: "var(--muted)" }}>{pc.label} {pc.clock}</div>
            <div style={{ fontSize: 12 }}>{line(e)}</div>
          </button>
        );
      })}
    </div>
  );
}
