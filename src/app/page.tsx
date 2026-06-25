import GamePage from "@/components/game/GamePage";

// The hero surface: a live game-replay experience. Public per-game play-by-play
// is replayed as if it were the output of AirPLAi's CV pipeline. The season
// dashboard now lives at /season behind this view.
export default function Page() {
  return <GamePage />;
}
