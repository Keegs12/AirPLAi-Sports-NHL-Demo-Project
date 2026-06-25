"use client";

import { useTrackingFull } from "@/lib/useGameReplay";
import { useReplay } from "@/components/game/GameReplayProvider";
import { toSvgFull, fullLines, fullFaceoffSpots, VIEW_FULL } from "@/lib/rink";
import { teamTheme } from "@/lib/team-theme";

const { w: W, h: H, cornerR: R } = VIEW_FULL;
const CY = H / 2;

/** A net + crease drawn at one goal line. `side` = +1 (right end) or -1 (left). */
function Goal({ px, side }: { px: number; side: 1 | -1 }) {
  const netDepth = 3.5;
  const half = 3; // net mouth = 6 ft
  const creaseR = 6;
  return (
    <g>
      {/* crease, bulging toward center ice */}
      <path
        d={`M ${px} ${CY - creaseR} A ${creaseR} ${creaseR} 0 0 ${side === 1 ? 0 : 1} ${px} ${CY + creaseR} Z`}
        fill="rgba(91,200,255,0.10)"
        stroke="#3b6fd4"
        strokeWidth="0.4"
        opacity="0.8"
      />
      {/* net, sitting behind the goal line */}
      <rect
        x={side === 1 ? px : px - netDepth}
        y={CY - half}
        width={netDepth}
        height={half * 2}
        rx="0.6"
        fill="rgba(255,255,255,0.06)"
        stroke="var(--muted)"
        strokeWidth="0.5"
      />
    </g>
  );
}

/**
 * The animated-rink alternative to the video tape: a full 5-on-5 reconstruction
 * driven by the (synthesized) tracking frames, interpolated by the replay clock.
 * Laid out the way NHL.com shows a live game — the whole sheet horizontal with a
 * net at each end. Frames arrive already in absolute full-rink coords (home
 * attacks right, away left, goalies pinned in their creases), interpolated so
 * the skaters travel the length of the ice between possessions. No real
 * player-tracking data exists for this game, so this is clearly labeled
 * CV-generated.
 */
export default function RinkReplaySurface() {
  const snap = useTrackingFull();
  const { game } = useReplay();
  const spots = fullFaceoffSpots();

  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #0f1b30, #070b13)", display: "grid", placeItems: "center", padding: 12 }}>
      <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Full-sheet 5-on-5 rink reconstruction">
        {/* ice surface */}
        <rect x="0" y="0" width={W} height={H} rx={R} fill="#0c1626" stroke="var(--line-2)" strokeWidth="0.6" />

        {/* center red line + center faceoff circle */}
        <line x1={fullLines.centerX} y1="0" x2={fullLines.centerX} y2={H} stroke="#c8424f" strokeWidth="1" opacity="0.85" />
        <circle cx={fullLines.centerX} cy={CY} r="15" fill="none" stroke="#3b6fd4" strokeWidth="0.4" opacity="0.5" />
        <circle cx={fullLines.centerX} cy={CY} r="1.2" fill="#c8424f" />

        {/* blue lines */}
        {fullLines.blueX.map((x, i) => (
          <line key={i} x1={x} y1="0" x2={x} y2={H} stroke="#3b6fd4" strokeWidth="1" opacity="0.8" />
        ))}

        {/* goal lines (kept short of the rounded boards) */}
        {fullLines.goalX.map((x, i) => (
          <line key={i} x1={x} y1="6" x2={x} y2={H - 6} stroke="#c8424f" strokeWidth="0.6" opacity="0.8" />
        ))}

        {/* faceoff spots: end-zone circles + neutral-zone dots */}
        {spots.map((s, i) => (
          <g key={i}>
            {s.circle && <circle cx={s.px} cy={s.py} r="15" fill="none" stroke="#3b6fd4" strokeWidth="0.4" opacity="0.45" />}
            <circle cx={s.px} cy={s.py} r="1.1" fill="#c8424f" opacity="0.8" />
          </g>
        ))}

        {/* nets + creases at both ends */}
        <Goal px={fullLines.goalX[0]} side={-1} />
        <Goal px={fullLines.goalX[1]} side={1} />

        {snap && (
          <>
            {/* players (already in absolute full-rink coords) */}
            {snap.players.map((p, i) => {
              const { px, py } = toSvgFull(p.x, p.y);
              const th = teamTheme(p.team);
              const isG = p.pos === "G";
              const r = isG ? 2.5 : 3;
              return (
                <g key={`${p.team}-${p.n}-${i}`}>
                  <circle cx={px} cy={py} r={r} fill={th.primary} fillOpacity={isG ? 0.7 : 0.92} stroke="#0a0e16" strokeWidth="0.5" />
                  <text x={px} y={py + 1.3} textAnchor="middle" fontSize="3" fontFamily="var(--mono)" fill={p.team === "VGK" ? "#1a1a1a" : "#fff"} fontWeight="600">
                    {p.n}
                  </text>
                </g>
              );
            })}
            {/* puck */}
            {(() => { const { px, py } = toSvgFull(snap.puck.x, snap.puck.y); return (
              <g>
                <circle cx={px} cy={py} r="2.4" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
                <circle cx={px} cy={py} r="1.1" fill="#fff" />
              </g>
            ); })()}
          </>
        )}
      </svg>

      <div className="mono" style={{ position: "absolute", top: 10, left: 14, fontSize: 9.5, letterSpacing: "0.16em", color: "var(--blue)", textTransform: "uppercase" }}>
        ● CV-generated tracking
      </div>
      <div className="mono" style={{ position: "absolute", bottom: 10, left: 14, fontSize: 9.5, color: "var(--muted)" }}>
        5-on-5 reconstruction · {game.meta.away} vs {game.meta.home}
      </div>
    </div>
  );
}
