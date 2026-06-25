"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EnrichedGame } from "@/lib/game-types";
import { eventAbsT } from "@/lib/game-replay";
import { timelineDuration } from "@/lib/game-time";

export interface ReplayContextValue {
  game: EnrichedGame;
  t: number; // absolute seconds — the single source of truth
  reached: number; // high-water mark: the furthest t the replay has ever reached
  playing: boolean;
  rate: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setRate: (r: number) => void;
  seek: (t: number) => void;
  seekToEvent: (eventId: string) => void;
}

const ReplayContext = createContext<ReplayContextValue | null>(null);

export const RATES = [1, 4, 8, 16];

export function GameReplayProvider({ game, children }: { game: EnrichedGame; children: React.ReactNode }) {
  const duration = useMemo(() => timelineDuration(game.meta.lastEventAbsT), [game]);
  // Start paused at the opening faceoff so the demo opens on 0-0.
  const [t, setT] = useState(0);
  // Furthest point the replay has ever reached. The play-by-play log keys off
  // this (not t), so seeking backward to revisit a play never erases the plays
  // that came after it.
  const [reached, setReached] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(8); // 8x is the sweet spot for an 85-min game

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  // keep live values in refs so the rAF loop reads fresh state without re-binding
  const playingRef = useRef(playing);
  const rateRef = useRef(rate);
  const tRef = useRef(t);
  playingRef.current = playing;
  rateRef.current = rate;
  tRef.current = t;

  // advance the high-water mark whenever t moves past it (covers rAF, the
  // reduced-motion interval, scrubbing, and event seeks — all funnel through t).
  useEffect(() => {
    setReached((r) => (t > r ? t : r));
  }, [t]);

  const seek = useCallback(
    (next: number) => setT(Math.max(0, Math.min(duration, next))),
    [duration]
  );

  const seekToEvent = useCallback(
    (eventId: string) => {
      const ev = game.events.find((e) => e.id === eventId);
      if (ev) seek(eventAbsT(ev));
    },
    [game, seek]
  );

  const play = useCallback(() => {
    // restart from the top if we're parked at the end
    if (tRef.current >= duration - 0.01) setT(0);
    setPlaying(true);
  }, [duration]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [pause, play]);

  // rAF clock: advance t by real-elapsed × rate while playing.
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function frame(ts: number) {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (playingRef.current) {
        const next = tRef.current + dt * rateRef.current;
        if (next >= duration) {
          setT(duration);
          setPlaying(false);
        } else {
          setT(next);
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    if (reduced) {
      // interval fallback respects reduced-motion (no rAF animation)
      const id = window.setInterval(() => {
        if (!playingRef.current) return;
        const next = tRef.current + 0.25 * rateRef.current;
        if (next >= duration) {
          setT(duration);
          setPlaying(false);
        } else setT(next);
      }, 250);
      return () => window.clearInterval(id);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [duration]);

  const value: ReplayContextValue = useMemo(
    () => ({ game, t, reached, playing, rate, duration, play, pause, toggle, setRate, seek, seekToEvent }),
    [game, t, reached, playing, rate, duration, play, pause, toggle, seek, seekToEvent]
  );

  return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>;
}

export function useReplay(): ReplayContextValue {
  const ctx = useContext(ReplayContext);
  if (!ctx) throw new Error("useReplay must be used within a GameReplayProvider");
  return ctx;
}
