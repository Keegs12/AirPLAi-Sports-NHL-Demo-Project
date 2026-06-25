import { describe, it, expect } from "vitest";
import { game } from "@/lib/game-data";
import {
  scoreAt,
  shotsOnMapUpTo,
  eventsUpTo,
  activeGoalie,
  eventToShot,
  eventAbsT,
} from "@/lib/game-replay";
import { timelineDuration } from "@/lib/game-time";

const TEAMS = [game.meta.away, game.meta.home];
const DURATION = timelineDuration(game.meta.lastEventAbsT);
const shotish = game.events.filter((e) => e.type === "goal" || e.type === "shot" || e.type === "penalty_shot");

describe("replay selectors at time T", () => {
  it("score is read from the authoritative scoreAfter and ends at the final", () => {
    const start = scoreAt(game.events, 0, TEAMS);
    expect(start).toEqual({ [game.meta.away]: 0, [game.meta.home]: 0 });
    const end = scoreAt(game.events, DURATION, TEAMS);
    expect(end).toEqual(game.meta.final);
  });

  it("captures the 4-0 Vegas lead, the tie, and the final", () => {
    // after Marner's hat trick (P2, last Vegas goal at clockElapsed 866 -> absT 2066)
    expect(scoreAt(game.events, 2100, TEAMS)).toEqual({ VGK: 4, CAR: 0 });
    // after Svechnikov ties it (P3 clockElapsed 1098 -> absT 3498)
    expect(scoreAt(game.events, 3500, TEAMS)).toEqual({ VGK: 4, CAR: 4 });
    // after Theodore's winner
    expect(scoreAt(game.events, DURATION, TEAMS)).toEqual({ VGK: 5, CAR: 4 });
  });

  it("shots on the map accumulate monotonically and never reveal the future", () => {
    let prev = 0;
    for (let t = 0; t <= DURATION; t += 300) {
      const n = shotsOnMapUpTo(game.events, t).length;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(shotsOnMapUpTo(game.events, DURATION).length).toBe(shotish.length);
    // no event in the "up to now" set is in the future
    const cut = 1500;
    expect(eventsUpTo(game.events, cut).every((e) => eventAbsT(e) <= cut)).toBe(true);
  });

  it("resolves the Carolina goalie change (Andersen -> Bussi) at the start of P3", () => {
    expect(activeGoalie(game.events, 2399, "CAR", "Frederik Andersen")).toBe("Frederik Andersen");
    expect(activeGoalie(game.events, 2400, "CAR", "Frederik Andersen")).toBe("Brandon Bussi");
  });

  it("adapts a goal event into a Shot the shot map can render", () => {
    const goal = game.events.find((e) => e.type === "goal")!;
    const shot = eventToShot(goal)!;
    expect(shot.goal).toBe(1);
    expect(shot.event).toBe("GOAL");
    expect(shot.shooterName).toBe((goal as any).scorer);
  });
});
