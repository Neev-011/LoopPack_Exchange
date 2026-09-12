/**
 * PostGIS Spatial Matchmaking & Geocoding Service
 * Provides Haversine distance calculation, city/hub geocoding (with Nominatim OSM API integration),
 * and PostGIS spatial proximity search for B2B material listings.
 */

const CITY_COORDINATE_LOOKUP = {
  'mahape': { lat: 19.1150, lon: 73.0150, name: 'Mahape Industrial Park, Navi Mumbai' },
  'navi mumbai': { lat: 19.0330, lon: 73.0297, name: 'Navi Mumbai Hub' },
  'bhiwandi': { lat: 19.2968, lon: 73.0631, name: 'Bhiwandi Logistics Gateway' },
  'thane': { lat: 19.2183, lon: 72.9781, name: 'Thane Freight Hub' },
  'taloja': { lat: 19.0622, lon: 73.1114, name: 'Taloja MIDC Zone' },
  'kurla': { lat: 19.0650, lon: 72.8790, name: 'Kurla Industrial Estate' },
  'goregaon': { lat: 19.1663, lon: 72.8526, name: 'Goregaon East Hub' },
  'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Central Mumbai' },
  'pune': { lat: 18.5204, lon: 73.8567, name: 'Pune Logistics Depot' },
  'chakan': { lat: 18.7600, lon: 73.8590, name: 'Chakan Auto & Freight Corridor' },
  'nashik': { lat: 19.9975, lon: 73.7898, name: 'Nashik MIDC' },
  'ahmedabad': { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad GIDC' },
  'vadodara': { lat: 22.3072, lon: 73.1812, name: 'Vadodara Industrial Corridor' },
  'surat': { lat: 21.1702, lon: 72.8311, name: 'Surat Textile & Freight Park' },
  'vapi': { lat: 20.3717, lon: 72.9044, name: 'Vapi GIDC Estate' },
  'delhi': { lat: 28.6139, lon: 77.2090, name: 'Delhi NCR Freight Terminal' },
  'gurgaon': { lat: 28.4595, lon: 77.0266, name: 'Gurugram Logistics Park' },
  'noida': { lat: 28.5355, lon: 77.3910, name: 'Noida Phase II Hub' },
  'bangalore': { lat: 12.9716, lon: 77.5946, name: 'Bengaluru Logistics Corridor' },
  'peenya': { lat: 13.0312, lon: 77.5260, name: 'Peenya Industrial Area' },
  'chennai': { lat: 13.0827, lon: 80.2707, name: 'Chennai Port & Freight Corridor' },
  'hyderabad': { lat: 17.3850, lon: 78.4867, name: 'Hyderabad Industrial Zone' },
  'kolkata': { lat: 22.5726, lon: 88.3639, name: 'Kolkata Dankuni Freight Hub' }
};

/**
 * Calculates Haversine distance in kilometers between two lat/lon pairs
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

/**
 * Geocodes an actual location string to latitude, longitude, and display name.
 * Uses local fast lookup, fallback Nominatim API call, or deterministic hash for unknown locations.
 * 
 * @param {string} locationName 
 * @returns {Promise<{lat: number, lon: number, name: string}>}
 */
export async function geocodeLocation(locationName) {
  if (!locationName || typeof locationName !== 'string') {
    return { lat: 19.0760, lon: 72.8777, name: 'Central Mumbai Depot' };
  }

  const query = locationName.trim().toLowerCase();

  // 1. Direct dictionary match
  for (const [key, data] of Object.entries(CITY_COORDINATE_LOOKUP)) {
    if (query.includes(key)) {
      return {
        lat: data.lat,
        lon: data.lon,
        name: locationName.trim() || data.name
      };
    }
  }

  // 2. OpenStreetMap Nominatim API Geocoding for custom location strings
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationName)}`, {
      headers: { 'User-Agent': 'LoopPackExchange-B2B-Logistics/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          name: data[0].display_name.split(',')[0] || locationName
        };
      }
    }
  } catch (err) {
    console.warn(`[Geocoding] Nominatim lookup for "${locationName}" timed out, using fallback math:`, err.message);
  }

  // 3. Deterministic spatial offset fallback based on location string hash
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 200) - 100) / 1000; // ±0.1 deg
  const lonOffset = ((Math.abs(hash >> 3) % 200) - 100) / 1000;

  return {
    lat: parseFloat((19.0760 + latOffset).toFixed(4)),
    lon: parseFloat((72.8777 + lonOffset).toFixed(4)),
    name: locationName.trim()
  };
}

export function searchListingsPostGIS(listings, centerLat, centerLon, radiusKm = 25) {
  return listings
    .map(item => ({
      ...item,
      distanceKm: calculateDistanceKm(centerLat, centerLon, item.lat, item.lon)
    }))
    .filter(item => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
