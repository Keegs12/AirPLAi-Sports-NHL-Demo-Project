import { describe, it, expect } from "vitest";
import { absT, absToPeriodClock, periodLabel, fmtClock, segmentOffset } from "@/lib/game-time";

describe("game timeline math", () => {
  it("maps (period, clockElapsed) to absolute seconds", () => {
    expect(absT(1, 0)).toBe(0);
    expect(absT(2, 480)).toBe(1680); // P2 8:00 in — matches GAME3.md
    expect(absT(3, 0)).toBe(2400);
    expect(absT(5, 338)).toBe(5138); // Theodore's 2OT winner
  });

  it("labels regulation and overtime periods", () => {
    expect(periodLabel(1)).toBe("P1");
    expect(periodLabel(3)).toBe("P3");
    expect(periodLabel(4)).toBe("OT");
    expect(periodLabel(5)).toBe("2OT");
  });

  it("inverts to a down-counting clock", () => {
    const pc = absToPeriodClock(1680);
    expect(pc.period).toBe(2);
    expect(pc.clockElapsed).toBe(480);
    expect(pc.clock).toBe("12:00"); // 20:00 - 8:00 remaining
  });

  it("handles the OT1 gap (no period-4 events but the segment exists)", () => {
    expect(segmentOffset(4)).toBe(3600);
    expect(absToPeriodClock(5138).label).toBe("2OT");
  });

  it("formats remaining seconds as mm:ss", () => {
    expect(fmtClock(720)).toBe("12:00");
    expect(fmtClock(62)).toBe("01:02");
    expect(fmtClock(0)).toBe("00:00");
  });
});
