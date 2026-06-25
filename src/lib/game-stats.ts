// Compute helpers over the enriched game: box-score lookups, season cross-refs,
// per-player shot sets, and team-level aggregates used by the cards + Analytics.

import type { Shot, Skater } from "./types";
import type { BoxSkater, BoxGoalie, EnrichedGame, GameEvent, TeamAbbr } from "./game-types";
import { skaters as seasonSkaters } from "./data";
import { eventToShot, eventAbsT, activeGoalie } from "./game-replay";
import { segmentOffset, periodLabel } from "./game-time";
import { summarizeShots } from "./stats";

// Deterministic per-entity pseudo-randoms. Modeled "CV" metrics must be a stable
// function of the player (no runtime RNG), so a card shows the same numbers every
// render. Seeded mulberry32 off a string hash.
function seeded(key: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function gameSkater(game: EnrichedGame, team: TeamAbbr, name: string): BoxSkater | undefined {
  return game.boxscore[team]?.skaters.find((s) => s.name === name);
}

export function gameGoalie(game: EnrichedGame, name: string): BoxGoalie | undefined {
  return game.goalieZones[name];
}

/** Match a game player to their season line (exact name). */
export function seasonSkaterByName(name: string): Skater | undefined {
  return seasonSkaters.find((s) => s.name === name);
}

/** Which team a player belongs to in this game. */
export function teamOfPlayer(game: EnrichedGame, name: string): TeamAbbr | undefined {
  for (const t of Object.keys(game.boxscore)) {
    if (game.boxscore[t].skaters.some((s) => s.name === name)) return t;
    if (game.boxscore[t].goalies.some((g) => g.name === name)) return t;
  }
  return undefined;
}

/** All of a player's shot attempts (on goal + missed + blocked) — for ixG / Corsi. */
export function playerGameShots(game: EnrichedGame, name: string): Shot[] {
  return game.events
    .filter((e) => {
      if (e.type === "goal") return e.scorer === name;
      if (e.type === "shot") return e.shooter === name;
      if (e.type === "penalty_shot") return e.shooter === name;
      return false;
    })
    .map(eventToShot)
    .filter((s): s is Shot => s !== null);
}

/**
 * A player's shots ON GOAL (goals + saved on-goal shots) — the shots that
 * actually reached the goalie. Count matches the box score "S", so the player's
 * shot-location map shows exactly the box-score number (no missed/blocked attempts).
 */
export function playerShotsOnGoal(game: EnrichedGame, name: string): Shot[] {
  return game.events
    .filter((e) => (e.type === "goal" && e.scorer === name) || (e.type === "shot" && e.shooter === name && e.event === "SHOT"))
    .map(eventToShot)
    .filter((s): s is Shot => s !== null);
}

/** Team shot set (Shot[]). Pass `t` to limit to events fired by that time. */
export function teamShots(game: EnrichedGame, team: TeamAbbr, t = Infinity): Shot[] {
  return game.events
    .filter((e) => e.team === team && eventAbsT(e) <= t)
    .map(eventToShot)
    .filter((s): s is Shot => s !== null);
}

export interface TeamGameAgg extends ReturnType<typeof summarizeShots> {
  team: TeamAbbr;
  sog: number; // shots on goal (goals + saved on-goal shots + saved penalty shots)
  corsi: number; // all shot attempts (SOG + missed + blocked)
  ppGoals: number;
}

/** Team-level aggregate for the Analytics tab. Pass `t` to make it time-synced. */
export function teamAggregate(game: EnrichedGame, team: TeamAbbr, t = Infinity): TeamGameAgg {
  const shots = teamShots(game, team, t); // every attempt (Corsi)
  const base = summarizeShots(shots);
  const corsi = shots.length;
  const sog = game.events.filter(
    (e) => e.team === team && eventAbsT(e) <= t && (e.type === "goal" || e.type === "penalty_shot" || (e.type === "shot" && e.event === "SHOT"))
  ).length;
  const ppGoals = game.events.filter((e) => e.team === team && eventAbsT(e) <= t && e.type === "goal" && (e as any).strength === "PP").length;
  return { ...base, team, sog, corsi, ppGoals };
}

/** Possession proxy: Corsi-for % between the two teams (time-synced via `t`). */
export function corsiSplit(game: EnrichedGame, t = Infinity): Record<TeamAbbr, number> {
  const { away, home } = game.meta;
  const a = teamAggregate(game, away, t).corsi;
  const h = teamAggregate(game, home, t).corsi;
  const tot = a + h || 1;
  return { [away]: Math.round((100 * a) / tot), [home]: Math.round((100 * h) / tot) };
}

export const fmtToi = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

// ---- Advanced per-player metrics (this game) -------------------------------
export interface PlayerAdvanced {
  // derived from the real shot/box data
  ixG: number;          // individual expected goals
  hdc: number;          // high-danger chances
  xgPer60: number;      // ixG per 60
  shootingPct: number;  // S% (G / shots on goal)
  // on-ice (modeled — public feeds don't give these per-shift)
  ipp: number;          // Individual Point %
  cfPct: number;        // on-ice Corsi-for %
  xGF: number;          // on-ice xG for
  xGA: number;          // on-ice xG against
  // skating (CV-generated)
  topSpeed: number;     // mph
  avgSpeed: number;     // mph
  distanceMi: number;   // miles skated
  // shot selection (derived)
  shotMix: Array<{ type: string; n: number }>;
}

export function playerAdvanced(game: EnrichedGame, team: TeamAbbr, name: string): PlayerAdvanced | null {
  const line = gameSkater(game, team, name);
  if (!line) return null;
  const shots = playerGameShots(game, name);

  const ixG = r2(shots.reduce((s, x) => s + x.xGoal, 0));
  const hdc = shots.filter((x) => x.highDanger === 1).length;
  const xgPer60 = line.TOI > 0 ? r2((ixG / line.TOI) * 3600) : 0;
  const shootingPct = line.S > 0 ? r1((100 * line.G) / line.S) : 0;

  const rnd = seeded("adv:" + name);
  const isD = line.pos === "D";
  const minutes = line.TOI / 60;
  const ipp = line.P > 0 ? Math.min(100, Math.round(62 + rnd() * 33)) : Math.round(rnd() * 18);
  const cfPct = r1(45 + rnd() * 14);
  const xGF = r2(ixG + minutes * 0.045 + rnd() * 0.5);
  const xGA = r2(minutes * (isD ? 0.05 : 0.04) + rnd() * 0.5);
  const topSpeed = r1((isD ? 20.6 : 21.6) + rnd() * 3.1);
  const avgSpeed = r1(11 + rnd() * 3);
  const distanceMi = r2(minutes * (0.16 + rnd() * 0.03));

  const mix: Record<string, number> = {};
  for (const s of shots) mix[s.shotType] = (mix[s.shotType] ?? 0) + 1;
  const shotMix = Object.entries(mix).map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n);

  return { ixG, hdc, xgPer60, shootingPct, ipp, cfPct, xGF, xGA, topSpeed, avgSpeed, distanceMi, shotMix };
}

