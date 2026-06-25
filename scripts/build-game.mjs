/**
 * build-game.mjs
 * -----------------------------------------------------------------------------
 * Enriches the real Game 3 event backbone (data/games/scf-2026-game3.json) into
 * a self-contained, demo-ready file (…enriched.json) that the live-replay UI
 * consumes. The real scoring events are kept verbatim; everything synthesized is
 * generated deterministically from the SHARED xG/spatial model (scripts/lib/
 * xg-model.mjs) and clearly labeled so the UI can mark it "modeled."
 *
 * Adds:
 *   1. Non-scoring shot attempts   — so the live shot map fills as the clock runs.
 *                                     P1 on-goal totals hit meta.p1Shots exactly.
 *   2. Box-score lines             — G/A real from goals, S/SM consistent with the
 *                                     synthesized attempts, rest modeled.
 *   3. Goalie net-zone save maps   — the flagship CV-only surface (glove/blocker/
 *                                     five-hole), with each goal mapped to a zone.
 *   4. 5-on-5 tracking frames      — a believable on-ice snapshot per event so the
 *                                     animated rink view can interpolate motion.
 *
 * Run:  node scripts/build-game.mjs   (or: npm run build:game)
 */
import { readFileSync, writeFileSync } from "node:fs";
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
  shotDistance,
} from "./lib/xg-model.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = join(__dirname, "..", "data", "games");
const SRC = join(GAMES_DIR, "scf-2026-game3.json");
const OUT = join(GAMES_DIR, "scf-2026-game3.enriched.json");

const game = JSON.parse(readFileSync(SRC, "utf8"));
const { meta, rosters } = game;
const HOME = meta.home; // VGK
const AWAY = meta.away; // CAR
const TEAMS = [AWAY, HOME];

// --- deterministic RNG -------------------------------------------------------
const rand = rng(2026);
const gauss = (m, s) => gaussRaw(rand, m, s);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickW = (arr, weights) => {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
};
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// --- timeline (mirror of src/lib/game-time.ts) -------------------------------
const SEG = { 1: 0, 2: 1200, 3: 2400, 4: 3600, 5: 4800 };
const absT = (period, clockElapsed) => SEG[period] + clockElapsed;

// --- names + jersey numbers --------------------------------------------------
const clean = (n) => n.replace(/\s*\(C\)\s*$/, "").trim();
const NUMBERS = {
  // Carolina — from the ESPN box-score reference where names match
  "Sebastian Aho": 20, "Andrei Svechnikov": 37, "Seth Jarvis": 24, "Jordan Staal": 11,
  "Nikolaj Ehlers": 27, "Logan Stankoven": 22, "Taylor Hall": 71, "Jackson Blake": 53,
  "Jordan Martinook": 48, "Mark Jankowski": 77, "William Carrier": 28, "Jaccob Slavin": 74,
  "Shayne Gostisbehere": 4, "Sean Walker": 26, "Jalen Chatfield": 5, "Eric Robinson": 50,
  "Frederik Andersen": 31, "Brandon Bussi": 32,
  // Vegas
  "Jack Eichel": 9, "Mitch Marner": 93, "Tomas Hertl": 48, "William Karlsson": 71,
  "Ivan Barbashev": 49, "Brett Howden": 21, "Pavel Dorofeyev": 16, "Colton Sissons": 59,
  "Cole Smith": 28, "Mark Stone": 61, "Shea Theodore": 27, "Brayden McNabb": 3,
  "Noah Hanifin": 15, "Alex Pietrangelo": 7, "Carter Hart": 79,
};
const CENTERS = new Set([
  "Sebastian Aho", "Jordan Staal", "Logan Stankoven", "Mark Jankowski",
  "Jack Eichel", "William Karlsson", "Brett Howden", "Colton Sissons",
]);

// roster, cleaned, by team
const ROST = {};
for (const t of TEAMS) {
  ROST[t] = {
    F: rosters[t].F.map(clean),
    D: rosters[t].D.map(clean),
    G: rosters[t].G.map(clean),
  };
}
const posOf = (team, name) =>
  ROST[team].D.includes(name) ? "D" : ROST[team].G.includes(name) ? "G" : CENTERS.has(name) ? "C" : "F";

