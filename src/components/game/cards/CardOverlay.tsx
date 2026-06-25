"use client";

import { useEffect } from "react";
import { useCards } from "./CardContext";
import PlayerCard from "./PlayerCard";
import GoalieCard from "./GoalieCard";

/** Dismissible overlay shell. Entity detail opens here — never as a sixth tab. */
export default function CardOverlay() {
  const { card, close } = useCards();

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, close]);

  if (!card) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 60, background: "rgba(5,8,13,0.66)",
        backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20,
      }}
    >
      <div
        className="panel fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(560px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: "var(--ice-1)" }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px 0" }}>
          <button onClick={close} aria-label="Close" className="pill" style={{ cursor: "pointer" }}>✕ close</button>
        </div>
        {card.kind === "player" ? <PlayerCard team={card.team} name={card.name} /> : <GoalieCard name={card.name} />}
      </div>
    </div>
  );
}