// ---- Advanced per-goalie metrics (this game) -------------------------------
export interface GoalieAdvanced {
  xgPer60: number;        // xG faced per 60 (derived)
  dSvPct: number;         // save% above expected, in pts (derived from GSAx)
  gsaxPctOfXg: number;    // % of expected goals saved above average (derived)
  unblockedSvPct: number; // Fenwick save% — unblocked shots (modeled)
  hdSvPct: number;        // high-danger save% (modeled)
  reboundCtrlPct: number; // rebound control (CV-generated)
}

export function goalieAdvanced(game: EnrichedGame, name: string): GoalieAdvanced | null {
  const g = gameGoalie(game, name);
  if (!g) return null;
  const xgPer60 = g.TOI > 0 ? r2((g.xGFaced / g.TOI) * 3600) : 0;
  const dSvPct = g.SA > 0 ? r1((g.GSAx / g.SA) * 100) : 0; // GSAx/SA == actual − expected SV%
  const gsaxPctOfXg = g.xGFaced > 0 ? r1((g.GSAx / g.xGFaced) * 100) : 0;

  const rnd = seeded("gadv:" + name);
  const svp = g.SVpct * 100;
  const unblockedSvPct = r1(Math.min(100, svp - (1.4 + rnd() * 1.6))); // Fenwick a touch below SV%
  const hdSvPct = r1(Math.max(58, svp - (8 + rnd() * 7)));             // high-danger lower
  const reboundCtrlPct = r1(74 + rnd() * 18);
  return { xgPer60, dSvPct, gsaxPctOfXg, unblockedSvPct, hdSvPct, reboundCtrlPct };
}

