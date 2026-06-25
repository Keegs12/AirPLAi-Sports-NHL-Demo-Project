# Part 1 — Domain & Design: AirPLAi for Hockey

## The bet

AirPLAi turns sports film into searchable, spatial intelligence: upload footage, the
CV pipeline extracts tracking and events, and a person asks questions in plain language.
Hockey is an unusually good second sport for that engine because the sport's entire
analytics culture is *already spatial and already probabilistic*. The public vocabulary
fans and front offices use — expected goals, high-danger chances, hot zones — is exactly
what AirPLAi's hot-zone surface produces. We are not teaching the market a new way to
see the game; we are rendering the way they already think, from video they already shoot.

Hockey is also underserved relative to its appetite. Every NHL club has an analytics
group, the major junior and NCAA pipelines shoot game film constantly, and almost none of
that footage is automatically tracked. The gap between "we have the tape" and "we can
query the tape" is the wedge.

## Resources & research

What shaped these decisions:

- **AirPLAi's own product** — PLAi Ground (the GBA basketball build), the pickleball demo, the
  website and the deck — to mirror the product's information architecture (two-pane viewer +
  intelligence panel, PLAiChat, clip cards) and value framing into hockey rather than invent a
  new one.
- **Public hockey data & stat conventions** — the **NHL API** (play-by-play, box score, shifts)
  and **NHL EDGE** (puck/player tracking) for the data schema; **MoneyPuck** for season aggregates
  and the xG / shot vocabulary; **Natural Stat Trick** and **Evolving-Hockey** for the
  advanced-stat conventions (Corsi/Fenwick, GSAx, finishing/goals-above-expected); **Sportlogiq**-
  style frame-by-frame tracking as the reference for the surfaces no public feed provides
  (forechecking, zone entries, net-location); **DailyFaceoff** for line combinations; and public
  recaps (NHL.com / Wikipedia / CBS / CBC) for the hero game's real scoring backbone.
- `docs/DATA_SOURCES.md` is the full source catalog, including the specific "public-feed gaps"
  that justify each CV-only surface.

## What actually matters in hockey, and why

Shot volume and raw goals lie. The metrics that survive contact with the sport are the
ones that account for *where* and *how* a chance was created:

- **Expected goals (xG).** Every unblocked shot gets a probability of becoming a goal,
  modeled from distance, angle, shot type, and context. xG is the single most important
  number because it separates process from luck: a team can win the chance battle and lose
  the game, and over a season xG predicts future goals better than past goals do. This is
  the backbone of the demo — every shot is weighted by xG, not counted equally.

- **Shot location / high-danger chances.** Not all ice is equal. The "home plate" slot in
  front of the net — roughly from the top of the faceoff circles in to the crease — is
  where the large majority of goals come from. A shot from there is worth several times a
  point shot. Coaches live and die by slot control. The shot map makes this legible at a
  glance: the home-plate area is drawn explicitly and the heat ramp lights up where danger
  concentrates.

- **Finishing (goals above expected).** Goals minus xG. Positive finishing flags genuine
  shooting talent or a hot stretch; negative flags a cold one or a structural problem. It
  is the most intuitive "is this player better than the shot quality they get?" number, and
  it is the default sort in the league-leaders panel.

- **Shot type.** Wrist, snap, slap, backhand, tip, wrap. Type correlates with location and
  danger: slap shots cluster at the point and convert rarely; tips and deflections happen
  at the crease and convert at high rates. The shot-profile panel and the type filters on
  the map expose this directly.

- **Corsi / Fenwick (shot-attempt share).** Possession proxies — the share of total shot
  attempts a team controls. Useful at the team level for who is "driving play." Included in
  the team aggregates; not the hero, because attempt share without quality is the trap xG
  exists to avoid.

- **Special teams (power play / penalty kill).** Uniquely hockey: a penalty hands a team a
  full-strength advantage (5-on-4, sometimes 5-on-3) for two minutes. Over a season PP% and PK%
  swing standings, and in a playoff series they decide games. So the demo derives PP%, PK%,
  power-play opportunities, PP/SH goals, PP time and PP shots straight from the penalty +
  strength-tagged goal events. *How* a power play operates — the 1-3-1 vs. overload formation,
  zone time, slot passing — is a film-only read, which is exactly where the CV layer adds value.

