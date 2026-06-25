# Hero Game — 2026 Stanley Cup Final, Game 3

**Carolina Hurricanes @ Vegas Golden Knights — Vegas 5, Carolina 4 (2OT)**
June 6, 2026 · T-Mobile Arena, Las Vegas · Vegas took a 2-1 series lead
(Carolina won the series 4-2 to win the Cup; this was the dramatic middle game.)

This is the demo's centerpiece game. It is chosen because it is the highest-event,
most narratively loaded tape of the series — exactly what makes a live-building shot map,
an xG swing chart, and PLAiChat queries ("show the comeback", "where did Andersen get
beat?") compelling. The numbers below are real; per-shot coordinates and exact clock
times are representative pending the live NHL API play-by-play pull (see DATA_SOURCES.md).

## Why this game carries the demo

- **A four-goal swing.** Vegas led 4-0; Carolina scored 4 in the third to tie, then lost
  in 2OT. The xG/score timeline tells a story no box score can.
- **A goalie change mid-game.** Andersen pulled after two periods; rookie Brandon Bussi in
  for the third + OT. Perfect setup for the goalie net-zone surface ("where did Andersen
  get beat on the four Vegas goals?").
- **Record performances on both sides** — instant "highlight clip" material for PLAiChat.
- **A fluke OT winner** (low-xG shot banked off the end boards, in off the goalie's skate)
  — a vivid data point for the finishing/luck (goals vs xG) story.

## Scoring summary (real)

| # | Per | ~Clock | Team | Goal | Detail |
|---|-----|--------|------|------|--------|
| 1 | P2 | 08:00 | VGK | Tomas Hertl (PP) | On the power play after a Carolina too-many-on-the-ice penalty; Marner assist |
| 2 | P2 | 08:16 | VGK | Mitch Marner (1) | Shot deflected in off a Carolina stick; 16s after Hertl (Vegas record, fastest two playoff goals) |
| 3 | P2 | 11:30 | VGK | Mitch Marner (2) | Backhand past Andersen |
| 4 | P2 | 14:26 | VGK | Mitch Marner (3) | Slap shot — natural hat trick in 6:10, fastest hat trick in Cup Final history → **4-0** |
| – | P3 | 04:04 | VGK | Marner penalty shot | **Short-handed penalty shot, STOPPED by Bussi** — the pivotal miss |
| 5 | P3 | 07:03 | CAR | Jordan Martinook | Start of the comeback |
| 6 | P3 | 07:20 | CAR | Taylor Hall | |
| 7 | P3 | 07:42 | CAR | Jordan Staal | Three goals in 39 seconds (fastest 3 in Cup Final history) → **4-3**, 12:18 left |
| 8 | P3 | 18:18 | CAR | Andrei Svechnikov (PP) | 6-on-4, goalie pulled; jammed a rebound home with 1:42 left → **4-4** |
| 9 | 2OT | 05:38 | VGK | Shea Theodore (GWG) | Low slap from the point banked off the end boards, in off Bussi's skate; McNabb assist → **5-4** |

P1 was scoreless with Carolina out-shooting Vegas 7-2. Two Vegas second-period goals were
waved off on challenges (offside; goalie interference). Carolina entered the playoffs 6-0
in OT and lost in OT here for the first time.

## Goalies

- **CAR** — Frederik Andersen started, pulled after 2 periods (4 goals against). **Brandon
  Bussi** (rookie, first NHL action in two months) played the 3rd + both OTs, ~18 saves,
  excellent; the OT winner deflected in off his skate.
- **VGK** — Carter Hart started and finished.

## Rosters / depth (key players confirmed from Final coverage — complete via NHL API roster endpoint)

**Carolina Hurricanes**
- F: Sebastian Aho, Andrei Svechnikov, Seth Jarvis, Jordan Staal (C), Nikolaj Ehlers,
  Logan Stankoven, Taylor Hall, Jackson Blake, Jordan Martinook, Mark Jankowski,
  William Carrier (left G3, upper body)
- D: Jaccob Slavin, Shayne Gostisbehere, Sean Walker, Jalen Chatfield
- G: Frederik Andersen, Brandon Bussi
- Notable: Jordan Staal won the Conn Smythe (oldest ever, 37); the Hall–Stankoven–Blake
  line drove much of the postseason offense.

**Vegas Golden Knights**
- F: Jack Eichel (C), Mitch Marner, Tomas Hertl, William Karlsson, Ivan Barbashev,
  Brett Howden, Pavel Dorofeyev, Colton Sissons, Cole Smith, Mark Stone
- D: Shea Theodore, Brayden McNabb, Noah Hanifin, Alex Pietrangelo
- G: Carter Hart
- Notable: Marner (first year in Vegas) led all 2026 playoff scorers; Eichel and Hanifin
  won 2026 Olympic gold for the USA.

## How it maps to the demo surfaces

- **Live shot map + xG timeline:** replay the events above on the game clock; the map fills
  in, the score/xG chart shows the 4-0 Vegas wall, then Carolina's third-period surge.
- **Goalie net-zone map (CV-only surface):** the four Vegas goals on Andersen, then Bussi's
  shutout-until-the-bounce relief — "where did each goalie get beat."
- **PLAiChat over the game:** "show Marner's hat trick", "Carolina's third-period goals",
  "every high-danger chance in OT", "lowest-xG goal of the game" (→ Theodore's bank-in).
- **Finishing / luck story:** Theodore's winner is a low-xG fluke; Svechnikov's tying goal
  is a high-xG crease jam — the contrast sells goals-vs-expected.

Sources: NHL.com, Wikipedia, CBS Sports, CBC recaps of the 2026 SCF (Games 1–6, Game 3).
Exact coordinates/clock to be replaced by the NHL API play-by-play for this game.
