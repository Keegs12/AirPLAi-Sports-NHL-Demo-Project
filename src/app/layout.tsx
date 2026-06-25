import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirPLAi · Hockey",
  description: "Shot-level hockey intelligence — expected goals, hot zones, and natural-language video search.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="topbar">
          <div className="wrap topbar-inner">
            <a className="brand" href="/" style={{ textDecoration: "none" }}>
              <span className="dot" />
              <span className="brand-text">AirPLAi</span><span style={{ color: "var(--muted)", fontWeight: 400 }}>·Hockey</span>
            </a>
            <nav className="topnav">
              <a className="chip" href="/">Live game</a>
              <a className="chip" href="/season">Season</a>
              <a className="chip cv-outline" href="/airplai">What we bring</a>
              <a className="chip chip-ext" href="https://airplaisports.com" target="_blank" rel="noreferrer">airplaisports.com ↗</a>
            </nav>
          </div>
        </div>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
