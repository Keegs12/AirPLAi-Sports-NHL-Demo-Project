import { NextResponse } from "next/server";
import { parseQuery, answerQuery, type PlaiQuery } from "@/lib/query-engine";
import { teams, skaters } from "@/lib/data";

export const runtime = "nodejs";

// The LLM's ONLY job is to turn a question into a PlaiQuery. The answer is then
// computed by answerQuery() over real data — so stats can't be hallucinated.
function systemPrompt(): string {
  const teamList = teams.map((t) => `${t.team}=${t.name}`).join(", ");
  const players = skaters.map((s) => s.name).join(", ");
  return [
    "You translate a hockey analytics question into a JSON query. Respond with ONLY the JSON, no prose, no markdown.",
    "Schema: { intent, team, team2, metric, shotType, player, limit }",
    'intent in ["team_summary","leaderboard","shot_type","high_danger","compare_teams","player","unknown"]',
    'metric in ["points","goals","xGoals","finishing","xG_per60"]',
    'shotType in ["WRIST","SNAP","SLAP","BACKHAND","TIP","WRAP"]',
    "team/team2 must be one of these abbreviations: " + teamList,
    "player must be one of: " + players,
    "Omit fields that do not apply. If unclear, use intent=unknown.",
  ].join("\n");
}

async function llmParse(question: string, apiKey: string): Promise<PlaiQuery | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: systemPrompt(),
        messages: [{ role: "user", content: question }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(text) as PlaiQuery;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { question } = await req.json().catch(() => ({ question: "" }));
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let query: PlaiQuery | null = apiKey ? await llmParse(question, apiKey) : null;
  let source: "llm" | "rules" = "llm";
  if (!query || !query.intent) {
    query = parseQuery(question); // deterministic fallback — always works
    source = "rules";
  }

  const result = answerQuery(query);
  return NextResponse.json({ ...result, source });
}