// shooter weighting: forwards more than D; a few stars weighted up for realism
const STAR = new Set(["Mitch Marner", "Jack Eichel", "Sebastian Aho", "Andrei Svechnikov", "Seth Jarvis", "Tomas Hertl"]);
function shooterPool(team) {
  const names = [...ROST[team].F, ...ROST[team].D];
  const weights = names.map((n) =>
    (ROST[team].D.includes(n) ? 0.5 : 1) * (STAR.has(n) ? 2.2 : 1)
  );
  return { names, weights };
}

// --- 1. non-scoring shot attempts -------------------------------------------
// On-goal shots-on-goal per period per team (INCLUDING goals). P1 is the known
// real total (meta.p1Shots); the rest are representative of the game's flow
// (Vegas dominant in P2, Carolina pushing in P3, two overtimes).
const PERIOD_SOG = {
  [AWAY]: { 1: meta.p1Shots[AWAY], 2: 6, 3: 15, 4: 5, 5: 4 }, // CAR
  [HOME]: { 1: meta.p1Shots[HOME], 2: 13, 3: 6, 4: 4, 5: 6 }, // VGK
};
const PERIOD_MAX = { 1: 1200, 2: 1200, 3: 1200, 4: 1200, 5: 360 }; // OT2 ended at 338s

const goalEvents = game.events.filter((e) => e.type === "goal");
const goalsByPeriodTeam = (period, team) =>
  goalEvents.filter((e) => e.period === period && e.team === team).length;

let synthId = 0;
const nextId = () => `s3-${String(++synthId).padStart(3, "0")}`;

function makeAttempt(team, period, onGoal) {
  const { names, weights } = shooterPool(team);
  const shooter = pickW(names, weights);
  const type = shotTypeProfile(rand);
  const { x, y } = sampleLocation(rand, type);
  const xg = expectedGoals(x, y, type);
  let event;
  if (onGoal) event = "SHOT";
  else event = rand() < 0.46 ? "MISS" : "BLOCK"; // missed net vs blocked attempt
  const clockElapsed = round(clampN(gauss(PERIOD_MAX[period] / 2, PERIOD_MAX[period] / 4), 8, PERIOD_MAX[period] - 8), 0);
  return {
    id: nextId(),
    period,
    clockElapsed,
    team,
    type: "shot",
    shooter,
    shotType: type,
    x: round(x, 1),
    y: round(y, 1),
    xG: round(xg, 3),
    highDanger: isHighDanger(x, y) ? 1 : 0,
    event,
    synthesized: true,
  };
}

const attempts = [];
for (const team of TEAMS) {
  for (const period of [1, 2, 3, 4, 5]) {
    const sog = PERIOD_SOG[team][period];
    const goalsP = goalsByPeriodTeam(period, team);
    const savedOnGoal = Math.max(0, sog - goalsP); // on-goal shots the goalie saved
    for (let i = 0; i < savedOnGoal; i++) attempts.push(makeAttempt(team, period, true));
    // additional Corsi attempts (missed / blocked) for shot-map density + possession
    const extra = Math.round(sog * 0.55);
    for (let i = 0; i < extra; i++) attempts.push(makeAttempt(team, period, false));
  }
}

// Give the penalty shot a location + xG so it renders on the map (saved => goal 0)
for (const e of game.events) {
  if (e.type === "penalty_shot") {
    e.x = 82;
    e.y = 0;
    e.shotType = "WRIST";
    e.xG = 0.33; // penalty shots convert ~33%
    e.highDanger = 1;
  }
}

// --- merged, time-sorted event stream ---------------------------------------
const events = [...game.events, ...attempts].sort(
  (a, b) => absT(a.period, a.clockElapsed) - absT(b.period, b.clockElapsed)
);

// helper: is an event a shot-on-goal? (goal, saved penalty shot, or on-goal attempt)
const isShotOnGoal = (e) =>
  e.type === "goal" || e.type === "penalty_shot" || (e.type === "shot" && e.event === "SHOT");
const shooterName = (e) => e.scorer ?? e.shooter;

