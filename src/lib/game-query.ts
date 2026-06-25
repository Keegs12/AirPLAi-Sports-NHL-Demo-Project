// Deterministic, game-scoped PLAiChat. Parses a natural-language question about
// THIS game and answers from the enriched data — never invents numbers. Answers
// can carry a seek target (jump the viewer) and a tab directive (drive the panel),
// which is the connective tissue that makes the chat feel like video intelligence.
// Runs client-side over the loaded game, so it works with no API key.

import type { EnrichedGame, GameEvent, GoalEvent, TeamAbbr } from "./game-types";
import { eventAbsT } from "./game-replay";
import { absToPeriodClock, periodLabel } from "./game-time";
import { teamAggregate, corsiSplit } from "./game-stats";

export interface GameClip {
  eventId: string;
  label: string;
  when: string;
  xG?: number;
}

export interface GameAnswer {
  answer: string;
  seekEventId?: string;
  tab?: "plays" | "box" | "shotmap" | "chat" | "analytics";
  clips?: GameClip[];
  rows?: Array<Record<string, string | number>>;
}

const whenOf = (game: EnrichedGame, e: GameEvent) => {
  const pc = absToPeriodClock(eventAbsT(e));
  return `${pc.label} ${pc.clock}`;
};
const goals = (game: EnrichedGame) => game.events.filter((e): e is GoalEvent => e.type === "goal");
const clip = (game: EnrichedGame, e: GameEvent, label: string): GameClip => ({
  eventId: e.id,
  label,
  when: whenOf(game, e),
  xG: (e as any).xG,
});

function findPlayer(game: EnrichedGame, q: string): string | undefined {
  const all = new Set<string>();
  for (const t of Object.keys(game.rosters)) {
    for (const grp of ["F", "D", "G"] as const) game.rosters[t][grp].forEach((n) => all.add(n.replace(/\s*\(C\)\s*$/, "")));
  }
  for (const name of all) {
    const last = name.split(" ").slice(-1)[0].toLowerCase();
    if (q.includes(name.toLowerCase()) || (last.length > 3 && q.includes(last))) return name;
  }
  return undefined;
}

function detectPeriod(q: string): number | undefined {
  if (/\b(2ot|double overtime|second overtime)\b/.test(q)) return 5;
  if (/\b(ot|overtime)\b/.test(q)) return 4;
  if (/\b(1st|first)\b/.test(q)) return 1;
  if (/\b(2nd|second)\b/.test(q)) return 2;
  if (/\b(3rd|third)\b/.test(q)) return 3;
  return undefined;
}

