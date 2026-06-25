"use client";

import { useState } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import ShotMap from "@/components/ShotMap";
import CvBadge from "@/components/CvBadge";
import Tip from "@/components/Tip";
import { GLOSSARY } from "@/lib/glossary";
import PlayerHeatmap from "./PlayerHeatmap";
import PlayerShootingNet from "./PlayerShootingNet";
import {
  gameSkater, seasonSkaterByName, playerShotsOnGoal, playerAdvanced,
  playerSeasonNetMap, playerSeasonAdvanced, playerSeasonGoals, fmtToi,
  type PlayerAdvanced,
} from "@/lib/game-stats";
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
      <div className="num" style={{ fontSize: 30, lineHeight: 1, marginTop: 4, color: color ?? "var(--text)" }}>{value}</div>
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

function Adv({ label, value, cv, title }: { label: string; value: string | number; cv?: boolean; title?: string }) {
  return (
    <div style={{ padding: "7px 9px", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 8 }}>
      <div className="kicker" style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}>
        {cv && <span style={{ color: "var(--blue)" }}>●</span>}<Label text={label} fallback={title} />
      </div>
      <div className="num" style={{ fontSize: 15, marginTop: 2 }}>{value}</div>
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

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: "1px solid var(--line)", alignItems: "baseline" }}>
      <span className="kicker" style={{ width: 66, flex: "none", fontSize: 9.5 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}
const V = ({ children }: { children: React.ReactNode }) => <span style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{children}</span>;

/** Advanced + skating + shot selection — shared by the game and season scopes. */
function AdvBlocks({ adv, distanceUnit }: { adv: PlayerAdvanced; distanceUnit: string }) {
  return (
    <>
      <SectionLabel note="● modeled from tracking">Advanced</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        <Adv label="ixG" value={adv.ixG} title="Individual expected goals" />
        <Adv label="xG/60" value={adv.xgPer60} />
        <Adv label="HD chances" value={adv.hdc} title="High-danger chances" />
        <Adv label="CF%" value={`${adv.cfPct}%`} cv title="On-ice Corsi-for %" />
        <Adv label="IPP" value={`${adv.ipp}%`} cv title="Individual point %" />
        <Adv label="xGF / xGA" value={`${adv.xGF} / ${adv.xGA}`} cv title="On-ice expected goals for / against" />
      </div>

      <SectionLabel cv>Skating speed</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        <Adv label="Top speed" value={`${adv.topSpeed} mph`} cv />
        <Adv label="Avg speed" value={`${adv.avgSpeed} mph`} cv />
        <Adv label={`Distance${distanceUnit === "season" ? " (season)" : ""}`} value={`${adv.distanceMi} mi`} cv />
      </div>

      {adv.shotMix.length > 0 && (
        <>
          <SectionLabel>Shot selection</SectionLabel>
          {(() => { const max = Math.max(...adv.shotMix.map((m) => m.n)); return adv.shotMix.map((m) => (
            <div key={m.type} style={{ display: "grid", gridTemplateColumns: "62px 1fr 26px", gap: 8, alignItems: "center", padding: "3px 0" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{m.type}</span>
              <div style={{ height: 7, background: "var(--ice-3)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(m.n / max) * 100}%`, height: "100%", background: "var(--blue)", borderRadius: 4 }} />
              </div>
              <span className="num" style={{ fontSize: 12, textAlign: "right" }}>{m.n}</span>
            </div>
          )); })()}
        </>
      )}
    </>
  );
}

export default function PlayerCard({ team, name }: { team: string; name: string }) {
  const { game } = useReplay();
  const [scope, setScope] = useState<"game" | "season">("game");
  const line = gameSkater(game, team, name);
  const season = seasonSkaterByName(name);
  const adv = playerAdvanced(game, team, name);
  const shots = playerShotsOnGoal(game, name); // on-goal only → matches box "S"
  const seasonNet = playerSeasonNetMap(game, name);
  const seasonAdv = playerSeasonAdvanced(game, name);
  const seasonGoals = playerSeasonGoals(game, name);
  const th = teamTheme(team);
  const last = name.split(" ").slice(-1)[0];

  return (
    <div style={{ padding: "4px 16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="num" style={{ fontSize: 30, color: th.primary }}>#{line?.number ?? "—"}</span>
        <div>
          <div className="display" style={{ fontSize: 22 }}>{name}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{th.name} · {line?.pos ?? "—"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="pill" onClick={() => setScope("game")} style={scope === "game" ? activePill : undefined}>This game</button>
          <button className="pill" onClick={() => setScope("season")} style={scope === "season" ? activePill : undefined}>Season</button>
        </div>
      </div>

      {scope === "game" ? (
        line && adv ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginTop: 14 }}>
              <Hero label="Goals" value={line.G} color={line.G > 0 ? th.primary : undefined} divider />
              <Hero label="Assists" value={line.A} divider />
              <Hero label="Points" value={line.P} color={line.P > 0 ? "var(--blue)" : undefined} divider />
              <Hero label="+/−" value={line.plusMinus > 0 ? `+${line.plusMinus}` : line.plusMinus} color={line.plusMinus > 0 ? "var(--good)" : line.plusMinus < 0 ? "var(--hot)" : undefined} />
            </div>

            <KeyLine items={[["Shots", line.S], ["S%", `${adv.shootingPct}%`], ["TOI", fmtToi(line.TOI)]]} />

            <AdvBlocks adv={adv} distanceUnit="game" />

            <div style={{ marginTop: 14 }}>
              <Group label="Ice time">
                ES <V>{fmtToi(line.ESTOI)}</V> · PP <V>{fmtToi(line.PPTOI)}</V> · SH <V>{fmtToi(line.SHTOI)}</V> · <V>{line.SHFT}</V> shifts
              </Group>
              <Group label="Two-way">
                Hits <V>{line.HT}</V> · Blocks <V>{line.BS}</V> · Takeaways <V>{line.TK}</V> · Giveaways <V>{line.GV}</V> · PIM <V>{line.PIM}</V>
              </Group>
              {line.FOW + line.FOL > 0 && (
                <Group label="Faceoffs"><V>{line.FOW}–{line.FOL}</V> · <V>{line.FOpct || "—"}%</V> won</Group>
              )}
            </div>

            <SectionLabel cv>Net placement · this game</SectionLabel>
            <PlayerShootingNet name={name} />
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              Where on the net {last} put their shots — hot = goals, cool = saved (glove / blocker / five-hole).
            </div>
            <SectionLabel cv>Average ice position</SectionLabel>
            <PlayerHeatmap name={name} pos={line.pos} />

            <div style={{ marginTop: 14 }}>
              <div className="kicker" style={{ paddingBottom: 4 }}>Shot locations · {shots.length} on goal</div>
              {shots.length ? <ShotMap shots={shots} /> : <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>No shots on goal.</div>}
            </div>

            <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>
              G/A/Shots/ixG/shot-mix are real &amp; replay-consistent · ● on-ice, skating &amp; positioning are tracking-modeled for the demo
            </div>
          </>
        ) : (
          <div style={{ color: "var(--muted)", marginTop: 14 }}>No game line for this player.</div>
        )
      ) : (
        <>
          {season ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginTop: 14 }}>
                <Hero label="Goals" value={season.I_F_goals} color={th.primary} divider />
                <Hero label="Assists" value={season.I_F_primaryAssists + season.I_F_secondaryAssists} divider />
                <Hero label="Points" value={season.I_F_points} color="var(--blue)" divider />
                <Hero label="GP" value={season.games_played} />
              </div>
              <KeyLine items={[["Shots", season.I_F_shotsOnGoal], ["S%", `${seasonAdv.shootingPct}%`], ["G−xG", `${season.goalsAboveExpected >= 0 ? "+" : ""}${season.goalsAboveExpected}`]]} />
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginTop: 14 }}>
                <Hero label="Goals" value={seasonNet.goals} color={th.primary} divider />
                <Hero label="Shots" value={seasonNet.shots} divider />
                <Hero label="S%" value={`${seasonAdv.shootingPct}%`} divider />
                <Hero label="GP" value={seasonNet.gp} />
              </div>
              <div className="mono" style={{ marginTop: 10, fontSize: 10.5, color: "var(--muted)", lineHeight: 1.6 }}>
                Season box-score line isn&apos;t in the demo sample for {name} — these are a modeled full-season projection.
              </div>
            </>
          )}

          <AdvBlocks adv={seasonAdv} distanceUnit="season" />

          <SectionLabel cv>Season shooting fingerprint · where they score</SectionLabel>
          <PlayerShootingNet name={name} zones={seasonNet.zones} />
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
            {seasonNet.goals}G on {seasonNet.shots} shots over {seasonNet.gp} games · hot = where they score.
          </div>

          <SectionLabel cv>Average ice position · season</SectionLabel>
          <PlayerHeatmap name={name} pos={line?.pos ?? "F"} />

          <SectionLabel cv>Goal locations · season</SectionLabel>
          <ShotMap shots={seasonGoals} />
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
            Where {last} scores from on the ice across the season — every goal placed and danger-colored.
          </div>
        </>
      )}
    </div>
  );
}

const activePill: React.CSSProperties = { color: "var(--text)", borderColor: "var(--blue)", background: "rgba(91,200,255,0.08)" };
