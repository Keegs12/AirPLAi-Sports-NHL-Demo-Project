"use client";

import { createContext, useContext, useState } from "react";
import PlaysTab from "./tabs/PlaysTab";
import BoxScoreTab from "./tabs/BoxScoreTab";
import ShotMapTab from "./tabs/ShotMapTab";
import PlaiChatTab from "./tabs/PlaiChatTab";
import AnalyticsTab from "./tabs/AnalyticsTab";

export type TabKey = "plays" | "box" | "shotmap" | "chat" | "analytics";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "plays", label: "Play by play" },
  { key: "box", label: "Box score" },
  { key: "shotmap", label: "Shot map" },
  { key: "chat", label: "PLAiChat" },
  { key: "analytics", label: "Analytics" },
];

const TabCtx = createContext<(t: TabKey) => void>(() => {});
/** Lets any tab (e.g. PLAiChat) switch the active tab — the connective tissue. */
export function useSetTab() {
  return useContext(TabCtx);
}

export default function IntelPanel({ initial = "shotmap" }: { initial?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(initial);

  return (
    <TabCtx.Provider value={setTab}>
      <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", gap: 6, padding: 12, borderBottom: "1px solid var(--line)", flexWrap: "wrap", flex: "none" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="pill"
              style={tab === t.key ? { color: "var(--text)", borderColor: "var(--blue)", background: "rgba(91,200,255,0.08)" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="fade-in" key={tab} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {tab === "plays" && <PlaysTab />}
          {tab === "box" && <BoxScoreTab />}
          {tab === "shotmap" && <ShotMapTab />}
          {tab === "chat" && <PlaiChatTab />}
          {tab === "analytics" && <AnalyticsTab />}
        </div>
      </div>
    </TabCtx.Provider>
  );
}
