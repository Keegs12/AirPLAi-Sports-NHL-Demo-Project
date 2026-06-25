// Pure, dependency-free selectors over (events, t). The replay stores ONE scalar
// `t` (absolute seconds); everything the UI shows — score, shots on the map,
// cumulative xG, the active goalie, on-ice tracking — is DERIVED from t here.
// That keeps scrubbing backward free and nothing can desync.

import type { Shot } from "./types";
import type {
  GameEvent,
  GoalEvent,
  TeamAbbr,
  TrackingFrame,
  TrackingPlayer,
} from "./game-types";
import { absT } from "./game-time";

const NET_X = 89;
const dist = (x: number, y: number) => Math.sqrt((NET_X - x) ** 2 + y ** 2);
export const eventAbsT = (e: GameEvent) => absT(e.period, e.clockElapsed);

/** Adapt any shot-bearing event to the Shot shape the shot map + stats consume. */
export function eventToShot(e: GameEvent): Shot | null {
  if (e.type === "goalie_change" || e.type === "penalty") return null;
  if (e.type === "goal") {
    return {
      team: e.team,
      season: "SCF-2026-G3",
      shooterName: e.scorer,
      period: e.period,
      xCordAdjusted: e.x,
      yCordAdjusted: e.y,
      shotType: e.shotType,
      shotDistance: Number(dist(e.x, e.y).toFixed(1)),
      xGoal: e.xG,
      goal: 1,
      event: "GOAL",
      highDanger: e.highDanger,
    };
  }
  if (e.type === "penalty_shot") {
    if (e.x === undefined || e.y === undefined) return null;
    const scored = e.result === "goal";
    return {
      team: e.team,
      season: "SCF-2026-G3",
      shooterName: e.shooter,
      period: e.period,
      xCordAdjusted: e.x,
      yCordAdjusted: e.y,
      shotType: e.shotType ?? "WRIST",
      shotDistance: Number(dist(e.x, e.y).toFixed(1)),
      xGoal: e.xG ?? 0.33,
      goal: scored ? 1 : 0,
      event: scored ? "GOAL" : "SHOT",
      highDanger: e.highDanger ?? 1,
    };
  }
  // shot attempt
  return {
    team: e.team,
    season: "SCF-2026-G3",
    shooterName: e.shooter,
    period: e.period,
    xCordAdjusted: e.x,
    yCordAdjusted: e.y,
    shotType: e.shotType,
    shotDistance: Number(dist(e.x, e.y).toFixed(1)),
    xGoal: e.xG,
    goal: 0,
    event: e.event,
    highDanger: e.highDanger,
  };
}

/** All events that have fired by time t (inclusive). */
export function eventsUpTo(events: GameEvent[], t: number): GameEvent[] {
  return events.filter((e) => eventAbsT(e) <= t);
}

/** Score at time t — read from the latest goal's authoritative scoreAfter. */
export function scoreAt(events: GameEvent[], t: number, teams: TeamAbbr[]): Record<TeamAbbr, number> {
  const zero = Object.fromEntries(teams.map((tm) => [tm, 0])) as Record<TeamAbbr, number>;
  let latest: GoalEvent | null = null;
  for (const e of events) {
    if (e.type === "goal" && eventAbsT(e) <= t) {
      if (!latest || eventAbsT(e) >= eventAbsT(latest)) latest = e;
    }
  }
  return latest ? { ...zero, ...latest.scoreAfter } : zero;
}

/** Shots to draw on the map at time t (goals + saved penalty shots + attempts). */
export function shotsOnMapUpTo(events: GameEvent[], t: number): Shot[] {
  return eventsUpTo(events, t)
    .map(eventToShot)
    .filter((s): s is Shot => s !== null);
}

/** Cumulative xG for a team up to time t (the win-probability / pressure curve). */
export function cumulativeXgAt(events: GameEvent[], t: number, team: TeamAbbr): number {
  let sum = 0;
  for (const e of eventsUpTo(events, t)) {
    if (e.team !== team) continue;
    if (e.type === "goal" || e.type === "shot") sum += e.xG;
    else if (e.type === "penalty_shot") sum += e.xG ?? 0;
  }
  return sum;
}

/** Which goalie is in net for `team` at time t, given a starting goalie. */
export function activeGoalie(events: GameEvent[], t: number, team: TeamAbbr, startGoalie: string): string {
  let g = startGoalie;
  for (const e of events) {
    if (e.type === "goalie_change" && e.team === team && eventAbsT(e) <= t) g = e.in;
  }
  return g;
}

