import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCorridorMatch } from './corridorMatchingService.js';

const truck = {
  origin: { lat: 0, lon: 0 },
  destination: { lat: 0, lon: 1 },
  capacityTons: 10,
  availableDate: '2026-09-13',
  availableTime: '09:00',
  status: 'available'
};

const point = (lon, lat = 0) => ({ lat, lon });
const shipment = (pickup, delivery, requiredCapacityTons = 2) => ({
  pickup,
  delivery,
  requiredCapacityTons,
  requestedDate: '2026-09-13',
  requestedTime: '09:00'
});

function fakeRouteFetcher(waypoints) {
  const isBase = waypoints.length === 2;
  const isValidCorridor = waypoints[1].lon === 0.35 && waypoints[2].lon === 0.65;
  const isWrongDirection = waypoints[1].lon === 0.65 && waypoints[2].lon === 0.35;
  const isExcessive = waypoints[1].lat === 0.1;
  return Promise.resolve({
    isRealOSRM: true,
    distanceKm: isBase ? 111.2 : isValidCorridor ? 125 : isWrongDirection ? 135 : isExcessive ? 400 : 220,
    durationMins: isBase ? 100 : 120,
    geometry: {
      type: 'LineString',
      coordinates: isBase
        ? [[0, 0], [1, 0]]
        : [[0, 0], [0.35, 0], [0.65, 0], [1, 0]]
    }
  });
}

const evaluate = (shipmentValue, truckValue = truck, routeFetcher = fakeRouteFetcher) => evaluateCorridorMatch({
  truck: truckValue,
  shipment: shipmentValue,
  routeFetcher
});

test('returns DIRECT_MATCH for an exact route', async () => {
  const result = await evaluate(shipment(point(0), point(1)));
  assert.equal(result.mode, 'DIRECT_MATCH');
  assert.equal(result.compatible, true);
});

test('returns ON_ROUTE_MATCH for a small-detour shipment in route order', async () => {
  const result = await evaluate(shipment(point(0.35, 0.02), point(0.65, 0.02)));
  assert.equal(result.mode, 'ON_ROUTE_MATCH');
  assert.equal(result.compatible, true);
});

test('rejects a shipment travelling in the wrong direction', async () => {
  const result = await evaluate(shipment(point(0.65), point(0.35)));
  assert.equal(result.reasonCode, 'WRONG_DIRECTION');
});

test('rejects an excessive detour', async () => {
  const result = await evaluate(shipment(point(0.5, 0.1), point(0.6, 0.1)));
  assert.equal(result.reasonCode, 'DETOUR_TOO_LARGE');
});

test('rejects insufficient capacity before routing', async () => {
  const result = await evaluate(shipment(point(0.35), point(0.65), 11));
  assert.equal(result.reasonCode, 'INSUFFICIENT_CAPACITY');
});

test('rejects missing coordinates', async () => {
  const result = await evaluate(shipment(null, point(0.65)));
  assert.equal(result.reasonCode, 'MISSING_COORDINATES');
});

test('rejects OSRM fallback or failure', async () => {
  const result = await evaluate(shipment(point(0.35), point(0.65)), truck, async () => ({
    isRealOSRM: false,
    distanceKm: 125,
    durationMins: 120,
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 0]] }
  }));
  assert.equal(result.reasonCode, 'ROUTE_UNAVAILABLE');
});
