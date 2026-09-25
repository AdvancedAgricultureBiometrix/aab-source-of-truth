// SCS-CAP-03 geometry validation (contract 2151321, "Geometry"): GeoJSON
// (RFC 7946) coordinates in EPSG:4326, checked in the application because the
// pilot has no spatial database. TODO(postgis): when PostGIS is adopted this
// moves to the database (ST_IsValid), area is computed and overlap becomes real.
//
// validateGeometry returns every problem found, each naming its JSON pointer
// within the request; an empty list means the geometry is valid. It never
// throws on malformed input.
//
// Checked: positions ([longitude, latitude], an optional altitude ignored;
// finite numbers; longitude −180..180, latitude −90..90); a POINT is one
// position; every polygon ring has at least 4 positions, is closed and does
// not intersect itself; a MULTIPOLYGON is a non-empty list of polygons; the
// EUDR area rule (polygons declare areaHectares; a point declares at most 4).
// Not checked (contract gaps): holes inside their outer ring, overlap between
// multipolygon parts, winding order (RFC 7946 §3.1.6 says not to reject on it),
// coordinate precision.

/** EUDR Article 2(28): a plot of more than 4 hectares must be a polygon. */
export const POINT_MAX_HECTARES = 4;

/**
 * Implementation limits, so that the self-intersection check (quadratic in a
 * ring's size) stays fast. Not contract rules: a ring or plot larger than this
 * is refused as GEOMETRY_INVALID with a reason saying so.
 */
export const MAX_RING_POSITIONS = 1000;
export const MAX_TOTAL_POSITIONS = 10000;

export type GeometryType = "POINT" | "POLYGON" | "MULTIPOLYGON";

type Position = readonly [number, number];

const BASE = "/plot/geometry";

/** Check one position; on success return [longitude, latitude]. */
function position(value: unknown, at: string, problems: string[]): Position | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3 || !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
    problems.push(`${at}: a position must be [longitude, latitude] or [longitude, latitude, altitude], all finite numbers.`);
    return null;
  }
  const [lon, lat] = value as number[];
  let ok = true;
  if (lon! < -180 || lon! > 180) {
    problems.push(`${at}: longitude ${lon} is outside −180 to 180.`);
    ok = false;
  }
  if (lat! < -90 || lat! > 90) {
    problems.push(`${at}: latitude ${lat} is outside −90 to 90.`);
    ok = false;
  }
  return ok ? [lon!, lat!] : null;
}

const cross = (o: Position, a: Position, b: Position) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const onSegment = (p: Position, a: Position, b: Position) =>
  Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);

/** True if segments ab and cd share any point (crossing, touching or collinear overlap). */
function segmentsIntersect(a: Position, b: Position, c: Position, d: Position): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && onSegment(a, c, d)) || (d2 === 0 && onSegment(b, c, d)) || (d3 === 0 && onSegment(c, a, b)) || (d4 === 0 && onSegment(d, a, b));
}

/** Check one linear ring (the positions of a polygon boundary or hole). */
function ring(value: unknown, at: string, problems: string[], budget: { positions: number }): void {
  if (!Array.isArray(value)) {
    problems.push(`${at}: a ring must be an array of positions.`);
    return;
  }
  if (value.length < 4) {
    problems.push(`${at}: a ring needs at least 4 positions (it has ${value.length}).`);
    return;
  }
  if (value.length > MAX_RING_POSITIONS) {
    problems.push(`${at}: a ring may have at most ${MAX_RING_POSITIONS} positions in the pilot (it has ${value.length}).`);
    return;
  }
  budget.positions += value.length;
  const before = problems.length;
  const points = value.map((p, i) => position(p, `${at}/${i}`, problems));
  if (problems.length > before) return;
  const pts = points as Position[];
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    problems.push(`${at}: the ring is not closed (its first and last positions differ).`);
    return;
  }
  // segments i = pts[i]→pts[i+1]; adjacent segments share an endpoint by
  // design, as do the first and last (the ring closes)
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)) {
        problems.push(`${at}: the ring intersects itself (segment ${i} meets segment ${j}).`);
        return;
      }
    }
  }
}

function polygon(value: unknown, at: string, problems: string[], budget: { positions: number }): void {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push(`${at}: a polygon must be a non-empty array of rings.`);
    return;
  }
  value.forEach((r, i) => ring(r, `${at}/${i}`, problems, budget));
}

export function validateGeometry(geometryType: GeometryType, coordinates: unknown, areaHectares: number | undefined): string[] {
  const problems: string[] = [];
  const at = `${BASE}/coordinates`;
  const budget = { positions: 0 };

  if (geometryType === "POINT") {
    position(coordinates, at, problems);
    if (areaHectares !== undefined && areaHectares > POINT_MAX_HECTARES) {
      problems.push(
        `${BASE}/areaHectares: a POINT may represent a plot of at most ${POINT_MAX_HECTARES} hectares (EUDR Article 2(28)); ${areaHectares} ha must be a POLYGON or MULTIPOLYGON.`,
      );
    }
    return problems;
  }

  if (geometryType === "POLYGON") {
    polygon(coordinates, at, problems, budget);
  } else if (!Array.isArray(coordinates) || coordinates.length === 0) {
    problems.push(`${at}: a MULTIPOLYGON must be a non-empty array of polygons.`);
  } else {
    coordinates.forEach((p, i) => polygon(p, `${at}/${i}`, problems, budget));
  }
  if (budget.positions > MAX_TOTAL_POSITIONS) {
    problems.push(`${at}: a plot may have at most ${MAX_TOTAL_POSITIONS} positions in the pilot (it has ${budget.positions}).`);
  }
  if (areaHectares === undefined) {
    problems.push(`${BASE}/areaHectares: required for a ${geometryType}.`);
  }
  return problems;
}
