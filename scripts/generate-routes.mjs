import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { routeTraces } from "../src/data/route-traces.js";
import {
  buildRouteMetrics,
  distanceMeters,
  projectPointOntoRoute
} from "../src/scripts/route-geometry.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTER_URL = process.env.ROUTER_URL || "https://router.project-osrm.org";
const TRACE_SPACING_M = 35;
const MATCH_CHUNK_SIZE = 10;
const MATCH_RADIUS_M = 40;

function densifyTrace(trace) {
  const points = [];
  for (let index = 0; index < trace.length - 1; index += 1) {
    const from = trace[index];
    const to = trace[index + 1];
    const subdivisions = Math.max(1, Math.ceil(distanceMeters(from, to) / TRACE_SPACING_M));
    for (let step = 0; step < subdivisions; step += 1) {
      const fraction = step / subdivisions;
      points.push([
        from[0] + (to[0] - from[0]) * fraction,
        from[1] + (to[1] - from[1]) * fraction
      ]);
    }
  }
  points.push([...trace.at(-1)]);
  return points;
}

function matchUrl(points) {
  const coordinates = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const radiuses = points.map(() => MATCH_RADIUS_M).join(";");
  return `${ROUTER_URL}/match/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false&gaps=ignore&tidy=true&radiuses=${radiuses}`;
}

async function matchChunk(points, line, chunkIndex) {
  const response = await fetch(matchUrl(points), {
    headers: { "User-Agent": "bus-urbano-xativa route generator" }
  });
  if (!response.ok) throw new Error(`${line}: router returned HTTP ${response.status}`);

  const result = await response.json();
  if (result.code !== "Ok" || !result.matchings?.length) {
    throw new Error(`${line}: chunk ${chunkIndex} could not be matched (${result.code || "invalid response"})`);
  }
  return result.matchings.flatMap(matching => matching.geometry.coordinates);
}

