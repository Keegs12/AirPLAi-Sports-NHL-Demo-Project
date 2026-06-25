"use client";

import { useCurrentEvent } from "@/lib/useGameReplay";
import { useReplay } from "@/components/game/GameReplayProvider";
import { teamTheme } from "@/lib/team-theme";

/**
 * The default "tape" when no public/game3.mp4 is present. Styled to read as a
 * broadcast feed coming off the (mocked) CV pipeline — honest to the brief's
 * "public data stands in for computer vision" framing.
 */
export default function BroadcastPlaceholder() {
  const { game, playing } = useReplay();
  const ev = useCurrentEvent();

  const caption =
    ev?.type === "goal"
      ? `GOAL · ${ev.team} — ${ev.scorer}${ev.detail ? ` · ${ev.detail}` : ""}`
      : ev?.type === "penalty_shot"
      ? `PENALTY SHOT (${ev.result}) · ${ev.shooter}`
      : ev?.type === "goalie_change"
      ? `GOALIE CHANGE · ${ev.in} in for ${(ev as any).out}`
      : ev?.type === "penalty"
      ? `PENALTY · ${ev.team} ${ev.player} — ${ev.infraction}`
      : ev?.type === "shot"
      ? `${ev.team} shot attempt · ${ev.shooter}`
      : "Opening faceoff";

  return (
    <div
      style={{
        position: "absolute", inset: 0, overflow: "hidden",
        background:
          "radial-gradient(120% 80% at 50% 0%, #16243c 0%, #0c1322 55%, #070b13 100%)",
        display: "grid", placeItems: "center",
      }}
    >
      {/* faint ice schematic */}
      <svg viewBox="0 0 200 100" width="92%" style={{ opacity: 0.12, position: "absolute" }} aria-hidden>
        <rect x="2" y="2" width="196" height="96" rx="24" fill="none" stroke="#5bc8ff" strokeWidth="0.6" />
        <line x1="100" y1="2" x2="100" y2="98" stroke="#cc3344" strokeWidth="0.6" />
        <line x1="66" y1="2" x2="66" y2="98" stroke="#3b6fd4" strokeWidth="0.6" />
        <line x1="134" y1="2" x2="134" y2="98" stroke="#3b6fd4" strokeWidth="0.6" />
        <circle cx="100" cy="50" r="11" fill="none" stroke="#5bc8ff" strokeWidth="0.6" />
      </svg>

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div
          className="mono"
          style={{ fontSize: 11, letterSpacing: "0.22em", color: "var(--blue)", textTransform: "uppercase" }}
        >
          ● CV pipeline feed {playing ? "· live" : "· paused"}
        </div>
        <div className="display" style={{ fontSize: 24, marginTop: 8, opacity: 0.9 }}>
          {game.meta.game}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          {teamTheme(game.meta.away).name} @ {teamTheme(game.meta.home).name} · {game.meta.venue}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 14, opacity: 0.7 }}>
          drop <span style={{ color: "var(--text)" }}>public/game3.mp4</span> to replace this with film
        </div>
      </div>

      {/* lower-third caption synced to the clock */}
      <div
        className="fade-in"
        key={ev?.id ?? "none"}
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "10px 16px",
          background: "linear-gradient(0deg, rgba(7,11,19,0.92), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 4, height: 16, background: ev ? teamTheme((ev as any).team ?? "").primary : "var(--blue)", borderRadius: 2 }} />
          <span className="mono" style={{ fontSize: 12 }}>{caption}</span>
        </div>
      </div>
    </div>
  );
}
