"use client";

import { useState } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import GoalieSaveMap from "@/components/game/GoalieSaveMap";
import ShotMap from "@/components/ShotMap";
import CvBadge from "@/components/CvBadge";
import Tip from "@/components/Tip";
import { GLOSSARY } from "@/lib/glossary";
import PlayerShootingNet from "./PlayerShootingNet";
import { gameGoalie, goalieAdvanced, goalieShotsFaced, goalieSeasonNetMap, goalieSeasonAdvanced, goalieSeasonShotsFaced, teamOfPlayer, fmtToi } from "@/lib/game-stats";
import { teamTheme } from "@/lib/team-theme";

/** Wrap a stat label in a hover tooltip when the glossary defines it. */
function Label({ text, fallback }: { text: string; fallback?: string }) {
  const tip = GLOSSARY[text] ?? fallback;
  return tip ? <Tip text={tip}>{text}</Tip> : <>{text}</>;
}

function Hero({ label, value, color, divider }: { label: string; value: string | number; color?: string; divider?: boolean }) {
  return (
    <div style={{ padding: "12px 6px", textAlign: "center", borderRight: divider ? "1px solid var(--line)" : "none" }}>
      <div className="kicker" style={{ fontSize: 9 }}><Label text={label} /></div>
      <div className="num" style={{ fontSize: 28, lineHeight: 1, marginTop: 4, color: color ?? "var(--text)" }}>{value}</div>
    </div>
  );
}

function Adv({ label, value, cv, color, title }: { label: string; value: string | number; cv?: boolean; color?: string; title?: string }) {
  return (
    <div style={{ padding: "7px 9px", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 8 }}>
      <div className="kicker" style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}>
        {cv && <span style={{ color: "var(--blue)" }}>●</span>}<Label text={label} fallback={title} />
      </div>
      <div className="num" style={{ fontSize: 15, marginTop: 2, color: color ?? "var(--text)" }}>{value}</div>
    </div>
  );
}

