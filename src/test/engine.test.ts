import { describe, it, expect } from "vitest";
import { parseQuery, answerQuery, ask } from "@/lib/query-engine";
import { summarizeShots, shotTypeBreakdown } from "@/lib/stats";
import { shotsForTeam, teams } from "@/lib/data";

describe("query parser", () => {
  it("routes high-danger questions to the high_danger intent with the right team", () => {
    const q = parseQuery("show me Colorado's high danger chances");
    expect(q.intent).toBe("high_danger");
    expect(q.team).toBe("COL");
  });

  it("parses a leaderboard with metric and limit", () => {
    const q = parseQuery("top 3 players by finishing");
    expect(q.intent).toBe("leaderboard");
    expect(q.metric).toBe("finishing");
    expect(q.limit).toBe(3);
  });

  it("detects a two-team comparison", () => {
    const q = parseQuery("compare Carolina and Florida");
    expect(q.intent).toBe("compare_teams");
    expect([q.team, q.team2].sort()).toEqual(["CAR", "FLA"]);
  });

  it("recognizes a player and a shot type", () => {
    expect(parseQuery("how does Auston Matthews shoot").player).toBe("Auston Matthews");
    expect(parseQuery("Boston wrist shots").shotType).toBe("WRIST");
  });
});

describe("answerer", () => {
  it("returns a leaderboard of the requested length", () => {
    const a = answerQuery(parseQuery("top 3 by goals"));
    expect(a.rows).toHaveLength(3);
  });

  it("high-danger answers emit a filtered shot-map viz directive", () => {
    const a = ask("Carolina high danger");
    expect(a.viz).toMatchObject({ kind: "filter_shots", team: "CAR", highDangerOnly: true });
  });

  it("falls back to guidance on an unparseable question", () => {
    expect(ask("what is the meaning of hockey").answer).toMatch(/Try:/);
  });
});

describe("stats are internally consistent", () => {
  it("shot-type breakdown shots sum to the team total", () => {
    const team = teams[0].team;
    const all = shotsForTeam(team);
    const sum = shotTypeBreakdown(all).reduce((a, r) => a + r.shots, 0);
    expect(sum).toBe(all.length);
  });

  it("summary goals never exceed shots and xG is positive", () => {
    const s = summarizeShots(shotsForTeam(teams[0].team));
    expect(s.goals).toBeLessThanOrEqual(s.shots);
    expect(s.xGoals).toBeGreaterThan(0);
  });

  it("league shooting rate is hockey-realistic (3%-15%)", () => {
    const all = teams.flatMap((t) => shotsForTeam(t.team));
    const s = summarizeShots(all);
    expect(s.shootingPct).toBeGreaterThan(3);
    expect(s.shootingPct).toBeLessThan(15);
  });
});
