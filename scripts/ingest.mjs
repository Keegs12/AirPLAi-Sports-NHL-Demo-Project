/**
 * ingest.mjs — replace the committed seed with LIVE MoneyPuck data.
 * -----------------------------------------------------------------------------
 * The seed snapshot (scripts/generate-seed.mjs) exists so the demo runs offline
 * and renders identically every time. When you want real, current data, run:
 *
 *     node scripts/ingest.mjs            # latest available season
 *     node scripts/ingest.mjs 2023       # a specific season (start year)
 *
 * MoneyPuck publishes public CSVs. Skater/team season files are plain CSV; the
 * per-shot file ships as a zip. This script pulls skaters + teams directly and
 * documents the shots path. It writes the same JSON shape the app already reads,
 * so NOTHING in src/ changes.
 *
 * Note: run this from your own machine — moneypuck.com must be reachable. The
 * demo's build/CI does NOT depend on it.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

const season = process.argv[2] || "2023"; // MoneyPuck keys seasons by start year
const BASE = "https://moneypuck.com/moneypuck/playerData/seasonSummary";
const SKATERS_URL = `${BASE}/${season}/regular/skaters.csv`;
const TEAMS_URL = `${BASE}/${season}/regular/teams.csv`;
// Per-shot data (zip): https://peter-tanner.com/moneypuck/downloads/shots_${season}.zip
// Unzip, then map columns: xCordAdjusted, yCordAdjusted, shotType, xGoal, goal,
// event, shotDistance, team, shooterName, period -> data/shots.json.

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.map((line) => {
    // handles simple quoted fields
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, ""));
    const row = {};
    cols.forEach((c, i) => (row[c] = cells[i]));
    return row;
  });
}

async function getCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return parseCsv(await res.text());
}

const num = (v) => (v === "" || v == null ? 0 : Number(v));

async function main() {
  console.log(`[ingest] pulling MoneyPuck season ${season} ...`);
  const [skRows, tmRows] = await Promise.all([getCsv(SKATERS_URL), getCsv(TEAMS_URL)]);

  // MoneyPuck rows are per-situation; keep "all" situations.
  const skaters = skRows
    .filter((r) => r.situation === "all")
    .map((r) => {
      const g = num(r.I_F_goals);
      const xg = num(r.I_F_xGoals);
      const ice = num(r.icetime);
      return {
        season: `${season}-${Number(season) + 1}`,
        name: r.name,
        team: r.team,
        position: r.position,
        games_played: num(r.games_played),
        icetime: ice,
        I_F_goals: g,
        I_F_primaryAssists: num(r.I_F_primaryAssists),
        I_F_secondaryAssists: num(r.I_F_secondaryAssists),
        I_F_points: num(r.I_F_points),
        I_F_shotsOnGoal: num(r.I_F_shotsOnGoal),
        I_F_xGoals: Number(xg.toFixed(1)),
        goalsAboveExpected: Number((g - xg).toFixed(1)),
        xG_per60: ice ? Number((xg / (ice / 3600)).toFixed(2)) : 0,
      };
    })
    .filter((s) => s.games_played >= 20)
    .sort((a, b) => b.I_F_points - a.I_F_points);

  const teams = tmRows
    .filter((r) => r.situation === "all")
    .map((r) => {
      const xgf = num(r.xGoalsFor), xga = num(r.xGoalsAgainst), gf = num(r.goalsFor);
      return {
        season: `${season}-${Number(season) + 1}`,
        team: r.team,
        name: r.team,
        games_played: num(r.games_played),
        xGoalsFor: Number(xgf.toFixed(0)),
        xGoalsAgainst: Number(xga.toFixed(0)),
        goalsFor: gf,
        goalsAgainst: num(r.goalsAgainst),
        xGoalsPct: Number(((100 * xgf) / (xgf + xga || 1)).toFixed(1)),
        corsiPct: Number(num(r.corsiPercentage ?? 0).toFixed(1)) * 100 || 0,
        points: num(r.points),
        finishingFor: Number((gf - xgf).toFixed(1)),
      };
    });

  writeFileSync(join(DATA_DIR, "skaters.json"), JSON.stringify(skaters, null, 2));
  writeFileSync(join(DATA_DIR, "teams.json"), JSON.stringify(teams, null, 2));
  console.log(`[ingest] wrote ${skaters.length} skaters, ${teams.length} teams.`);
  console.log(
    "[ingest] NOTE: per-shot coordinates come from shots_" +
      season +
      ".zip. Download + unzip it, then map its columns into data/shots.json " +
      "(see the comment block at the top of this file). Until then, shots.json keeps the seed snapshot."
  );
}

main().catch((err) => {
  console.error("[ingest] failed:", err.message);
  console.error("[ingest] keeping existing data. Are you online and is moneypuck.com reachable?");
  process.exit(1);
});
