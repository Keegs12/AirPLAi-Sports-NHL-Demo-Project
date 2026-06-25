"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useReplay } from "@/components/game/GameReplayProvider";
import { useCards } from "@/components/game/cards/CardContext";
import { fmtToi } from "@/lib/game-stats";
import { teamTheme } from "@/lib/team-theme";
import type { BoxSkater, BoxGoalie } from "@/lib/game-types";
import Tip from "@/components/Tip";
import { GLOSSARY } from "@/lib/glossary";
import LineCombos from "./LineCombos";

type Band = "scoring" | "ice" | "faceoffs";
interface Col<T> { key: string; label: string; title?: string; get: (r: T) => number | string; sortVal?: (r: T) => number; align?: "left"; }

const num = (label: string, key: keyof BoxSkater, title?: string): Col<BoxSkater> => ({
  key, label, title, get: (r) => r[key] as number, sortVal: (r) => r[key] as number,
});

const DEFAULT_COLS: Col<BoxSkater>[] = [
  num("G", "G"), num("A", "A"), num("P", "P"),
  { key: "pm", label: "+/−", get: (r) => (r.plusMinus > 0 ? `+${r.plusMinus}` : r.plusMinus), sortVal: (r) => r.plusMinus },
  num("S", "S", "Shots on goal"),
  { key: "toi", label: "TOI", get: (r) => fmtToi(r.TOI), sortVal: (r) => r.TOI },
];

const BANDS: Record<Band, Col<BoxSkater>[]> = {
  scoring: [num("SM", "SM", "Shots missed"), num("BS", "BS", "Blocked shots (by player)"), num("PN", "PN", "Penalties taken"), num("PIM", "PIM"), num("HT", "HT", "Hits"), num("TK", "TK", "Takeaways"), num("GV", "GV", "Giveaways")],
  ice: [num("SHFT", "SHFT", "Shifts"), { key: "es", label: "ESTOI", get: (r) => fmtToi(r.ESTOI), sortVal: (r) => r.ESTOI }, { key: "pp", label: "PPTOI", get: (r) => fmtToi(r.PPTOI), sortVal: (r) => r.PPTOI }, { key: "sh", label: "SHTOI", get: (r) => fmtToi(r.SHTOI), sortVal: (r) => r.SHTOI }],
  faceoffs: [num("FOW", "FOW"), num("FOL", "FOL"), { key: "fo", label: "FO%", get: (r) => r.FOpct || "—", sortVal: (r) => r.FOpct }],
};

const GOALIE_COLS: Col<BoxGoalie>[] = [
  { key: "sa", label: "SA", get: (r) => r.SA, sortVal: (r) => r.SA },
  { key: "sv", label: "SV", get: (r) => r.SV, sortVal: (r) => r.SV },
  { key: "ga", label: "GA", get: (r) => r.GA, sortVal: (r) => r.GA },
  { key: "svp", label: "SV%", get: (r) => (r.SVpct * 100).toFixed(1), sortVal: (r) => r.SVpct },
  { key: "gsax", label: "GSAx", get: (r) => `${r.GSAx >= 0 ? "+" : ""}${r.GSAx}`, sortVal: (r) => r.GSAx },
  { key: "toi", label: "TOI", get: (r) => fmtToi(r.TOI), sortVal: (r) => r.TOI },
];