// --- 2. box-score lines ------------------------------------------------------
// G/A are REAL (from the goal events). S/SM are consistent with the synthesized
// attempts. Everything else is modeled (seeded) and flagged for the UI.
function buildSkaterLines(team) {
  const names = [...ROST[team].F, ...ROST[team].D];
  return names.map((name) => {
    const pos = posOf(team, name);
    const isD = pos === "D";
    const isC = pos === "C";

    // real scoring
    const g = goalEvents.filter((e) => e.team === team && clean(e.scorer) === name).length;
    const a = goalEvents.filter((e) => e.team === team && (e.assists || []).map(clean).includes(name)).length;

    // shots consistent with the synthesized stream
    const myShots = events.filter((e) => e.type === "shot" && e.team === team && e.shooter === name);
    const s = g + myShots.filter((e) => e.event === "SHOT").length; // shots on goal incl goals
    const sm = myShots.filter((e) => e.event === "MISS").length;

    // modeled physical / usage line (seeded, plausible for an 85-min 2OT game)
    const toi = Math.round(isD ? gauss(1750, 280) : gauss(1180, 240)); // seconds
    const ppToi = Math.round(clampN(gauss(isD ? 150 : 110, 70), 0, 320));
    const shToi = Math.round(clampN(gauss(isD ? 160 : 60, 80), 0, 300));
    const esToi = Math.max(0, toi - ppToi - shToi);
    const fow = isC ? Math.round(clampN(gauss(11, 5), 2, 22)) : 0;
    const fol = isC ? Math.round(clampN(gauss(10, 5), 2, 22)) : 0;

    return {
      name,
      number: NUMBERS[name] ?? 0,
      pos,
      G: g,
      A: a,
      P: g + a,
      plusMinus: 0, // filled after we know on-ice goals (approx below)
      S: s,
      SM: sm,
      BS: Math.round(clampN(gauss(isD ? 2.2 : 0.9, 1.4), 0, 7)), // blocks made (defense)
      PN: rand() < 0.18 ? 1 : 0,
      PIM: 0, // filled from PN below
      HT: Math.round(clampN(gauss(isD ? 3 : 2.2, 2), 0, 9)),
      TK: Math.round(clampN(gauss(1.4, 1.3), 0, 6)),
      GV: Math.round(clampN(gauss(1.6, 1.4), 0, 6)),
      SHFT: Math.round(clampN(toi / 45 + gauss(0, 2), 12, 45)),
      TOI: toi,
      ESTOI: esToi,
      PPTOI: ppToi,
      SHTOI: shToi,
      FOW: fow,
      FOL: fol,
      FOpct: fow + fol > 0 ? round((100 * fow) / (fow + fol), 1) : 0,
    };
  });
}

const boxscore = {};
for (const team of TEAMS) {
  const skaters = buildSkaterLines(team);
  // PIM from penalties; a rough team +/- spread anchored to the final margin
  for (const sk of skaters) sk.PIM = sk.PN * 2;
  // approximate +/-: scorers/assisters trend +, weighted by final margin sign
  const margin = meta.final[team] - meta.final[team === HOME ? AWAY : HOME];
  for (const sk of skaters) {
    const base = sk.P > 0 ? 1 : 0;
    sk.plusMinus = clampN(Math.round(base + margin / 6 + gauss(0, 1)), -3, 4);
  }
  boxscore[team] = { skaters, goalies: [] };
}

// --- goalie lines + 3. net-zone save maps -----------------------------------
const ZONES = ["glove-high", "glove-low", "blocker-high", "blocker-low", "five-hole"];
// which goalie was in net for a given event (Andersen P1-2, Bussi P3+ for CAR;
// Carter Hart all game for VGK). The save map is built for the goalie FACING
// each shot — i.e. the opposing team's goalie.
function goalieFacing(shootingTeam, period) {
  const defTeam = shootingTeam === HOME ? AWAY : HOME;
  if (defTeam === AWAY) return period <= 2 ? "Frederik Andersen" : "Brandon Bussi";
  return ROST[HOME].G[0]; // Carter Hart
}

