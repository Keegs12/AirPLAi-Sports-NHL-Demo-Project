"use client";

import { useMemo, useState } from "react";
import type { Shot, ShotType } from "@/lib/types";
import { toSvg, homePlatePath, faceoffDots, lines, VIEW } from "@/lib/rink";
import { xgColor, xgRadius } from "@/lib/colors";

interface Props {
  shots: Shot[];
  shotType?: ShotType;
  highDangerOnly?: boolean;
}

export default function ShotMap({ shots, shotType, highDangerOnly }: Props) {
  const [hover, setHover] = useState<Shot | null>(null);

  const filtered = useMemo(
    () =>
      shots
        .filter((s) => (shotType ? s.shotType === shotType : true))
        .filter((s) => (highDangerOnly ? s.highDanger === 1 : true))
        // draw highest-xG last so dangerous chances sit on top
        .sort((a, b) => a.xGoal - b.xGoal),
    [shots, shotType, highDangerOnly]
  );

  const dots = faceoffDots();

  return (
    <div style={{ position: "relative", padding: "4px 16px 8px" }}>
      {/* crop just past the blue line so the offensive zone fills the frame
          (the deep neutral zone is empty and only makes the action look cramped) */}
      <svg viewBox={`-3 -3 ${VIEW.w + 6} 88`} width="100%" role="img"
        aria-label="Half-rink shot map colored by expected goals">
        {/* ice surface (half rink, rounded end boards at top) */}
        <path
          d={`M0,${VIEW.cornerR} Q0,0 ${VIEW.cornerR},0 H${VIEW.w - VIEW.cornerR}
             Q${VIEW.w},0 ${VIEW.w},${VIEW.cornerR} V${VIEW.h} H0 Z`}
          fill="#0f1828"
          stroke="var(--line-2)"
          strokeWidth="0.5"
        />

        {/* blue line */}
        <line x1="0" y1={lines.blueLinePy} x2={VIEW.w} y2={lines.blueLinePy}
          stroke="#3b6fd4" strokeWidth="1.1" opacity="0.85" />
        {/* goal line */}
        <line x1="6" y1={lines.goalLinePy} x2={VIEW.w - 6} y2={lines.goalLinePy}
          stroke="#c8424f" strokeWidth="0.7" opacity="0.8" />

        {/* high-danger home plate */}
        <polygon points={homePlatePath()} fill="rgba(255,77,94,0.10)"
          stroke="rgba(255,77,94,0.45)" strokeWidth="0.4" strokeDasharray="1.4 1.2" />

        {/* crease + net */}
        {(() => {
          const net = toSvg(89, 0);
          const top = toSvg(89, 4), bot = toSvg(89, -4);
          return (
            <g>
              <path d={`M${top.px},${top.py} A6,6 0 0 1 ${bot.px},${bot.py}`}
                fill="rgba(91,200,255,0.16)" stroke="rgba(91,200,255,0.5)" strokeWidth="0.4" />
              <rect x={net.px - 3} y={net.py - 1.2} width="6" height="2.4" rx="0.5"
                fill="none" stroke="var(--muted)" strokeWidth="0.5" />
            </g>
          );
        })()}

        {/* faceoff dots */}
        {dots.map((d, i) => (
          <g key={i}>
            <circle cx={d.px} cy={d.py} r="7.5" fill="none" stroke="#3b6fd4" strokeWidth="0.4" opacity="0.5" />
            <circle cx={d.px} cy={d.py} r="1.1" fill="#c8424f" opacity="0.8" />
          </g>
        ))}

        {/* shots */}
        {filtered.map((s, i) => {
          const { px, py } = toSvg(s.xCordAdjusted, s.yCordAdjusted);
          const isGoal = s.goal === 1;
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={xgRadius(s.xGoal)}
              fill={xgColor(s.xGoal)}
              fillOpacity={isGoal ? 0.95 : 0.55}
              stroke={isGoal ? "#fff" : "none"}
              strokeWidth={isGoal ? 0.6 : 0}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <title>
                {`${s.shooterName} — ${s.shotType.toLowerCase()} ${isGoal ? "GOAL" : s.event.toLowerCase()} · ${(
                  s.xGoal * 100
                ).toFixed(0)}% xG · ${s.shotDistance}ft`}
              </title>
            </circle>
          );
        })}
      </svg>

      {hover && (
        <div
          style={{
            position: "absolute", top: 10, right: 22, pointerEvents: "none",
            background: "var(--ice-2)", border: "1px solid var(--line-2)",
            borderRadius: 10, padding: "8px 11px", fontSize: 12.5, maxWidth: 210,
          }}
        >
          <div style={{ fontWeight: 600 }}>{hover.shooterName}</div>
          <div style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11, marginTop: 2 }}>
            {hover.shotType.toLowerCase()} · {hover.goal ? "GOAL" : hover.event.toLowerCase()} ·{" "}
            {(hover.xGoal * 100).toFixed(0)}% xG · {hover.shotDistance}ft
          </div>
        </div>
      )}
    </div>
  );
}
