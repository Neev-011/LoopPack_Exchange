import { fetchOSRMRoute } from './osrmService.js';
import { calculateDistanceKm } from './spatialService.js';

export const CORRIDOR_MATCH_DEFAULTS = Object.freeze({
  maxDetourKm: 40,
  maxDetourPercent: 15,
  maxCorridorDistanceKm: 25,
  exactPointToleranceKm: 0.5
});

function validPoint(point) {
  return Number.isFinite(Number(point?.lat))
    && Number.isFinite(Number(point?.lon))
    && Number(point.lat) >= -90
    && Number(point.lat) <= 90
    && Number(point.lon) >= -180
    && Number(point.lon) <= 180;
}

function compatibleDate(requestedDate, availableDate) {
  return !requestedDate || !availableDate || availableDate === 'Available Today' || requestedDate === availableDate;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function compatibleTime(requestedTime, availableTime) {
  if (!requestedTime || !availableTime) return true;
  if (availableTime === '00:00') return true;
  const requested = timeToMinutes(requestedTime);
  const available = timeToMinutes(availableTime);
  return requested !== null && available !== null && Math.abs(requested - available) <= 120;
}

function routeCoordinates(route) {
  return route?.geometry?.type === 'LineString' && Array.isArray(route.geometry.coordinates)
    ? route.geometry.coordinates.filter(coordinate => Array.isArray(coordinate) && coordinate.length >= 2)
    : [];
}

function projectPointToSegment(point, start, end) {
  const latitudeScale = Math.cos((Number(point.lat) * Math.PI) / 180);
  const startX = Number(start[0]) * latitudeScale;
  const startY = Number(start[1]);
  const endX = Number(end[0]) * latitudeScale;
  const endY = Number(end[1]);
  const pointX = Number(point.lon) * latitudeScale;
  const pointY = Number(point.lat);
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = (dx * dx) + (dy * dy);
  const ratio = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((pointX - startX) * dx + (pointY - startY) * dy) / lengthSquared));
  const projected = {
    lat: startY + ((endY - startY) * ratio),
    lon: (startX + ((endX - startX) * ratio)) / latitudeScale
  };
  return {
    distanceKm: calculateDistanceKm(point.lat, point.lon, projected.lat, projected.lon),
    segmentRatio: ratio,
    segmentLengthKm: calculateDistanceKm(start[1], start[0], end[1], end[0])
  };
}

function projectPointToRoute(point, route) {
  const coordinates = routeCoordinates(route);
  let best = null;
  let distanceAlongKm = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const segment = projectPointToSegment(point, coordinates[index], coordinates[index + 1]);
    const candidate = {
      distanceKm: segment.distanceKm,
      distanceAlongKm: distanceAlongKm + (segment.segmentLengthKm * segment.segmentRatio)
    };
    if (!best || candidate.distanceKm < best.distanceKm) best = candidate;
    distanceAlongKm += segment.segmentLengthKm;
  }
  return best;
}

function incompatible(reason, reasonCode = 'INCOMPATIBLE') {
  return { compatible: false, mode: 'INCOMPATIBLE', reason, reasonCode };
}

function coordinateRoutePoint(point, name) {
  return { lat: Number(point.lat), lon: Number(point.lon), name };
}

export function validateCorridorCandidatePrerequisites({ truck, shipment }) {
  if (String(truck?.status || 'available').toLowerCase() !== 'available') {
    return incompatible('Truck is not available.', 'TRUCK_UNAVAILABLE');
  }
  if (!Number.isFinite(Number(truck?.capacityTons))
    || Number(truck.capacityTons) < Number(shipment?.requiredCapacityTons)) {
    return incompatible('Truck capacity is insufficient for the shipment.', 'INSUFFICIENT_CAPACITY');
  }
  if (!compatibleDate(shipment?.requestedDate, truck?.availableDate)) {
    return incompatible('Truck availability date is incompatible.', 'DATE_INCOMPATIBLE');
  }
  if (!compatibleTime(shipment?.requestedTime, truck?.availableTime)) {
    return incompatible('Truck availability time is incompatible.', 'TIME_INCOMPATIBLE');
  }
  return null;
}

