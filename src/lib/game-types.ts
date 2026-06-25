// Types for the game-replay layer. These mirror the enriched game file produced
// by scripts/build-game.mjs (data/games/scf-2026-game3.enriched.json). The NHL
// API ingest path writes the SAME shape, so swapping real per-game data in
// requires no type or UI changes.

import type { ShotType, ShotEvent } from "./types";

export type TeamAbbr = string;

/** A scored goal — real, from public recaps. */
export interface GoalEvent {
  id: string;
  type: "goal";
  period: number;
  clockElapsed: number; // seconds elapsed within the period
  team: TeamAbbr;
  strength: "EV" | "PP" | "SH";
  scorer: string;
  assists: string[];
  shotType: ShotType;
  x: number;
  y: number;
  xG: number;
  highDanger: 0 | 1;
  scoreAfter: Record<TeamAbbr, number>;
  gameWinner?: boolean;
  detail?: string;
}

/** A synthesized non-scoring shot attempt (fills the live shot map). */
export interface ShotAttemptEvent {
  id: string;
  type: "shot";
  period: number;
  clockElapsed: number;
  team: TeamAbbr;
  shooter: string;
  shotType: ShotType;
  x: number;
  y: number;
  xG: number;
  highDanger: 0 | 1;
  event: ShotEvent; // SHOT (on goal) | MISS | BLOCK
  synthesized: true;
}

export interface GoalieChangeEvent {
  id: string;
  type: "goalie_change";
  period: number;
  clockElapsed: number;
  team: TeamAbbr;
  out: string;
  in: string;
  detail?: string;
}

export interface PenaltyShotEvent {
  id: string;
  type: "penalty_shot";
  period: number;
  clockElapsed: number;
  team: TeamAbbr;
  shooter: string;
  result: "saved" | "goal";
  goalie: string;
  strength: string;
  x?: number;
  y?: number;
  xG?: number;
  shotType?: ShotType;
  highDanger?: 0 | 1;
  detail?: string;
}

/** A penalty (minor/major) — drives the play-by-play and the PP/PK context. */
export interface PenaltyEvent {
  id: string;
  type: "penalty";
  period: number;
  clockElapsed: number;
  team: TeamAbbr; // the team that took the penalty (went short-handed)
  player: string;
  infraction: string;
  pim: number; // penalty minutes
  drawnBy?: string;
  detail?: string;
}

export type GameEvent = GoalEvent | ShotAttemptEvent | GoalieChangeEvent | PenaltyShotEvent | PenaltyEvent;

export interface BoxSkater {
  name: string;
  number: number;
  pos: "C" | "F" | "D";
  G: number;
  A: number;
  P: number;
  plusMinus: number;
  S: number;
  SM: number;
  BS: number;
  PN: number;
  PIM: number;
  HT: number;
  TK: number;
  GV: number;
  SHFT: number;
  TOI: number; // seconds
  ESTOI: number;
  PPTOI: number;
  SHTOI: number;
  FOW: number;
  FOL: number;
  FOpct: number;
}

export interface GoalieZone {
  zone: "glove-high" | "glove-low" | "blocker-high" | "blocker-low" | "five-hole";
  sa: number;
  ga: number;
  sv: number;
  svPct: number;
}

export interface BoxGoalie {
  name: string;
  number: number;
  pos: "G";
  SA: number;
  SV: number;
  GA: number;
  SVpct: number;
  GSAx: number;
  TOI: number;
  xGFaced: number;
  zones: GoalieZone[];
  synthesized: true;
}

export interface TrackingPlayer {
  n: number; // jersey number
  team: TeamAbbr;
  pos: "C" | "F" | "D" | "G";
  x: number;
  y: number;
}

export interface TrackingFrame {
  eventId: string;
  absT: number;
  puck: { x: number; y: number };
  attackingTeam: TeamAbbr;
  players: TrackingPlayer[];
}

export interface GameMeta {
  game: string;
  date: string;
  venue: string;
  home: TeamAbbr;
  away: TeamAbbr;
  final: Record<TeamAbbr, number>;
  decision: string;
  seriesAfter: string;
  seriesResult: string;
  p1Shots: Record<TeamAbbr, number>;
  shotTotals: Record<TeamAbbr, Record<string, number>>;
  periods: number[];
  lastEventAbsT: number;
  source: string;
  note?: string;
  enriched?: Record<string, string>;
}

export interface GameRosters {
  [team: string]: { F: string[]; D: string[]; G: string[]; partial?: boolean };
}

export interface ThreeStar {
  star: number;
  name: string;
  team: TeamAbbr;
  line: string;
}

export interface EnrichedGame {
  meta: GameMeta;
  rosters: GameRosters;
  events: GameEvent[];
  boxscore: Record<TeamAbbr, { skaters: BoxSkater[]; goalies: BoxGoalie[] }>;
  goalieZones: Record<string, BoxGoalie>;
  tracking: TrackingFrame[];
  threeStars: ThreeStar[];
}