A reviewer who knows hockey should be able to sanity-check the demo's numbers: league
shooting rate sits in the high single digits, average shot xG is ~0.08, and high-danger
chances convert several times more often than perimeter shots. Those relationships are
baked into the data model on purpose — getting them wrong is the fastest way to lose a
hockey audience.

## How AirPLAi's pipeline maps onto the sport

The basketball product already does player/ball tracking, event detection, and spatial
aggregation. The hockey port is a re-targeting, not a rebuild:

| AirPLAi capability (basketball) | Hockey equivalent |
| --- | --- |
| Player + ball tracking | Skater + puck tracking; shot release detection |
| Shot chart / hot zones | Rink shot map; high-danger slot heat |
| Event tagging (made/missed) | Shot / goal / miss / block + shot-type classification |
| Per-player & per-game breakdowns | Per-skater xG, finishing, shot profile |
| Natural-language search (PLAiChat) | Same surface, hockey-aware query schema |

The one model that is genuinely new is the **xG model** — it has to be trained on hockey
geometry. Everything else (tracking, event detection, the search layer) is the existing
engine pointed at a new rink.

## The CV-only surfaces — where AirPLAi is the *only* source

The box-score numbers above are table stakes: ESPN, the NHL API, MoneyPuck and the advanced
sites all publish them, and the demo shows them too. The pitch is the layer a feed *cannot*
give you because it has to be *seen*. Each of these ships in the demo, badged `AirPLAi CV`:

- **Goalie net-zone save maps.** *Which part of the net* — glove high/low, blocker high/low,
  five-hole — a goalie was beaten in. Public feeds give shot-location save%, never net location.
  This is the flagship gap, and it compounds: aggregated over a season it's a scouting report no
  one sells.
- **Shooter "fingerprint" net maps.** The mirror image — where a player targets and beats
  goalies. A per-player tendency a pre-scout would pay for.
- **Positioning heatmaps & skating load.** Where a player actually lives on the ice, plus top
  speed, average speed and distance — the athletic layer broadcasts show but no feed records.
- **Live momentum & time of possession.** Who is taking over, in real time — the in-game
  control signal, most valuable the instant it swings.
- **Power-play formation & movement.** Setup, zone time and slot passing on the man-advantage
  (above).
- **Forechecking.** Dump-in recovery %, forced turnovers, breakouts pressured, and O-zone time
  generated off the forecheck. Forechecking quietly shapes who wins — a team that recovers its
  dumps and traps the opponent in their own end controls the game — yet the NHL tracks *none* of
  it. Only frame-by-frame tracking (Sportlogiq-style) produces it, which is precisely AirPLAi's
  pitch: elite forechecks recover ~25%+ of their dump-ins.
- **Microstats.** Controlled zone entries/exits and slot passing — the possession game between
  the shots, which today requires manual tracking.

These are mocked **deterministically** for the demo (seeded per player, clearly labeled) so they
behave like a real pipeline's output; the `/airplai` page states plainly which numbers are
public and which only AirPLAi can produce.

## Design decisions for the demo

- **The hero is a live game, watched and queried.** The landing experience is a two-pane game
  replay — the broadcast "tape" on the left, a five-tab intelligence panel on the right — built
  around a real hero game (the 2026 Cup Final, Game 3). It opens on the product surface AirPLAi
  actually sells: watching a game while the shot map, score, xG, momentum and cards build off
  the (mocked-CV) feed. The most characteristic object inside it is still a rink with chances
  plotted on it and the high-danger home plate drawn in. The season dashboard lives behind it
  at `/season`.

- **The heat vernacular is the visual identity.** Cold blue for low-danger, hot red for
  high-danger, exactly the scale analysts already read. It doubles as the brand: ice plus
  scoring danger.

- **PLAiChat answers from data, never from vibes.** The language model only translates a
  question into a structured query; the numbers are computed by the same tested code the
  dashboard uses. In an investor demo, a chatbot that confidently invents a stat is a
  credibility bomb. This architecture makes that failure impossible.

- **Every answer carries clips.** Because the pitch is *video* intelligence, each query
  returns the matching plays as clip cards. In production these resolve to real timestamps
  in uploaded film; here they are derived from the highest-xG matching goals so the loop is
  visible end to end.

