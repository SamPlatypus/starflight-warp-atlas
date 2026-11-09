import { describe, expect, it } from "vitest";
import { createFlight, densityToCount, sliderToSpeed, stepFlight, BOOST_MULT, SPEED_MAX, SPEED_MIN } from "./sim";

describe("flight rules", () => {
  it("speed slider spans min to max", () => {
    expect(sliderToSpeed(0)).toBeCloseTo(SPEED_MIN);
    expect(sliderToSpeed(1)).toBeCloseTo(SPEED_MAX);
  });

  it("boost converges to cruise times BOOST_MULT", () => {
    const f = createFlight(10);
    for (let i = 0; i < 600; i++) stepFlight(f, 1 / 60, true);
    expect(f.speed).toBeCloseTo(10 * BOOST_MULT, 0);
  });

  it("density 0 shows 3000 stars, 1 shows all", () => {
    expect(densityToCount(0, 100000)).toBe(3000);
    expect(densityToCount(1, 100000)).toBe(100000);
  });
});
