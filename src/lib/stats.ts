import type { Shot, Skater, ShotType } from "./types";

export interface TeamShotSummary {
  shots: number;
  goals: number;
  xGoals: number;
  shootingPct: number; // goals / shots
  finishing: number; // goals - xGoals (goals above expected)
  highDangerShots: number;
  highDangerPct: number; // share of shots from the high-danger area
  highDangerGoals: number;
  avgShotDistance: number;
}

/** Round helper kept local so results are stable across the app + tests. */
export const r = (n: number, d = 2) => Number(n.toFixed(d));

export function summarizeShots(shots: Shot[]): TeamShotSummary {
  const n = shots.length || 1;
  const goals = shots.filter((s) => s.goal).length;
  const xG = shots.reduce((a, s) => a + s.xGoal, 0);
  const hd = shots.filter((s) => s.highDanger);
  const dist = shots.reduce((a, s) => a + s.shotDistance, 0);
  return {
    shots: shots.length,
    goals,
    xGoals: r(xG, 1),
    shootingPct: r((100 * goals) / n, 1),
    finishing: r(goals - xG, 1),
    highDangerShots: hd.length,
    highDangerPct: r((100 * hd.length) / n, 1),
    highDangerGoals: hd.filter((s) => s.goal).length,
    avgShotDistance: r(dist / n, 1),
  };
}

export function shotTypeBreakdown(
  shots: Shot[]
): Array<{ type: ShotType; shots: number; goals: number; xGoals: number; shootingPct: number }> {
  const order: ShotType[] = ["WRIST", "SNAP", "SLAP", "BACKHAND", "TIP", "WRAP"];
  return order
    .map((type) => {
      const subset = shots.filter((s) => s.shotType === type);
      const goals = subset.filter((s) => s.goal).length;
      return {
        type,
        shots: subset.length,
        goals,
        xGoals: r(subset.reduce((a, s) => a + s.xGoal, 0), 1),
        shootingPct: subset.length ? r((100 * goals) / subset.length, 1) : 0,
      };
    })
    .filter((row) => row.shots > 0);
}

export interface RankedSkater extends Skater {
  points: number;
}

/** Sort skaters by a metric, returning the top N. */
export function topSkaters(
  list: Skater[],
  metric: "I_F_points" | "I_F_goals" | "I_F_xGoals" | "goalsAboveExpected" | "xG_per60",
  n = 10
): Skater[] {
  return [...list].sort((a, b) => (b[metric] as number) - (a[metric] as number)).slice(0, n);
}
