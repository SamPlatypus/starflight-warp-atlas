import { describe, expect, it } from "vitest";
import { ARRIVE_PC, createAutopilot, engage, pickNearest, stepAutopilot, WARP_SPEED } from "./autopilot";
import { PC_TO_LY, SPEED_MIN } from "./sim";

const deg = (d: number) => (d * Math.PI) / 180;

describe("landmark targeting", () => {
  it("locks a landmark tapped within 32px", () => {
    expect(pickNearest([{ x: 100, y: 100 }, null, { x: 300, y: 300 }], 120, 120)).toBe(0);
  });
  it("ignores taps farther than 32px", () => {
    expect(pickNearest([{ x: 100, y: 100 }], 100, 133)).toBe(-1);
  });
});

describe("fly here autopilot", () => {
  it("stays aligning at 6 degrees and engages warp within 5 degrees", () => {
    const ap = createAutopilot();
    engage(ap, 10);
    stepAutopilot(ap, deg(6), 100, 10, 0.016);
    expect(ap.phase).toBe("align");
    stepAutopilot(ap, deg(4.9), 100, 10, 0.016);
    expect(ap.phase).toBe("warp");
  });

  it("disengages with minimum throttle once under 0.2 light-years", () => {
    expect(ARRIVE_PC * PC_TO_LY).toBeCloseTo(0.2);
    const ap = createAutopilot();
    engage(ap, 50);
    ap.phase = "warp";
    expect(stepAutopilot(ap, 0, 0.19 / PC_TO_LY, 50, 0.016)).toBe("arrived");
    expect(ap.phase).toBe("off");
    expect(ap.speed).toBeLessThanOrEqual(SPEED_MIN);
  });

  it("reaches a distant star without overshooting it", () => {
    const ap = createAutopilot();
    engage(ap, 10);
    ap.phase = "warp";
    let dist = 400;
    let peak = 0;
    for (let i = 0; i < 20000 && ap.phase !== "off"; i++) {
      stepAutopilot(ap, 0, dist, 10, 0.05);
      peak = Math.max(peak, ap.speed);
      dist -= ap.speed * 0.05;
      expect(dist).toBeGreaterThan(0);
    }
    expect(ap.phase).toBe("off");
    expect(peak).toBeLessThanOrEqual(WARP_SPEED);
  });
});