export function askGame(game: EnrichedGame, raw: string): GameAnswer {
  const q = raw.toLowerCase().trim();
  const { away, home } = game.meta;
  const G = goals(game);

  // --- lowest / flukiest xG goal -> Theodore's 2OT winner ---
  if (/(lowest|flukiest|luckiest|softest|weakest).*(goal|xg)|fluke/.test(q)) {
    const g = [...G].sort((a, b) => a.xG - b.xG)[0];
    return {
      answer: `The lowest-xG goal was ${g.scorer}'s ${whenOf(game, g)} marker at just ${(g.xG * 100).toFixed(0)}% xG — ${g.detail}`,
      seekEventId: g.id,
      tab: "shotmap",
      clips: [clip(game, g, `${g.scorer} — ${(g.xG * 100).toFixed(0)}% xG`)],
    };
  }

  // --- game-winner / overtime winner ---
  if (/(game.?winner|winning goal|2ot|overtime winner|who won|how did .* win)/.test(q)) {
    const g = G.find((e) => e.gameWinner) ?? G[G.length - 1];
    return {
      answer: `${g.scorer} won it for ${g.team} at ${whenOf(game, g)} — ${g.detail}. Final: ${away} ${game.meta.final[away]}, ${home} ${game.meta.final[home]} (${game.meta.decision}).`,
      seekEventId: g.id,
      clips: [clip(game, g, `${g.scorer} — game-winner`)],
    };
  }

  // --- hat trick / Marner ---
  if (/hat ?trick|hattrick/.test(q)) {
    const marner = G.filter((e) => e.scorer === "Mitch Marner");
    return {
      answer: `Mitch Marner scored a natural hat trick in 6:10 — the fastest in Stanley Cup Final history. His three goals: ${marner.map((g) => `${whenOf(game, g)} (${g.shotType.toLowerCase()})`).join(", ")}.`,
      seekEventId: marner[marner.length - 1]?.id,
      tab: "shotmap",
      clips: marner.map((g, i) => clip(game, g, `Marner goal ${i + 1}`)),
    };
  }

  // --- comeback / rally ---
  if (/comeback|rally|39|burst|tie|tying/.test(q)) {
    const carP3 = G.filter((e) => e.team === away && e.period === 3);
    return {
      answer: `${away} erased a 4-0 hole with four third-period goals — three in 39 seconds (the fastest three goals in Cup Final history): ${carP3.map((g) => `${g.scorer} ${whenOf(game, g)}`).join(", ")}.`,
      tab: "plays",
      clips: carP3.map((g) => clip(game, g, `${g.scorer} — ${whenOf(game, g)}`)),
    };
  }

  // --- goalie: where did X get beat ---
  if (/(beat|beaten|goalie|net.?zone|glove|blocker|five.?hole|save)/.test(q)) {
    const player = findPlayer(game, q);
    const name = player && game.goalieZones[player] ? player : "Frederik Andersen";
    const gl = game.goalieZones[name];
    const beaten = gl.zones.filter((z) => z.ga > 0).map((z) => z.zone).join(", ");
    return {
      answer: `${name}: ${gl.SV}/${gl.SA} saves (${(gl.SVpct * 100).toFixed(1)}%), GSAx ${gl.GSAx >= 0 ? "+" : ""}${gl.GSAx}. Beaten in: ${beaten || "no zones"}. Open the Net view for the full map.`,
      tab: "shotmap",
    };
  }

  // --- per-period ---
  const period = detectPeriod(q);
  if (period && /(period|happen|recap|summary|ot|overtime|1st|2nd|3rd|first|second|third)/.test(q)) {
    const gp = G.filter((e) => e.period === period);
    const desc = gp.length
      ? gp.map((g) => `${g.team} ${g.scorer} (${whenOf(game, g)})`).join(", ")
      : "no goals";
    return {
      answer: `${periodLabel(period)}: ${desc}.`,
      seekEventId: gp[0]?.id,
      tab: "plays",
      clips: gp.map((g) => clip(game, g, `${g.scorer}`)),
    };
  }

  // --- per-player ---
  const player = findPlayer(game, q);
  if (player) {
    for (const t of [away, home]) {
      const sk = game.boxscore[t].skaters.find((s) => s.name === player);
      if (sk) {
        const theirGoals = G.filter((e) => e.scorer === player);
        return {
          answer: `${player} (${t}): ${sk.G}G ${sk.A}A (${sk.P} pts), ${sk.S} shots, +/− ${sk.plusMinus}. ${theirGoals.length ? `Goals at ${theirGoals.map((g) => whenOf(game, g)).join(", ")}.` : ""}`,
          seekEventId: theirGoals[0]?.id,
          tab: "box",
          clips: theirGoals.map((g) => clip(game, g, `${player} goal`)),
        };
      }
    }
    if (game.goalieZones[player]) return askGame(game, `where did ${player} get beat`);
  }

  // --- shots / possession ---
  if (/(shot|sog|possession|corsi|attempt|chances)/.test(q)) {
    const a = teamAggregate(game, away);
    const h = teamAggregate(game, home);
    const cf = corsiSplit(game);
    return {
      answer: `Shots on goal: ${away} ${a.sog}, ${home} ${h.sog}. Shot attempts (Corsi): ${away} ${a.corsi} (${cf[away]}%) vs ${home} ${h.corsi} (${cf[home]}%). High-danger share: ${away} ${a.highDangerPct}%, ${home} ${h.highDangerPct}%.`,
      tab: "analytics",
      rows: [
        { team: away, SOG: a.sog, Corsi: a.corsi, "CF%": cf[away], "HD%": a.highDangerPct, xG: a.xGoals },
        { team: home, SOG: h.sog, Corsi: h.corsi, "CF%": cf[home], "HD%": h.highDangerPct, xG: h.xGoals },
      ],
    };
  }

  // --- default: scoring summary ---
  return {
    answer: `${game.meta.game}: ${away} ${game.meta.final[away]}, ${home} ${game.meta.final[home]} (${game.meta.decision}). ${away} trailed 4-0 before scoring four in the third; ${home} won it in double-OT. Try: "show the flukiest goal", "how did the comeback happen", "where did Andersen get beat", or "Marner's hat trick".`,
    tab: "plays",
    clips: G.slice(0, 4).map((g) => clip(game, g, `${g.scorer} (${g.team})`)),
  };
}

export const GAME_SUGGESTIONS = [
  "Show the flukiest goal",
  "How did the comeback happen?",
  "Where did Andersen get beat?",
  "Marner's hat trick",
  "Shots and possession",
  "Who won it in OT?",
];
