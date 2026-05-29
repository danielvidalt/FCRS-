export interface XY {
  x: number;
  y: number;
}

function distSq(a: XY, b: XY): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Closest point on segment ab to point p. */
export function projectPointOnSegment(a: XY, b: XY, p: XY): XY {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * abx, y: a.y + t * aby };
}

/**
 * Insert a point on the polyline nearest to `click`.
 * Returns null if click is farther than `maxDistance` px from the line.
 */
export function insertPointOnLineAt(
  points: XY[],
  click: XY,
  maxDistance = 28
): XY[] | null {
  if (points.length === 0) return [{ ...click }];
  if (points.length === 1) return [points[0], { ...click }];

  let bestIndex = 1;
  let bestPoint = click;
  let bestDist = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const proj = projectPointOnSegment(points[i], points[i + 1], click);
    const d = distSq(proj, click);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i + 1;
      bestPoint = proj;
    }
  }

  if (bestDist > maxDistance * maxDistance) return null;

  const next = points.map((p) => ({ x: p.x, y: p.y }));
  next.splice(bestIndex, 0, bestPoint);
  return next;
}
