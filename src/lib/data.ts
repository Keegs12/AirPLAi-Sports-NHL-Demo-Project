import teamsJson from "../../data/teams.json";
import skatersJson from "../../data/skaters.json";
import shotsJson from "../../data/shots.json";
import metaJson from "../../data/meta.json";
import type { Team, Skater, Shot, Meta } from "./types";

// The dataset is small and static, so we load it directly. For a larger or
// frequently-updated corpus this boundary is where you'd swap in a DB/edge
// store (see docs/TECHNICAL_WRITEUP.md) — callers below wouldn't change.

export const teams = teamsJson as Team[];
export const skaters = skatersJson as Skater[];
export const shots = shotsJson as Shot[];
export const meta = metaJson as Meta;

export function teamList(): Team[] {
  return [...teams].sort((a, b) => b.points - a.points);
}

export function getTeam(abbr: string): Team | undefined {
  return teams.find((t) => t.team === abbr);
}

export function shotsForTeam(abbr: string): Shot[] {
  return shots.filter((s) => s.team === abbr);
}

export function skatersForTeam(abbr: string): Skater[] {
  return skaters.filter((s) => s.team === abbr);
}
