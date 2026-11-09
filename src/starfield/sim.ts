// Pure flight rules: no React, no three.js. Units: parsecs and seconds.
export const SPEED_MIN = 0.5; // pc/s at slider 0
export const SPEED_MAX = 300; // pc/s at slider 1
export const BOOST_MULT = 6; // boost multiplies cruise speed
export const BOOST_RESPONSE = 3; // 1/s easing into/out of boost
export const ACCEL = 1.8; // 1/s speed easing
export const TURN_RATE = 1.4; // rad/s at full stick
export const TURN_DAMP = 5; // 1/s steering inertia
export const MIN_STARS = 3000;
export const MAG_LIMIT_MIN = 5.5; // naked-eye limit at lowest density
export const MAG_LIMIT_MAX = 8.5;

export interface Flight {
  speed: number;
  cruise: number;
  boost: number; // 0..1 eased
  yawRate: number;
  pitchRate: number;
  steerX: number; // -1..1 input
  steerY: number;
}

export function createFlight(cruise: number): Flight {
  return { speed: cruise, cruise, boost: 0, yawRate: 0, pitchRate: 0, steerX: 0, steerY: 0 };
}

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export function stepFlight(f: Flight, rawDt: number, boosting: boolean): void {
  const dt = Math.min(rawDt, 0.05);
  f.boost += ((boosting ? 1 : 0) - f.boost) * ease(BOOST_RESPONSE, dt);
  const target = f.cruise * (1 + (BOOST_MULT - 1) * f.boost);
  f.speed += (target - f.speed) * ease(ACCEL, dt);
  f.yawRate += (-f.steerX * TURN_RATE - f.yawRate) * ease(TURN_DAMP, dt);
  f.pitchRate += (-f.steerY * TURN_RATE - f.pitchRate) * ease(TURN_DAMP, dt);
}

/** Logarithmic speed slider: 0 -> SPEED_MIN, 1 -> SPEED_MAX. */
export function sliderToSpeed(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, c);
}

export function densityToCount(t: number, total: number): number {
  const c = Math.max(0, Math.min(1, t));
  const min = Math.min(MIN_STARS, total);
  return Math.round(min + (total - min) * c * c);
}

export function densityToMagLimit(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return MAG_LIMIT_MIN + (MAG_LIMIT_MAX - MAG_LIMIT_MIN) * c;
}

/** Drag offset in px -> stick value -1..1 (full deflection at 35% of the short screen side). */
export function dragToSteer(dx: number, short: number): number {
  return Math.max(-1, Math.min(1, dx / (short * 0.35)));
}

export const PC_TO_LY = 3.2616;