// ---- Shooter's net map: where a player aims and where they score -----------
export const NET_ZONES = ["glove-high", "blocker-high", "glove-low", "five-hole", "blocker-low"] as const;
export type NetZone = (typeof NET_ZONES)[number];

function weightedPick(weights: Record<NetZone, number>, roll: number): NetZone {
  const total = NET_ZONES.reduce((s, z) => s + weights[z], 0);
  let r = roll * total;
  for (const z of NET_ZONES) { r -= weights[z]; if (r <= 0) return z; }
  return NET_ZONES[NET_ZONES.length - 1];
}

/**
 * Per-player net map (CV-generated): which part of the net the player targets and
 * scores in. Derived from their real shots (count + goals), with the target zone
 * assigned deterministically — the shooter-side mirror of the goalie save map.
 */
export function playerNetMap(game: EnrichedGame, name: string): Array<{ zone: NetZone; shots: number; goals: number }> {
  // on-goal shots only → the zone totals equal the box-score "S" (a shot has to be
  // on net to have a net location; missed/blocked attempts never reach the net).
  const shots = playerShotsOnGoal(game, name);
  const counts = Object.fromEntries(NET_ZONES.map((z) => [z, { shots: 0, goals: 0 }])) as Record<NetZone, { shots: number; goals: number }>;
  const rnd = seeded("pnet:" + name);
  const goalW: Record<NetZone, number> = { "glove-high": 1.5, "blocker-high": 1.2, "glove-low": 1.0, "five-hole": 1.2, "blocker-low": 1.0 };
  const shotW: Record<NetZone, number> = { "glove-high": 1.2, "blocker-high": 1.1, "glove-low": 1.0, "five-hole": 0.7, "blocker-low": 1.0 };
  for (const s of shots) {
    const z = weightedPick(s.goal === 1 ? goalW : shotW, rnd());
    counts[z].shots += 1;
    if (s.goal === 1) counts[z].goals += 1;
  }
  return NET_ZONES.map((z) => ({ zone: z, ...counts[z] }));
}

// ---- Season-aggregate net maps (the scouting moat) -------------------------
// We only have one game + a partial season seed, so the season aggregate is a
// deterministic model: scaled to a full season and biased by the player's/goalie's
// in-game tendencies so the season view feels continuous with the game view.
export interface SeasonNetMap {
  zones: Array<{ zone: NetZone; shots: number; goals: number }>;
  gp: number;
  shots: number;
  goals: number;
  svPct?: number; // goalie only
  gsax?: number;  // goalie only
}

/** Allocate `total` across weighted buckets as whole numbers (largest-remainder). */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let rem = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - floored[i] })).sort((a, b) => b.f - a.f);
  for (let k = 0; rem > 0 && order.length; k++, rem--) floored[order[k % order.length].i]++;
  return floored;
}

function allocateZones(goals: number, shots: number, goalW: number[], shotW: number[]) {
  const ga = allocate(goals, goalW);
  const sa = allocate(shots, shotW);
  return NET_ZONES.map((z, i) => ({ zone: z, goals: ga[i], shots: Math.max(sa[i], ga[i]) }));
}

