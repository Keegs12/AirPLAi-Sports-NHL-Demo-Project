import { describe, it, expect } from "vitest";
import { game } from "@/lib/game-data";
import { specialTeams, lineCombos, forechecking } from "@/lib/game-stats";

const TEAMS = [game.meta.away, game.meta.home];

// Special-teams splits must agree with the underlying penalty + goal events: a
// team's PP goals == its strength-tagged PP goals, and its PP opportunities ==
// the count of penalties drawn on the opponent.
describe("special teams ↔ events consistency", () => {
  const st = specialTeams(game);

  for (const team of TEAMS) {
    it(`${team} PP goals match strength-tagged goals`, () => {
      const ppGoals = game.events.filter(
        (e) => e.type === "goal" && e.team === team && (e as any).strength === "PP"
      ).length;
      expect(st[team].ppGoals).toBe(ppGoals);
    });

    it(`${team} PP opportunities equal opponent penalties`, () => {
      const oppPenalties = game.events.filter(
        (e) => e.type === "penalty" && (e as any).team !== team
      ).length;
      expect(st[team].ppOpps).toBe(oppPenalties);
    });

    it(`${team} PP% is a valid percentage`, () => {
      expect(st[team].ppPct).toBeGreaterThanOrEqual(0);
      expect(st[team].ppPct).toBeLessThanOrEqual(100);
      expect(st[team].pkPct).toBeGreaterThanOrEqual(0);
      expect(st[team].pkPct).toBeLessThanOrEqual(100);
    });
  }
});

// Forechecking is a CV-only surface: the rush/forecheck offense split must
// partition cleanly and the recovery rate must be a plausible percentage.
describe("forechecking sanity", () => {
  const fc = forechecking(game);
  for (const team of TEAMS) {
    it(`${team} rush + forecheck offense = 100%`, () => {
      expect(fc[team].rushPct + fc[team].forecheckPct).toBe(100);
    });
    it(`${team} dump-in recovery % is a valid rate`, () => {
      expect(fc[team].recoveryPct).toBeGreaterThan(0);
      expect(fc[team].recoveryPct).toBeLessThan(100);
      expect(fc[team].recoveries).toBeLessThanOrEqual(fc[team].dumpIns);
    });
  }
});

// Line combinations are reference data — every name must be a real roster player
// that exists in the box score, so clicking opens a real card.
describe("line combinations reference real roster players", () => {
  for (const team of TEAMS) {
    it(`${team} lines + pairs + starter exist in the box score`, () => {
      const { forwardLines, dPairs, starter } = lineCombos(game, team);
      const skaters = new Set(game.boxscore[team].skaters.map((s) => s.name));
      const goalies = new Set(game.boxscore[team].goalies.map((g) => g.name));
      for (const n of [...forwardLines.flat(), ...dPairs.flat()]) {
        expect(skaters.has(n), n).toBe(true);
      }
      expect(goalies.has(starter), starter).toBe(true);
    });
  }
});
