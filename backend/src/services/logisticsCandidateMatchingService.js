import { calculateDistanceKm } from './spatialService.js';
import {
  evaluateCorridorMatch,
  validateCorridorCandidatePrerequisites,
  CORRIDOR_MATCH_DEFAULTS
} from './corridorMatchingService.js';

const DIRECT_POINT_TOLERANCE_KM = 0.5;

function directRouteDistanceKm(shipment) {
  const distance = calculateDistanceKm(
    shipment?.pickup?.lat,
    shipment?.pickup?.lon,
    shipment?.delivery?.lat,
    shipment?.delivery?.lon
  );
  return Number.isFinite(distance) && distance > 0 ? distance * 1.25 : null;
}

function normalizeLocation(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function directRouteMatches(vehicle, shipment) {
  const pickupCity = normalizeLocation(shipment.pickupCity);
  const deliveryCity = normalizeLocation(shipment.deliveryCity);
  const vehicleOrigin = normalizeLocation(vehicle.originCity);
  const vehicleDestination = normalizeLocation(vehicle.destinationCity);
  const cityMatch = Boolean(pickupCity && deliveryCity)
    && (pickupCity.includes(vehicleOrigin) || vehicleOrigin.includes(pickupCity))
    && (deliveryCity.includes(vehicleDestination) || vehicleDestination.includes(deliveryCity));
  const coordinateMatch = vehicle.origin && vehicle.destination && shipment.pickup && shipment.delivery
    && calculateDistanceKm(vehicle.origin.lat, vehicle.origin.lon, shipment.pickup.lat, shipment.pickup.lon) <= DIRECT_POINT_TOLERANCE_KM
    && calculateDistanceKm(vehicle.destination.lat, vehicle.destination.lon, shipment.delivery.lat, shipment.delivery.lon) <= DIRECT_POINT_TOLERANCE_KM;
  return cityMatch || coordinateMatch;
}

function directCandidate(vehicle, shipment) {
  const prerequisiteError = validateCorridorCandidatePrerequisites({ truck: vehicle, shipment });
  if (prerequisiteError) return prerequisiteError;
  if (!directRouteMatches(vehicle, shipment)) return null;
  const distanceKm = directRouteDistanceKm(shipment);
  const ratePerKm = Number(vehicle.ratePerKm);
  const estimatedCost = Number.isFinite(ratePerKm) && distanceKm
    ? Number((ratePerKm * distanceKm).toFixed(2))
    : null;
  return {
    ...vehicle,
    vehicle,
    matchMode: 'DIRECT_MATCH',
    matchReason: 'Vehicle route exactly matches the shipment route.',
    baseDistanceKm: distanceKm,
    combinedDistanceKm: distanceKm,
    detourKm: 0,
    detourPercent: 0,
    estimatedCost: Number.isFinite(Number(vehicle.estimatedCost)) ? Number(vehicle.estimatedCost) : estimatedCost
  };
}

export async function rankLogisticsCandidates({
  vehicles = [],
  shipment,
  options = {},
  routeFetcher
}) {
  const directMatches = [];
  const corridorInputs = [];
  for (const vehicle of vehicles) {
    const direct = directCandidate(vehicle, shipment);
    if (direct) {
      directMatches.push(direct);
      continue;
    }
    const prerequisites = validateCorridorCandidatePrerequisites({ truck: vehicle, shipment });
    if (!prerequisites) corridorInputs.push(vehicle);
  }

  const corridorMatches = await Promise.all(corridorInputs.map(async vehicle => {
    const result = await evaluateCorridorMatch({
      truck: {
        ...vehicle,
        origin: vehicle.origin || vehicle.originCoordinates,
        destination: vehicle.destination || vehicle.destinationCoordinates
      },
      shipment,
      options: { ...CORRIDOR_MATCH_DEFAULTS, ...options },
      routeFetcher
    });
    if (!result.compatible || result.mode !== 'ON_ROUTE_MATCH') return null;
    const estimatedCost = Number.isFinite(Number(vehicle.ratePerKm))
      ? Number(vehicle.ratePerKm) * result.combinedDistanceKm
      : null;
    return {
      ...vehicle,
      vehicle,
      ...result,
      matchMode: result.mode,
      matchReason: result.reason,
      estimatedCost
    };
  }));

  const sortCandidates = (first, second) => {
    const modeOrder = { DIRECT_MATCH: 0, ON_ROUTE_MATCH: 1 };
    return modeOrder[first.matchMode] - modeOrder[second.matchMode]
      || ((first.estimatedCost ?? Number.POSITIVE_INFINITY) - (second.estimatedCost ?? Number.POSITIVE_INFINITY))
      || (first.matchMode === 'ON_ROUTE_MATCH'
        ? first.detourKm - second.detourKm
        : 0)
      || String(first.id).localeCompare(String(second.id));
  };

  return [...directMatches, ...corridorMatches.filter(Boolean)].sort(sortCandidates);
}
