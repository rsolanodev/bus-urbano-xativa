import { readFile } from "node:fs/promises";

import { routeTraces } from "../src/data/route-traces.js";
import { buildRouteMetrics, distanceMeters } from "../src/scripts/route-geometry.js";

const limits = {
  l1: { minDistanceM: 8000, maxDistanceM: 10250 },
  l2: { minDistanceM: 7000, maxDistanceM: 10000 }
};

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const [id, definition] of Object.entries(routeTraces)) {
  const feature = JSON.parse(await readFile(new URL(`../src/data/routes/${id}.json`, import.meta.url)));
  const coordinates = feature.geometry?.coordinates;
  assert(feature.type === "Feature", `${id}: expected a GeoJSON Feature`);
  assert(feature.geometry?.type === "LineString", `${id}: expected a LineString`);
  assert(Array.isArray(coordinates) && coordinates.length > 100, `${id}: route is not detailed enough`);
  if (!Array.isArray(coordinates) || coordinates.length < 2) continue;

  coordinates.forEach((coordinate, index) => {
    assert(Array.isArray(coordinate) && coordinate.length === 2, `${id}: invalid coordinate ${index}`);
    const [lng, lat] = coordinate;
    assert(Number.isFinite(lat) && Number.isFinite(lng), `${id}: non-finite coordinate ${index}`);
    assert(lat >= 38.97 && lat <= 39.02 && lng >= -0.55 && lng <= -0.49, `${id}: coordinate ${index} is outside Xativa`);
    if (index > 0) {
      assert(lng !== coordinates[index - 1][0] || lat !== coordinates[index - 1][1], `${id}: duplicate coordinate ${index}`);
    }
  });

  const route = coordinates.map(([lng, lat]) => [lat, lng]);
  const metrics = buildRouteMetrics(route);
  const closingGapM = distanceMeters(route[0], route.at(-1));
  assert(closingGapM < 1, `${id}: circular route is open by ${closingGapM.toFixed(1)} m`);
  assert(metrics.totalDistanceM >= limits[id].minDistanceM, `${id}: route is unexpectedly short`);
  assert(metrics.totalDistanceM <= limits[id].maxDistanceM, `${id}: route is unexpectedly long`);
  assert(Math.abs(metrics.totalDistanceM - feature.properties.distanceM) < 2, `${id}: stored distance is stale`);

  for (let index = 1; index < route.length; index += 1) {
    const segmentM = distanceMeters(route[index - 1], route[index]);
    assert(segmentM <= 210, `${id}: segment ${index - 1}-${index} jumps ${segmentM.toFixed(1)} m`);
  }

  const occurrences = feature.properties.stopOccurrences;
  assert(occurrences.length === definition.stopIds.length + 1, `${id}: unexpected stop occurrence count`);
  let previousDistanceM = -1;
  occurrences.forEach((occurrence, index) => {
    assert(occurrence.sequence === index, `${id}: occurrence sequence ${index} is invalid`);
    assert(definition.stopIds.includes(occurrence.stopId), `${id}: unknown stop ${occurrence.stopId}`);
    if (index < definition.stopIds.length) {
      assert(occurrence.stopId === definition.stopIds[index], `${id}: occurrence ${index} references the wrong stop`);
      assert(occurrence.stopIndex === index, `${id}: occurrence ${index} has an invalid stop index`);
      assert(!occurrence.terminal, `${id}: published stop ${index} is marked terminal`);
    }
    assert(occurrence.distanceAlongM >= previousDistanceM, `${id}: stop distances are not monotonic`);
    assert(occurrence.segmentIndex >= 0 && occurrence.segmentIndex < route.length - 1, `${id}: invalid route segment for stop ${occurrence.stopId}`);
    assert(occurrence.segmentFraction >= 0 && occurrence.segmentFraction <= 1, `${id}: invalid segment fraction for stop ${occurrence.stopId}`);
    assert(occurrence.snapDistanceM <= 90, `${id}: stop ${occurrence.stopId} is ${occurrence.snapDistanceM} m from route`);
    previousDistanceM = occurrence.distanceAlongM;
  });
  assert(occurrences.at(-1).terminal === true, `${id}: terminal origin occurrence is missing`);
  assert(occurrences.at(-1).stopId === definition.stopIds[0], `${id}: terminal occurrence does not return to origin`);
  assert(occurrences.at(-1).stopIndex === 0, `${id}: terminal occurrence has an invalid stop index`);
  assert(Math.abs(occurrences.at(-1).distanceAlongM - metrics.totalDistanceM) < 2, `${id}: terminal occurrence is not at route end`);
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Route data validation passed.");
}
