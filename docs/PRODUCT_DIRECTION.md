# Product Direction

> **Status:** this direction is shipped. The live two-pane game replay is the landing page
> (`/`); the season dashboard moved to `/season`. The two CV-only surfaces called for below —
> the goalie net-zone save map and the microstats panel — are both built and labeled
> CV-generated. See `docs/UX_IA.md` for the realized IA and `docs/TECHNICAL_WRITEUP.md` for
> the replay-engine architecture.

## The framing decision

The brief says we do **not** need to run computer vision or predictive modeling —
*"publicly available data is sufficient."* We take that literally for the data layer, but
we reject the obvious-but-weak interpretation (build a season-stats dashboard).

The product AirPLAi sells is **video intelligence**: footage in, searchable spatial
intelligence out. So the demo should *be that product* — centered on a **game**, not a
season. We present a video-first experience (an uploaded game, an ongoing/live feed) and
feed it underneath with **public per-game play-by-play data standing in for the CV
output**. No CV is built; the product nonetheless looks and behaves like CV is running.

This threads the brief perfectly:
- *Satisfies "no CV needed":* every number comes from a free public feed.
- *Pitches the real thing:* the surface is film-centric, live-building, and answers
  questions about a game as it unfolds — which a season dashboard never does.
- *Justifies the company:* the surfaces that public data **can't** provide
  (net-zone goalie maps, zone entries/exits, passing) are shown as CV-extracted. That gap
  is the entire reason AirPLAi should exist for hockey.

## What we're building (re-centered)

**Hero = a game view, not a season view.** A video/feed panel (uploaded game, demo game,
or "live") with a synchronized intelligence layer that **builds as the game progresses**:
- a shot map that fills in shift by shift, shots weighted by xG;
- live xG / danger accumulators and an event ticker (shot, chance, goal, entry);
- a scrubber/timeline that acts as the tape — scrub the game, the analytics move with it.

**PLAiChat operates over the game.** "Show every Makar chance in the third," "where did
the goalie get beat," "high-danger looks off the rush" — answered against the loaded
game, returning the clip moments. This is the search-the-film story, made literal.

**Flagship CV-only surfaces.** A goalie **net-zone map** (glove/blocker/five-hole) and a
**zone-entry / passing panel**, both labeled as extracted-from-film. These are mocked or
modeled (no public feed exists) and they are the demo's "only AirPLAi can do this" moment.

## The technical hinge

A video-centric demo needs **per-game, time-stamped events** — and public data has them:
the **NHL API play-by-play** (`gamecenter/{gameId}/play-by-play`) returns every event with
period, time-in-period, coordinates, and type; **MoneyPuck** shot rows carry
game_id/period/time/xG/coords. So we take a real game and **replay** it: the timeline is
the clock, events stream in on cue, the shot map and xG build live. That replay *is* the
mocked CV pipeline.

Implications for the data layer (shifts from the current season-seed approach):
- add a **"load a game"** path that pulls one game's play-by-play and normalizes it into a
  timed event stream (the thing the UI scrubs through);
- keep a committed **demo game** so the experience runs offline and identically every time
  (same seed-vs-live philosophy we already use, applied per-game);
- net-zone + microstat panels get a small synthesized/modeled layer, clearly labeled.

## What carries over from what we've built

Nothing is wasted. The existing rink geometry, xG coloring, shot-map component, stats
library, and PLAiChat query engine all transfer directly — they stop describing a *season*
and start describing a *game as it plays*. The current season dashboard becomes the
**post-game / season** view that sits behind the live game view, not the front door.

## Open questions to resolve next

- Pick the demo game(s) — a high-event, recognizable matchup reads best.
- Decide the "live" illusion: real-time tick vs. user-scrubbed timeline (scrub is more
  demo-proof; live tick is more impressive — possibly both).
- How far to take the net-zone goalie map (the highest-wow CV-only surface).
