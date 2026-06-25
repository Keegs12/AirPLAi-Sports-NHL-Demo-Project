"use client";

import { useReplay } from "@/components/game/GameReplayProvider";
import { useCards } from "@/components/game/cards/CardContext";
import { lineCombos } from "@/lib/game-stats";
import { teamTheme } from "@/lib/team-theme";

/**
 * Roster line combinations — forward lines (3-wide), defense pairs (2-wide), and
 * the starting goalie, in a vertical stack. This is REFERENCE/public lineup data
 * (dailyfaceoff-style), deliberately NOT a CV surface — the honest contrast that
 * makes the AirPLAi CV surfaces stand out. Each name opens that player's card.
 */
export default function LineCombos({ team }: { team: string }) {
  const { game } = useReplay();
  const { openPlayer, openGoalie } = useCards();
  const { forwardLines, dPairs, starter } = lineCombos(game, team);
  const th = teamTheme(team);

  const numOf = (name: string) =>
    game.boxscore[team]?.skaters.find((s) => s.name === name)?.number ??
    game.boxscore[team]?.goalies.find((g) => g.name === name)?.number;

  const Chip = ({ name, onClick }: { name: string; onClick: () => void }) => {
    const num = numOf(name);
    return (
      <button
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
          background: "var(--ice-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${th.primary}`,
          borderRadius: 9, padding: "9px 11px",
        }}
      >
        {num != null && <span className="num" style={{ fontSize: 13, color: th.primary, minWidth: 18 }}>{num}</span>}
        <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      </button>
    );
  };

  const Group = ({ label }: { label: string }) => (
    <div className="kicker" style={{ margin: "14px 0 7px" }}>{label}</div>
  );

  return (
    <div style={{ padding: "4px 14px 16px" }}>
      <Group label="Forward lines" />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {forwardLines.map((line, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(line.length, 1)}, 1fr)`, gap: 7 }}>
            {line.map((n) => <Chip key={n} name={n} onClick={() => openPlayer(team, n)} />)}
          </div>
        ))}
      </div>

      <Group label="Defense pairs" />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {dPairs.map((pair, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(pair.length, 1)}, 1fr)`, gap: 7 }}>
            {pair.map((n) => <Chip key={n} name={n} onClick={() => openPlayer(team, n)} />)}
          </div>
        ))}
      </div>

      <Group label="Starting goalie" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 7 }}>
        {starter && <Chip name={starter} onClick={() => openGoalie(team, starter)} />}
      </div>

      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 14, lineHeight: 1.6 }}>
        Reference lineup data (dailyfaceoff-style) — public personnel info, <strong>not</strong> a CV surface.
        It anchors the tracking views to the actual lines on the ice.
      </div>
    </div>
  );
}
