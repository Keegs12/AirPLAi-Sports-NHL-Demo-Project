"use client";

import GameViewer from "./viewer/GameViewer";
import IntelPanel from "./panel/IntelPanel";

/** Two-pane game view: the tape (left) + the intelligence panel (right). */
export default function TwoPane() {
  return (
    <div className="grid-game" style={{ paddingTop: 16 }}>
      <GameViewer />
      <IntelPanel />
    </div>
  );
}
