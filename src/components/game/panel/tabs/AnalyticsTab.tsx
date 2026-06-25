"use client";

import { useMemo } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import { useCards } from "@/components/game/cards/CardContext";
import CvBadge from "@/components/CvBadge";
import { teamAggregate, corsiSplit, momentumSeries, possessionByPeriod, specialTeams, ppFormation, forechecking, fmtToi } from "@/lib/game-stats";
import { segmentOffset } from "@/lib/game-time";
import { teamTheme } from "@/lib/team-theme";

/** Two-sided comparison row (NHL game-stats style). */
function Compare({ label, a, h, aTeam, hTeam, fmt }: { label: string; a: number; h: number; aTeam: string; hTeam: string; fmt?: (n: number) => string }) {
  const total = a + h || 1;
  const aPct = (a / total) * 100;
  const f = fmt ?? ((n: number) => String(n));
  return (
    <div style={{ padding: "7px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span className="num">{f(a)}</span>
        <span className="kicker" style={{ fontSize: 10 }}>{label}</span>
        <span className="num">{f(h)}</span>
      </div>
      <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", background: "var(--ice-3)" }}>
        <div style={{ width: `${aPct}%`, background: teamTheme(aTeam).primary }} />
        <div style={{ width: `${100 - aPct}%`, background: teamTheme(hTeam).primary }} />
      </div>
    </div>
  );
}

function Section({ title, children, note, cv, live }: { title: string; children: React.ReactNode; note?: string; cv?: boolean; live?: boolean }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span className="panel-title">{title}</span>
        {cv && <CvBadge />}
        {live && <span className="mono" style={{ fontSize: 9, color: "var(--brand-teal)", border: "1px solid var(--brand-teal)", borderRadius: 999, padding: "1px 7px", letterSpacing: "0.1em" }}>● LIVE VALUE</span>}
      </div>
      {children}
      {note && <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>{note}</div>}
    </div>
  );
}

export default function AnalyticsTab() {
  const { game, t } = useReplay();
  const { openPlayer } = useCards();
  const { away, home } = game.meta;
  const a = teamAggregate(game, away, t);
  const h = teamAggregate(game, home, t);
  const cf = corsiSplit(game, t);
  const st = specialTeams(game, t);
  const sa = st[away];
  const sh = st[home];
  const fc = forechecking(game, t);
  const fa = fc[away];
  const fh = fc[home];

  const started = t > 1;

  return (
    <div>
      {!started && (
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 16px 2px", padding: "9px 12px", borderRadius: 10, background: "rgba(91,200,255,0.06)", border: "1px solid var(--line)", fontSize: 11.5, color: "var(--muted)" }}>
          <span style={{ color: "var(--blue)" }}>▶</span> These analytics build live as the game runs — press play (or jump to a moment).
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 4px" }}>
        <span className="display" style={{ color: teamTheme(away).primary, fontSize: 16 }}>{away}</span>
        <span className="kicker">team vs team</span>
        <span className="display" style={{ color: teamTheme(home).primary, fontSize: 16 }}>{home}</span>
      </div>

      <Section title="Shot quality">
        <Compare label="shots on goal" a={a.sog} h={h.sog} aTeam={away} hTeam={home} />
        <Compare label="expected goals (xG)" a={a.xGoals} h={h.xGoals} aTeam={away} hTeam={home} fmt={(n) => n.toFixed(1)} />
        <Compare label="high-danger %" a={a.highDangerPct} h={h.highDangerPct} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
        <Compare label="finishing (G − xG)" a={a.finishing} h={h.finishing} aTeam={away} hTeam={home} fmt={(n) => (n >= 0 ? `+${n}` : `${n}`)} />
      </Section>

      <Section title="Possession" note="Corsi = all shot attempts (on goal + missed + blocked).">
        <Compare label="shot attempts (Corsi)" a={a.corsi} h={h.corsi} aTeam={away} hTeam={home} />
        <Compare label="Corsi-for %" a={cf[away]} h={cf[home]} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
      </Section>

      <Section title="Momentum" live note="Windowed shot/goal differential — above the line = home pressing, below = away. Most valuable in-game, the instant control swings.">
        <Momentum />
      </Section>

      <TimeOfPossession away={away} home={home} />

      <Section title="Special teams" note="Power play & penalty kill, derived from the penalty events + strength-tagged goals. The man-advantage is hockey's biggest structural edge.">
        <Compare label="power-play %" a={sa.ppPct} h={sh.ppPct} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
        <Compare label="power-play goals" a={sa.ppGoals} h={sh.ppGoals} aTeam={away} hTeam={home} />
        <Compare label="power plays (opportunities)" a={sa.ppOpps} h={sh.ppOpps} aTeam={away} hTeam={home} />
        <Compare label="penalty-kill %" a={sa.pkPct} h={sh.pkPct} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
        <Compare label="short-handed goals" a={sa.shGoals} h={sh.shGoals} aTeam={away} hTeam={home} />
        <Compare label="power-play time" a={sa.ppTimeSec} h={sh.ppTimeSec} aTeam={away} hTeam={home} fmt={fmtToi} />
        <Compare label="power-play shots on goal" a={sa.ppShots} h={sh.ppShots} aTeam={away} hTeam={home} />
      </Section>

      <Section title="Power-play formation & movement" cv note="Setup, zone time and slot passing on the man-advantage — a film-only read of HOW a power play operates, which no public feed provides.">
        <PpFormationBlock away={away} home={home} />
      </Section>

      <Section title="Forechecking" cv note="No public NHL feed tracks forechecking — only frame-by-frame tracking does. Dump-in recovery %, forced turnovers and O-zone pressure decide who controls breakouts and, often, who wins. Elite forechecks recover ~25%+ of dump-ins.">
        <Compare label="dump-in recovery %" a={fa.recoveryPct} h={fh.recoveryPct} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
        <Compare label="dump-in recoveries" a={fa.recoveries} h={fh.recoveries} aTeam={away} hTeam={home} />
        <Compare label="forced turnovers" a={fa.forcedTurnovers} h={fh.forcedTurnovers} aTeam={away} hTeam={home} />
        <Compare label="breakouts pressured" a={fa.pressureForced} h={fh.pressureForced} aTeam={away} hTeam={home} />
        <Compare label="O-zone time off forecheck" a={fa.ozTimeForecheck} h={fh.ozTimeForecheck} aTeam={away} hTeam={home} fmt={fmtToi} />
        <Compare label="shots off the forecheck" a={fa.shotsOnForecheck} h={fh.shotsOnForecheck} aTeam={away} hTeam={home} />
        <Compare label="forecheck offense %" a={fa.forecheckPct} h={fh.forecheckPct} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
      </Section>

      <Section title="Microstats" cv note="Zone entries & passing are not in any public feed — computer vision is the only way to produce them (illustrative here).">
        <Compare label="controlled zone entries" a={illus(a.corsi, 0.62)} h={illus(h.corsi, 0.62)} aTeam={away} hTeam={home} />
        <Compare label="entry → shot %" a={48} h={44} aTeam={away} hTeam={home} fmt={(n) => `${n}%`} />
        <Compare label="passes to the slot" a={illus(a.shots, 1.4)} h={illus(h.shots, 1.4)} aTeam={away} hTeam={home} />
      </Section>

      <div style={{ padding: "12px 16px 16px" }}>
        <div className="panel-title" style={{ marginBottom: 10 }}>Three Stars</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {game.threeStars.map((s) => {
            const th = teamTheme(s.team);
            return (
              <button
                key={s.star}
                onClick={() => openPlayer(s.team, s.name)}
                style={{ display: "flex", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", background: "var(--ice-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${th.primary}`, borderRadius: 10, padding: "10px 13px" }}
              >
                <span className="num" style={{ fontSize: 26, color: th.primary, flex: "none", width: 22, textAlign: "center" }}>{s.star}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                  <span className="mono" style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{s.team} · {s.line}</span>
                </span>
                <span className="mono" style={{ marginLeft: "auto", flex: "none", fontSize: 11, color: "var(--blue)" }}>card ↗</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// illustrative microstat: a stable function of a real count (no RNG at runtime)
function illus(base: number, k: number): number {
  return Math.round(base * k);
}

/** CV-generated power-play formation & movement, per team. */
function PpFormationBlock({ away, home }: { away: string; home: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {[away, home].map((tm) => {
        const f = ppFormation(tm);
        const th = teamTheme(tm);
        return (
          <div key={tm} style={{ background: "var(--ice-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
            <div className="mono" style={{ fontSize: 11, color: th.primary, marginBottom: 5 }}>{tm}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 15, marginBottom: 8 }}>{f.formation}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.85 }}>
              O-zone time <span style={{ color: "var(--text)" }}>{f.ozoneTimePct}%</span><br />
              Slot passes / PP <span style={{ color: "var(--text)" }}>{f.slotPasses}</span><br />
              Controlled entries <span style={{ color: "var(--text)" }}>{f.entryPct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Momentum swing graph — area fills toward whichever team is pressing. */
function Momentum() {
  const { game, t, duration } = useReplay();
  const { home, away } = game.meta;
  const series = useMemo(() => momentumSeries(game, t), [game, t]);

  const W = 320;
  const H = 60;
  const mid = H / 2;
  const xOf = (s: number) => (s / duration) * W;
  const yOf = (m: number) => mid - m * (mid - 4);
  const dividers = game.meta.periods.filter((p) => p > 1).map((p) => segmentOffset(p));
  const nowX = xOf(Math.min(t, duration));

  const area =
    series.length > 1
      ? `M ${xOf(series[0].x).toFixed(1)},${mid} ` +
        series.map((p) => `L ${xOf(p.x).toFixed(1)},${yOf(p.m).toFixed(1)}`).join(" ") +
        ` L ${xOf(series[series.length - 1].x).toFixed(1)},${mid} Z`
      : "";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }} role="img" aria-label="Momentum swing graph">
        <defs>
          <linearGradient id="momfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={teamTheme(home).primary} stopOpacity="0.85" />
            <stop offset="49.9%" stopColor={teamTheme(home).primary} stopOpacity="0.22" />
            <stop offset="50.1%" stopColor={teamTheme(away).primary} stopOpacity="0.22" />
            <stop offset="100%" stopColor={teamTheme(away).primary} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {dividers.map((x, i) => (
          <line key={i} x1={xOf(x)} y1="0" x2={xOf(x)} y2={H} stroke="var(--line)" strokeWidth="0.5" />
        ))}
        {area && <path d={area} fill="url(#momfill)" stroke="none" />}
        <line x1="0" y1={mid} x2={W} y2={mid} stroke="var(--line-2)" strokeWidth="0.5" />
        <line x1={nowX} y1="0" x2={nowX} y2={H} stroke="var(--blue)" strokeWidth="0.75" opacity="0.7" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span className="mono" style={{ fontSize: 10, color: teamTheme(home).primary }}>▲ {home} pressing</span>
        <span className="mono" style={{ fontSize: 10, color: teamTheme(away).primary }}>{away} pressing ▼</span>
      </div>
    </div>
  );
}

/** Time of possession per period (CV-generated), as two-sided bars + total. */
function TimeOfPossession({ away, home }: { away: string; home: string }) {
  const { game, t } = useReplay();
  const rows = useMemo(() => possessionByPeriod(game, t), [game, t]);
  const totHome = rows.reduce((s, p) => s + p.homeSec, 0);
  const totAway = rows.reduce((s, p) => s + p.awaySec, 0);

  return (
    <Section title="Time of possession" cv note="Puck-possession time isn't in any public feed — derived from tracking, the kind of surface only computer vision produces.">
      {rows.length === 0 ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Press play to accumulate possession…</div>
      ) : (
        <>
          {rows.map((p) => (
            <Compare key={p.period} label={`${p.label} possession`} a={p.awaySec} h={p.homeSec} aTeam={away} hTeam={home} fmt={fmtToi} />
          ))}
          <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }} />
          <Compare label="total" a={totAway} h={totHome} aTeam={away} hTeam={home} fmt={fmtToi} />
        </>
      )}
    </Section>
  );
}
