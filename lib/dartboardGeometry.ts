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
