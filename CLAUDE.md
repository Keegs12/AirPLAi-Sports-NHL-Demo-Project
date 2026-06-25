# CLAUDE.md — AirPLAi Hockey

Context and working agreement for Claude Code. Read this first, then `docs/`.

## What this is

An interview take-home for **AirPLAi Sports** (AI sports-video intelligence). The task:
apply AirPLAi's product to a new sport — **hockey** — as a deployable, investor-ready demo
on public data. Full grading criteria and the original brief shaped `docs/DOMAIN_DESIGN.md`
(Part 1) and `docs/TECHNICAL_WRITEUP.md` (Part 3). Deliverable is a working app + README +
those two docs, emailed to the AirPLAi team (the email/deploy steps are the user's to do).

## The core framing decision (don't lose this)

The brief says we do NOT need to run computer vision — _public data is sufficient_. But the
product AirPLAi sells IS computer vision. So we build the **real product surface** — a
**video / live-game experience** — and feed it underneath with **public per-game
play-by-play data standing in for the CV output**. The demo looks and feels like it's
watching a game; under the hood it's public data. No CV is built.

Two surfaces that public feeds CANNOT provide — **goalie net-zone save maps**
(glove/blocker/five-hole) and **microstats** (zone entries/exits, passing) — are presented
as "CV-generated." That gap IS the reason AirPLAi should exist for hockey. See
`docs/PRODUCT_DIRECTION.md` and `docs/DATA_SOURCES.md`.

## The story / hero game

The demo is built around the **2026 Stanley Cup Final, Carolina def. Vegas 4-2** (real, it
just finished). The centerpiece replay game is **Game 3** (VGK 5, CAR 4, 2OT): Marner's
record hat trick, a 4-0 Vegas lead, Carolina's 4-goal third-period comeback, a goalie
change, and a fluke 2OT winner. Full capture + real scoring in `docs/GAME3.md`; the
machine-readable event backbone is `data/games/scf-2026-game3.json`.

## UI / information architecture (full spec in `docs/UX_IA.md`)

Reuse AirPLAi's pickleball product IA, adapted to hockey. **Two panes:** left = game viewer
("the tape" — video/placeholder, score, clock, scrubber with event ticks); right =
intelligence panel with **five tabs**: **Plays** (play-by-play), **Box score**, **Shot map**,
**PLAiChat**, **Analytics**. Tabs are _modes_; **player and goalie open as cards on click**,
not tabs — that rule keeps it at five.

- **Player card:** This game / Season; full ESPN line + advanced (xGF%, WAR, ixG) + shot locs.
- **Goalie card:** net-zone save map (glove/blocker/five-hole) + GSAx — flagship CV-only.
- **Box score:** default cols Player·G·A·P·+/−·S·TOI; sticky name + grouped horizontal scroll
  (Scoring / Ice time / Faceoffs bands = jump chips); sort on header; expand-to-full-width;
  row → card holds all ~17 columns as a grid.
- **Analytics:** stacked sections — team-vs-team, special teams (PP/PK), possession, microstats.
- **Connective tissue:** everything syncs to the video clock (plays, shot dots, chat clips all seek).

## What's already built (working)

- Next.js 14 (App Router) + TS app; builds clean, 46/46 vitest passing.
- Rink geometry + xG heat coloring + SVG **shot map** (`src/lib/rink.ts`,
  `src/lib/colors.ts`, `src/components/ShotMap.tsx`).
- Stats lib + deterministic **PLAiChat query engine** (LLM optional, rules fallback):
  `src/lib/stats.ts`, `src/lib/query-engine.ts`, `src/app/api/plaichat/route.ts`.
- Season dashboard (`src/components/Dashboard.tsx`) on a committed seed
  (`scripts/generate-seed.mjs` → `data/*.json`) plus a live MoneyPuck path
  (`scripts/ingest.mjs`).

All of this transfers to the game-centric direction — the season dashboard becomes the
"post-game / season" view behind the new live game view.

## Shipped (the re-center is done)

All of the re-center build order is **shipped and working**:

1. ✅ **Two-pane game-view shell** — left tape (embedded YouTube broadcast / rink toggle, score
   bug + line score, scrubber with event ticks); right five-tab panel. Season `Dashboard` lives
   behind it at `/season`.
2. ✅ **Game replay engine** — one scalar `t` (`game-replay.ts`) drives score / shots / xG /
   goalie / tracking; the play-by-play is auto-populated.
3. ◻ **NHL/EDGE real ingestion** — `scripts/ingest-game.mjs` maps the schema; the surfaces are
   built with deterministic modeled data and clearly labeled. *Real-data upgrade, not missing.*
4. ✅ **Box score + player/goalie cards** — full ESPN columns, This-game/Season scopes, advanced
   stats; plus a **Lines** (line-combinations) view.
5. ✅ **Goalie net-zone map** + shooter fingerprints, positioning heatmaps, skating, shots-faced
   maps, and **season-aggregate** versions — all badged `AirPLAi CV`.
6. ✅ **PLAiChat over the game** (game-scoped intents).
7. ✅ **Analytics** — team-vs-team, momentum, possession, **special teams / power play** (real
   PP%/PK% + CV formation read), microstats. Plus an **/airplai** value page.

Open items are upgrades/future work — see `docs/TECHNICAL_WRITEUP.md` ("What is shipped vs. what
comes next"): EDGE/MoneyPuck real data, time-building the box score, wider PLAiChat, a real clip
layer.

**Reproducibility caution:** `data/*.json` (season seed) is the *committed deterministic* output
of `scripts/generate-seed.mjs` (seeded RNG). Do **not** run `npm run ingest` against the repo —
it overwrites the seed with a live MoneyPuck snapshot (abbreviated team names, different roster)
and breaks the query tests. If it happens, restore with `node scripts/generate-seed.mjs`.

## Run / network notes

- `npm install && npm run dev` (regenerates seed if missing). `npm test` for vitest.
- `ANTHROPIC_API_KEY` is optional (PLAiChat upgrades rules → LLM parser).
- The live NHL API / MoneyPuck / EDGE pulls must run on a normal network — do them locally;
  the earlier cloud sandbox could not reach those domains.
- Deploy target is Vercel; deploying + emailing deliverables is the user's call.

## Working agreement

- Keep data honest: real where we can source it, clearly labeled where synthesized.
- Keep hockey accuracy tight (league shooting ~8-9%, avg shot xG ~0.08, slot = high danger).
  There's a test guarding the league shooting rate; keep that kind of guard.
- One bold thing (the live rink shot map); keep everything around it quiet.