// each real goal mapped to the net zone it beat the goalie in (consistent w/ detail)
const GOAL_ZONE = {
  "g3-01": "blocker-high", // Hertl PP wrist, high
  "g3-02": "five-hole", // Marner tip deflection, low through the pads
  "g3-03": "glove-low", // Marner backhand, low glove side
  "g3-04": "glove-high", // Marner slap from distance, glove side high
  "g3-07": "blocker-low", // Martinook wrist
  "g3-08": "glove-high", // Hall snap
  "g3-09": "five-hole", // Staal wrist through traffic
  "g3-10": "blocker-low", // Svechnikov jam-in
  "g3-11": "five-hole", // Theodore banked in off the skate, low
};

function buildGoalie(team, name, periods) {
  // shots this goalie faced = opponent shots-on-goal while in net
  const faced = events.filter(
    (e) => isShotOnGoal(e) && e.team !== team && periods.includes(e.period)
  );
  const sa = faced.length;
  const ga = faced.filter((e) => e.type === "goal").length;
  const sv = sa - ga;
  const xgFaced = faced.reduce((acc, e) => acc + (e.xG ?? 0), 0);

  // distribute faced shots across zones (seeded); goals land in their mapped zone
  const zoneCounts = Object.fromEntries(ZONES.map((z) => [z, { sa: 0, ga: 0 }]));
  for (const e of faced) {
    let z;
    if (e.type === "goal" && GOAL_ZONE[e.id]) {
      z = GOAL_ZONE[e.id];
      zoneCounts[z].ga += 1;
    } else {
      // saves skew to glove/blocker high (where goalies are beaten less)
      z = pickW(ZONES, [1.4, 1, 1.4, 1, 0.8]);
    }
    zoneCounts[z].sa += 1;
  }
  const zones = ZONES.map((z) => ({
    zone: z,
    sa: zoneCounts[z].sa,
    ga: zoneCounts[z].ga,
    sv: zoneCounts[z].sa - zoneCounts[z].ga,
    svPct: zoneCounts[z].sa ? round((zoneCounts[z].sa - zoneCounts[z].ga) / zoneCounts[z].sa, 3) : 1,
  }));

  return {
    name,
    number: NUMBERS[name] ?? 0,
    pos: "G",
    SA: sa,
    SV: sv,
    GA: ga,
    SVpct: sa ? round(sv / sa, 3) : 0,
    GSAx: round(xgFaced - ga, 2), // goals saved above expected
    TOI: periods.reduce((acc, p) => acc + (p === 5 ? PERIOD_MAX[5] : 1200), 0),
    xGFaced: round(xgFaced, 2),
    zones, // the CV-only net-zone save map
    synthesized: true,
  };
}

boxscore[AWAY].goalies = [
  buildGoalie(AWAY, "Frederik Andersen", [1, 2]),
  buildGoalie(AWAY, "Brandon Bussi", [3, 4, 5]),
];
boxscore[HOME].goalies = [buildGoalie(HOME, ROST[HOME].G[0], [1, 2, 3, 4, 5])];

const goalieZones = {};
for (const team of TEAMS) for (const gl of boxscore[team].goalies) goalieZones[gl.name] = gl;

// --- 4. 5-on-5 tracking frames ----------------------------------------------
// A fixed on-ice "unit" per team is positioned plausibly around the puck for
// each shot/goal event, so the animated rink can interpolate smooth motion.
// Clearly a mock (no real tracking data exists) — labeled CV-generated.
const UNIT = {
  [HOME]: ["Jack Eichel", "Mitch Marner", "Tomas Hertl", "Shea Theodore", "Alex Pietrangelo"],
  [AWAY]: ["Sebastian Aho", "Andrei Svechnikov", "Seth Jarvis", "Jaccob Slavin", "Shayne Gostisbehere"],
};
const NET_X = 89;

