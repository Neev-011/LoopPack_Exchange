import { fetchOSRMRoute } from '../src/services/osrmService.js';
import { calculateDistanceKm } from '../src/services/spatialService.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002/api/v1';
const shipment = {
  pickupCity: 'Rajkot, Gujarat',
  deliveryCity: 'Ahmedabad, Gujarat',
  pickup: { lat: 22.3039, lon: 70.8022 },
  delivery: { lat: 23.0225, lon: 72.5714 },
  requiredCapacityTons: 1,
  requestedDate: '2026-09-13',
  requestedTime: '09:00'
};

function projectPointToRoute(point, route) {
  const coordinates = route.geometry.coordinates;
  let best = null;
  let distanceAlongKm = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const scale = Math.cos(Number(point.lat) * Math.PI / 180);
    const startX = Number(start[0]) * scale;
    const startY = Number(start[1]);
    const endX = Number(end[0]) * scale;
    const endY = Number(end[1]);
    const pointX = Number(point.lon) * scale;
    const pointY = Number(point.lat);
    const dx = endX - startX;
    const dy = endY - startY;
    const lengthSquared = (dx * dx) + (dy * dy);
    const ratio = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((pointX - startX) * dx + (pointY - startY) * dy) / lengthSquared));
    const projectedLat = startY + ((endY - startY) * ratio);
    const projectedLon = (startX + ((endX - startX) * ratio)) / scale;
    const segmentKm = calculateDistanceKm(start[1], start[0], end[1], end[0]);
    const candidate = {
      distanceKm: calculateDistanceKm(point.lat, point.lon, projectedLat, projectedLon),
      distanceAlongKm: distanceAlongKm + (segmentKm * ratio)
    };
    if (!best || candidate.distanceKm < best.distanceKm) best = candidate;
    distanceAlongKm += segmentKm;
  }
  return best;
}

const trucksResponse = await fetch(`${API_BASE_URL}/trucks`);
if (!trucksResponse.ok) throw new Error(`Truck lookup failed: HTTP ${trucksResponse.status}`);
const trucksPayload = await trucksResponse.json();
const storedTruck = trucksPayload.data.find(truck => truck.originCity === 'Junagadh' && truck.destinationCity === 'Gandhinagar');
if (!storedTruck) throw new Error('Corrected Junagadh -> Gandhinagar truck was not found.');

const vehicle = {
  ...storedTruck,
  origin: storedTruck.originCoordinates,
  destination: storedTruck.destinationCoordinates
};

const matchResponse = await fetch(`${API_BASE_URL}/trucks/match`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vehicles: [vehicle], shipment })
});
const matchPayload = await matchResponse.json();
if (!matchResponse.ok) throw new Error(`Matcher failed: HTTP ${matchResponse.status}`);

const baseRoute = await fetchOSRMRoute([vehicle.origin, vehicle.destination]);
const combinedRoute = await fetchOSRMRoute([vehicle.origin, shipment.pickup, shipment.delivery, vehicle.destination]);
const pickupProjection = projectPointToRoute(shipment.pickup, baseRoute);
const deliveryProjection = projectPointToRoute(shipment.delivery, baseRoute);
const detourKm = Number((combinedRoute.distanceKm - baseRoute.distanceKm).toFixed(2));
const detourPercent = Number((detourKm / baseRoute.distanceKm * 100).toFixed(2));
const result = matchPayload.data[0] || null;

const diagnostic = {
  truck: {
    originCity: storedTruck.originCity,
    destinationCity: storedTruck.destinationCity,
    originCoordinates: vehicle.origin,
    destinationCoordinates: vehicle.destination
  },
  shipment,
  baseRoute: {
    distanceKm: baseRoute.distanceKm,
    durationMins: baseRoute.durationMins,
    isRealOSRM: baseRoute.isRealOSRM
  },
  combinedRoute: {
    distanceKm: combinedRoute.distanceKm,
    durationMins: combinedRoute.durationMins,
    isRealOSRM: combinedRoute.isRealOSRM
  },
  detour: { km: detourKm, percent: detourPercent },
  corridor: {
    pickupRajkot: pickupProjection,
    deliveryAhmedabad: deliveryProjection,
    maxCorridorDistanceKm: 25
  },
  progression: {
    pickupBeforeDelivery: pickupProjection.distanceAlongKm < deliveryProjection.distanceAlongKm,
    pickupDistanceAlongKm: pickupProjection.distanceAlongKm,
    deliveryDistanceAlongKm: deliveryProjection.distanceAlongKm
  },
  matcher: {
    httpStatus: matchResponse.status,
    finalMode: result?.matchMode || 'INCOMPATIBLE',
    reason: result?.matchReason || result?.reason || null,
    reasonCode: result?.reasonCode || null
  }
};

console.log(JSON.stringify(diagnostic, null, 2));
if (diagnostic.matcher.finalMode !== 'ON_ROUTE_MATCH') process.exitCode = 1;
