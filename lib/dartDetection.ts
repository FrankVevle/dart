// Pure pixel-level dart detection: diff a "before" and "after" photo of the same, fixed-position
// board to find where new dark shapes (dart shafts/flights) appeared. Operates on plain typed
// arrays (duck-typed to ImageData) so it has no DOM dependency and can be unit tested directly.
export interface ImageLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface DetectedBlob {
  // Point within the blob closest to the board center — approximates where the dart
  // entered the board, since a dart's flight usually sticks out away from center.
  x: number;
  y: number;
  centroidX: number;
  centroidY: number;
  pixelCount: number;
}

const DEFAULT_DIFF_THRESHOLD = 35;

function luminance(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

export function detectChangedBlobs(
  reference: ImageLike,
  photo: ImageLike,
  center: { x: number; y: number },
  options: { diffThreshold?: number; minBlobArea?: number; maxBlobs?: number } = {}
): DetectedBlob[] {
  const { width, height } = reference;
  if (photo.width !== width || photo.height !== height) {
    throw new Error('Reference and photo dimensions must match');
  }
  const diffThreshold = options.diffThreshold ?? DEFAULT_DIFF_THRESHOLD;
  const minBlobArea = options.minBlobArea ?? Math.max(12, Math.round(width * height * 0.0004));
  const maxBlobs = options.maxBlobs ?? 3;

  const changed = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (Math.abs(luminance(reference.data, i) - luminance(photo.data, i)) > diffThreshold) {
      changed[p] = 1;
    }
  }

  const visited = new Uint8Array(width * height);
  const blobs: DetectedBlob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < width * height; start++) {
    if (!changed[start] || visited[start]) continue;

    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let tipX = 0;
    let tipY = 0;
    let tipDist = Infinity;

    while (stack.length > 0) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p / width) | 0;
      sumX += x;
      sumY += y;
      count++;
      const d = Math.hypot(x - center.x, y - center.y);
      if (d < tipDist) {
        tipDist = d;
        tipX = x;
        tipY = y;
      }

      // 4-connected neighbors, guarding left/right against wrapping to the next row.
      if (x > 0 && !visited[p - 1] && changed[p - 1]) {
        visited[p - 1] = 1;
        stack.push(p - 1);
      }
      if (x < width - 1 && !visited[p + 1] && changed[p + 1]) {
        visited[p + 1] = 1;
        stack.push(p + 1);
      }
      if (p - width >= 0 && !visited[p - width] && changed[p - width]) {
        visited[p - width] = 1;
        stack.push(p - width);
      }
      if (p + width < width * height && !visited[p + width] && changed[p + width]) {
        visited[p + width] = 1;
        stack.push(p + width);
      }
    }

    if (count >= minBlobArea) {
      blobs.push({ x: tipX, y: tipY, centroidX: sumX / count, centroidY: sumY / count, pixelCount: count });
    }
  }

  blobs.sort((a, b) => b.pixelCount - a.pixelCount);
  return blobs.slice(0, maxBlobs);
}
