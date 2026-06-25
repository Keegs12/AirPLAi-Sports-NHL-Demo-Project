import type { ShotType } from "./types";
import { teams, shotsForTeam, skatersForTeam, skaters, getTeam } from "./data";
import { summarizeShots, shotTypeBreakdown, topSkaters } from "./stats";

// ---------------------------------------------------------------------------
// PLAiChat translates a natural-language question into this structured query,
// then a deterministic answerer runs it over the data. The LLM (optional, see
// api/plaichat/route.ts) only produces the PlaiQuery JSON — it never invents
// numbers. The deterministic parser below is the zero-dependency fallback so
// the demo works with no API key.
// ---------------------------------------------------------------------------

export interface PlaiQuery {
  intent:
    | "team_summary"
    | "leaderboard"
    | "shot_type"
    | "high_danger"
    | "compare_teams"
    | "player"
    | "unknown";
  team?: string;
  team2?: string;
  metric?: "points" | "goals" | "xGoals" | "finishing" | "xG_per60";
  shotType?: ShotType;
  player?: string;
  limit?: number;
}

export interface PlaiClip {
  label: string;
  period: number;
  timestamp: string;
  xGoal: number;
}

export interface PlaiAnswer {
  answer: string;
  query: PlaiQuery;
  viz?: { kind: "filter_shots"; team?: string; shotType?: ShotType; highDangerOnly?: boolean };
  clips?: PlaiClip[];
  rows?: Array<Record<string, string | number>>;
}

const METRIC_WORDS: Record<string, PlaiQuery["metric"]> = {
  point: "points",
  goal: "goals",
  "expected goal": "xGoals",
  xg: "xGoals",
  finish: "finishing",
  overperform: "finishing",
  "above expected": "finishing",
  clutch: "finishing",
};

const SHOT_WORDS: Record<string, ShotType> = {
  wrist: "WRIST",
  snap: "SNAP",
  slap: "SLAP",
  backhand: "BACKHAND",
  tip: "TIP",
  deflect: "TIP",
  wrap: "WRAP",
};

/** Deterministic, dependency-free NL -> PlaiQuery parser. */
export function parseQuery(qRaw: string): PlaiQuery {
  const q = qRaw.toLowerCase();
  const query: PlaiQuery = { intent: "unknown" };

  // team match by abbreviation, city, or nickname
  const teamHits = teams.filter((t) => {
    const name = t.name.toLowerCase();
    const city = name.split(" ").slice(0, -1).join(" ");
    const nick = name.split(" ").slice(-1)[0];
    return (
      q.includes(t.team.toLowerCase()) ||
      q.includes(name) ||
      (city.length > 3 && q.includes(city)) ||
      (nick.length > 3 && q.includes(nick))
    );
  });
  if (teamHits[0]) query.team = teamHits[0].team;
  if (teamHits[1]) query.team2 = teamHits[1].team;

  // player match
  const playerHit = skaters.find((s) => {
    const parts = s.name.toLowerCase().split(" ");
    return q.includes(s.name.toLowerCase()) || parts.some((p) => p.length > 4 && q.includes(p));
  });
  if (playerHit) query.player = playerHit.name;

  // metric + shot type
  for (const [word, metric] of Object.entries(METRIC_WORDS)) if (q.includes(word)) query.metric = metric;
  for (const [word, type] of Object.entries(SHOT_WORDS)) if (q.includes(word)) query.shotType = type;

  // limit ("top 5")
  const m = q.match(/top\s+(\d+)/);
  if (m) query.limit = Math.min(20, parseInt(m[1], 10));

  // intent resolution (order matters)
  if (query.team && query.team2) query.intent = "compare_teams";
  else if (query.player) query.intent = "player";
  else if (q.includes("high danger") || q.includes("high-danger") || q.includes("slot")) query.intent = "high_danger";
  else if (query.shotType) query.intent = "shot_type";
  else if (/\b(top|best|leader|most|rank)\b/.test(q) || query.limit) query.intent = "leaderboard";
  else if (query.team) query.intent = "team_summary";

  return query;
}

const pad = (n: number) => String(n).padStart(2, "0");
function mockClips(team: string, opts: { shotType?: ShotType; highDangerOnly?: boolean }): PlaiClip[] {
  // Build credible "video clips" from the highest-xG goals matching the query.
  // In production these resolve to real timestamps in uploaded game film.
  return shotsForTeam(team)
    .filter((s) => s.goal === 1)
    .filter((s) => (opts.shotType ? s.shotType === opts.shotType : true))
    .filter((s) => (opts.highDangerOnly ? s.highDanger === 1 : true))
    .sort((a, b) => b.xGoal - a.xGoal)
    .slice(0, 4)
    .map((s) => ({
      label: `${s.shooterName} — ${s.shotType.toLowerCase()} goal`,
      period: s.period,
      timestamp: `P${s.period} ${pad(Math.floor(Math.random() * 20))}:${pad(Math.floor(Math.random() * 60))}`,
      xGoal: s.xGoal,
    }));
}