## Example investor questions the demo answers

- "Show Colorado's high-danger chances" → slot map lights up, with the count and conversion.
- "Top 5 by finishing" → who is beating their shot quality, league-wide.
- "Compare Carolina and Florida" → xG, slot share, and finishing side by side.
- "How does Auston Matthews shoot?" → a player's line, expected goals, and finishing.
- "Boston tip-in shots" → filters the map to deflections and returns the clips.

Each of these is a question a scout, a coach, or a broadcaster asks out loud today and
answers by hand. The demo answers them in one sentence and one picture.

## Replicate vs. mock — and why

| Layer | Decision | Rationale |
| --- | --- | --- |
| Season aggregates (teams, skaters) | **Real** (MoneyPuck schema, realistic 2023-24 figures; live pull provided) | Domain credibility depends on numbers a hockey person recognizes. |
| Box score, scoring, assists, penalties | **Real** (from public recaps; committed game backbone) | The spine everything else reconciles against. |
| Special teams (PP%/PK%, opportunities, PP/SH goals) | **Real / derived** from the penalty + strength-tagged goal events | Uniquely-hockey value computed, not mocked. |
| Line combinations | **Reference** (public lineup data, dailyfaceoff-style) | Honest public layer; the contrast that makes the CV surfaces stand out. It is explicitly *not* a CV surface. |
| xG model + shot geometry | **Replicated** (calibrated logistic on distance/angle/type) | The core intelligence must behave correctly; mocking it would undercut the whole thesis. |
| Per-shot coordinates | **Synthesized from a hockey-accurate spatial model**, swappable for real shot data | Real per-shot files are large and ship as zips; the spatial *distribution* is what the map communicates, and it is modeled faithfully. The ingestion script documents the real swap. |
| CV surfaces (net-zone maps, shooter fingerprints, positioning, skating, PP formation, microstats) | **Mocked deterministically**, clearly badged `AirPLAi CV` | The CV pipeline is exactly what AirPLAi already has; the demo assumes its output and builds the product on top. Seeded so it's stable and reproducible. |
| Computer vision (tracking from film) | **Mocked / assumed** | Out of scope for a trial; the brief explicitly allows mocked features. |
| Broadcast video | **Real embed** (YouTube full-game replay), with mp4/placeholder fallback | The actual film, streamed off-origin; keeps the deploy lean. |

The guiding rule: replicate anything that proves AirPLAi understands hockey, mock anything
that only proves we can run a CV cluster (which the company already has).

## What I built (the demo at a glance)

- **Live game replay** (`/`) — two panes: the broadcast "tape" (YouTube full-game embed with an
  animated-rink toggle, a score bug + period-by-period line score, and a scrubber with event ticks
  and jump-to-moment chips) and a **five-tab intelligence panel**, everything synced to one clock.
- **Five tabs** — *Play-by-play* (emphasized highlight cards + the full feed incl. penalties),
  *Box score* (Skaters / Goalies / **Lines**, sortable, full-table overlay), *Shot map* (Ice ↔ Net
  toggle), *PLAiChat* (game-scoped natural-language Q&A that drives the other tabs), and
  *Analytics* (team-vs-team, momentum, time-of-possession, **special teams / power play**,
  **forechecking**, microstats, three stars).
- **Player & goalie cards** (click any name) — *This game / Season* scopes with the full ESPN line,
  advanced stats (xG, xG/60, CF%, IPP, xGF/xGA, GSAx…), and the CV-only surfaces: **goalie net-zone
  save maps**, **shooter net placement**, **positioning heatmaps**, **skating speed**, **shots-faced
  maps**, plus **season-aggregate** versions of each. Hover any stat for a plain-English tooltip.
- **`/airplai`** — a value page that contrasts the public box score with the AirPLAi CV-only
  surfaces, in the brand gradient.
- **`/season`** — the season dashboard (filterable shot map + leaderboard + PLAiChat) behind the
  live game.
- **Honesty rails** — an `AirPLAi CV` badge on every computer-vision surface, a deterministic
  (seeded, no runtime RNG) data model, and a box-score↔map consistency invariant guarded by tests.
