# Data Sources & Advanced-Stat Taxonomy

Working reference for what we want to surface and where each piece comes from. The
guiding rule for this project: **public data is sufficient to feed the product**, even
though the product is pitched as computer-vision intelligence. We source everything we
can from free feeds and clearly mark the few surfaces that only CV/manual tracking can
produce today (those are the flagship "why AirPLAi" surfaces).

## The stat layers we care about

**Box score (have it / easy):** G A +/− S, missed/blocked shots, hits, takeaways,
giveaways, PIM, penalties drawn/taken, faceoffs. Shifts, TOI, and TOI splits
(ES/PP/SH).

**Shot quality / chances:** individual xG (ixG); xGF/60, xGA/60, xGF%/xGA%;
high-danger chances (HDCF/HDCA/HDCF%); scoring chances (SCF/SCA); goals above expected
(G − xG, "finishing"); PDO (regression flag).

**Goalie value:** GSAx/GSAA (goals saved above expected/average) — the key modern goalie
number; danger-split save% (high/mid/low); 5v5 save% incl. in-close; **net-location
save% (glove high / blocker low / five-hole)** — the hard one (see gap below).

**Player impact / value:** WAR / GAR / SPAR; RAPM (isolated on-ice impact adjusting for
teammates, competition, deployment); Game Score / GSVA (single-number rating, the
original formula is computable straight from the box score — no paid feed required);
QoC / QoT.

**Possession / context:** Corsi / Fenwick (CF%/FF%) and rel-to-team versions; zone-start
%; on/off and with-or-without-you (WOWY).

**Microstats (manual tracking only):** controlled zone entries % (carry vs dump),
entry denials, zone exits w/ control %, failed exits, shot assists / passing
(primary/secondary, slot/"royal road" passes), forecheck pressure, rush vs cycle.

**Special teams:** PP xGF/60, PK xGA/60, special-teams entry success/denial,
**penalty differential** (drawn − taken).

**Skating / physical (tracking):** top speed, speed bursts (18/20/22+ mph), distance,
shot speed, puck zone time %, zone-start %.

## Sources

| Source | Gives us | Access | Cost |
| --- | --- | --- | --- |
| **NHL API** (`api-web.nhle.com`, `api.nhle.com/stats/rest`) | Box score, **per-game play-by-play with event coords + timestamps**, TOI splits, faceoffs, PP/PK, shooting, shot type, penalties | Undocumented JSON; `nhl-api-py` (`nhlpy`) wraps it | Free |
| **NHL EDGE** (NHL.com/EDGE, 2021-22→) | Tracking: skating speed/bursts/distance, shot speed, shot **+ goalie save location by ice region**, puck zone time, zone-start %, 5v5 in-close SV% | Hidden endpoints via `nhl-api-py` `edge` module | Free |
| **MoneyPuck** | Per-shot **xG** + arena-adjusted coords (2007→now), with game_id/period/time; skaters/goalies/lines/teams season files | Direct CSV download | Free |
| **Natural Stat Trick** | On-ice CF/FF/xGF, **HDCF/SCF**, WOWY, situational splits, line/pair | Web tables (scrapeable) | Free (some Patreon) |
| **Evolving-Hockey** | **WAR/GAR/SPAR, RAPM, GSAx**, xG, contract projections | Site export | ~$8/mo Patreon |
| **All Three Zones** (Corey Sznajder) | **Microstats**: entries/exits w/ control, passing/shot assists (~400 games/season, tracked by hand) | Tableau + spreadsheets | Patreon |
| **HockeyViz** (McCurdy) | Isolated threat/impact heatmaps, deployment, team shot maps | Site (viz) | Patreon |
| **Hockey-Reference** | Historical depth, basic + some advanced | "Get table as CSV" | Free |
| **Sportlogiq / Stathletes** | Pro-grade tracking + microstats from video | Team/enterprise | Private |

Primary tooling: **`nhl-api-py`** (PyPI / github coreyjs) wraps both the standard stats
endpoints (report types incl. `faceoffpercentages`, `powerplay`, `penaltykill`,
`puckPossessions`, `shottype`, `timeonice`) and the EDGE tracking endpoints. One library
covers most of the box-score list and the physical layer.

## The goalie net-location gap (this is a feature, not a blocker)

NHL EDGE publishes goalie save location **by where the shot came from on the ice** (16
regions, shots/saves/goals/SV%) and added 5v5 in-close save%. But **which part of the
net** the puck beat the goalie — glove high, blocker low, five-hole — is *not* a clean
public feed. The play-by-play historically didn't record it; what exists came from
one-off NHL data releases (Dom Luszczyszyn / The Athletic) or manual/vendor tracking.

Same story for microstats: zone entries/exits and passing require a human watching every
game (Sznajder tracks ~400/season by hand) or a pro vendor.

**These two gaps are the wedge.** They are exactly what AirPLAi's CV extracts from film.
In the demo we source everything else from free feeds and present a **goalie net-zone
map** and a **zone-entry / passing panel** as CV-generated surfaces — the things no public
feed gives you, which is the reason the product should exist.
