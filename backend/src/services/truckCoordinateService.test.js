import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteTruckRouteCoordinates, resolveTruckCoordinates } from './truckCoordinateService.js';

test('resolves Junagadh to Gandhinagar from structured addresses', async () => {
  const geocoder = async query => query.includes('Junagadh')
    ? { lat: 21.5220416, lon: 70.4582458 }
    : { lat: 23.2232877, lon: 72.6492267 };
  const result = await resolveTruckCoordinates({
    pickupAddress: { state: 'Gujarat', city: 'Junagadh', streetArea: 'Industrial Area' },
    deliveryAddress: { state: 'Gujarat', city: 'Gandhinagar', streetArea: 'Sector 1' },
    originCity: 'Junagadh',
    destinationCity: 'Gandhinagar',
    geocoder
  });
  assert.deepEqual(result, {
    origin: { lat: 21.5220416, lon: 70.4582458 },
    destination: { lat: 23.2232877, lon: 72.6492267 }
  });
  assert.equal(hasCompleteTruckRouteCoordinates({ originCoordinates: result.origin, destinationCoordinates: result.destination }), true);
});

test('does not use stale legacy lat/lon when structured coordinates are missing', () => {
  const legacyTruck = {
    originCity: 'Junagadh',
    lat: 23.1862867,
    lon: 72.6277877,
    originCoordinates: null,
    destinationCoordinates: { lat: 23.2232877, lon: 72.6492267 }
  };
  assert.equal(hasCompleteTruckRouteCoordinates(legacyTruck), false);
  assert.equal(legacyTruck.originCoordinates, null);
});
