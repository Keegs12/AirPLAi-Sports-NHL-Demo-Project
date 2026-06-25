"use client";

import { GameReplayProvider, useReplay } from "./GameReplayProvider";
import { CardProvider } from "./cards/CardContext";
import CardOverlay from "./cards/CardOverlay";
import TwoPane from "./TwoPane";
import { eventAbsT } from "@/lib/game-replay";
import { game } from "@/lib/game-data";

/** Date · venue · series state — the series reflects the point in the replay
 * (tied entering Game 3, flipping once the game-winning goal is scored), instead
 * of spoiling the final series result. */
function HeaderMeta() {
  const { game, t, duration } = useReplay();
  const winner = game.events.find((e) => e.type === "goal" && (e as any).gameWinner);
  const winnerT = winner ? eventAbsT(winner) : duration;
  const series = t >= winnerT ? game.meta.seriesAfter : "series tied 1-1";
  return (
    <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
      {game.meta.date} · {game.meta.venue} · {game.meta.decision} · {series}
    </div>
  );
}

/** Client root for the live game view. */
export default function GamePage() {
  return (
    <GameReplayProvider game={game}>
      <CardProvider>
        <div style={{ padding: "18px 0 6px" }}>
          <div className="kicker">Live game intelligence · replaying public play-by-play as the CV feed</div>
          <h1 className="display" style={{ fontSize: 26, margin: "4px 0 0" }}>{game.meta.game}</h1>
          <HeaderMeta />
        </div>
        <TwoPane />
        <CardOverlay />
      </CardProvider>
    </GameReplayProvider>
  );
}