export default function BoxScoreTab() {
  const { game } = useReplay();
  const { openPlayer, openGoalie } = useCards();
  const { away, home } = game.meta;
  const [team, setTeam] = useState(away);
  const [mode, setMode] = useState<"skaters" | "goalies" | "lines">("skaters");
  const [band, setBand] = useState<Band>("scoring");
  const [sortKey, setSortKey] = useState<string>("P");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [expanded, setExpanded] = useState(false);
  // Portal target — only available client-side, so gate the overlay on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const th = teamTheme(team);

  // The panel always shows the compact, banded view; the "Full table" button
  // opens every column in an overlay (like the player/goalie cards) rather than
  // mutating the panel in place.
  const cols = useMemo(() => [...DEFAULT_COLS, ...BANDS[band]], [band]);
  const fullCols = useMemo(() => [...DEFAULT_COLS, ...BANDS.scoring, ...BANDS.ice, ...BANDS.faceoffs], []);

  const sortRows = useCallback(
    (cs: Col<BoxSkater>[]) => {
      const all = game.boxscore[team].skaters;
      const col = cs.find((c) => c.key === sortKey) ?? DEFAULT_COLS[2];
      const sv = col.sortVal ?? (() => 0);
      return [...all].sort((a, b) => (sv(a) - sv(b)) * sortDir);
    },
    [game, team, sortKey, sortDir]
  );
  const rows = useMemo(() => sortRows(cols), [sortRows, cols]);
  const fullRows = useMemo(() => sortRows(fullCols), [sortRows, fullCols]);

  // Close the full-table overlay on Escape, matching the card overlay.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  if (mode === "lines") {
    return (
      <div>
        <Controls {...{ team, setTeam, away, home, mode, setMode, band, setBand, setExpanded, showBands: false, canExpand: false }} />
        <LineCombos team={team} />
      </div>
    );
  }

  if (mode === "goalies") {
    return (
      <div>
        <Controls {...{ team, setTeam, away, home, mode, setMode, band, setBand, setExpanded, showBands: false, canExpand: false }} />
        <div style={{ overflowX: "auto" }}>
          <SimpleTable
            cols={GOALIE_COLS}
            rows={game.boxscore[team].goalies}
            nameAccent={th.primary}
            onRow={(r: BoxGoalie) => openGoalie(team, r.name)}
            sortKey={sortKey} sortDir={sortDir} setSort={(k: string) => toggleSort(k, sortKey, sortDir, setSortKey, setSortDir)}
          />
        </div>
      </div>
    );
  }

  const setSort = (k: string) => toggleSort(k, sortKey, sortDir, setSortKey, setSortDir);

  return (
    <div>
      <Controls {...{ team, setTeam, away, home, mode, setMode, band, setBand, setExpanded, showBands: true, canExpand: true }} />
      <div style={{ overflowX: "auto" }}>
        <SkaterTable cols={cols} rows={rows} teamColor={th.primary} onRow={(r: BoxSkater) => openPlayer(team, r.name)} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
      </div>

      {expanded && mounted && createPortal(
        <div
          onClick={() => setExpanded(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(5,8,13,0.72)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 24 }}
        >
          <div className="panel fade-in" onClick={(e) => e.stopPropagation()} style={{ width: "min(1180px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "var(--ice-1)", overflow: "hidden" }}>
            <div className="panel-head" style={{ paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <span className="panel-title">{th.name} · full box score</span>
              <button className="pill" onClick={() => setExpanded(false)}>✕ close</button>
            </div>
            <div style={{ overflow: "auto", padding: 4 }}>
              <SkaterTable cols={fullCols} rows={fullRows} teamColor={th.primary} onRow={(r: BoxSkater) => openPlayer(team, r.name)} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function toggleSort(k: string, sortKey: string, sortDir: 1 | -1, setKey: (k: string) => void, setDir: (d: 1 | -1) => void) {
  if (k === sortKey) setDir(sortDir === 1 ? -1 : 1);
  else { setKey(k); setDir(-1); }
}

function Controls(p: any) {
  const bands: Band[] = ["scoring", "ice", "faceoffs"];
  const bandLabel: Record<Band, string> = { scoring: "Scoring", ice: "Ice time", faceoffs: "Faceoffs" };
  return (
    <div style={{ padding: "14px 14px 8px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <button className="pill" onClick={() => p.setTeam(p.away)} style={p.team === p.away ? pillFor(p.away) : undefined}>{p.away}</button>
      <button className="pill" onClick={() => p.setTeam(p.home)} style={p.team === p.home ? pillFor(p.home) : undefined}>{p.home}</button>
      <span style={{ width: 1, height: 18, background: "var(--line-2)", margin: "0 2px" }} />
      <button className="pill" onClick={() => p.setMode("skaters")} style={p.mode === "skaters" ? active : undefined}>Skaters</button>
      <button className="pill" onClick={() => p.setMode("goalies")} style={p.mode === "goalies" ? active : undefined}>Goalies</button>
      <button className="pill" onClick={() => p.setMode("lines")} style={p.mode === "lines" ? active : undefined}>Lines</button>
      {p.showBands && (
        <>
          <span style={{ width: 1, height: 18, background: "var(--line-2)", margin: "0 2px" }} />
          {bands.map((b) => (
            <button key={b} className="pill" onClick={() => p.setBand(b)} style={p.band === b ? active : undefined}>{bandLabel[b]}</button>
          ))}
        </>
      )}
      {p.canExpand && (
        <button className="pill" onClick={() => p.setExpanded(true)} style={{ marginLeft: "auto" }}>⤢ Full table</button>
      )}
    </div>
  );
}

function HeaderCell({ col, sortKey, sortDir, setSort, sticky }: any) {
  const active = col.key === sortKey;
  const tip = GLOSSARY[col.label] ?? col.title;
  return (
    <th
      onClick={() => col.sortVal && setSort(col.key)}
      style={{ cursor: col.sortVal ? "pointer" : "default", textAlign: col.align ?? "right", color: active ? "var(--blue)" : undefined,
        position: "sticky", top: 0, background: "var(--ice-1)", zIndex: 1,
        ...(sticky ? { left: 0, textAlign: "left", zIndex: 3 } : {}) }}
    >
      {tip ? <Tip text={tip} bare>{col.label}</Tip> : col.label}{active ? (sortDir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );
}

function SkaterTable({ cols, rows, teamColor, onRow, sortKey, sortDir, setSort }: any) {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ position: "sticky", left: 0, top: 0, background: "var(--ice-1)", zIndex: 3 }}>Player</th>
          {cols.map((c: Col<BoxSkater>) => <HeaderCell key={c.key} col={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: BoxSkater) => (
          <tr key={r.name} onClick={() => onRow(r)} style={{ cursor: "pointer" }}>
            <td style={{ position: "sticky", left: 0, background: "var(--ice-1)", whiteSpace: "nowrap", zIndex: 1 }}>
              <span className="mono" style={{ color: teamColor, fontSize: 11 }}>{r.number}</span> {r.name} <span className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>{r.pos}</span>
            </td>
            {cols.map((c: Col<BoxSkater>) => <td key={c.key} className="tdnum">{c.get(r)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SimpleTable({ cols, rows, nameAccent, onRow, sortKey, sortDir, setSort }: any) {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ position: "sticky", left: 0, top: 0, background: "var(--ice-1)", zIndex: 3 }}>Goalie</th>
          {cols.map((c: Col<BoxGoalie>) => <HeaderCell key={c.key} col={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: BoxGoalie) => (
          <tr key={r.name} onClick={() => onRow(r)} style={{ cursor: "pointer" }}>
            <td style={{ whiteSpace: "nowrap" }}><span className="mono" style={{ color: nameAccent, fontSize: 11 }}>{r.number}</span> {r.name}</td>
            {cols.map((c: Col<BoxGoalie>) => <td key={c.key} className="tdnum">{c.get(r)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const active: React.CSSProperties = { color: "var(--text)", borderColor: "var(--blue)", background: "rgba(91,200,255,0.08)" };
function pillFor(abbr: string): React.CSSProperties { return { color: "var(--text)", borderColor: teamTheme(abbr).primary }; }
