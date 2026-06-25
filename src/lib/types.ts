// Domain types. These mirror the seed/MoneyPuck schema so swapping in live
// data via scripts/ingest.mjs requires no type changes.

export type ShotType = "WRIST" | "SNAP" | "SLAP" | "BACKHAND" | "TIP" | "WRAP";
export type ShotEvent = "SHOT" | "GOAL" | "MISS" | "BLOCK";

export interface Shot {
  team: string;
  season: string;
  shooterName: string;
  period: number;
  xCordAdjusted: number; // rink x, [-100,100], net at +89
  yCordAdjusted: number; // rink y, [-42.5,42.5]
  shotType: ShotType;
  shotDistance: number;
  xGoal: number; // probability the shot is a goal
  goal: 0 | 1;
  event: ShotEvent;
  highDanger: 0 | 1;
}

export interface Skater {
  season: string;
  name: string;
  team: string;
  position: "C" | "L" | "R" | "D";
  games_played: number;
  icetime: number;
  I_F_goals: number;
  I_F_primaryAssists: number;
  I_F_secondaryAssists: number;
  I_F_points: number;
  I_F_shotsOnGoal: number;
  I_F_xGoals: number;
  goalsAboveExpected: number;
  xG_per60: number;
}

export interface Team {
  season: string;
  team: string;
  name: string;
  games_played: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
  xGoalsPct: number;
  corsiPct: number;
  points: number;
  finishingFor: number;
}

export interface Meta {
  season: string;
  generatedAt: string;
  source: string;
  counts: { teams: number; skaters: number; shots: number };
}
