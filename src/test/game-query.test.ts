import { describe, it, expect } from "vitest";
import { game } from "@/lib/game-data";
import { askGame } from "@/lib/game-query";

describe("game-scoped PLAiChat", () => {
  it("routes 'flukiest goal' to Theodore's low-xG 2OT winner", () => {
    const a = askGame(game, "show me the flukiest goal");
    expect(a.answer).toMatch(/Theodore/);
    expect(a.seekEventId).toBe("g3-11");
  });

  it("answers 'where did Andersen get beat' from the net-zone data", () => {
    const a = askGame(game, "where did Andersen get beat?");
    expect(a.answer).toMatch(/Andersen/);
    expect(a.tab).toBe("shotmap");
  });

  it("returns Marner's three hat-trick clips", () => {
    const a = askGame(game, "tell me about the hat trick");
    expect(a.clips).toHaveLength(3);
  });

  it("summarizes a specific period", () => {
    const a = askGame(game, "what happened in the third period");
    expect(a.answer).toMatch(/P3/);
    expect(a.tab).toBe("plays");
  });

  it("reports shots and possession with a table", () => {
    const a = askGame(game, "shots and possession");
    expect(a.rows && a.rows.length).toBe(2);
    expect(a.tab).toBe("analytics");
  });

  it("falls back to a scoring summary on an unrecognized question", () => {
    const a = askGame(game, "what is the airspeed of a swallow");
    expect(a.answer).toMatch(/Game 3/);
  });
});
