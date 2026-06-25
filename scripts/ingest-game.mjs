/**
 * ingest-game.mjs
 * -----------------------------------------------------------------------------
 * The REAL per-game data path. Pulls live play-by-play from the public NHL API
 * for a given gameId and writes it in the SAME backbone shape the demo's hero
 * game uses (meta + rosters + events). After ingesting, run `npm run build:game`
 * to add the modeled layers (non-scoring synthesis is replaced by the real shots
 * here; box/goalie/tracking are still modeled until EDGE tracking is wired).
 *
 * Must run on a normal network (the cloud sandbox cannot reach nhle.com).
 *
 *   node scripts/ingest-game.mjs 2025030314          # an NHL gameId
 *
 * Why this exists: the hero game (2026 SCF Game 3) is an authored near-future
 * scenario, so its coordinates/times are representative. This script is how you
 * point the exact same UI at a REAL, already-played game with zero code changes —
 * the schema is identical, so data.ts / the replay engine just work.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const gameId = process.argv[2];
if (!gameId) {
  console.error("usage: node scripts/ingest-game.mjs <nhlGameId>   e.g. 2025030314");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = join(__dirname, "..", "data", "games");
mkdirSync(GAMES_DIR, { recursive: true });

const API = "https://api-web.nhle.com/v1";
const TYPE_MAP = { goal: "goal", "shot-on-goal": "shot", "missed-shot": "shot", "blocked-shot": "shot" };
const EVENT_MAP = { goal: "GOAL", "shot-on-goal": "SHOT", "missed-shot": "MISS", "blocked-shot": "BLOCK" };
const SHOT_TYPE = { wrist: "WRIST", snap: "SNAP", slap: "SLAP", backhand: "BACKHAND", "tip-in": "TIP", deflected: "TIP", "wrap-around": "WRAP" };

const toElapsed = (mmss) => { const [m, s] = mmss.split(":").map(Number); return m * 60 + s; };
// orient every shot toward the net at x=+89 (NHL coords span both ends)
const orient = (x, y) => (x < 0 ? { x: -x, y: -y } : { x, y });

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const pbp = await getJSON(`${API}/gamecenter/${gameId}/play-by-play`);
const players = new Map((pbp.rosterSpots ?? []).map((p) => [p.playerId, `${p.firstName?.default ?? ""} ${p.lastName?.default ?? ""}`.trim()]));
const teamAbbr = (id) => (id === pbp.homeTeam.id ? pbp.homeTeam.abbrev : pbp.awayTeam.abbrev);

const events = [];
let n = 0;
for (const play of pbp.plays ?? []) {
  const kind = TYPE_MAP[play.typeDescKey];
  if (!kind) continue;
  const d = play.details ?? {};
  const period = play.periodDescriptor?.number ?? 1;
  const clockElapsed = play.timeInPeriod ? toElapsed(play.timeInPeriod) : 0;
  const team = teamAbbr(d.eventOwnerTeamId);
  const { x, y } = orient(d.xCoord ?? 0, d.yCoord ?? 0);
  const shotType = SHOT_TYPE[d.shotType] ?? "WRIST";
  if (kind === "goal") {
    events.push({
      id: `nhl-${++n}`, period, clockElapsed, team, type: "goal",
      strength: d.strength ?? "EV",
      scorer: players.get(d.scoringPlayerId) ?? "Unknown",
      assists: [d.assist1PlayerId, d.assist2PlayerId].filter(Boolean).map((id) => players.get(id)),
      shotType, x, y, xG: 0, highDanger: 0, // xG/HD recomputed by build-game's model
      scoreAfter: { [pbp.homeTeam.abbrev]: d.homeScore ?? 0, [pbp.awayTeam.abbrev]: d.awayScore ?? 0 },
      detail: play.typeDescKey,
    });
  } else {
    events.push({
      id: `nhl-${++n}`, period, clockElapsed, team, type: "shot",
      shooter: players.get(d.shootingPlayerId ?? d.scoringPlayerId) ?? "Unknown",
      shotType, x, y, xG: 0, highDanger: 0,
      event: EVENT_MAP[play.typeDescKey], synthesized: false,
    });
  }
}

const out = {
  meta: {
    game: `${pbp.awayTeam.abbrev} @ ${pbp.homeTeam.abbrev} (gameId ${gameId})`,
    date: pbp.gameDate, venue: pbp.venue?.default ?? "",
    home: pbp.homeTeam.abbrev, away: pbp.awayTeam.abbrev,
    final: { [pbp.homeTeam.abbrev]: pbp.homeTeam.score ?? 0, [pbp.awayTeam.abbrev]: pbp.awayTeam.score ?? 0 },
    decision: pbp.gameOutcome?.lastPeriodType ?? "REG",
    source: `Real NHL API play-by-play (api-web.nhle.com/v1/gamecenter/${gameId}). Coordinates/times are exact.`,
  },
  // rosters by side, deduped from the play-by-play roster spots
  rosters: rostersFrom(pbp),
  events,
};

const file = join(GAMES_DIR, `ingested-${gameId}.json`);
writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`Ingested ${events.length} events -> ${file}`);
console.log(`Next: point src/lib/game-data.ts at this file (or copy over the backbone), then 'npm run build:game'.`);

function rostersFrom(pbp) {
  const r = {};
  for (const side of [pbp.awayTeam, pbp.homeTeam]) r[side.abbrev] = { F: [], D: [], G: [] };
  for (const p of pbp.rosterSpots ?? []) {
    const abbr = teamAbbr(p.teamId);
    const name = `${p.firstName?.default ?? ""} ${p.lastName?.default ?? ""}`.trim();
    const grp = p.positionCode === "G" ? "G" : p.positionCode === "D" ? "D" : "F";
    if (r[abbr] && !r[abbr][grp].includes(name)) r[abbr][grp].push(name);
  }
  return r;
}
