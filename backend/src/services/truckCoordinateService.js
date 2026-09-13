import { geocodeLocation } from './spatialService.js';

function isValidCoordinatePair(value) {
  return Number.isFinite(Number(value?.lat))
    && Number.isFinite(Number(value?.lon))
    && Number(value.lat) >= -90
    && Number(value.lat) <= 90
    && Number(value.lon) >= -180
    && Number(value.lon) <= 180;
}

function addressQueries(address, city) {
  const cityState = [address?.city || city, address?.state].filter(Boolean).join(', ');
  const detailed = [address?.streetArea, address?.landmark, cityState].filter(Boolean).join(', ');
  return [...new Set([detailed, cityState, city].filter(Boolean))];
}

async function resolveAddress(address, city, geocoder) {
  for (const query of addressQueries(address, city)) {
    const result = await geocoder(query, { allowSyntheticFallback: false });
    if (isValidCoordinatePair(result)) return result;
  }
  return null;
}

export { isValidCoordinatePair };

export async function resolveTruckCoordinates({
  pickupAddress,
  deliveryAddress,
  originCity,
  destinationCity,
  geocoder = geocodeLocation
}) {
  const origin = await resolveAddress(pickupAddress, originCity, geocoder);
  const destination = await resolveAddress(deliveryAddress, destinationCity, geocoder);
  return {
    origin: isValidCoordinatePair(origin) ? { lat: Number(origin.lat), lon: Number(origin.lon) } : null,
    destination: isValidCoordinatePair(destination) ? { lat: Number(destination.lat), lon: Number(destination.lon) } : null
  };
}

export function hasCompleteTruckRouteCoordinates(truck) {
  return isValidCoordinatePair(truck?.originCoordinates)
    && isValidCoordinatePair(truck?.destinationCoordinates);
}
