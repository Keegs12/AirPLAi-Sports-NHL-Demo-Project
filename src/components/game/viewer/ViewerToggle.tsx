"use client";

export type ViewerMode = "video" | "rink";

/** Small segmented control to switch the tape between film and animated tracking. */
export default function ViewerToggle({ mode, onChange }: { mode: ViewerMode; onChange: (m: ViewerMode) => void }) {
  const opts: Array<{ key: ViewerMode; label: string }> = [
    { key: "video", label: "Video" },
    { key: "rink", label: "Rink" },
  ];
  return (
    <div style={{ display: "inline-flex", background: "rgba(9,13,21,0.7)", border: "1px solid var(--line-2)", borderRadius: 999, padding: 2, backdropFilter: "blur(6px)" }}>
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="mono"
          style={{
            fontSize: 11, padding: "4px 11px", borderRadius: 999, cursor: "pointer", border: "none",
            background: mode === o.key ? "var(--blue-deep)" : "transparent",
            color: mode === o.key ? "#fff" : "var(--muted)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
