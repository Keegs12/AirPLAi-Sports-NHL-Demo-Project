"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A small styled hover tooltip. Rendered through a portal to document.body so it
 * is never clipped by the scrolling panels/cards. `bare` drops the dotted
 * underline (for table headers where the underline would be noisy).
 */
export default function Tip({ text, children, bare }: { text: string; children: React.ReactNode; bare?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.top });
  };
  const hide = () => setPos(null);

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      style={{ cursor: "help", borderBottom: bare ? "none" : "1px dotted var(--line-2)", outline: "none" }}
    >
      {children}
      {pos && typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: Math.min(Math.max(pos.x, 132), (typeof window !== "undefined" ? window.innerWidth : 1200) - 132),
              top: pos.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 200,
              width: "max-content",
              maxWidth: 244,
              background: "var(--ice-3)",
              border: "1px solid var(--line-2)",
              borderRadius: 8,
              padding: "8px 11px",
              fontSize: 11.5,
              lineHeight: 1.45,
              color: "var(--text)",
              fontFamily: "var(--body)",
              textTransform: "none",
              letterSpacing: "normal",
              boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
              pointerEvents: "none",
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}
