// Landmark targeting + "Fly Here" autopilot rules. Pure: no React, no three.js. Units: parsecs, seconds, radians.
import { PC_TO_LY, SPEED_MAX, SPEED_MIN } from "./sim";

export const TAP_RADIUS = 32; // px: a tap this close to a landmark locks it
export const ALIGN_TOL = (5 * Math.PI) / 180; // warp engages once heading is within this
export const REALIGN_TOL = 3 * ALIGN_TOL; // drop back to aligning if heading drifts past this
export const ALIGN_RATE = 2.2; // 1/s slerp rate toward the target heading
export const WARP_SPEED = SPEED_MAX * 2; // pc/s top autopilot speed
export const WARP_ACCEL = 1.2; // 1/s easing up to warp
export const APPROACH_K = 1.2; // speed cap = K * distance: exponential approach, never overshoots
export const ARRIVE_LY = 0.2;
export const ARRIVE_PC = ARRIVE_LY / PC_TO_LY;

export type ApPhase = "off" | "align" | "warp";
export interface Autopilot {
  phase: ApPhase;
  speed: number;
}

export const createAutopilot = (): Autopilot => ({ phase: "off", speed: 0 });

export function engage(ap: Autopilot, currentSpeed: number): void {
  ap.phase = "align";
  ap.speed = currentSpeed;
}

export function disengage(ap: Autopilot): void {
  ap.phase = "off";
}

/** Fraction of the remaining rotation to slerp this frame. */
export const slerpFactor = (dt: number) => 1 - Math.exp(-ALIGN_RATE * dt);

/**
 * Advance the autopilot. angle = radians between heading and target, dist = parsecs to target,
 * flightSpeed = speed the manual flight model wants this frame. Writes ap.speed (the speed to fly).
 * Returns "arrived" once inside ARRIVE_PC: autopilot is off and speed is at most SPEED_MIN.
 */
export function stepAutopilot(ap: Autopilot, angle: number, dist: number, flightSpeed: number, dt: number): "arrived" | null {
  if (ap.phase === "off") return null;
  if (dist < ARRIVE_PC) {
    ap.phase = "off";
    ap.speed = Math.min(ap.speed, SPEED_MIN);
    return "arrived";
  }
  const cap = APPROACH_K * dist;
  if (ap.phase === "align") {
    ap.speed = Math.min(flightSpeed, cap);
    if (angle <= ALIGN_TOL) ap.phase = "warp";
    return null;
  }
  if (angle > REALIGN_TOL) ap.phase = "align";
  const want = Math.min(WARP_SPEED, cap);
  ap.speed = want < ap.speed ? want : ap.speed + (want - ap.speed) * (1 - Math.exp(-WARP_ACCEL * dt));
  return null;
}

/** Index of the nearest screen point within radius of (x, y), or -1. Null points are off-screen. */
export function pickNearest(points: ({ x: number; y: number } | null)[], x: number, y: number, radius = TAP_RADIUS): number {
  let best = -1;
  let bestD = radius;
  points.forEach((p, i) => {
    if (!p) return;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
