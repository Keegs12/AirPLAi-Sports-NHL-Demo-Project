"use client";

import { useRef } from "react";
import { useReplay, RATES } from "@/components/game/GameReplayProvider";
import { eventAbsT } from "@/lib/game-replay";
import { periodBoundaries, periodLabel, fmtClock, REG_PERIOD, segmentOffset } from "@/lib/game-time";
import { teamTheme } from "@/lib/team-theme";
import type { GameEvent } from "@/lib/game-types";

function tickColor(e: GameEvent): string {
  if (e.type === "goal") return teamTheme(e.team).primary;
  if (e.type === "penalty_shot") return "#facc15";
  if (e.type === "goalie_change") return "#5bc8ff";
  return "var(--muted)";
}

export default function Scrubber() {
  const { game, t, duration, playing, toggle, rate, setRate, seek, seekToEvent } = useReplay();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pct = (x: number) => `${(x / duration) * 100}%`;

  const notable = game.events.filter(
    (e) => e.type === "goal" || e.type === "goalie_change" || e.type === "penalty_shot"
  );
  const bounds = periodBoundaries(game.meta.periods).filter((b) => b.startT < duration);

  function onTrackClick(ev: React.MouseEvent) {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    seek(((ev.clientX - r.left) / r.width) * duration);
  }

  // "Jump to the moment" — the burst and the winner sell the demo live.
  const winner = game.events.find((e) => e.type === "goal" && (e as any).gameWinner);
  const burstStart = game.events.find((e) => e.id === "g3-07"); // start of the 39s comeback
  const chips = [
    { label: "↦ Comeback (P3)", id: burstStart?.id },
    { label: "↦ 2OT winner", id: winner?.id },
  ].filter((c) => c.id);

  return (
    <div style={{ padding: "10px 16px 12px", background: "rgba(9,13,21,0.66)", borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="num"
          style={{
            width: 36, height: 36, flex: "none", borderRadius: "50%", cursor: "pointer",
            background: "var(--blue-deep)", color: "#fff", border: "none", fontSize: 15,
          }}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        {/* timeline track */}
        <div
          ref={trackRef}
          onClick={onTrackClick}
          style={{ position: "relative", flex: 1, height: 30, cursor: "pointer" }}
        >
          {/* base rail */}
          <div style={{ position: "absolute", top: 13, left: 0, right: 0, height: 4, borderRadius: 4, background: "var(--ice-3)" }} />
          {/* played portion */}
          <div style={{ position: "absolute", top: 13, left: 0, width: pct(t), height: 4, borderRadius: 4, background: "var(--blue)" }} />
          {/* period dividers */}
          {bounds.map((b) =>
            b.startT === 0 ? null : (
              <div key={b.period} style={{ position: "absolute", top: 7, left: pct(b.startT), width: 1, height: 16, background: "var(--line-2)" }} />
            )
          )}
          {/* event ticks */}
          {notable.map((e) => {
            const left = pct(eventAbsT(e));
            const isGoal = e.type === "goal";
            return (
              <div
                key={e.id}
                title={tickTitle(e)}
                onClick={(ev) => { ev.stopPropagation(); seekToEvent(e.id); }}
                style={{
                  position: "absolute", top: isGoal ? 4 : 8, left, transform: "translateX(-50%)",
                  width: isGoal ? 3 : 7, height: isGoal ? 22 : 7,
                  borderRadius: isGoal ? 1.5 : "50%",
                  background: tickColor(e), cursor: "pointer",
                  border: isGoal ? "none" : "1px solid rgba(0,0,0,0.4)",
                }}
              />
            );
          })}
          {/* playhead */}
          <div style={{ position: "absolute", top: 2, left: pct(t), transform: "translateX(-50%)", width: 2, height: 26, background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.7)", pointerEvents: "none" }} />
        </div>

        {/* rate */}
        <div style={{ display: "flex", gap: 4, flex: "none" }}>
          {RATES.map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className="mono"
              style={{
                fontSize: 11, padding: "4px 7px", borderRadius: 7, cursor: "pointer",
                background: r === rate ? "var(--blue-deep)" : "transparent",
                color: r === rate ? "#fff" : "var(--muted)",
                border: "1px solid var(--line-2)",
              }}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>

      {/* jump chips */}
      <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
        {chips.map((c) => (
          <button key={c.id} className="pill" onClick={() => seekToEvent(c.id!)}>{c.label}</button>
        ))}
      </div>
    </div>
  );
}

function tickTitle(e: GameEvent): string {
  const off = segmentOffset(e.period);
  const remaining = Math.max(0, REG_PERIOD - (eventAbsT(e) - off));
  const when = `${periodLabel(e.period)} ${fmtClock(remaining)}`;
  if (e.type === "goal") return `${when} — GOAL ${e.team} ${e.scorer}`;
  if (e.type === "penalty_shot") return `${when} — penalty shot (${e.result}) ${e.shooter}`;
  if (e.type === "goalie_change") return `${when} — goalie change: ${e.in} in`;
  return when;
}
