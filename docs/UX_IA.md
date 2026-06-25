# UX / Information Architecture

> **Status:** this spec is fully realized in the build. Left pane =
> `src/components/game/viewer/*` (score bug, scrubber + event ticks, video↔rink toggle, xG
> timeline); right pane = `src/components/game/panel/*` (the five tabs); cards =
> `src/components/game/cards/*`; the goalie net-zone map = `GoalieSaveMap.tsx`. Everything
> syncs to one clock (`GameReplayProvider` + `src/lib/game-replay.ts`).

How the game view is organized. We reuse AirPLAi's pickleball product IA (two-pane page:
video left, tabbed intelligence panel right) and adapt it to hockey. The whole point is to
look and behave like AirPLAi's existing product, so "we mirrored your IA" is the story.

## Layout: two panes

- **Left — game viewer ("the tape").** Video/broadcast surface (placeholder or clips for
  the demo, since we have no real film) with a score bug, game clock + period, a
  **scrubber/timeline with event ticks**, and an event ticker. This is the spine: it plays,
  and everything on the right syncs to its clock.
- **Right — intelligence panel.** Five tabs (the _modes_). Entity detail (a player, a
  goalie) is **not** a tab — it opens as a **card on click**. That single rule is what keeps
  us at five tabs instead of twelve.

## Tab mapping (pickleball → hockey)

| AirPLAi pickleball | Our hockey tab           | Holds                                                                           |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------- |
| Rallies            | **Plays** (play-by-play) | Chronological event feed synced to the video; click an event → seek + highlight |
| Swings             | **Box score**            | Per-player table for both teams; click a row → player/goalie card               |
| Shot Map           | **Shot map**             | Rink with shots by xG; Ice ↔ Net toggle (Net = goalie save zones); filters      |
| PLAi Chat          | **PLAiChat**             | NL query over THIS game; returns answer + clip cards; can drive the other tabs  |
| Analytics          | **Analytics**            | Aggregate/advanced: team-vs-team, special teams, possession, microstats         |

The one real adaptation is Swings → Box score: in hockey the per-shot ("swing") detail lives
naturally inside Plays (expand an event) and the Shot map (each dot is a shot), so the tab
slot is better spent on the box score, which is how hockey is actually read.

## The drill-down layer (opens on click; reachable from Box score, Plays, Shot map)

- **Player card.** Toggle _This game_ (live, building from the replay) vs _Season_. Shows the
  full ESPN line plus the advanced layer (xGF%, WAR, ixG) and that player's shot locations.
- **Goalie card.** The **net-zone save map** (glove high/low, blocker high/low, five-hole),
  GSAx, danger-split SV%, and "where they got beat" tied to the game's goals. This is a
  flagship **CV-only** surface — label it as CV-generated (no clean public feed exists).

## Box score — column plan

The table is for **scanning + ranking**; the **player card is the system of record** (every
column, no scroll, as a grid).

- **Default columns (always visible, no scroll):** Player · G · A · P · +/− · S · TOI
- **Grouped bands (sticky Player column + horizontal scroll); bands double as jump chips:**
    - _Scoring / activity:_ G A P +/− S SM BS PN PIM HT TK GV
    - _Ice time:_ SHFT TOI ESTOI PPTOI SHTOI
    - _Faceoffs:_ FOW FOL FO%
- **Skaters ⇄ Goalies toggle.** Goalie line: SA SV GA SV% GSAx TOI.
- **Abbreviation key:** SM = shots missed, BS = blocked shots (by player), PN = penalties
  taken (count), PIM = penalty minutes, HT = hits, TK = takeaways, GV = giveaways,
  SHFT = shifts, \*TOI splits = ES/PP/SH.

Mechanics that make ~17 columns livable in a narrow panel:

- sticky Player column + grouped horizontal scroll
- header-cell tooltips spell out each abbreviation on hover
- click a header to **sort** (ranking is the point of a box score)
- **expand-to-full-width**: collapse the video pane and the box score takes the whole width
  for the full ESPN-style table, every column visible — the power-user escape hatch
- row click → player/goalie card with the complete line

## Analytics tab — sections (stacked, not new tabs)

Team-vs-team (xGF%, CF%, HDCF%) · Special teams (PP/PK xG, conversion, entries) ·
Possession · **Microstats** (zone entries/exits, passing — labeled CV-generated).

## Connective tissue

Everything syncs to the **video clock**. A play in Plays, a dot on the Shot map, a clip card
from PLAiChat — all seek the viewer. That sync is what makes this read as _video
intelligence_ rather than a stats site, and it ties the five tabs back to the left pane.

## Where every discussed stat lives

| Stat / surface                               | Home                                     |
| -------------------------------------------- | ---------------------------------------- |
| G A +/− S SM BS PN PIM HT TK GV              | Box score (scoring band) + player card   |
| SHFT, TOI, ES/PP/SH TOI                      | Box score (ice-time band) + player card  |
| Faceoffs (W-L-%)                             | Box score (faceoff band) + player card   |
| WAR/GAR, xGF%/GF%, finishing, ixG            | Player card (Season)                     |
| Goalie net-zone (glove/blocker/5-hole), GSAx | Goalie card + Shot map (Net toggle)      |
| Shot map, high-danger, shot types            | Shot map tab                             |
| Team-vs-team, PP/PK, possession              | Analytics tab                            |
| Zone entries/exits, passing (microstats)     | Analytics tab + player card (CV-labeled) |
| Natural-language search                      | PLAiChat tab (drives the others)         |

## Open / optional

- Default box-score columns are a starting set; could promote FO% (centers) or HT.
- Goalie net-zone surfaced both in the goalie card and as the Shot map Net toggle (do both).
- Whether "live tick" (real-time clock) or user-scrubbed timeline drives the replay — scrub
  is more demo-proof; possibly support both.
