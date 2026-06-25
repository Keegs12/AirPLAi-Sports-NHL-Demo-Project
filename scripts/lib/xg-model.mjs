/**
 * xg-model.mjs
 * -----------------------------------------------------------------------------
 * The hockey-accurate spatial + expected-goals model, extracted so BOTH the
 * season seed (generate-seed.mjs) and the per-game enrichment (build-game.mjs)
 * compute shots the same way. Single-sourcing this is what keeps the league
 * shooting rate (~8-9%) and average attempt xG (~0.08) consistent — and what
 * the vitest guard tests rely on.
 *
 * NHL coordinate system (feet): x in [-100,100] (attacking goal line at x=+89),
 * y in [-42.5,42.5]. All shots here are oriented toward the net at x=+89.
 */

export const NET_X = 89;
export const NET_Y = 0;
export const SHOT_TYPES = ["WRIST", "SNAP", "SLAP", "BACKHAND", "TIP", "WRAP"];

// --- deterministic RNG (mulberry32) -----------------------------------------
/** Returns a seeded [0,1) generator. Same seed -> same stream, every machine. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller gaussian draw from a given rand() function. */
export function gauss(rand, m, s) {
  const u = 1 - rand();
  const v = rand();
  return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export const round = (x, d = 2) => Number(x.toFixed(d));

/** Weighted shot-type draw; SLAP biased to the point, TIP/WRAP to the crease. */
export function shotTypeProfile(rand) {
  const r = rand();
  if (r < 0.46) return "WRIST";
  if (r < 0.66) return "SNAP";
  if (r < 0.8) return "SLAP";
  if (r < 0.9) return "BACKHAND";
  if (r < 0.97) return "TIP";
  return "WRAP";
}

/** Returns {x,y} rink coords for a shot of the given type. */
export function sampleLocation(rand, type) {
  if (type === "SLAP") {
    // point shots: near the blue line, spread along the boards
    return { x: clamp(gauss(rand, 63, 4), 40, 78), y: clamp(gauss(rand, 0, 18), -40, 40) };
  }
  if (type === "TIP") {
    return { x: clamp(gauss(rand, 83, 3), 74, 89), y: clamp(gauss(rand, 0, 4), -8, 8) };
  }
  if (type === "WRAP") {
    return {
      x: clamp(gauss(rand, 88, 1.5), 84, 90),
      y: clamp(gauss(rand, 0, 3) + (rand() < 0.5 ? -3 : 3), -7, 7),
    };
  }
  // WRIST / SNAP / BACKHAND: slot-weighted, most attempts from outside the slot
  const slot = rand() < 0.4;
  if (slot) return { x: clamp(gauss(rand, 78, 5), 66, 89), y: clamp(gauss(rand, 0, 9), -22, 22) };
  return { x: clamp(gauss(rand, 66, 9), 40, 88), y: clamp(gauss(rand, 0, 17), -39, 39) };
}

/**
 * Logistic xG from distance, angle and shot type. Calibrated so league-average
 * attempt xG ~0.07-0.08, slot wrist shots ~0.12-0.18, point slap shots
 * ~0.02-0.03, crease tips ~0.25-0.35.
 */
export function expectedGoals(x, y, type) {
  const dx = NET_X - x;
  const dy = NET_Y - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.abs(Math.atan2(dy, dx === 0 ? 0.001 : dx)); // 0 = straight on
  let z = -0.55 - 0.062 * dist - 1.3 * angle;
  const bump = { TIP: 0.3, WRAP: -0.4, SNAP: 0.1, WRIST: 0.0, BACKHAND: -0.25, SLAP: -0.2 };
  z += bump[type] ?? 0;
  const xg = 1 / (1 + Math.exp(-z));
  return clamp(xg, 0.003, 0.95);
}

/** Distance from the net for a rink coordinate. */
export function shotDistance(x, y) {
  return Math.sqrt((NET_X - x) ** 2 + (NET_Y - y) ** 2);
}

/**
 * NHL "home plate" high-danger area: from just below the top of the circles in
 * to the net, narrowing toward the boards (a trapezoid). Net at x=89.
 */
export function isHighDanger(x, y) {
  if (x < 72 || x > 90) return false;
  const halfWidth = 9 + (x - 72) * 0.55; // ~9ft at the apex to ~18ft at the crease
  return Math.abs(y) <= Math.min(halfWidth, 20);
}
