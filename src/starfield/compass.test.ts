import { describe, expect, it } from "vitest";
import { placeCompass } from "./compass";

const W = 400, H = 800;

describe("sol compass", () => {
  it("shows a reticle at Sol's screen position when ahead and on screen", () => {
    const p = placeCompass({ x: 0, y: 0, z: -5 }, { x: 0.5, y: -0.5 }, W, H);
    expect(p).toEqual({ mode: "dot", x: 300, y: 600 });
  });

  it("clamps a chevron to the right edge with a 20px margin when Sol is off to the right", () => {
    const p = placeCompass({ x: 10, y: 0, z: -1 }, { x: 4, y: 0 }, W, H);
    expect(p.mode).toBe("edge");
    if (p.mode !== "edge") return;
    expect(p.x).toBeCloseTo(380);
    expect(p.y).toBeCloseTo(400);
    expect(p.angle).toBeCloseTo(0);
  });

  it("points toward Sol's bearing when Sol is behind the camera", () => {
    const p = placeCompass({ x: 0, y: 3, z: 5 }, { x: 0, y: -0.6 }, W, H);
    expect(p.mode).toBe("edge");
    if (p.mode !== "edge") return;
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(20); // top edge, inset 20px
    expect(p.angle).toBeCloseTo(-Math.PI / 2);
  });

  it("hides when the camera is at Sol", () => {
    expect(placeCompass({ x: 0, y: 0, z: 0 }, { x: 0, y: 0 }, W, H).mode).toBe("hidden");
  });
});
