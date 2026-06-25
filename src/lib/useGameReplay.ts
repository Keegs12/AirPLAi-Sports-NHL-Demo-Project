"use client";

import { useMemo } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import {
  scoreAt,
  shotsOnMapUpTo,
  eventsUpTo,
  cumulativeXgAt,
  activeGoalie,
  currentEventAt,
  trackingAt,
  trackingFullAt,
} from "@/lib/game-replay";
import { absToPeriodClock } from "@/lib/game-time";
import { startingGoalie } from "@/lib/game-data";

/** Re-export the base hook for convenience. */
export { useReplay } from "@/components/game/GameReplayProvider";

/** Period + down-counting clock at the current time. */
export function useGameClock() {
  const { t } = useReplay();
  return useMemo(() => absToPeriodClock(t), [t]);
}

/** Live score, keyed by team abbr. */
export function useScore() {
  const { game, t } = useReplay();
  const teams = [game.meta.away, game.meta.home];
  return useMemo(() => scoreAt(game.events, t, teams), [game, t, teams.join()]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Shots to draw on the map so far (accumulates as the clock advances). */
export function useShotsUpToNow() {
  const { game, t } = useReplay();
  return useMemo(() => shotsOnMapUpTo(game.events, t), [game, t]);
}

/** Events fired so far (for the ticker — tracks the live clock). */
export function useEventsUpToNow() {
  const { game, t } = useReplay();
  return useMemo(() => eventsUpTo(game.events, t), [game, t]);
}

/**
 * Every event the replay has reached (high-water mark), regardless of where the
 * clock is parked now. The play-by-play log uses this so seeking back to an
 * earlier play never drops the plays that came after it.
 */
export function useEventsCaptured() {
  const { game, reached } = useReplay();
  return useMemo(() => eventsUpTo(game.events, reached), [game, reached]);
}

/** Cumulative xG per team up to now (the pressure / win-probability curve). */
export function useCumulativeXg() {
  const { game, t } = useReplay();
  const { away, home } = game.meta;
  return useMemo(
    () => ({ [away]: cumulativeXgAt(game.events, t, away), [home]: cumulativeXgAt(game.events, t, home) }),
    [game, t, away, home]
  );
}

/** Which goalie each team has in net right now. */
export function useActiveGoalies() {
  const { game, t } = useReplay();
  const { away, home } = game.meta;
  return useMemo(
    () => ({
      [away]: activeGoalie(game.events, t, away, startingGoalie(away)),
      [home]: activeGoalie(game.events, t, home, startingGoalie(home)),
    }),
    [game, t, away, home]
  );
}

/** The most recent event (drives the ticker headline + callouts). */
export function useCurrentEvent() {
  const { game, t } = useReplay();
  return useMemo(() => currentEventAt(game.events, t), [game, t]);
}

/** Interpolated on-ice tracking snapshot for the animated rink. */
export function useTracking() {
  const { game, t } = useReplay();
  return useMemo(() => trackingAt(game.tracking, t), [game, t]);
}

/** Full-sheet absolute snapshot (goalies pinned, play travels end-to-end). */
export function useTrackingFull() {
  const { game, t } = useReplay();
  return useMemo(() => trackingFullAt(game.tracking, t, game.meta.home), [game, t]);
}
