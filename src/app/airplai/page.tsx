import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AirPLAi · What we bring",
  description: "Computer vision that turns any hockey broadcast into shot-, player-, and goalie-level intelligence no public feed can give you.",
};

// What you can already get from public feeds (ESPN / NHL API / advanced sites).
const PUBLIC_STATS = [
  "Goals, assists, points",
  "Shots on goal, shooting %",
  "Time on ice, shifts",
  "Faceoff wins / losses",
  "Hits, blocks, takeaways",
  "Box-score xG totals",
];

// What ONLY a vision model watching the game can produce.
const CV_SURFACES: Array<{ title: string; value: string; live: boolean }> = [
  { title: "Goalie net-zone maps", value: "Exactly where every goalie gets beat — glove, blocker, five-hole — over a game or a whole season. No feed encodes the part of the net a shot beats.", live: false },
  { title: "Shooter target maps", value: "The mirror image: where a shooter aims and where they actually score on goalies. A scouting fingerprint for every player, game-to-season.", live: false },
  { title: "Positioning heatmaps", value: "Where a player truly lives on the ice — net-front, the points, the soft spots — not just where they shot from.", live: false },
  { title: "Skating speed & load", value: "Top speed, average speed, distance and acceleration bursts. The athletic layer broadcasts show but no feed records.", live: false },
  { title: "Microstats", value: "Controlled zone entries & exits, slot passes, puck recoveries, forecheck pressure — the possession game between the shots.", live: false },
  { title: "Live momentum & possession", value: "Who is taking over, right now — a control signal that's most valuable in-game, the instant it swings.", live: true },
  { title: "Forechecking", value: "Dump-in recovery %, forced turnovers, breakouts pressured — the puck-disruption layer that quietly decides games. The NHL doesn't track it; only frame-by-frame tracking can.", live: false },
];

function Pill({ children, brand }: { children: React.ReactNode; brand?: boolean }) {
  return (
    <span className={brand ? "cv-badge" : undefined} style={brand ? undefined : { fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "4px 10px" }}>
      {children}
    </span>
  );
}

export default function AirplaiPage() {
  return (
    <div style={{ padding: "40px 0 60px" }}>
      {/* hero */}
      <div className="kicker" style={{ marginBottom: 14 }}>Computer vision for hockey</div>
      <h1 className="display brand-text" style={{ fontSize: 84, lineHeight: 0.95, margin: 0, letterSpacing: "0.01em" }}>AirPLAi</h1>
      <p style={{ fontSize: 20, maxWidth: 760, marginTop: 18, color: "var(--text)", lineHeight: 1.5 }}>
        We point a model at the <strong>same broadcast you already watch</strong> and turn it into shot-, player-, and
        goalie-level intelligence — the layer that lives <em>between</em> the box-score numbers.
      </p>
      <p style={{ fontSize: 15, maxWidth: 720, marginTop: 10, color: "var(--muted)" }}>
        This demo replays a real game from public play-by-play standing in for that vision feed. Everywhere you see the{" "}
        <span className="cv-badge"><span className="pulse" />AirPLAi CV</span> badge is something a feed can't give you — it has to be <em>seen</em>.
      </p>

      {/* the gap */}
      <div className="grid-main" style={{ marginTop: 40, gridTemplateColumns: "1fr 1.25fr", alignItems: "stretch" }}>
        <div className="panel" style={{ padding: "20px 22px" }}>
          <div className="kicker" style={{ marginBottom: 4 }}>Anyone can pull this</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 22, marginBottom: 14 }}>The public box score</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {PUBLIC_STATS.map((s) => (
              <div key={s} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "var(--muted)" }}>
                <span style={{ color: "var(--line-2)" }}>✓</span> {s}
              </div>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 16, lineHeight: 1.6 }}>
            ESPN, the NHL API, MoneyPuck — all give you these. They're table stakes, and we show them too.
          </div>
        </div>

        <div className="panel cv-outline" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span className="cv-badge"><span className="pulse" />AirPLAi CV</span>
            <span className="kicker">only we see this</span>
          </div>
          <div className="brand-text" style={{ fontFamily: "var(--display)", fontSize: 22, marginBottom: 14 }}>What the vision model adds</div>
          <div style={{ display: "grid", gap: 12 }}>
            {CV_SURFACES.map((c) => (
              <div key={c.title} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--display)", fontSize: 16 }}>{c.title}</span>
                  {c.live && <span className="mono" style={{ fontSize: 9, color: "var(--brand-teal)", border: "1px solid var(--brand-teal)", borderRadius: 999, padding: "1px 7px", letterSpacing: "0.1em" }}>LIVE</span>}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* season vs game framing */}
      <div className="panel" style={{ marginTop: 22, padding: "20px 22px" }}>
        <div className="kicker" style={{ marginBottom: 8 }}>Where the value compounds</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <div className="brand-text" style={{ fontFamily: "var(--display)", fontSize: 18 }}>Per game</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>Live momentum, who's taking over, where a goalie is leaking tonight — actionable in real time.</div>
          </div>
          <div>
            <div className="brand-text" style={{ fontFamily: "var(--display)", fontSize: 18 }}>Per player</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>A shooting & positioning fingerprint — where they beat goalies, where they live, how fast they move.</div>
          </div>
          <div>
            <div className="brand-text" style={{ fontFamily: "var(--display)", fontSize: 18 }}>Across a season</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>Aggregate the maps over 82 games and you have scouting no public source sells — the real moat.</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 28, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/" className="num" style={{ textDecoration: "none", fontSize: 15, padding: "12px 22px", borderRadius: 12, color: "#0a0e16", background: "var(--brand-grad)", fontFamily: "var(--display)", letterSpacing: "0.03em" }}>
          See it live →
        </a>
        <a href="/season" className="chip" style={{ padding: "11px 16px" }}>Season dashboard</a>
      </div>
    </div>
  );
}