function KeyLine({ items }: { items: Array<[string, string | number]> }) {
  return (
    <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
      {items.map(([l, v]) => (
        <span key={l} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="kicker" style={{ fontSize: 9.5 }}><Label text={l} /></span>
          <span className="num" style={{ fontSize: 16 }}>{v}</span>
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children, note, cv }: { children: React.ReactNode; note?: string; cv?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 16, marginBottom: 7 }}>
      <span className="kicker">{children}</span>
      {cv ? <CvBadge /> : note ? <span className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>{note}</span> : null}
    </div>
  );
}

const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
const activePill: React.CSSProperties = { color: "var(--text)", borderColor: "var(--blue)", background: "rgba(91,200,255,0.08)" };

export default function GoalieCard({ name }: { name: string }) {
  const { game } = useReplay();
  const [scope, setScope] = useState<"game" | "season">("game");
  const g = gameGoalie(game, name);
  const adv = goalieAdvanced(game, name);
  const seasonNet = goalieSeasonNetMap(game, name);
  const seasonAdv = goalieSeasonAdvanced(game, name);
  const seasonFaced = goalieSeasonShotsFaced(game, name);
  const team = teamOfPlayer(game, name);
  const th = teamTheme(team ?? "");
  const faced = goalieShotsFaced(game, name);
  const last = name.split(" ").slice(-1)[0];

  if (!g || !adv) return <div style={{ padding: 20, color: "var(--muted)" }}>No goalie data for {name}.</div>;

  const topLeak = seasonNet ? [...seasonNet.zones].sort((a, b) => b.goals - a.goals)[0] : null;

  return (
    <div style={{ padding: "4px 16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="num" style={{ fontSize: 30, color: th.primary }}>#{g.number}</span>
        <div>
          <div className="display" style={{ fontSize: 22 }}>{name}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{th.name} · Goaltender</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="pill" onClick={() => setScope("game")} style={scope === "game" ? activePill : undefined}>This game</button>
          <button className="pill" onClick={() => setScope("season")} style={scope === "season" ? activePill : undefined}>Season</button>
        </div>
      </div>

      {scope === "game" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginTop: 14 }}>
            <Hero label="SV%" value={(g.SVpct * 100).toFixed(1)} divider />
            <Hero label="Saves" value={g.SV} divider />
            <Hero label="GA" value={g.GA} color={g.GA >= 4 ? "var(--hot)" : undefined} divider />
            <Hero label="GSAx" value={sign(g.GSAx)} color={g.GSAx >= 0 ? "var(--good)" : "var(--hot)"} />
          </div>

          <KeyLine items={[["Shots against", g.SA], ["xG faced", g.xGFaced], ["TOI", fmtToi(g.TOI)]]} />

          <SectionLabel note="● modeled from tracking">Advanced · this game</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
            <Adv label="xG/60 faced" value={adv.xgPer60} title="Expected goals faced per 60" />
            <Adv label="SV% vs exp" value={`${sign(adv.dSvPct)}%`} color={adv.dSvPct >= 0 ? "var(--good)" : "var(--hot)"} title="Save % above expected" />
            <Adv label="xG saved" value={`${sign(adv.gsaxPctOfXg)}%`} color={adv.gsaxPctOfXg >= 0 ? "var(--good)" : "var(--hot)"} title="% of expected goals saved above average" />
            <Adv label="Unblocked SV%" value={`${adv.unblockedSvPct}%`} cv title="Fenwick save % (unblocked shots)" />
            <Adv label="HD SV%" value={`${adv.hdSvPct}%`} cv title="High-danger save %" />
            <Adv label="Rebound ctrl" value={`${adv.reboundCtrlPct}%`} cv title="Share of saves controlled / frozen" />
          </div>

          <SectionLabel cv>Net-zone save map · where they got beat</SectionLabel>
          <GoalieSaveMap goalie={name} />
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
            Which part of the net (glove / blocker / five-hole) the goalie was beaten in — no public feed provides this; it is exactly the gap AirPLAi fills.
          </div>

          <SectionLabel cv>Shots faced · location &amp; danger</SectionLabel>
          {faced.length ? <ShotMap shots={faced} /> : <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>No shots faced yet.</div>}
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
            All {g.SA} shots on goal AirPLAi tracked against {last} this game, colored by danger (xG).
          </div>
        </>
      ) : (
        seasonNet && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginTop: 14 }}>
              <Hero label="GP" value={seasonNet.gp} divider />
              <Hero label="SV%" value={((seasonNet.svPct ?? 0) * 100).toFixed(1)} divider />
              <Hero label="GSAx" value={sign(seasonNet.gsax ?? 0)} color={(seasonNet.gsax ?? 0) >= 0 ? "var(--good)" : "var(--hot)"} divider />
              <Hero label="GA" value={seasonNet.goals} />
            </div>

            <KeyLine items={[["Shots faced", seasonNet.shots], ["Saves", seasonNet.shots - seasonNet.goals]]} />

            {seasonAdv && (
              <>
                <SectionLabel note="● modeled from tracking">Advanced · season</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                  <Adv label="xG/60 faced" value={seasonAdv.xgPer60} />
                  <Adv label="SV% vs exp" value={`${sign(seasonAdv.dSvPct)}%`} color={seasonAdv.dSvPct >= 0 ? "var(--good)" : "var(--hot)"} title="Save % above expected" />
                  <Adv label="xG saved" value={`${sign(seasonAdv.gsaxPctOfXg)}%`} color={seasonAdv.gsaxPctOfXg >= 0 ? "var(--good)" : "var(--hot)"} title="% of expected goals saved above average" />
                  <Adv label="Unblocked SV%" value={`${seasonAdv.unblockedSvPct}%`} cv title="Fenwick save % (unblocked shots)" />
                  <Adv label="HD SV%" value={`${seasonAdv.hdSvPct}%`} cv title="High-danger save %" />
                  <Adv label="Rebound ctrl" value={`${seasonAdv.reboundCtrlPct}%`} cv title="Rebound control" />
                </div>
              </>
            )}

            {/* the moat: where this goalie leaks over a full season */}
            <SectionLabel cv>Season leak map · where they get beat</SectionLabel>
            <PlayerShootingNet name={name} zones={seasonNet.zones} />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
              {seasonNet.goals} GA on {seasonNet.shots} shots over {seasonNet.gp} games · hot = most-beaten zone
              {topLeak && topLeak.goals > 0 ? ` (${topLeak.zone.replace("-", " ")})` : ""}.
            </div>

            <SectionLabel cv>Shots faced · season</SectionLabel>
            <ShotMap shots={seasonFaced} />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              A representative season of shots faced by {last}, by location &amp; danger.
            </div>

            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 12 }}>
              ● Modeled full-season aggregate, biased by this game&apos;s tendencies. With real tracking this is built from every shot of every start.
            </div>
          </>
        )
      )}
    </div>
  );
}
