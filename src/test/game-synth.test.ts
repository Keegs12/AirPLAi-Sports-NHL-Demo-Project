import { describe, it, expect } from "vitest";
import { game } from "@/lib/game-data";
import { teamAggregate } from "@/lib/game-stats";

// Guards on the synthesized game layer — the per-game analogue of the season's
// league-shooting-rate guard. Keeps the modeled data honest and hockey-real.

describe("synthesized game data is consistent and realistic", () => {
  it("P1 shots on goal hit the known real totals exactly", () => {
    for (const team of [game.meta.away, game.meta.home]) {
      const sog = game.events.filter(
        (e) => e.team === team && e.period === 1 && (e.type === "goal" || (e.type === "shot" && (e as any).event === "SHOT"))
      ).length;
      expect(sog).toBe(game.meta.p1Shots[team]);
    }
  });

  it("every synthesized attempt is a non-goal", () => {
    const attempts = game.events.filter((e) => e.type === "shot");
    expect(attempts.length).toBeGreaterThan(50);
    expect(attempts.every((e) => (e as any).event !== "GOAL")).toBe(true);
  });

  it("box-score goals reconcile to the final score", () => {
    for (const team of [game.meta.away, game.meta.home]) {
      const sum = game.boxscore[team].skaters.reduce((a, s) => a + s.G, 0);
      expect(sum).toBe(game.meta.final[team]);
      // points = goals + assists for every skater
      for (const s of game.boxscore[team].skaters) expect(s.P).toBe(s.G + s.A);
    }
  });

  it("the goalie story matches the recap: Andersen 4 GA, Bussi 1 GA", () => {
    expect(game.goalieZones["Frederik Andersen"].GA).toBe(4);
    expect(game.goalieZones["Brandon Bussi"].GA).toBe(1);
    // net-zone goals-against sum to each goalie's GA
    for (const name of ["Frederik Andersen", "Brandon Bussi"]) {
      const g = game.goalieZones[name];
      expect(g.zones.reduce((a, z) => a + z.ga, 0)).toBe(g.GA);
    }
  });

  it("high-danger shots carry higher average xG than the rest", () => {
    const shots = game.events.filter((e) => e.type === "shot" || e.type === "goal");
    const hd = shots.filter((e) => (e as any).highDanger === 1).map((e) => (e as any).xG);
    const lo = shots.filter((e) => (e as any).highDanger !== 1).map((e) => (e as any).xG);
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    expect(mean(hd)).toBeGreaterThan(mean(lo));
  });

  it("game shooting % is in a sane band for a high-scoring game", () => {
    for (const team of [game.meta.away, game.meta.home]) {
      const agg = teamAggregate(game, team);
      const shPct = (100 * agg.goals) / (agg.sog || 1);
      expect(shPct).toBeGreaterThan(3);
      expect(shPct).toBeLessThan(25);
    }
  });
});
