import { describe, it, expect } from "vitest";
import { game } from "@/lib/game-data";
import { playerShotsOnGoal, goalieShotsFaced } from "@/lib/game-stats";

// The maps tied to box-score numbers must agree with those numbers: a player's
// on-ice shot map shows exactly their shots on goal (S), and a goalie's
// shots-faced map shows exactly their shots against (SA). Missed/blocked attempts
// never inflate these maps.
describe("box-score ↔ map consistency", () => {
  it("each skater's on-goal shot map count equals their box-score Shots (S)", () => {
    for (const team of Object.keys(game.boxscore)) {
      for (const sk of game.boxscore[team].skaters) {
        expect(playerShotsOnGoal(game, sk.name).length, sk.name).toBe(sk.S);
      }
    }
  });

  it("each goalie's shots-faced map count equals their box-score Shots Against (SA)", () => {
    for (const team of Object.keys(game.boxscore)) {
      for (const g of game.boxscore[team].goalies) {
        expect(goalieShotsFaced(game, g.name).length, g.name).toBe(g.SA);
      }
    }
  });
});
