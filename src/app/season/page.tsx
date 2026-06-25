import { teams, skaters, shots, meta } from "@/lib/data";
import Dashboard from "@/components/Dashboard";

// The season / post-game view. This was the original landing page; the live game
// view at "/" is now the hero, and this sits behind it as the season context.
export default function SeasonPage() {
  return (
    <>
      {/* tie-in banner: frame this as the season layer behind the live game */}
      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 18px", marginTop: 18 }}>
        <span className="kicker brand-text">Season layer</span>
        <span style={{ fontSize: 13.5, color: "var(--muted)", flex: "1 1 300px" }}>
          The same AirPLAi intelligence, aggregated across a full season — the scouting context behind the live game. Per-game CV tracking rolls up into the views here.
        </span>
        <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="chip" href="/">▶ Live game</a>
          <a className="chip cv-outline" href="/airplai">What we bring</a>
        </span>
      </div>
      <Dashboard teams={teams} skaters={skaters} shots={shots} meta={meta} />
    </>
  );
}
