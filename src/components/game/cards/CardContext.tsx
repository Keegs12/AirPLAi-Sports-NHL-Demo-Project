"use client";

import { createContext, useContext, useCallback, useMemo, useState } from "react";

export type CardTarget =
  | { kind: "player"; team: string; name: string }
  | { kind: "goalie"; team: string; name: string }
  | null;

interface CardCtx {
  card: CardTarget;
  openPlayer: (team: string, name: string) => void;
  openGoalie: (team: string, name: string) => void;
  close: () => void;
}

const Ctx = createContext<CardCtx | null>(null);

export function CardProvider({ children }: { children: React.ReactNode }) {
  const [card, setCard] = useState<CardTarget>(null);
  const openPlayer = useCallback((team: string, name: string) => setCard({ kind: "player", team, name }), []);
  const openGoalie = useCallback((team: string, name: string) => setCard({ kind: "goalie", team, name }), []);
  const close = useCallback(() => setCard(null), []);
  const value = useMemo(() => ({ card, openPlayer, openGoalie, close }), [card, openPlayer, openGoalie, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCards(): CardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCards must be used within a CardProvider");
  return ctx;
}