export async function evaluateCorridorMatch({
  truck,
  shipment,
  options = {},
  routeFetcher = fetchOSRMRoute
}) {
  const settings = { ...CORRIDOR_MATCH_DEFAULTS, ...options };
  const points = {
    origin: truck?.origin,
    destination: truck?.destination,
    pickup: shipment?.pickup,
    delivery: shipment?.delivery
  };

  if (!Object.values(points).every(validPoint)) {
    return incompatible('Reliable coordinates are required for the truck and shipment endpoints.', 'MISSING_COORDINATES');
  }
  const prerequisiteError = validateCorridorCandidatePrerequisites({ truck, shipment });
  if (prerequisiteError) return prerequisiteError;

  const baseWaypoints = [
    coordinateRoutePoint(points.origin, 'Truck origin'),
    coordinateRoutePoint(points.destination, 'Truck destination')
  ];
  const combinedWaypoints = [
    coordinateRoutePoint(points.origin, 'Truck origin'),
    coordinateRoutePoint(points.pickup, 'Shipment pickup'),
    coordinateRoutePoint(points.delivery, 'Shipment delivery'),
    coordinateRoutePoint(points.destination, 'Truck destination')
  ];

  let baseRoute;
  let combinedRoute;
  try {
    [baseRoute, combinedRoute] = await Promise.all([
      routeFetcher(baseWaypoints),
      routeFetcher(combinedWaypoints)
    ]);
  } catch (error) {
    return incompatible(`Route calculation unavailable: ${error.message}`, 'ROUTE_UNAVAILABLE');
  }

  if (!baseRoute?.isRealOSRM || !combinedRoute?.isRealOSRM) {
    return incompatible('Route calculation unavailable.', 'ROUTE_UNAVAILABLE');
  }
  if (!Number.isFinite(Number(baseRoute.distanceKm))
    || !Number.isFinite(Number(combinedRoute.distanceKm))
    || Number(baseRoute.distanceKm) <= 0) {
    return incompatible('Route calculation returned invalid distances.', 'INVALID_ROUTE');
  }

  const baseDistanceKm = Number(baseRoute.distanceKm);
  const combinedDistanceKm = Number(combinedRoute.distanceKm);
  const detourKm = Math.max(0, combinedDistanceKm - baseDistanceKm);
  const detourPercent = (detourKm / baseDistanceKm) * 100;
  const pickupProjection = projectPointToRoute(points.pickup, baseRoute);
  const deliveryProjection = projectPointToRoute(points.delivery, baseRoute);
  const exactRoute = calculateDistanceKm(points.origin.lat, points.origin.lon, points.pickup.lat, points.pickup.lon) <= settings.exactPointToleranceKm
    && calculateDistanceKm(points.destination.lat, points.destination.lon, points.delivery.lat, points.delivery.lon) <= settings.exactPointToleranceKm;

  if (!pickupProjection || !deliveryProjection) {
    return incompatible('Base route geometry is unavailable.', 'INVALID_ROUTE_GEOMETRY');
  }
  if (exactRoute) {
    return {
      compatible: true,
      mode: 'DIRECT_MATCH',
      baseDistanceKm,
      combinedDistanceKm,
      detourKm,
      detourPercent: Number(detourPercent.toFixed(2)),
      baseDurationMinutes: Number(baseRoute.durationMins) || null,
      combinedDurationMinutes: Number(combinedRoute.durationMins) || null,
      route: points,
      reason: 'Shipment endpoints match the truck route.'
    };
  }
  if (pickupProjection.distanceKm > settings.maxCorridorDistanceKm
    || deliveryProjection.distanceKm > settings.maxCorridorDistanceKm) {
    return incompatible('Shipment stops are too far from the truck corridor.', 'OFF_CORRIDOR');
  }
  if (pickupProjection.distanceAlongKm >= deliveryProjection.distanceAlongKm) {
    return incompatible('Shipment pickup must occur before delivery in the truck direction.', 'WRONG_DIRECTION');
  }
  if (detourKm > settings.maxDetourKm || detourPercent > settings.maxDetourPercent) {
    return incompatible('Detour exceeds the configured corridor limits.', 'DETOUR_TOO_LARGE');
  }

  return {
    compatible: true,
    mode: exactRoute ? 'DIRECT_MATCH' : 'ON_ROUTE_MATCH',
    baseDistanceKm,
    combinedDistanceKm,
    detourKm,
    detourPercent: Number(detourPercent.toFixed(2)),
    baseDurationMinutes: Number(baseRoute.durationMins) || null,
    combinedDurationMinutes: Number(combinedRoute.durationMins) || null,
    route: points,
    reason: exactRoute
      ? 'Shipment endpoints match the truck route.'
      : 'Shipment can be added with an acceptable detour.'
  };
}
