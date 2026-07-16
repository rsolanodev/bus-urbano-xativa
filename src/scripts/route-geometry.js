const EARTH_RADIUS_M = 6371008.8;

function toRadians(value) {
  return value * Math.PI / 180;
}

export function distanceMeters(from, to) {
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to[1] - from[1]);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function buildRouteMetrics(route) {
  if (!Array.isArray(route) || route.length < 2) {
    throw new TypeError("A route requires at least two coordinates.");
  }

  const cumulativeDistances = [0];
  for (let index = 1; index < route.length; index += 1) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1] + distanceMeters(route[index - 1], route[index])
    );
  }

  return {
    cumulativeDistances,
    totalDistanceM: cumulativeDistances.at(-1)
  };
}

function findSegment(cumulativeDistances, distanceM) {
  let low = 0;
  let high = cumulativeDistances.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (cumulativeDistances[middle] < distanceM) low = middle + 1;
    else high = middle;
  }

  return Math.max(0, low - 1);
}

export function sampleRouteAtDistance(route, cumulativeDistances, distanceM) {
  const totalDistanceM = cumulativeDistances.at(-1);
  const safeDistanceM = Math.min(Math.max(distanceM, 0), totalDistanceM);

  if (safeDistanceM === totalDistanceM) {
    return {
      position: [...route.at(-1)],
      segmentIndex: route.length - 2,
      segmentFraction: 1
    };
  }

  const segmentIndex = findSegment(cumulativeDistances, safeDistanceM);
  const segmentStartM = cumulativeDistances[segmentIndex];
  const segmentLengthM = cumulativeDistances[segmentIndex + 1] - segmentStartM;
  const segmentFraction = segmentLengthM === 0 ? 0 : (safeDistanceM - segmentStartM) / segmentLengthM;
  const from = route[segmentIndex];
  const to = route[segmentIndex + 1];

  return {
    position: [
      from[0] + (to[0] - from[0]) * segmentFraction,
      from[1] + (to[1] - from[1]) * segmentFraction
    ],
    segmentIndex,
    segmentFraction
  };
}

export function getOccurrenceIndexAtDistance(occurrences, distanceM) {
  let result = 0;
  for (let index = 1; index < occurrences.length; index += 1) {
    if (occurrences[index].distanceAlongM > distanceM) break;
    result = index;
  }
  return result;
}

export function projectPointOntoRoute(point, route, cumulativeDistances, options = {}) {
  const startSegment = Math.max(0, options.startSegment ?? 0);
  const endSegment = Math.min(route.length - 2, options.endSegment ?? route.length - 2);
  const latitudeScale = Math.cos(toRadians(point[0]));
  let best = null;

  for (let index = startSegment; index <= endSegment; index += 1) {
    const from = route[index];
    const to = route[index + 1];
    const ax = (from[1] - point[1]) * latitudeScale;
    const ay = from[0] - point[0];
    const bx = (to[1] - point[1]) * latitudeScale;
    const by = to[0] - point[0];
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const fraction = denominator === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / denominator));
    const projected = [
      from[0] + (to[0] - from[0]) * fraction,
      from[1] + (to[1] - from[1]) * fraction
    ];
    const snapDistanceM = distanceMeters(point, projected);

    if (!best || snapDistanceM < best.snapDistanceM) {
      const segmentDistanceM = cumulativeDistances[index + 1] - cumulativeDistances[index];
      best = {
        position: projected,
        segmentIndex: index,
        segmentFraction: fraction,
        distanceAlongM: cumulativeDistances[index] + segmentDistanceM * fraction,
        snapDistanceM
      };
    }
  }

  return best;
}
