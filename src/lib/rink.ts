// Rink geometry helpers. We render the OFFENSIVE HALF of an NHL rink (the half
// containing the attacking net), since every shot in the dataset is oriented
// toward the net at x=+89. All shots are mapped into this half.
//
// NHL coordinate system (feet):
//   x in [-100, 100]  (center ice = 0; attacking goal line at x = +89)
//   y in [-42.5, 42.5]
//
// We draw the half-rink "standing up" (net at the TOP) so it reads like the
// shot maps analysts are used to. SVG viewBox is in feet, then scaled by CSS.

export const RINK = {
  netX: 89,
  halfLengthMin: 0, // center line
  halfLengthMax: 100,
  widthHalf: 42.5,
};

// SVG canvas in feet for the offensive half: width = 85 (boards), height = 100
// (center line to end boards). We translate so y:[-42.5,42.5] -> [0,85] and
// x:[0,100] -> [100,0] (net near the top).
export const VIEW = { w: 85, h: 100, cornerR: 28 };

/** rink (x,y) -> svg (px,py) within the offensive-half canvas */
export function toSvg(x: number, y: number): { px: number; py: number } {
  const px = y + RINK.widthHalf; // -42.5..42.5 -> 0..85
  const py = 100 - x; // x 0..100 -> py 100..0 (net at x=89 -> py=11, near top)
  return { px, py };
}

/** SVG point string for the home-plate high-danger trapezoid */
export function homePlatePath(): string {
  // Mirror of isHighDanger() in generate-seed.mjs: apex near x=72, widening to
  // the crease at x=89. Build the polygon in rink space, then map to SVG.
  const pts: Array<[number, number]> = [];
  const apexHalf = 9;
  const creaseHalf = Math.min(9 + (89 - 72) * 0.55, 20);
  pts.push([72, -apexHalf]);
  pts.push([89, -creaseHalf]);
  pts.push([89, creaseHalf]);
  pts.push([72, apexHalf]);
  return pts
    .map(([x, y]) => {
      const { px, py } = toSvg(x, y);
      return `${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

/** Faceoff dot positions (offensive zone) in SVG space */
export function faceoffDots(): Array<{ px: number; py: number }> {
  // regulation end-zone dots: 20 ft from the goal line (x=89) → x=69, y=±22
  return [
    toSvg(69, -22),
    toSvg(69, 22),
  ];
}

/** Goal line + blue line as SVG y-values (constant py) */
export const lines = {
  goalLinePy: toSvg(89, 0).py,
  blueLinePy: toSvg(25, 0).py, // offensive blue line, 25 ft from center ice
  centerPy: toSvg(0, 0).py,
};

// ---- Full-sheet HORIZONTAL rink (for the live tracking reconstruction) -----
// NHL.com's live rink shows the whole 200ft × 85ft sheet laid out lengthwise
// with a net at each end. We keep the league coordinate system —
//   x in [-100, 100] (length; goal lines at x = ±89)
//   y in [-42.5, 42.5] (width)
// — and map it straight across: x -> px (horizontal), y -> py (vertical).
export const VIEW_FULL = { w: 200, h: 85, cornerR: 28 };

/** full-rink (x,y) -> svg (px,py): center ice lands at (100, 42.5). */
export function toSvgFull(x: number, y: number): { px: number; py: number } {
  return { px: x + 100, py: y + 42.5 };
}

/** Vertical guide lines (constant px) for the full horizontal sheet. */
export const fullLines = {
  centerX: toSvgFull(0, 0).px, // red center line
  blueX: [toSvgFull(-25, 0).px, toSvgFull(25, 0).px], // blue lines at ±25
  goalX: [toSvgFull(-89, 0).px, toSvgFull(89, 0).px], // goal lines at ±89
};

/** Faceoff spots on the full sheet: 4 end-zone (with circles) + 4 neutral-zone. */
export function fullFaceoffSpots(): Array<{ px: number; py: number; circle: boolean }> {
  const spots: Array<{ px: number; py: number; circle: boolean }> = [];
  for (const x of [-69, 69]) for (const y of [-22, 22]) spots.push({ ...toSvgFull(x, y), circle: true });
  for (const x of [-20, 20]) for (const y of [-22, 22]) spots.push({ ...toSvgFull(x, y), circle: false });
  return spots;
}
