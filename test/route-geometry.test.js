import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRouteMetrics,
  distanceMeters,
  getOccurrenceIndexAtDistance,
  projectPointOntoRoute,
  sampleRouteAtDistance
} from "../src/scripts/route-geometry.js";

const route = [[39, -0.52], [39, -0.51], [39.01, -0.51]];
const metrics = buildRouteMetrics(route);

test("buildRouteMetrics accumulates every segment", () => {
  assert.equal(metrics.cumulativeDistances.length, route.length);
  assert.ok(metrics.totalDistanceM > 1900);
  assert.ok(metrics.totalDistanceM < 2100);
});

test("sampleRouteAtDistance clamps and interpolates positions", () => {
  assert.deepEqual(sampleRouteAtDistance(route, metrics.cumulativeDistances, -1).position, route[0]);
  assert.deepEqual(sampleRouteAtDistance(route, metrics.cumulativeDistances, Infinity).position, route.at(-1));

  const firstSegmentM = distanceMeters(route[0], route[1]);
  const middle = sampleRouteAtDistance(route, metrics.cumulativeDistances, firstSegmentM / 2);
  assert.equal(middle.segmentIndex, 0);
  assert.ok(Math.abs(middle.position[1] - -0.515) < 0.00001);
});

test("projectPointOntoRoute returns route progress and snap distance", () => {
  const projection = projectPointOntoRoute([39.001, -0.515], route, metrics.cumulativeDistances);
  assert.equal(projection.segmentIndex, 0);
  assert.ok(projection.distanceAlongM > 400);
  assert.ok(projection.snapDistanceM > 100);
});

test("getOccurrenceIndexAtDistance advances monotonically", () => {
  const occurrences = [
    { distanceAlongM: 0 },
    { distanceAlongM: 100 },
    { distanceAlongM: 250 }
  ];
  assert.equal(getOccurrenceIndexAtDistance(occurrences, 0), 0);
  assert.equal(getOccurrenceIndexAtDistance(occurrences, 249), 1);
  assert.equal(getOccurrenceIndexAtDistance(occurrences, 250), 2);
});
