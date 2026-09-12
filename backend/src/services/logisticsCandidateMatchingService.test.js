import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLogisticsCandidates } from './logisticsCandidateMatchingService.js';

const shipment = {
  pickupCity: 'Morbi',
  deliveryCity: 'Mumbai',
  pickup: { lat: 0, lon: 0.2 },
  delivery: { lat: 0, lon: 0.8 },
  requiredCapacityTons: 2,
  requestedDate: '2026-09-13',
  requestedTime: '09:00'
};

const baseVehicle = {
  capacityTons: 5,
  availableDate: shipment.requestedDate,
  availableTime: shipment.requestedTime,
  status: 'available',
  ratePerKm: 10
};

function routeFetcher(waypoints) {
  const base = waypoints.length === 2;
  const offset = waypoints[0].lon === 2 ? 2 : 0;
  return Promise.resolve({
    isRealOSRM: true,
    distanceKm: base ? 111 : 120,
    durationMins: base ? 100 : 110,
    geometry: { type: 'LineString', coordinates: [[offset, 0], [offset + 1, 0]] }
  });
}

test('ranks an exact direct match ahead of an on-route match', async () => {
  const result = await rankLogisticsCandidates({
    shipment,
    routeFetcher,
    vehicles: [
      { ...baseVehicle, id: 'corridor', truckName: 'Corridor', originCity: 'Ahmedabad', destinationCity: 'Mumbai', originCoordinates: { lat: 0, lon: 0 }, destinationCoordinates: { lat: 0, lon: 1 } },
      { ...baseVehicle, id: 'direct', truckName: 'Direct', originCity: 'Morbi', destinationCity: 'Mumbai' }
    ]
  });
  assert.equal(result[0].matchMode, 'DIRECT_MATCH');
  assert.equal(result[1].matchMode, 'ON_ROUTE_MATCH');
});

test('keeps only corridor-compatible non-direct candidates', async () => {
  const result = await rankLogisticsCandidates({
    shipment,
    routeFetcher,
    vehicles: [
      { ...baseVehicle, id: 'wrong', originCity: 'Ahmedabad', destinationCity: 'Mumbai', originCoordinates: { lat: 0, lon: 2 }, destinationCoordinates: { lat: 0, lon: 3 } },
      { ...baseVehicle, id: 'corridor', originCity: 'Ahmedabad', destinationCity: 'Mumbai', originCoordinates: { lat: 0, lon: 0 }, destinationCoordinates: { lat: 0, lon: 1 } }
    ]
  });
  assert.deepEqual(result.map(candidate => candidate.id), ['corridor']);
  assert.equal(result[0].matchMode, 'ON_ROUTE_MATCH');
});

test('does not require OSRM for a valid direct route', async () => {
  const result = await rankLogisticsCandidates({
    shipment,
    routeFetcher: async () => { throw new Error('offline'); },
    vehicles: [{ ...baseVehicle, id: 'direct', originCity: 'Morbi', destinationCity: 'Mumbai' }]
  });
  assert.equal(result[0].matchMode, 'DIRECT_MATCH');
});