/** Season net-zone leak map for a goalie — where they get beat over a season. */
export function goalieSeasonNetMap(game: EnrichedGame, name: string): SeasonNetMap | null {
  const g = gameGoalie(game, name);
  if (!g) return null;
  const rnd = seeded("gseason:" + name);
  const gp = 46 + Math.floor(rnd() * 20); // ~46–66 starts
  const shots = Math.round(gp * (27 + rnd() * 8));
  const svPct = Math.round((0.902 + rnd() * 0.016) * 1000) / 1000; // .902–.918
  const goals = Math.round(shots * (1 - svPct));
  const gameZ = new Map(g.zones.map((z) => [z.zone, z]));
  const goalW = NET_ZONES.map((z) => 0.6 + rnd() * 0.9 + (gameZ.get(z)?.ga ?? 0) * 0.45); // weak zones leak more
  const shotW = NET_ZONES.map(() => 0.85 + rnd() * 0.4);
  const zones = allocateZones(goals, shots, goalW, shotW);
  const gsax = Math.round((shots * 0.076 - goals + (rnd() - 0.45) * 5) * 10) / 10;
  return { zones, gp, shots, goals, svPct, gsax };
}

/** Season shooting fingerprint for a player — where they beat goalies over a season. */
export function playerSeasonNetMap(game: EnrichedGame, name: string): SeasonNetMap {
  const season = seasonSkaterByName(name);
  const rnd = seeded("pseason:" + name);
  const gp = season?.games_played ?? 68 + Math.floor(rnd() * 14);
  const shots = season?.I_F_shotsOnGoal ?? Math.round(gp * (1.6 + rnd() * 1.6));
  const goals = season?.I_F_goals ?? Math.round(shots * (0.08 + rnd() * 0.05));
  const gameNet = new Map(playerNetMap(game, name).map((z) => [z.zone, z]));
  const goalW = NET_ZONES.map((z) => 0.5 + rnd() * 0.8 + (gameNet.get(z)?.goals ?? 0) * 0.8 + (z === "glove-high" || z === "five-hole" ? 0.4 : 0));
  const shotW = NET_ZONES.map((z) => 0.8 + rnd() * 0.5 + (gameNet.get(z)?.shots ?? 0) * 0.2);
  const zones = allocateZones(goals, shots, goalW, shotW);
  return { zones, gp, shots, goals };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Deterministic season shot cloud toward the net (for the on-ice season map). */
function shotCloud(seedKey: string, nShots: number, nGoals: number, team: TeamAbbr): Shot[] {
  const rnd = seeded(seedKey);
  const out: Array<Shot & { k: number }> = [];
  for (let i = 0; i < nShots; i++) {
    const goal = i < nGoals ? 1 : 0;
    const base = goal ? 8 + rnd() * 16 : 12 + rnd() * 34;     // goals closer to the net
    const ang = (rnd() - 0.5) * (goal ? 1.1 : 1.9);            // tighter angle for goals
    const x = clamp(89 - base * Math.cos(ang), 30, 88);
    const y = clamp(base * Math.sin(ang), -38, 38);
    const dist = Math.sqrt((89 - x) ** 2 + y ** 2);
    const xg = clamp(0.62 * Math.exp(-dist / 17), 0.01, 0.6);
    const hd = dist < 25 && Math.abs(y) < 22 ? 1 : 0;
    out.push({
      team, season: "SEASON", shooterName: "", period: 1,
      xCordAdjusted: r1(x), yCordAdjusted: r1(y), shotType: "WRIST",
      shotDistance: r1(dist), xGoal: Math.round(xg * 1000) / 1000,
      goal: goal as 0 | 1, event: goal ? "GOAL" : "SHOT", highDanger: hd as 0 | 1,
      k: rnd(), // stable sort key so goals don't all render first
    });
  }
  return out.sort((a, b) => a.k - b.k).map(({ k, ...s }) => s);
}

/** Season on-ice GOAL map for a player — only the shots that went in, over a season. */
export function playerSeasonGoals(game: EnrichedGame, name: string): Shot[] {
  const net = playerSeasonNetMap(game, name);
  const team = teamOfPlayer(game, name) ?? game.meta.home;
  const nGoals = Math.min(net.goals, 60); // every dot is a goal (capped for clarity)
  return shotCloud("psgoal:" + name, nGoals, nGoals, team);
}

/** Season on-ice map of every shot a goalie faced. */
export function goalieSeasonShotsFaced(game: EnrichedGame, name: string): Shot[] {
  const sm = goalieSeasonNetMap(game, name);
  if (!sm) return [];
  const team = teamOfPlayer(game, name);
  const oppTeam = team === game.meta.home ? game.meta.away : game.meta.home;
  const nShots = Math.min(sm.shots, 150);
  const nGoals = sm.shots > 0 ? Math.round((sm.goals * nShots) / sm.shots) : 0;
  return shotCloud("gsfloc:" + name, nShots, nGoals, oppTeam);
}

/** Season-aggregate of the per-game advanced metrics (same shape, scaled up). */
export function playerSeasonAdvanced(game: EnrichedGame, name: string): PlayerAdvanced {
  const season = seasonSkaterByName(name);
  const net = playerSeasonNetMap(game, name);
  const team = teamOfPlayer(game, name);
  const gameAdv = team ? playerAdvanced(game, team, name) : null;
  const rnd = seeded("padvS:" + name);
  const gp = net.gp;

  const ixG = season?.I_F_xGoals ?? r2(net.goals * (0.85 + rnd() * 0.4));
  const xgPer60 = season?.xG_per60 ?? r2(0.5 + rnd() * 0.7);
  const shootingPct = net.shots > 0 ? r1((100 * net.goals) / net.shots) : 0;
  const hdc = Math.round(gp * (0.5 + rnd() * 0.9));
  const ipp = Math.min(100, Math.round(58 + rnd() * 30));
  const cfPct = r1(47 + rnd() * 11);
  const xGF = r2(38 + rnd() * 40);
  const xGA = r2(34 + rnd() * 34);
  const topSpeed = r1(22.6 + rnd() * 2.4);
  const avgSpeed = r1(11.6 + rnd() * 2.2);
  const distanceMi = r2(gp * (2.8 + rnd() * 0.8));

  // realistic season shot distribution, biased toward the player's game tendencies
  const weights: Record<string, number> = { WRIST: 0.4, SNAP: 0.18, SLAP: 0.14, BACKHAND: 0.1, TIP: 0.12, WRAP: 0.06 };
  const gm = gameAdv?.shotMix ?? [];
  const gTot = gm.reduce((s, m) => s + m.n, 0) || 1;
  for (const m of gm) weights[m.type] = (weights[m.type] ?? 0.1) + 0.5 * (m.n / gTot);
  const wTot = Object.values(weights).reduce((s, w) => s + w, 0);
  const shotMix = Object.entries(weights)
    .map(([type, w]) => ({ type, n: Math.round((net.shots * w) / wTot) }))
    .filter((m) => m.n > 0)
    .sort((a, b) => b.n - a.n);

  return { ixG, hdc, xgPer60, shootingPct, ipp, cfPct, xGF, xGA, topSpeed, avgSpeed, distanceMi, shotMix };
}

/** Season-aggregate of the per-game goalie advanced metrics. */
export function goalieSeasonAdvanced(game: EnrichedGame, name: string): GoalieAdvanced | null {
  const sm = goalieSeasonNetMap(game, name);
  if (!sm) return null;
  const rnd = seeded("gadvS:" + name);
  const sa = sm.shots, ga = sm.goals, gsax = sm.gsax ?? 0;
  const xgFaced = Math.max(ga + gsax, ga * 0.9);
  const xgPer60 = r2(xgFaced / sm.gp);
  const dSvPct = sa > 0 ? r1((gsax / sa) * 100) : 0;
  const gsaxPctOfXg = xgFaced > 0 ? r1((gsax / xgFaced) * 100) : 0;
  const svp = (sm.svPct ?? 0) * 100;
  const unblockedSvPct = r1(Math.min(100, svp - (1.2 + rnd() * 1.4)));
  const hdSvPct = r1(Math.max(58, svp - (8 + rnd() * 6)));
  const reboundCtrlPct = r1(75 + rnd() * 16);
  return { xgPer60, dSvPct, gsaxPctOfXg, unblockedSvPct, hdSvPct, reboundCtrlPct };
}

/** Every shot this goalie faced (opponent shots while they were in net). */
export function goalieShotsFaced(game: EnrichedGame, name: string): Shot[] {
  const team = teamOfPlayer(game, name);
  if (!team) return [];
  const opp = team === game.meta.home ? game.meta.away : game.meta.home;
  const start = game.rosters[team]?.G?.[0] ?? "";
  // Shots ON GOAL only (goals + saved on-goal shots + penalty shots), so the
  // count equals the goalie's shots-against (SA) — missed/blocked attempts excluded.
  return game.events
    .filter((e) => (e as any).team === opp && (e.type === "goal" || e.type === "penalty_shot" || (e.type === "shot" && e.event === "SHOT")))
    .filter((e) => activeGoalie(game.events, eventAbsT(e), team, start) === name)
    .map(eventToShot)
    .filter((s): s is Shot => s !== null);
}

/**
 * Momentum curve over the game: a windowed, decayed shot/goal differential.
 * m > 0 = the HOME team is pressing; m < 0 = the AWAY team. Sampled from 0..t so
 * it grows live with the replay clock. Goals swing it hard; danger weights shots.
 */
export function momentumSeries(game: EnrichedGame, t: number): Array<{ x: number; m: number }> {
  const { home, away } = game.meta;
  const W = 150; // 2:30 sliding window
  const STEP = 15;
  const evs = game.events.filter((e) => e.type === "shot" || e.type === "goal" || e.type === "penalty_shot");
  const val = (e: GameEvent) =>
    e.type === "goal" ? 5 : e.type === "penalty_shot" ? 2.5 : 1 + ((e as any).xG ?? 0) * 4;

  const pts: Array<{ x: number; m: number }> = [];
  for (let s = 0; s <= t + 0.001; s += STEP) {
    let hw = 0;
    let aw = 0;
    for (const e of evs) {
      const at = eventAbsT(e);
      if (at <= s && at > s - W) {
        const v = val(e) * (1 - (s - at) / W); // decay: recent events weigh more
        if (e.team === home) hw += v;
        else if (e.team === away) aw += v;
      }
    }
    pts.push({ x: s, m: Math.tanh((hw - aw) / 6) });
  }
  return pts;
}

export interface PeriodPossession {
  period: number;
  label: string;
  homeSec: number;
  awaySec: number;
  homePct: number;
}

/**
 * Time of possession per period (CV-generated). Derived from each period's
 * shot-attempt share, regressed toward 50% when attempts are sparse, then spread
 * across the seconds actually played in that period so it stays clock-synced.
 */
export function possessionByPeriod(game: EnrichedGame, t: number): PeriodPossession[] {
  const { home, away } = game.meta;
  const periodLen = (p: number) => (p === 5 ? 360 : 1200);
  const attempts = (team: TeamAbbr, p: number) =>
    game.events.filter(
      (e) => e.team === team && e.period === p && eventAbsT(e) <= t &&
        (e.type === "goal" || e.type === "penalty_shot" || e.type === "shot")
    ).length;

  const out: PeriodPossession[] = [];
  for (const p of game.meta.periods) {
    const elapsed = Math.max(0, Math.min(periodLen(p), t - segmentOffset(p)));
    if (elapsed <= 0) continue;
    const ah = attempts(home, p);
    const aa = attempts(away, p);
    const tot = ah + aa;
    const rawHome = tot > 0 ? ah / tot : 0.5;
    const homeShare = 0.5 + (rawHome - 0.5) * Math.min(1, tot / 8) * 0.9;
    out.push({
      period: p,
      label: periodLabel(p),
      homeSec: Math.round(homeShare * elapsed),
      awaySec: Math.round((1 - homeShare) * elapsed),
      homePct: Math.round(homeShare * 100),
    });
  }
  return out;
}

// ---- Line combinations (reference data — NOT a CV surface) -----------------
const cleanName = (n: string) => n.replace(/\s*\(C\)\s*$/, "").trim();
const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export interface LineCombos {
  forwardLines: string[][]; // rows of 3 (LW-C-RW)
  dPairs: string[][];       // rows of 2 (LD-RD)
  starter: string;          // projected starting goalie
}

/**
 * Roster line combinations (dailyfaceoff-style reference data). The players are
 * fixed by our committed roster so the names stay consistent with the box score;
 * in production this lineup view is sourced from public lineup feeds, not CV.
 */
export function lineCombos(game: EnrichedGame, team: TeamAbbr): LineCombos {
  const r = game.rosters[team] ?? { F: [], D: [], G: [] };
  return {
    forwardLines: chunk(r.F.map(cleanName), 3),
    dPairs: chunk(r.D.map(cleanName), 2),
    starter: cleanName(r.G?.[0] ?? ""),
  };
}

// ---- Special teams: power play / penalty kill ------------------------------
export interface TeamSpecialTeams {
  ppGoals: number;
  shGoals: number;
  ppOpps: number;   // power-play opportunities (opponent penalties)
  pkSits: number;   // times short-handed (own penalties)
  ppPct: number;    // power-play conversion %
  pkPct: number;    // penalty-kill %
  ppTimeSec: number;
  ppShots: number;  // shots on goal during own PP windows
  ppXg: number;
}

/**
 * Special-teams splits, derived from the REAL penalty + goal events (goals carry a
 * strength tag of EV/PP/SH; penalties carry the penalized team + minutes). Time-
 * synced via `t`. PP "windows" run from each opponent penalty for pim*60 seconds,
 * ending early on the first PP goal (minor-penalty rule).
 */
export function specialTeams(game: EnrichedGame, t = Infinity): Record<TeamAbbr, TeamSpecialTeams> {
  const { away, home } = game.meta;
  const opp = (tm: TeamAbbr) => (tm === home ? away : home);
  const penalties = game.events.filter((e) => e.type === "penalty" && eventAbsT(e) <= t);
  const ppGoalsBy = (tm: TeamAbbr) =>
    game.events.filter((e) => e.type === "goal" && e.team === tm && (e as any).strength === "PP" && eventAbsT(e) <= t);

  const windowsFor = (tm: TeamAbbr) =>
    penalties
      .filter((p) => (p as any).team === opp(tm)) // opponent penalized → tm on the PP
      .map((p) => {
        const start = eventAbsT(p);
        const pim = (p as any).pim ?? 2;
        let end = start + pim * 60;
        const g = ppGoalsBy(tm)
          .filter((gg) => eventAbsT(gg) >= start && eventAbsT(gg) < end)
          .sort((a, b) => eventAbsT(a) - eventAbsT(b))[0];
        if (g && pim <= 2) end = eventAbsT(g); // minor ends on the PP goal
        return { start, end };
      });

  const line = (tm: TeamAbbr): TeamSpecialTeams => {
    const wins = windowsFor(tm);
    const ppOpps = penalties.filter((p) => (p as any).team === opp(tm)).length;
    const pkSits = penalties.filter((p) => (p as any).team === tm).length;
    const ppGoals = ppGoalsBy(tm).length;
    const shGoals = game.events.filter((e) => e.type === "goal" && e.team === tm && (e as any).strength === "SH" && eventAbsT(e) <= t).length;
    const oppPPgoals = ppGoalsBy(opp(tm)).length;
    const ppShotsEvents = game.events.filter(
      (e) => (e as any).team === tm && eventAbsT(e) <= t &&
        (e.type === "goal" || e.type === "penalty_shot" || (e.type === "shot" && e.event === "SHOT")) &&
        // inclusive of the window end so the PP goal that closes the window counts
        wins.some((w) => eventAbsT(e) >= w.start && eventAbsT(e) <= w.end)
    );
    return {
      ppGoals,
      shGoals,
      ppOpps,
      pkSits,
      ppPct: ppOpps ? Math.round((100 * ppGoals) / ppOpps) : 0,
      pkPct: pkSits ? Math.round(100 * (1 - oppPPgoals / pkSits)) : 100,
      ppTimeSec: Math.round(wins.reduce((s, w) => s + Math.max(0, w.end - w.start), 0)),
      ppShots: ppShotsEvents.length,
      ppXg: Math.round(ppShotsEvents.reduce((s, e) => s + ((e as any).xG ?? 0), 0) * 100) / 100,
    };
  };

  return { [away]: line(away), [home]: line(home) } as Record<TeamAbbr, TeamSpecialTeams>;
}

/** CV-generated power-play formation & movement read (film-only; deterministic). */
export interface PpFormation {
  formation: string;
  ozoneTimePct: number;
  slotPasses: number;
  entryPct: number;
}
export function ppFormation(team: TeamAbbr): PpFormation {
  const rnd = seeded("ppform:" + team);
  const formations = ["1-3-1 umbrella", "1-3-1 flex", "overload", "spread (box +1)"];
  // pick the formation from the team identity so two teams don't collide on one
  const idx = [...team].reduce((s, c) => s + c.charCodeAt(0), 0) % formations.length;
  return {
    formation: formations[idx],
    ozoneTimePct: Math.round(60 + rnd() * 26),
    slotPasses: Math.round(4 + rnd() * 8),
    entryPct: Math.round(70 + rnd() * 22),
  };
}

// ---- Forechecking (CV-only) ------------------------------------------------
export interface TeamForecheck {
  recoveryPct: number;      // dump-in recovery % (elite ~25%+)
  dumpIns: number;          // dump-ins this team forechecked
  recoveries: number;       // dump-ins won back on the forecheck
  forcedTurnovers: number;  // hits/stick-checks that separated puck + possession
  pressureForced: number;   // opponent D-zone breakouts disrupted
  ozTimeForecheck: number;  // O-zone time generated off the forecheck (seconds)
  shotsOnForecheck: number; // shots within ~5–10s of a forecheck retrieval
  forecheckShotPct: number; // shooting % off the forecheck
  rushPct: number;          // share of 5-on-5 offense from the rush
  forecheckPct: number;     // share of 5-on-5 offense from the forecheck/cycle
}

/**
 * Forechecking analytics — a CV-only surface. No public NHL feed tracks
 * forechecking; only frame-by-frame tracking (Sportlogiq-style) does, which is
 * exactly AirPLAi's wheelhouse. Counts build off this team's real shot-attempt
 * volume up to `t` (so they grow with the clock); the rates are seeded per team.
 * Elite forechecks recover ~25%+ of dump-ins.
 */
export function forechecking(game: EnrichedGame, t = Infinity): Record<TeamAbbr, TeamForecheck> {
  const { away, home } = game.meta;
  const line = (tm: TeamAbbr): TeamForecheck => {
    const rnd = seeded("fc:" + tm);
    const agg = teamAggregate(game, tm, t);
    const corsi = agg.corsi;
    const sog = agg.sog;
    const recoveryPct = r1(23 + rnd() * 9); // ~23–32%
    const dumpIns = Math.round(corsi * (0.55 + rnd() * 0.3));
    const recoveries = Math.round((dumpIns * recoveryPct) / 100);
    const forcedTurnovers = Math.round(corsi * (0.28 + rnd() * 0.16));
    const pressureForced = Math.round(sog * (0.45 + rnd() * 0.3));
    const ozTimeForecheck = Math.round(corsi * (3.2 + rnd() * 1.8)); // seconds
    const shotsOnForecheck = Math.round(sog * (0.32 + rnd() * 0.16));
    const forecheckShotPct = r1(8 + rnd() * 6);
    const forecheckPct = Math.round(42 + rnd() * 16);
    const rushPct = 100 - forecheckPct;
    return { recoveryPct, dumpIns, recoveries, forcedTurnovers, pressureForced, ozTimeForecheck, shotsOnForecheck, forecheckShotPct, rushPct, forecheckPct };
  };
  return { [away]: line(away), [home]: line(home) } as Record<TeamAbbr, TeamForecheck>;
}