function formation(puck, attTeam, defTeam, defGoalie) {
  const j = (s) => gauss(0, s);
  const players = [];
  const aUnit = UNIT[attTeam];
  const dUnit = UNIT[defTeam];
  // attacking: F1 on puck, F2 net-front, F3 weak-side slot, D1/D2 points
  const aSpots = [
    { x: puck.x, y: puck.y },
    { x: 84 + j(2), y: -6 + j(5) },
    { x: 74 + j(4), y: 12 + j(6) },
    { x: 62 + j(3), y: -16 + j(5) },
    { x: 62 + j(3), y: 16 + j(5) },
  ];
  aUnit.forEach((name, i) => {
    players.push({
      n: NUMBERS[name] ?? 0,
      team: attTeam,
      pos: posOf(attTeam, name),
      x: round(clampN(aSpots[i].x, 26, 99), 1),
      y: round(clampN(aSpots[i].y, -41, 41), 1),
    });
  });
  // defending: collapse between puck and net
  const mid = (puck.x + NET_X) / 2;
  const dSpots = [
    { x: mid + j(2), y: puck.y * 0.5 + j(3) },
    { x: 85 + j(2), y: 5 + j(4) },
    { x: 76 + j(3), y: -5 + j(5) },
    { x: 68 + j(4), y: 9 + j(6) },
    { x: 66 + j(4), y: -11 + j(6) },
  ];
  dUnit.forEach((name, i) => {
    players.push({
      n: NUMBERS[name] ?? 0,
      team: defTeam,
      pos: posOf(defTeam, name),
      x: round(clampN(dSpots[i].x, 26, 99), 1),
      y: round(clampN(dSpots[i].y, -41, 41), 1),
    });
  });
  // goalies: defender in crease; attacker far back in own end
  players.push({ n: NUMBERS[defGoalie] ?? 0, team: defTeam, pos: "G", x: 88, y: round(clampN(puck.y * 0.2, -3, 3), 1) });
  const attGoalie = ROST[attTeam].G[0];
  players.push({ n: NUMBERS[attGoalie] ?? 0, team: attTeam, pos: "G", x: 22, y: 0 });
  return players;
}

const tracking = events
  .filter((e) => e.type === "shot" || e.type === "goal" || e.type === "penalty_shot")
  .map((e) => {
    const defTeam = e.team === HOME ? AWAY : HOME;
    const defGoalie = goalieFacing(e.team, e.period);
    return {
      eventId: e.id,
      absT: absT(e.period, e.clockElapsed),
      puck: { x: e.x, y: e.y },
      attackingTeam: e.team,
      players: formation({ x: e.x, y: e.y }, e.team, defTeam, defGoalie),
    };
  });

// --- three stars (derived) ---------------------------------------------------
const threeStars = [
  { star: 1, name: "Mitch Marner", team: HOME, line: "3G (natural hat trick in 6:10)" },
  { star: 2, name: "Shea Theodore", team: HOME, line: "2OT game-winner (0.04 xG)" },
  { star: 3, name: "Jordan Staal", team: AWAY, line: "1G in the 39-second comeback burst" },
];

// --- period shot totals (for display) ---------------------------------------
const shotTotals = {};
for (const team of TEAMS) {
  shotTotals[team] = {};
  let tot = 0;
  for (const p of [1, 2, 3, 4, 5]) {
    const n = events.filter((e) => e.team === team && e.period === p && isShotOnGoal(e)).length;
    shotTotals[team][p] = n;
    tot += n;
  }
  shotTotals[team].total = tot;
}

// --- assemble + write --------------------------------------------------------
const enriched = {
  meta: {
    ...meta,
    shotTotals,
    periods: [1, 2, 3, 4, 5],
    lastEventAbsT: Math.max(...events.map((e) => absT(e.period, e.clockElapsed))),
    enriched: {
      by: "scripts/build-game.mjs",
      model: "scripts/lib/xg-model.mjs (shared with the season seed)",
      real: "Scoring events, final score, rosters, P1 shot totals (public recaps).",
      modeled:
        "Non-scoring shot attempts, box-score columns beyond G/A/S, goalie net-zone " +
        "save maps, and 5-on-5 tracking. Clearly labeled CV-generated in the UI.",
    },
  },
  rosters,
  events,
  boxscore,
  goalieZones,
  tracking,
  threeStars,
};

writeFileSync(OUT, JSON.stringify(enriched, null, 2));
console.log(
  `Enriched game written: ${events.length} events ` +
    `(${attempts.length} synthesized attempts), ${tracking.length} tracking frames -> ${OUT}`
);
console.log(
  `  SOG  ${AWAY} ${shotTotals[AWAY].total} · ${HOME} ${shotTotals[HOME].total}   ` +
    `P1 ${AWAY} ${shotTotals[AWAY][1]} / ${HOME} ${shotTotals[HOME][1]} (target ${meta.p1Shots[AWAY]}/${meta.p1Shots[HOME]})`
);
