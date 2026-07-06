import type { DartThrow } from './DartsMatchEngine';

// Standard dartboard wedge order, clockwise from the top (12 o'clock = center of "20").
export const WEDGE_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Ring boundaries as a fraction of the outer double-ring radius (1.0 = the board's edge).
export const RADIUS_RATIO = {
  bullseye: 12 / 160,
  bull: 30 / 160,
  tripleIn: 95 / 160,
  tripleOut: 115 / 160,
  doubleIn: 150 / 160,
  doubleOut: 1
} as const;

export function segmentToWedgeAngle(segment: number): number {
  return WEDGE_ORDER.indexOf(segment) * 18;
}

export function angleToSegment(angleDeg: number): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const idx = Math.round(normalized / 18) % 20;
  return WEDGE_ORDER[idx];
}

// Two points that pin down a dartboard photo's geometry: the bullseye center, and the
// outer edge of the board straight up from it (the top of the double ring, centered on "20").
// This models the photo as an upright, un-skewed circle — good enough for a camera held
// roughly straight-on, but it won't correct for a steep viewing angle.
export interface BoardCalibration {
  centerX: number;
  centerY: number;
  topX: number;
  topY: number;
}

export function calibrationRadiusPx(cal: BoardCalibration): number {
  return Math.hypot(cal.topX - cal.centerX, cal.topY - cal.centerY);
}

// Maps a pixel position (in the same image the calibration was taken from) to the dart it
// corresponds to, or null if the point falls outside the board (a miss, or a bad detection).
export function pixelToThrow(px: number, py: number, cal: BoardCalibration): DartThrow | null {
  const calRadiusPx = calibrationRadiusPx(cal);
  if (calRadiusPx === 0) return null;

  const dx = px - cal.centerX;
  const dy = py - cal.centerY;
  const ratio = Math.hypot(dx, dy) / calRadiusPx;
  if (ratio > RADIUS_RATIO.doubleOut) return null;

  if (ratio <= RADIUS_RATIO.bullseye) return { segment: 25, multiplier: 2 };
  if (ratio <= RADIUS_RATIO.bull) return { segment: 25, multiplier: 1 };

  const angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const segment = angleToSegment(angleDeg);
  if (ratio <= RADIUS_RATIO.tripleIn) return { segment, multiplier: 1 };
  if (ratio <= RADIUS_RATIO.tripleOut) return { segment, multiplier: 3 };
  if (ratio <= RADIUS_RATIO.doubleIn) return { segment, multiplier: 1 };
  return { segment, multiplier: 2 };
}
