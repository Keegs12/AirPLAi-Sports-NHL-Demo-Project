// Loads the enriched hero game (built by scripts/build-game.mjs). Mirrors the
// season data.ts boundary: a small static file imported directly. The NHL API
// ingest path writes the same shape, so this import never changes.
import gameJson from "../../data/games/scf-2026-game3.enriched.json";
import type { EnrichedGame } from "./game-types";

export const game = gameJson as unknown as EnrichedGame;

/** Starting goalie for a team (first listed on the roster). */
export function startingGoalie(team: string): string {
  return game.rosters[team]?.G[0] ?? "";
}
