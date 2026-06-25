// Team colors for the live game view (score bug, scrubber ticks, dots-by-team).
// Inline values (not asset logos) to keep the demo license-clean and dependency-free.

export interface TeamTheme {
  abbr: string;
  name: string;
  primary: string;
  secondary: string;
}

const THEMES: Record<string, TeamTheme> = {
  VGK: { abbr: "VGK", name: "Vegas Golden Knights", primary: "#B4975A", secondary: "#333F42" },
  CAR: { abbr: "CAR", name: "Carolina Hurricanes", primary: "#CC0000", secondary: "#111111" },
};

const FALLBACK: TeamTheme = { abbr: "?", name: "Team", primary: "#5bc8ff", secondary: "#2b6cff" };

export function teamTheme(abbr: string): TeamTheme {
  return THEMES[abbr] ?? { ...FALLBACK, abbr };
}
