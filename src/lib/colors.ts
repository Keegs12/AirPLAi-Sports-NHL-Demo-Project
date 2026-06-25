// Shared xG color ramp: cold blue (low danger) -> cyan -> amber -> hot red
// (high danger). This blue->red heat scale is the shot-map vernacular hockey
// analysts read instantly, and it ties the demo to AirPLAi's "hot zone" surface.

const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [59, 130, 246]], // blue-500
  [0.06, [56, 189, 248]], // cyan-400
  [0.12, [250, 204, 21]], // amber-400
  [0.22, [249, 115, 22]], // orange-500
  [0.35, [255, 77, 94]], // hot red
];

export function xgColor(xg: number): string {
  const x = Math.max(0, Math.min(STOPS[STOPS.length - 1][0], xg));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i - 1];
    const [t2, c2] = STOPS[i];
    if (x <= t2) {
      const f = (x - t1) / (t2 - t1 || 1);
      const c = c1.map((v, k) => Math.round(v + (c2[k] - v) * f));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  const last = STOPS[STOPS.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

// Marker radius scales gently with xG so dangerous chances read bigger.
export function xgRadius(xg: number): number {
  return 0.9 + Math.min(xg, 0.4) * 5.5;
}