async function routeBridge(from, to, line) {
  // Overlapping match chunks can snap to opposite carriageways. A short local
  // join preserves the traced street instead of introducing a multi-kilometre detour.
  if (distanceMeters(from, to) <= 200) {
    return [[from[1], from[0]], [to[1], to[0]]];
  }
  const coordinates = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const response = await fetch(
    `${ROUTER_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
    { headers: { "User-Agent": "bus-urbano-xativa route generator" } }
  );
  const result = await response.json();
  if (!response.ok || result.code !== "Ok" || !result.routes?.[0]) {
    throw new Error(`${line}: could not bridge matching chunks`);
  }
  if (result.routes[0].distance > 1500) {
    throw new Error(`${line}: matching chunks require a ${(result.routes[0].distance / 1000).toFixed(2)} km bridge from ${from.join(",")} to ${to.join(",")}`);
  }
  return result.routes[0].geometry.coordinates;
}

async function matchTrace(trace, line) {
  const denseTrace = densifyTrace(trace);
  const coordinates = [];

  for (let start = 0, chunkIndex = 0; start < denseTrace.length - 1; start += MATCH_CHUNK_SIZE - 1, chunkIndex += 1) {
    const chunk = denseTrace.slice(start, Math.min(start + MATCH_CHUNK_SIZE, denseTrace.length));
    const matched = await matchChunk(chunk, line, chunkIndex);

    if (coordinates.length) {
      const previous = [coordinates.at(-1)[1], coordinates.at(-1)[0]];
      let joinIndex = 0;
      let joinDistanceM = Infinity;
      matched.forEach(([lng, lat], index) => {
        const candidateDistanceM = distanceMeters(previous, [lat, lng]);
        if (candidateDistanceM < joinDistanceM) {
          joinDistanceM = candidateDistanceM;
          joinIndex = index;
        }
      });
      matched.splice(0, joinIndex);
      const gapM = distanceMeters(
        previous,
        [matched[0][1], matched[0][0]]
      );
      if (gapM >= 2) {
        const bridge = await routeBridge(previous, [matched[0][1], matched[0][0]], line);
        coordinates.push(...bridge.slice(1, -1));
      } else matched.shift();
    }
    coordinates.push(...matched);
  }

  for (let index = coordinates.length - 1; index > 0; index -= 1) {
    if (coordinates[index][0] === coordinates[index - 1][0] && coordinates[index][1] === coordinates[index - 1][1]) {
      coordinates.splice(index, 1);
    }
  }

  const closingGapM = distanceMeters(
    [coordinates[0][1], coordinates[0][0]],
    [coordinates.at(-1)[1], coordinates.at(-1)[0]]
  );
  if (closingGapM > MATCH_RADIUS_M * 2) {
    throw new Error(`${line}: generated loop has a ${closingGapM.toFixed(1)} m closing gap`);
  }
  coordinates[coordinates.length - 1] = [...coordinates[0]];
  return coordinates;
}

function segmentAtDistance(cumulativeDistances, distanceM) {
  let index = 0;
  while (index < cumulativeDistances.length - 2 && cumulativeDistances[index + 1] < distanceM) {
    index += 1;
  }
  return index;
}

function buildStopOccurrences(definition, route, routeMetrics) {
  const traceMetrics = buildRouteMetrics(definition.trace);
  let previousSegment = 0;

  const occurrences = definition.stopTraceIndexes.map((traceIndex, stopIndex) => {
    const expectedProgress = traceMetrics.cumulativeDistances[traceIndex] / traceMetrics.totalDistanceM;
    const windowM = routeMetrics.totalDistanceM * 0.12;
    const expectedDistanceM = routeMetrics.totalDistanceM * expectedProgress;
    const startSegment = Math.max(previousSegment, segmentAtDistance(
      routeMetrics.cumulativeDistances,
      Math.max(0, expectedDistanceM - windowM)
    ));
    const endSegment = segmentAtDistance(
      routeMetrics.cumulativeDistances,
      Math.min(routeMetrics.totalDistanceM, expectedDistanceM + windowM)
    );
    const point = definition.trace[traceIndex];
    const projection = projectPointOntoRoute(point, route, routeMetrics.cumulativeDistances, {
      startSegment,
      endSegment: Math.max(startSegment, endSegment)
    });
    previousSegment = projection.segmentIndex;

    return {
      stopId: definition.stopIds[stopIndex],
      stopIndex,
      sequence: stopIndex,
      distanceAlongM: Math.round(projection.distanceAlongM * 10) / 10,
      snapDistanceM: Math.round(projection.snapDistanceM * 10) / 10,
      segmentIndex: projection.segmentIndex,
      segmentFraction: Math.round(projection.segmentFraction * 1000000) / 1000000
    };
  });

  occurrences.push({
    stopId: definition.stopIds[0],
    stopIndex: 0,
    sequence: definition.stopIds.length,
    terminal: true,
    distanceAlongM: Math.round(routeMetrics.totalDistanceM * 10) / 10,
    snapDistanceM: Math.round(distanceMeters(definition.trace[0], route.at(-1)) * 10) / 10,
    segmentIndex: route.length - 2,
    segmentFraction: 1
  });
  return occurrences;
}

async function generateRoute(id, definition) {
  const coordinates = await matchTrace(definition.trace, definition.line);
  const route = coordinates.map(([lng, lat]) => [lat, lng]);
  const metrics = buildRouteMetrics(route);
  const stopOccurrences = buildStopOccurrences(definition, route, metrics);

  return {
    type: "Feature",
    properties: {
      id,
      line: definition.line,
      generatedAt: new Date().toISOString(),
      source: "OpenStreetMap contributors",
      sourceUrl: "https://www.openstreetmap.org/copyright",
      router: "OSRM map matching",
      routerUrl: ROUTER_URL,
      routingProfile: "driving",
      geometryAccuracy: "orientative-road-aligned",
      distanceM: Math.round(metrics.totalDistanceM * 10) / 10,
      circular: true,
      traceSpacingM: TRACE_SPACING_M,
      matchRadiusM: MATCH_RADIUS_M,
      attribution: "Route aligned to OpenStreetMap road data (ODbL).",
      license: "ODbL-1.0",
      stopOccurrences
    },
    geometry: { type: "LineString", coordinates }
  };
}

await mkdir(resolve(ROOT, "src/data/routes"), { recursive: true });
for (const [id, definition] of Object.entries(routeTraces)) {
  const route = await generateRoute(id, definition);
  const output = resolve(ROOT, `src/data/routes/${id}.json`);
  await writeFile(output, `${JSON.stringify(route, null, 2)}\n`);
  const maxSnapM = Math.max(...route.properties.stopOccurrences.map(stop => stop.snapDistanceM));
  console.log(`${definition.line}: ${(route.properties.distanceM / 1000).toFixed(2)} km, ${route.geometry.coordinates.length} points, max stop snap ${maxSnapM.toFixed(1)} m`);
}
