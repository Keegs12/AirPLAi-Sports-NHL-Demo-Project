# Part 3 — Technical Writeup

> **Repo:** `github.com/Keegs12/AirPLAi-Sports-NHL-Demo-Project` · **Live demo:** _Vercel URL (TBD)_
>
> This document answers Part 3 of the brief directly:
> - **Backend, cloud & URL hosting** → *Hosting & cloud* (+ *Architecture* below).
> - **Other important technical decisions and their tradeoffs** → *Key decisions and the trade-offs behind them*.
> - **What I'd change or add with more time** → *What is shipped vs. what comes next*.
>
> **Backend in one line:** there is no database — the "backend" is the committed `/data` JSON
> (deterministic seed + enriched hero game) read at build/request time, plus a single Node
> serverless route (`/api/plaichat`). Deliberately minimal so the whole thing deploys as one unit.

## Architecture at a glance

```
 public hockey data ──> scripts/ ──> /data/*.json ──> src/lib (load + stats + xG)
                                                          │
                                          ┌───────────────┴───────────────┐
                                   server page.tsx                  api/plaichat (Node)
                                          │                                │
                                 client live game replay  ─ fetch ─> parse NL -> PlaiQuery
                                 ( the tape + 5-tab panel,           (LLM optional)  │
                                   player/goalie cards;                              ▼
                                   /season dashboard behind )         answerQuery() over /data
```

Single Next.js 14 (App Router) application, TypeScript throughout, deployable to Vercel as
one unit. No database, no chart library, no component framework — the dependency surface is
`next`, `react`, and `vitest`. That is a deliberate choice for a trial: fewer moving parts,
nothing to misconfigure, and every interesting decision is visible in the repo rather than
hidden in a vendor.

## The live game view (the hero) and its replay engine

The landing experience is a two-pane **game replay**: the tape (video/animated rink + score
bug + scrubber) on the left, a five-tab intelligence panel on the right, with player/goalie
cards on click. It is the *product surface* AirPLAi sells, fed by public play-by-play that
stands in for CV output.

**One scalar drives everything.** The replay state is a single absolute-seconds value `t`
held in a React context (`GameReplayProvider`, a `requestAnimationFrame` clock with a
reduced-motion interval fallback). The score, the shots on the map, cumulative xG, the active
goalie, and the on-ice tracking are **derived** from `t` by pure selectors in
`src/lib/game-replay.ts` — never stored. Scrubbing backward is therefore free and nothing can
desync. This is the same reason the score is read from each goal's authoritative `scoreAfter`
rather than recounted. Tests pin the derivations at specific times (4-0 lead, the tie, the
final; goalie change at the start of P3).

- *Why a context + selectors, not a store library:* the dependency surface stays at `next` /
  `react` / `vitest`, and "everything syncs to one clock" is exactly what context models.
- *Cost:* selectors recompute per tick; memoization keeps it cheap for a single game's event
  count. A multi-game or higher-frequency feed would index events by time.

**Honest data, single-sourced model.** `scripts/build-game.mjs` enriches the real scoring
backbone with the modeled layers (non-scoring attempts, full box columns, goalie net-zones,
5-on-5 tracking) at build time, deterministically, into a committed `…enriched.json`. The xG
and spatial model lives in `scripts/lib/xg-model.mjs` and is shared with the season seed, so
there is exactly one calibration to trust. Everything modeled is labeled "modeled/CV-generated"
in the UI; the P1 shot total is forced to the real public figure and tests guard the rest.

## Key decisions and the trade-offs behind them

**Data as a committed snapshot, with a live path.** The repo ships generated JSON in `/data`
and a `generate-seed.mjs` that recreates it deterministically (seeded RNG). `ingest.mjs`
pulls real MoneyPuck CSVs when you want current data.
- *Why:* a demo must render the same way every time, offline, with zero risk of a dead
  upstream during a pitch. Reproducibility is a grading criterion and a real product virtue.
- *Cost:* the committed shot coordinates are synthesized from a spatial model rather than
  real per-shot data (the real file is a large zip). The *aggregates* are realistic and the
  *distributions* are hockey-accurate; swapping in real shots is a documented, code-free
  change to `data/shots.json`.

**The LLM parses language; deterministic code computes facts.** PLAiChat's API route asks an
LLM to turn a question into a `PlaiQuery` JSON, then runs that query through the same
`answerQuery()` the tests cover.
- *Why:* stat hallucination is unacceptable in front of investors or a hockey ops team. This
  split gives natural-language flexibility with verifiable numbers, and it degrades
  gracefully: with no `ANTHROPIC_API_KEY`, a built-in rules parser handles the same queries,
  so the demo never hard-depends on an external API.
- *Cost:* the rules parser is keyword-based and narrower than a model. It covers the demo's
  query space well; broadening it is where real product work would go.

**Custom SVG instead of a charting library.** The rink, shot map, bars, heat ramp, goalie
net-zone grids, momentum curve, and positioning heatmaps are hand-drawn SVG in rink coordinates.
- *Why:* a rink is not a chart type any library ships. Owning the geometry means the
  high-danger trapezoid, the heat scale, and the coordinate transform are exact and themable,
  and it keeps the bundle small.
- *Cost:* more code than dropping in a library, and the geometry lives in `lib/rink.ts` to
  keep it testable and reusable.

