"use client";

import { useState } from "react";
import type { PlaiAnswer } from "@/lib/query-engine";

const SUGGESTIONS = [
  "Show Colorado's high-danger chances",
  "Top 5 by finishing",
  "Compare Carolina and Florida",
  "How does Auston Matthews shoot?",
  "Boston tip-in shots",
];

export default function PlaiChat({
  onResult,
}: {
  onResult: (a: PlaiAnswer) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<PlaiAnswer | null>(null);
  const [source, setSource] = useState<string>("");

  async function run(question: string) {
    if (!question.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/plaichat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data: PlaiAnswer & { source?: string } = await res.json();
      setAnswer(data);
      setSource(data.source ?? "");
      onResult(data);
    } catch {
      setAnswer({ query: { intent: "unknown" }, answer: "Something went wrong. Try another question." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">PLAiChat</span>
        <span className="chip">ask the game</span>
      </div>

      <div className="ask-row" style={{ paddingTop: 12 }}>
        <input
          className="ask"
          value={q}
          placeholder="Ask in plain language — e.g. “who finishes above expected?”"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(q)}
          aria-label="Ask a question about the games"
        />
        <button className="send" onClick={() => run(q)} disabled={loading}>
          {loading ? "…" : "Ask"}
        </button>
      </div>

      <div className="pills">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="pill" onClick={() => { setQ(s); run(s); }}>
            {s}
          </button>
        ))}
      </div>

      {answer && (
        <div className="answer fade-in">
          <div className="text">{answer.answer}</div>

          {answer.rows && answer.rows.length > 0 && (
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  {Object.keys(answer.rows[0]).map((k) => (
                    <th key={k} style={{ textAlign: typeof answer.rows![0][k] === "number" ? "right" : "left" }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answer.rows.map((row, i) => (
                  <tr key={i}>
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k} className={typeof v === "number" ? "tdnum" : ""}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {answer.clips && answer.clips.length > 0 && (
            <>
              <div className="src" style={{ marginTop: 14 }}>matching clips · {answer.clips.length}</div>
              <div className="clips">
                {answer.clips.map((c, i) => (
                  <div className="clip" key={i}>
                    <div className="play" aria-hidden>▶</div>
                    <div className="meta">
                      <div className="l">{c.label}</div>
                      <div className="t">{c.timestamp} · {(c.xGoal * 100).toFixed(0)}% xG</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {source && (
            <div className="src">
              parsed by {source === "llm" ? "LLM" : "rules engine"} · stats computed from data
            </div>
          )}
        </div>
      )}
    </div>
  );
}
