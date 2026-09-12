import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLogisticsVehicles } from './logisticsMatchingService.js';

const matchingInput = {
  sellerLocation: 'Morbi',
  buyerDestination: 'Mumbai',
  quantity: 100,
  unit: 'boxes',
  requiredDate: '2026-09-12',
  requiredTime: '09:00'
};

function vehicle(originCity, destinationCity) {
  return {
    id: `${originCity}-${destinationCity}`,
    truckName: `${originCity} to ${destinationCity}`,
    originCity,
    destinationCity,
    capacityTons: 2,
    availableDate: matchingInput.requiredDate,
    availableTime: matchingInput.requiredTime,
    ratePerKm: 20,
    status: 'available'
  };
}

function matchedVehicles(route) {
  return rankLogisticsVehicles({
    ...matchingInput,
    vehicles: [vehicle(...route)]
  });
}

test('accepts an exact route', () => {
  assert.equal(matchedVehicles(['Morbi', 'Mumbai']).length, 1);
});

test('rejects a wrong pickup with the correct destination', () => {
  assert.equal(matchedVehicles(['Ahmedabad', 'Mumbai']).length, 0);
});

test('rejects a correct pickup with the wrong destination', () => {
  assert.equal(matchedVehicles(['Morbi', 'Surat']).length, 0);
});

test('rejects a route with both endpoints wrong', () => {
  assert.equal(matchedVehicles(['Ahmedabad', 'Surat']).length, 0);
});

test('rejects the reverse route direction', () => {
  assert.equal(matchedVehicles(['Mumbai', 'Morbi']).length, 0);
});