**Mocked CV surfaces are deterministic, and the data stays self-consistent.** Every
"CV-generated" number (skating speed, on-ice CF%/xGF/xGA, goalie net-zone leak maps, shooter
fingerprints, positioning heatmaps, PP formation, season aggregates) is a *seeded* function of
the player/goalie — a string hash → mulberry32, never `Math.random` at runtime. So a card shows
the same numbers on every render and every machine, and the mocks read as a real pipeline's
output rather than noise. Where a number is shown next to a map, the two must agree: a skater's
shot map plots exactly their box-score shots-on-goal, and a goalie's shots-faced map plots
exactly their shots-against. That invariant is guarded by tests (`game-consistency.test.ts`,
`game-specialteams.test.ts`) so the data can't drift out of sync. Real-vs-modeled is marked
everywhere with an `AirPLAi CV` gradient badge.

**The broadcast is an embedded YouTube player, not a shipped media file.** The left "tape" embeds
the real NHL full-game replay (`youtube-nocookie.com`), configurable via
`NEXT_PUBLIC_BROADCAST_YOUTUBE`, with a fallback chain to a local `public/game3.mp4` and then a
styled broadcast placeholder.
- *Why:* it replaced a 94 MB committed mp3 — the deploy stays lean, the film is real, and the
  video lives off our origin.
- *Cost:* an embed can be region/age-restricted or block embedding; the fallback chain keeps the
  surface credible if it does.

**Ship the data to the client.** The dashboard is a client component; the season's shots are
serialized into the initial payload so filtering (team, shot type, high-danger) is instant
and offline.
- *Why:* the dataset is small and the interaction is snappy with no round-trips.
- *Cost:* this does not scale to many seasons or many teams of full-resolution shot data.
  The fix is already scoped below.

## Hosting & cloud

**Vercel.** It is the native home for Next.js: `git push` deploys, the `/api/plaichat` route
becomes a serverless function automatically, static assets hit the edge CDN, and preview
URLs per branch make sharing a build with a non-technical stakeholder trivial. The only
runtime secret is `ANTHROPIC_API_KEY`, set in the Vercel dashboard; the app runs fully
without it.

For the *real* product (CV pipeline + film), the shape would be: object storage for raw
video (S3/GCS), a GPU batch tier for tracking/event extraction writing structured events to
a warehouse or columnar store, and this same Next.js layer as the query/visualization front
end reading from an API instead of committed JSON. The front end is deliberately decoupled
from data origin so that swap is local to `src/lib/data.ts`.

## What is shipped vs. what comes next

**Shipped and working** (these are *in the demo*, deterministically modeled and CV-labeled, not
TODOs): the live two-pane game replay; the five-tab intelligence panel; player & goalie cards
with This-game/Season scopes; goalie net-zone save maps; shooter "fingerprint" net maps;
average-ice-position heatmaps; skating speed/distance; shots-faced maps; live momentum &
time-of-possession; **special teams (PP%/PK%, opportunities, PP/SH goals, PP time) with a
CV-only power-play formation read**; line combinations (reference data); season-aggregate
versions of the maps; the `/airplai` value page; and the deterministic-mock + consistency-guard
machinery above.

**Real-data upgrades** (the surfaces exist; swapping the modeled layer for real data is a
documented, code-light change): wire **EDGE tracking** for real goalie save-location and box
splits in `scripts/ingest-game.mjs`; unzip **MoneyPuck's per-shot files** in `ingest.mjs` for
real season coordinates; replace the modeled skating/positioning/microstats with the live CV
pipeline's output. The front end is decoupled from data origin so each swap is local to
`src/lib`.

**Genuinely future:**
- **Time-build the box score + cards** so a player's line *accumulates* visually as the replay
  runs (today the values are correct at time `t`, but don't animate up).
- **Move shot data behind an API/edge route** with server-side filtering, so the client payload
  stays flat across many seasons.
- **Widen PLAiChat** to multi-clause queries ("McDavid's high-danger chances in the third
  period"), period/date filters, and team-vs-team on one map.
- **Train and expose a calibrated xG model** with reliability curves shown in-product.
- **A real clip layer** seeking the video player to event timestamps — the full AirPLAi loop
  once real film is attached.
- **Tests on visualization geometry** (coordinate transforms, home-plate bounds) on top of the
  current stats/engine/consistency coverage.

## Testing & CI

The brief asks for "at least one test." `npm test` runs **46 vitest tests across 7 files** — and
the choice was to test the things that would *quietly* break the demo, not write a token smoke
test:

- **Replay selectors at time `t`** — score, accumulating shots, and the P3 goalie change all derive
  correctly from the single clock.
- **Synthesized-game fidelity** — P1 shots match the real public total exactly, goals reconcile to
  the final score, Andersen 4 GA / Bussi 1 GA, high-danger shots carry higher xG, and the league
  shooting rate stays in a hockey-realistic band (catches data-model regressions).
- **Box-score ↔ map consistency invariant** — a skater's shot map plots *exactly* their
  shots-on-goal, and a goalie's shots-faced map equals their shots-against. This is the load-bearing
  data-integrity guard.
- **Special-teams correctness** — PP goals match the strength-tagged goal events, PP opportunities
  match the penalty events, and line combos only reference real roster players.
- **Season query engine** — natural-language → query intent.

These run as a **GitHub Actions pipeline** (`.github/workflows/ci.yml`): on every push / PR it does
**typecheck → tests → production build**, so "a clean checkout builds and passes" is enforced by CI,
not just asserted in this doc.

## Running it

See `README.md`. Short version: `npm install && npm run dev` (offline; no env vars required).
`npm test` for the suite, `npm run typecheck` for types, `npm run build` for the production build —
the same three steps CI runs.
