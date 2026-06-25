"use client";

import { useState } from "react";
import ScoreBug from "./ScoreBug";
import Scrubber from "./Scrubber";
import XgTimeline from "./XgTimeline";
import EventTicker from "./EventTicker";
import BroadcastPlayer from "./BroadcastPlayer";
import RinkReplaySurface from "./RinkReplaySurface";
import ViewerToggle, { type ViewerMode } from "./ViewerToggle";

/** The left pane — "the tape": score bug, the surface, scrubber, ticker. */
export default function GameViewer() {
  const [mode, setMode] = useState<ViewerMode>("video");

  return (
    <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      <ScoreBug />
      <div style={{ position: "relative", flex: 1, minHeight: 280, background: "#070b13" }}>
        {mode === "video" ? <BroadcastPlayer /> : <RinkReplaySurface />}
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 4, display: "flex", gap: 6, alignItems: "center" }}>
          <ViewerToggle mode={mode} onChange={setMode} />
        </div>
      </div>
      <Scrubber />
      <XgTimeline />
      <EventTicker />
    </div>
  );
}
