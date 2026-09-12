/**
 * Spatial Math & Geo-Proximity Helpers for LoopPack Exchange
 * Simulates PostGIS ST_DWithin and ST_Distance queries locally
 */

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export function calculateRoadDistanceKm(lat1, lon1, lat2, lon2, circuityFactor = 1.25) {
  const directKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  return parseFloat((directKm * circuityFactor).toFixed(1));
}

export function getPickupDropMetrics(pickupLat, pickupLon, dropLat, dropLon) {
  const directDistanceKm = calculateHaversineDistance(pickupLat, pickupLon, dropLat, dropLon);
  const roadDistanceKm = calculateRoadDistanceKm(pickupLat, pickupLon, dropLat, dropLon);
  
  // Average freight truck speed in urban/semi-urban industrial transit: ~32 km/h
  const estTransitMinutes = Math.round((roadDistanceKm / 32) * 60);
  
  // Diesel truck average: ~0.35 L diesel per km for 2.5-6 ton light commercial vehicles (Tata 407 / Eicher)
  const dieselConsumedLiters = parseFloat((roadDistanceKm * 0.35).toFixed(1));
  
  // Backhaul savings: empty return leg pooling avoids separate dedicated empty trips (~42% efficiency)
  const fuelSavedLiters = parseFloat((dieselConsumedLiters * 0.42).toFixed(1));
  
  // Diesel emission factor: ~2.68 kg CO2e per liter of diesel
  const co2AvoidedKg = parseFloat((fuelSavedLiters * 2.68).toFixed(1));
  
  return {
    directDistanceKm,
    roadDistanceKm,
    estTransitMinutes,
    dieselConsumedLiters,
    fuelSavedLiters,
    co2AvoidedKg
  };
}

export function filterListingsByProximity(listings, userLat, userLon, maxRadiusKm = 50) {
  return listings
    .map(listing => {
      const distance = calculateHaversineDistance(userLat, userLon, listing.lat, listing.lon);
      return { ...listing, distanceKm: distance };
    })
    .filter(item => item.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

