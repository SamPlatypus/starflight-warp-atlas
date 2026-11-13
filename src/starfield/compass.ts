// Sol compass placement: pure screen-space math, no React/three.
export const COMPASS_MARGIN = 20; // px from viewport edge for the chevron

export interface Vec3 { x: number; y: number; z: number }
export type CompassPlacement =
  | { mode: "hidden" }
  | { mode: "dot"; x: number; y: number }
  | { mode: "edge"; x: number; y: number; angle: number };

/**
 * view: Sol in camera space (camera looks down -z).
 * ndc:  the same point projected by the camera (x,y in -1..1 when on screen).
 * Returns a reticle position when Sol is ahead and on screen, otherwise a
 * chevron clamped to the viewport edge (inset by margin) pointing along Sol's bearing.
 */
export function placeCompass(view: Vec3, ndc: { x: number; y: number }, width: number, height: number, margin = COMPASS_MARGIN): CompassPlacement {
  if (Math.hypot(view.x, view.y, view.z) < 1e-6) return { mode: "hidden" };
  if (view.z < 0 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1) {
    return { mode: "dot", x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
  }
  // Screen-space bearing (y down). Camera-space x/y keep the right sign even behind the camera.
  let dx = view.x;
  let dy = -view.y;
  if (Math.hypot(dx, dy) < 1e-9) { dx = 0; dy = 1; } // dead astern: point down
  const hw = Math.max(width / 2 - margin, 0);
  const hh = Math.max(height / 2 - margin, 0);
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return { mode: "edge", x: width / 2 + dx * t, y: height / 2 + dy * t, angle: Math.atan2(dy, dx) };
}
