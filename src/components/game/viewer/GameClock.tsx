"use client";

import { useGameClock } from "@/lib/useGameReplay";

/** Period label + down-counting mm:ss, driven by the replay clock. */
export default function GameClock() {
  const { label, clock } = useGameClock();
  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      <div className="num" style={{ fontSize: 22, letterSpacing: "0.02em" }}>{clock}</div>
      <div className="kicker" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}