/** Run a PlaiQuery against the data. Pure given the static dataset. */
export function answerQuery(query: PlaiQuery): PlaiAnswer {
  switch (query.intent) {
    case "team_summary": {
      const t = getTeam(query.team!);
      const s = summarizeShots(shotsForTeam(query.team!));
      return {
        query,
        answer:
          `${t?.name}: ${s.goals} goals on ${s.shots} tracked shots (${s.shootingPct}% shooting, ` +
          `${s.xGoals} xG). Finishing ${s.finishing >= 0 ? "+" : ""}${s.finishing} vs expected. ` +
          `${s.highDangerPct}% of shots came from the high-danger slot.`,
        viz: { kind: "filter_shots", team: query.team },
        clips: mockClips(query.team!, {}),
      };
    }
    case "high_danger": {
      const team = query.team ?? teams[0].team;
      const all = shotsForTeam(team);
      const s = summarizeShots(all);
      return {
        query,
        answer:
          `${getTeam(team)?.name} generated ${s.highDangerShots} high-danger chances ` +
          `(${s.highDangerPct}% of shots), converting ${s.highDangerGoals} of them. The slot map is highlighted.`,
        viz: { kind: "filter_shots", team, highDangerOnly: true },
        clips: mockClips(team, { highDangerOnly: true }),
      };
    }
    case "shot_type": {
      const team = query.team ?? teams[0].team;
      const rows = shotTypeBreakdown(shotsForTeam(team));
      const row = rows.find((x) => x.type === query.shotType);
      return {
        query,
        answer: row
          ? `${getTeam(team)?.name} on ${query.shotType!.toLowerCase()} shots: ${row.goals} goals on ` +
            `${row.shots} attempts (${row.shootingPct}%), ${row.xGoals} xG.`
          : `No ${query.shotType} shots found for ${team}.`,
        viz: { kind: "filter_shots", team, shotType: query.shotType },
        clips: mockClips(team, { shotType: query.shotType }),
        rows,
      };
    }
    case "compare_teams": {
      const a = summarizeShots(shotsForTeam(query.team!));
      const b = summarizeShots(shotsForTeam(query.team2!));
      const ta = getTeam(query.team!), tb = getTeam(query.team2!);
      return {
        query,
        answer:
          `${ta?.name} vs ${tb?.name} — xG: ${a.xGoals} vs ${b.xGoals}; ` +
          `high-danger share: ${a.highDangerPct}% vs ${b.highDangerPct}%; ` +
          `finishing: ${a.finishing} vs ${b.finishing}.`,
        rows: [
          { team: ta!.name, xG: a.xGoals, "HD%": a.highDangerPct, finishing: a.finishing, shooting: a.shootingPct },
          { team: tb!.name, xG: b.xGoals, "HD%": b.highDangerPct, finishing: b.finishing, shooting: b.shootingPct },
        ],
      };
    }
    case "player": {
      const p = skaters.find((s) => s.name === query.player)!;
      return {
        query,
        answer:
          `${p.name} (${p.team}): ${p.I_F_goals}G–${p.I_F_primaryAssists + p.I_F_secondaryAssists}A ` +
          `(${p.I_F_points} pts), ${p.I_F_xGoals} xG, ${p.goalsAboveExpected >= 0 ? "+" : ""}` +
          `${p.goalsAboveExpected} goals above expected, ${p.xG_per60} xG/60.`,
        viz: { kind: "filter_shots", team: p.team },
      };
    }
    case "leaderboard": {
      const metricMap: Record<string, Parameters<typeof topSkaters>[1]> = {
        points: "I_F_points",
        goals: "I_F_goals",
        xGoals: "I_F_xGoals",
        finishing: "goalsAboveExpected",
        xG_per60: "xG_per60",
      };
      const key = metricMap[query.metric ?? "points"];
      const list = query.team ? skatersForTeam(query.team) : skaters;
      const top = topSkaters(list, key, query.limit ?? 5);
      return {
        query,
        answer: `Top ${top.length} by ${query.metric ?? "points"}${query.team ? ` for ${getTeam(query.team)?.name}` : " (league)"}.`,
        rows: top.map((s) => ({
          player: s.name,
          team: s.team,
          [query.metric ?? "points"]: (s as any)[key],
        })),
      };
    }
    default:
      return {
        query,
        answer:
          "Try: \u201cShow Colorado\u2019s high-danger chances\u201d, \u201cTop 5 by finishing\u201d, " +
          "\u201cCompare Carolina and Florida\u201d, or \u201cHow does Auston Matthews shoot?\u201d",
      };
  }
}

/** Convenience for the deterministic path. */
export function ask(question: string): PlaiAnswer {
  return answerQuery(parseQuery(question));
}
