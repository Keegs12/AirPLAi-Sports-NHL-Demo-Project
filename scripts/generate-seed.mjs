/**
 * generate-seed.mjs
 * -----------------------------------------------------------------------------
 * Produces the committed seed dataset under /data. It is deterministic (seeded
 * RNG) so the demo renders identically on every machine and never depends on a
 * live network call at demo time.
 *
 * The SCHEMA mirrors MoneyPuck's public CSVs (skaters / teams / shots) so that
 * scripts/ingest.mjs can drop real data in with no code changes. See
 * docs/TECHNICAL_WRITEUP.md for the "seed vs. live" rationale.
 *
 * Team/skater season aggregates are realistic 2023-24 regular-season figures.
 * Per-shot events are SYNTHESIZED from a hockey-accurate spatial model (slot /
 * home-plate high-danger area, point shots from the blue line, tips at the
 * crease) so the shot map looks and behaves like a real NHL shot map. This is
 * the only synthesized layer; swap in shots_YYYY.zip via ingest.mjs for real
 * coordinates.
 *
 * Run:  node scripts/generate-seed.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  rng,
  gauss as gaussRaw,
  round,
  shotTypeProfile,
  sampleLocation,
  expectedGoals,
  isHighDanger,
  NET_X,
  NET_Y,
} from "./lib/xg-model.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

const SEASON = "2023-2024";

// Shared xG/spatial model (scripts/lib/xg-model.mjs) so the season seed and the
// per-game enrichment compute shots identically. Bind our seeded RNG (73) to
// the model's rand-taking helpers.
const rand = rng(73);
const gauss = (m, s) => gaussRaw(rand, m, s);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// --- teams: realistic 2023-24 regular-season aggregates ----------------------
// xGF/xGA are all-situations season totals; points are standings points.
const TEAMS = [
  { team: "DAL", name: "Dallas Stars",            xGoalsFor: 262, xGoalsAgainst: 224, goalsFor: 290, goalsAgainst: 233, points: 113, corsiPct: 53.1 },
  { team: "FLA", name: "Florida Panthers",        xGoalsFor: 255, xGoalsAgainst: 210, goalsFor: 268, goalsAgainst: 200, points: 110, corsiPct: 54.6 },
  { team: "CAR", name: "Carolina Hurricanes",     xGoalsFor: 268, xGoalsAgainst: 205, goalsFor: 259, goalsAgainst: 219, points: 111, corsiPct: 57.2 },
  { team: "VAN", name: "Vancouver Canucks",       xGoalsFor: 244, xGoalsAgainst: 233, goalsFor: 279, goalsAgainst: 222, points: 109, corsiPct: 49.8 },
  { team: "WPG", name: "Winnipeg Jets",           xGoalsFor: 236, xGoalsAgainst: 207, goalsFor: 259, goalsAgainst: 199, points: 110, corsiPct: 50.4 },
  { team: "BOS", name: "Boston Bruins",           xGoalsFor: 248, xGoalsAgainst: 219, goalsFor: 267, goalsAgainst: 226, points: 109, corsiPct: 51.9 },
  { team: "COL", name: "Colorado Avalanche",      xGoalsFor: 271, xGoalsAgainst: 236, goalsFor: 303, goalsAgainst: 254, points: 107, corsiPct: 54.0 },
  { team: "EDM", name: "Edmonton Oilers",         xGoalsFor: 266, xGoalsAgainst: 228, goalsFor: 294, goalsAgainst: 244, points: 104, corsiPct: 53.7 },
  { team: "NYR", name: "New York Rangers",        xGoalsFor: 241, xGoalsAgainst: 231, goalsFor: 281, goalsAgainst: 222, points: 114, corsiPct: 49.1 },
  { team: "NSH", name: "Nashville Predators",     xGoalsFor: 245, xGoalsAgainst: 232, goalsFor: 264, goalsAgainst: 230, points: 99,  corsiPct: 50.6 },
  { team: "TOR", name: "Toronto Maple Leafs",     xGoalsFor: 259, xGoalsAgainst: 238, goalsFor: 303, goalsAgainst: 253, points: 102, corsiPct: 52.4 },
  { team: "TBL", name: "Tampa Bay Lightning",     xGoalsFor: 252, xGoalsAgainst: 240, goalsFor: 287, goalsAgainst: 255, points: 98,  corsiPct: 51.1 },
  { team: "LAK", name: "Los Angeles Kings",       xGoalsFor: 247, xGoalsAgainst: 205, goalsFor: 262, goalsAgainst: 222, points: 99,  corsiPct: 54.3 },
  { team: "VGK", name: "Vegas Golden Knights",    xGoalsFor: 250, xGoalsAgainst: 224, goalsFor: 260, goalsAgainst: 240, points: 98,  corsiPct: 52.0 },
  { team: "NJD", name: "New Jersey Devils",       xGoalsFor: 256, xGoalsAgainst: 251, goalsFor: 271, goalsAgainst: 281, points: 81,  corsiPct: 52.8 },
  { team: "DET", name: "Detroit Red Wings",       xGoalsFor: 243, xGoalsAgainst: 246, goalsFor: 278, goalsAgainst: 263, points: 91,  corsiPct: 50.9 },
];

// --- skaters: realistic 2023-24 individual lines -----------------------------
// I_F_* = individual "for" totals (MoneyPuck naming). icetime in seconds.
const SKATERS = [
  { name: "Nikita Kucherov",   team: "TBL", pos: "R", games: 81, goals: 44, primaryAssists: 78, secondaryAssists: 22, shots: 290, ixG: 32.1, icetime: 81*1230 },
  { name: "Nathan MacKinnon",  team: "COL", pos: "C", games: 82, goals: 51, primaryAssists: 60, secondaryAssists: 29, shots: 423, ixG: 41.7, icetime: 82*1335 },
  { name: "Connor McDavid",    team: "EDM", pos: "C", games: 76, goals: 32, primaryAssists: 71, secondaryAssists: 29, shots: 256, ixG: 27.8, icetime: 76*1320 },
  { name: "Auston Matthews",   team: "TOR", pos: "C", games: 81, goals: 69, primaryAssists: 28, secondaryAssists: 19, shots: 348, ixG: 44.9, icetime: 81*1290 },
  { name: "Artemi Panarin",    team: "NYR", pos: "L", games: 82, goals: 49, primaryAssists: 51, secondaryAssists: 20, shots: 282, ixG: 30.4, icetime: 82*1185 },
  { name: "David Pastrnak",    team: "BOS", pos: "R", games: 82, goals: 47, primaryAssists: 45, secondaryAssists: 18, shots: 357, ixG: 35.2, icetime: 82*1230 },
  { name: "Leon Draisaitl",    team: "EDM", pos: "C", games: 81, goals: 41, primaryAssists: 50, secondaryAssists: 15, shots: 245, ixG: 28.0, icetime: 81*1305 },
  { name: "Sam Reinhart",      team: "FLA", pos: "C", games: 82, goals: 57, primaryAssists: 21, secondaryAssists: 16, shots: 263, ixG: 33.6, icetime: 82*1140 },
  { name: "Mikko Rantanen",    team: "COL", pos: "R", games: 80, goals: 42, primaryAssists: 41, secondaryAssists: 21, shots: 280, ixG: 31.0, icetime: 80*1245 },
  { name: "Cale Makar",        team: "COL", pos: "D", games: 77, goals: 21, primaryAssists: 44, secondaryAssists: 25, shots: 222, ixG: 16.9, icetime: 77*1545 },
  { name: "Quinn Hughes",      team: "VAN", pos: "D", games: 82, goals: 17, primaryAssists: 53, secondaryAssists: 22, shots: 188, ixG: 12.4, icetime: 82*1500 },
  { name: "Roman Josi",        team: "NSH", pos: "D", games: 82, goals: 23, primaryAssists: 39, secondaryAssists: 23, shots: 246, ixG: 14.1, icetime: 82*1560 },
  { name: "J.T. Miller",       team: "VAN", pos: "C", games: 81, goals: 37, primaryAssists: 42, secondaryAssists: 24, shots: 211, ixG: 24.8, icetime: 81*1230 },
  { name: "Jake Guentzel",     team: "CAR", pos: "L", games: 67, goals: 30, primaryAssists: 28, secondaryAssists: 19, shots: 198, ixG: 23.1, icetime: 67*1170 },
  { name: "Sebastian Aho",     team: "CAR", pos: "C", games: 79, goals: 36, primaryAssists: 33, secondaryAssists: 20, shots: 250, ixG: 26.7, icetime: 79*1215 },
  { name: "Jason Robertson",   team: "DAL", pos: "L", games: 82, goals: 29, primaryAssists: 40, secondaryAssists: 11, shots: 247, ixG: 25.9, icetime: 82*1155 },
  { name: "Wyatt Johnston",    team: "DAL", pos: "C", games: 82, goals: 32, primaryAssists: 23, secondaryAssists: 10, shots: 195, ixG: 22.4, icetime: 82*1020 },
  { name: "Kyle Connor",       team: "WPG", pos: "L", games: 65, goals: 34, primaryAssists: 25, secondaryAssists: 11, shots: 215, ixG: 24.0, icetime: 65*1185 },
  { name: "Mark Scheifele",    team: "WPG", pos: "C", games: 74, goals: 28, primaryAssists: 32, secondaryAssists: 12, shots: 178, ixG: 19.9, icetime: 74*1170 },
  { name: "Adrian Kempe",      team: "LAK", pos: "C", games: 82, goals: 28, primaryAssists: 26, secondaryAssists: 21, shots: 271, ixG: 25.3, icetime: 82*1140 },
];

// --- per-shot event synthesis (hockey-accurate spatial model) ----------------
// The model itself lives in scripts/lib/xg-model.mjs; here we just draw shots.
function buildShotsForTeam(team, totalShots, shooters) {
  const out = [];
  const n = Math.round(totalShots);
  for (let i = 0; i < n; i++) {
    const type = shotTypeProfile(rand);
    const { x, y } = sampleLocation(rand, type);
    const xg = expectedGoals(x, y, type);
    const goal = rand() < xg;                        // outcomes track xG directly
    let event = "SHOT";
    if (goal) event = "GOAL";
    else if (rand() < 0.16) event = "MISS";
    else if (rand() < 0.14) event = "BLOCK";
    out.push({
      team,
      season: SEASON,
      shooterName: pick(shooters),
      period: 1 + Math.floor(rand() * 3),
      xCordAdjusted: round(x, 1),
      yCordAdjusted: round(y, 1),
      shotType: type,
      shotDistance: round(Math.sqrt((NET_X - x) ** 2 + (NET_Y - y) ** 2), 1),
      xGoal: round(xg, 3),
      goal: goal ? 1 : 0,
      event,
      highDanger: isHighDanger(x, y) ? 1 : 0,
    });
  }
  return out;
}

// --- assemble ----------------------------------------------------------------
const skatersBySeason = SKATERS.map((s) => {
  const points = s.goals + s.primaryAssists + s.secondaryAssists;
  return {
    season: SEASON,
    name: s.name,
    team: s.team,
    position: s.pos,
    games_played: s.games,
    icetime: s.icetime,
    I_F_goals: s.goals,
    I_F_primaryAssists: s.primaryAssists,
    I_F_secondaryAssists: s.secondaryAssists,
    I_F_points: points,
    I_F_shotsOnGoal: s.shots,
    I_F_xGoals: s.ixG,
    // finishing = goals above expected (a real, intuitive investor metric)
    goalsAboveExpected: round(s.goals - s.ixG, 1),
    xG_per60: round((s.ixG / (s.icetime / 3600)), 2),
  };
});

const teamsBySeason = TEAMS.map((t) => ({
  season: SEASON,
  team: t.team,
  name: t.name,
  games_played: 82,
  xGoalsFor: t.xGoalsFor,
  xGoalsAgainst: t.xGoalsAgainst,
  goalsFor: t.goalsFor,
  goalsAgainst: t.goalsAgainst,
  xGoalsPct: round((100 * t.xGoalsFor) / (t.xGoalsFor + t.xGoalsAgainst), 1),
  corsiPct: t.corsiPct,
  points: t.points,
  finishingFor: round(t.goalsFor - t.xGoalsFor, 1),
}));

// shots: scale per-team count to ~8% of season xGF magnitude for a demo-sized file
const shooterByTeam = {};
for (const s of SKATERS) (shooterByTeam[s.team] ||= []).push(s.name);
let shots = [];
for (const t of TEAMS) {
  const shooters = shooterByTeam[t.team] || [`${t.team} skater`];
  // ~220 shot events per team keeps data/shots.json light but the map dense
  shots = shots.concat(buildShotsForTeam(t.team, 220, shooters));
}

writeFileSync(join(DATA_DIR, "teams.json"), JSON.stringify(teamsBySeason, null, 2));
writeFileSync(join(DATA_DIR, "skaters.json"), JSON.stringify(skatersBySeason, null, 2));
writeFileSync(join(DATA_DIR, "shots.json"), JSON.stringify(shots, null, 2));
writeFileSync(
  join(DATA_DIR, "meta.json"),
  JSON.stringify(
    {
      season: SEASON,
      generatedAt: new Date().toISOString(),
      source: "Seed snapshot. Aggregates: realistic 2023-24 MoneyPuck figures. " +
        "Per-shot coordinates: synthesized from a hockey-accurate spatial model. " +
        "Run scripts/ingest.mjs to replace with live MoneyPuck data.",
      counts: { teams: teamsBySeason.length, skaters: skatersBySeason.length, shots: shots.length },
    },
    null,
    2
  )
);

console.log(
  `Seed written: ${teamsBySeason.length} teams, ${skatersBySeason.length} skaters, ${shots.length} shots -> ${DATA_DIR}`
);
