// Pure timeline math for the replay clock. Hockey periods are 20:00 counting
// DOWN; the data records `clockElapsed` = seconds ELAPSED within the period.
// We lay periods on a single absolute-seconds axis (absT) so one scalar drives
// the whole replay. Overtime periods are numbered 4 (OT1), 5 (OT2): the Game 3
// data jumps straight from P3 to period 5 (the 2OT winner), so the OT1 segment
// must exist on the axis even when no event lands in it.

export const REG_PERIOD = 1200; // 20:00 in seconds

/** Absolute-seconds offset where a period begins. */
export function segmentOffset(period: number): number {
  // P1->0, P2->1200, P3->2400, OT1(4)->3600, OT2(5)->4800, ...
  return (period - 1) * REG_PERIOD;
}

/** (period, clockElapsed) -> absolute seconds on the unified timeline. */
export function absT(period: number, clockElapsed: number): number {
  return segmentOffset(period) + clockElapsed;
}

export interface PeriodClock {
  period: number;
  clockElapsed: number; // seconds into the period
  remaining: number; // seconds left in the period (counts down)
  label: string; // P1 / P2 / P3 / OT / 2OT
  clock: string; // mm:ss remaining
}

export function periodLabel(period: number): string {
  if (period <= 3) return `P${period}`;
  if (period === 4) return "OT";
  return `${period - 3}OT`; // period 5 -> 2OT
}

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
export function fmtClock(remaining: number): string {
  return `${pad(remaining / 60)}:${pad(remaining % 60)}`;
}

/** absolute seconds -> period + down-counting clock. */
export function absToPeriodClock(t: number): PeriodClock {
  const period = Math.min(5, Math.floor(t / REG_PERIOD) + 1);
  const clockElapsed = t - segmentOffset(period);
  const remaining = Math.max(0, REG_PERIOD - clockElapsed);
  return {
    period,
    clockElapsed,
    remaining,
    label: periodLabel(period),
    clock: fmtClock(remaining),
  };
}

/**
 * Total duration of the timeline given the last event. We extend a little past
 * the final event so the playhead has somewhere to rest, but never past the end
 * of that period.
 */
export function timelineDuration(lastEventAbsT: number): number {
  const period = Math.min(5, Math.floor(lastEventAbsT / REG_PERIOD) + 1);
  const periodEnd = segmentOffset(period) + REG_PERIOD;
  return Math.min(periodEnd, lastEventAbsT + 20);
}

/** Period boundaries (as absT) that actually occur in this game, for the scrubber. */
export function periodBoundaries(periods: number[]): Array<{ period: number; startT: number; label: string }> {
  return periods.map((p) => ({ period: p, startT: segmentOffset(p), label: periodLabel(p) }));
}