/** The most recent event at/just before t (for the ticker + callouts). */
export function currentEventAt(events: GameEvent[], t: number): GameEvent | null {
  let cur: GameEvent | null = null;
  for (const e of events) {
    if (eventAbsT(e) <= t && (!cur || eventAbsT(e) >= eventAbsT(cur))) cur = e;
  }
  return cur;
}

const keyOf = (p: TrackingPlayer) => `${p.team}-${p.n}`;

// Where each team's goalie lives on the full sheet. Home defends the LEFT net
// (attacks +89 → right), away defends the RIGHT net. Pinned there all game so
// goalies stay in their creases instead of drifting to the blue line.
const HOME_NET_X = -88;
const AWAY_NET_X = 88;

/**
 * Full-rink ABSOLUTE snapshot for the horizontal live-tracking view. Each stored
 * frame is an offensive-zone formation normalized to attack +89; we rotate the
 * away team's frames 180° to the LEFT end (so home always attacks right, away
 * left) and then interpolate in absolute coords — so the skaters actually travel
 * the length of the ice between possessions instead of the scene snapping sides.
 * Goalies are pinned to their own nets.
 */
export function trackingFullAt(
  frames: TrackingFrame[],
  t: number,
  home: TeamAbbr
): { players: TrackingPlayer[]; puck: { x: number; y: number } } | null {
  if (frames.length === 0) return null;

  const toAbs = (frame: TrackingFrame): { players: TrackingPlayer[]; puck: { x: number; y: number } } => {
    const d = frame.attackingTeam === home ? 1 : -1; // 180° rotation for the away end
    const players = frame.players.map((p) =>
      p.pos === "G"
        ? { ...p, x: p.team === home ? HOME_NET_X : AWAY_NET_X, y: 0 }
        : { ...p, x: p.x * d, y: p.y * d }
    );
    return { players, puck: { x: frame.puck.x * d, y: frame.puck.y * d } };
  };

  if (t <= frames[0].absT) return toAbs(frames[0]);
  const last = frames[frames.length - 1];
  if (t >= last.absT) return toAbs(last);

  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].absT <= t) i++;
  const a = toAbs(frames[i]);
  const b = toAbs(frames[i + 1]);
  const span = frames[i + 1].absT - frames[i].absT || 1;
  const f = Math.max(0, Math.min(1, (t - frames[i].absT) / span));

  const bByKey = new Map(b.players.map((p) => [keyOf(p), p]));
  const players = a.players.map((pa) => {
    const pb = bByKey.get(keyOf(pa)) ?? pa;
    return { ...pa, x: pa.x + (pb.x - pa.x) * f, y: pa.y + (pb.y - pa.y) * f };
  });
  const puck = { x: a.puck.x + (b.puck.x - a.puck.x) * f, y: a.puck.y + (b.puck.y - a.puck.y) * f };
  return { players, puck };
}

/** Interpolated on-ice snapshot at time t, for the animated rink view. */
export function trackingAt(
  frames: TrackingFrame[],
  t: number
): { players: TrackingPlayer[]; puck: { x: number; y: number }; attackingTeam: TeamAbbr } | null {
  if (frames.length === 0) return null;
  if (t <= frames[0].absT) return { players: frames[0].players, puck: frames[0].puck, attackingTeam: frames[0].attackingTeam };
  const last = frames[frames.length - 1];
  if (t >= last.absT) return { players: last.players, puck: last.puck, attackingTeam: last.attackingTeam };

  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].absT <= t) i++;
  const a = frames[i];
  const b = frames[i + 1];
  const span = b.absT - a.absT || 1;
  const f = Math.max(0, Math.min(1, (t - a.absT) / span));

  const bByKey = new Map(b.players.map((p) => [keyOf(p), p]));
  const players = a.players.map((pa) => {
    const pb = bByKey.get(keyOf(pa)) ?? pa;
    return { ...pa, x: pa.x + (pb.x - pa.x) * f, y: pa.y + (pb.y - pa.y) * f };
  });
  const puck = { x: a.puck.x + (b.puck.x - a.puck.x) * f, y: a.puck.y + (b.puck.y - a.puck.y) * f };
  // hand off "attacking team" at the midpoint so the puck color flips believably
  const attackingTeam = f < 0.5 ? a.attackingTeam : b.attackingTeam;
  return { players, puck, attackingTeam };
}
