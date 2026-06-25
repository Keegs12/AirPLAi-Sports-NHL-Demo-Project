"use client";

import { useState } from "react";
import { useReplay } from "@/components/game/GameReplayProvider";
import { useSetTab } from "@/components/game/panel/IntelPanel";
import { askGame, GAME_SUGGESTIONS, type GameAnswer } from "@/lib/game-query";

export default function PlaiChatTab() {
  const { game, seekToEvent } = useReplay();
  const setTab = useSetTab();
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<GameAnswer | null>(null);

  function run(question: string) {
    if (!question.trim()) return;
    const a = askGame(game, question);
    setAns(a);
    if (a.seekEventId) seekToEvent(a.seekEventId);
  }

  function jump(eventId: string, tab?: GameAnswer["tab"]) {
    seekToEvent(eventId);
    if (tab) setTab(tab);
  }

  return (
    <div style={{ paddingTop: 14 }}>
      <form
        className="ask-row"
        onSubmit={(e) => { e.preventDefault(); run(q); }}
      >
        <input className="ask" placeholder="Ask about this game…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="send" type="submit">Ask</button>
      </form>

      <div className="pills">
        {GAME_SUGGESTIONS.map((s) => (
          <button key={s} className="pill" onClick={() => { setQ(s); run(s); }}>{s}</button>
        ))}
      </div>

      {ans && (
        <div className="answer fade-in">
          <div className="text">{ans.answer}</div>
          {ans.tab && (
            <button className="pill" style={{ marginTop: 10 }} onClick={() => setTab(ans.tab!)}>
              → open {tabLabel(ans.tab)}
            </button>
          )}
          {ans.rows && ans.rows.length > 0 && (
            <table style={{ marginTop: 12 }}>
              <thead><tr>{Object.keys(ans.rows[0]).map((k) => <th key={k} style={{ textAlign: "right" }}>{k}</th>)}</tr></thead>
              <tbody>
                {ans.rows.map((r, i) => (
                  <tr key={i}>{Object.values(r).map((v, j) => <td key={j} className="tdnum">{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
          {ans.clips && ans.clips.length > 0 && (
            <div className="clips">
              {ans.clips.map((c) => (
                <button key={c.eventId} className="clip" onClick={() => jump(c.eventId, ans.tab)} style={{ cursor: "pointer", textAlign: "left" }}>
                  <span className="play">▶</span>
                  <span className="meta">
                    <span className="l">{c.label}</span>
                    <span className="t">{c.when}{c.xG !== undefined ? ` · ${(c.xG * 100).toFixed(0)}% xG` : ""}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="src">deterministic engine · answers computed from this game&apos;s data</div>
        </div>
      )}
    </div>
  );
}

function tabLabel(t: NonNullable<GameAnswer["tab"]>): string {
  return { plays: "Play by play", box: "Box score", shotmap: "Shot map", chat: "PLAiChat", analytics: "Analytics" }[t];
}
