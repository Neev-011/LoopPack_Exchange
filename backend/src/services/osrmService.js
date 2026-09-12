import { calculateDistanceKm } from './spatialService.js';

/**
 * Fetches real road routing data from Open Source Routing Machine (OSRM)
 * with automatic fallback to Haversine road-detour spatial math.
 * 
 * @param {Array<{lat: number, lon: number, name?: string}>} waypoints 
 * @returns {Promise<{
 *   distanceKm: number,
 *   durationMins: number,
 *   geometry: { type: string, coordinates: Array<[number, number]> },
 *   legs: Array<any>,
 *   isRealOSRM: boolean
 * }>}
 */
export async function fetchOSRMRoute(waypoints = []) {
  if (!waypoints || waypoints.length < 2) {
    return {
      distanceKm: 0,
      durationMins: 0,
      geometry: { type: 'LineString', coordinates: [] },
      legs: [],
      isRealOSRM: false
    };
  }

  // Format OSRM coordinate string: lon1,lat1;lon2,lat2;...
  const coordString = waypoints
    .map(pt => `${Number(pt.lon).toFixed(6)},${Number(pt.lat).toFixed(6)}`)
    .join(';');

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
        const durationMins = Math.round(route.duration / 60);

        return {
          distanceKm,
          durationMins,
          geometry: route.geometry,
          legs: route.legs.map((leg, i) => ({
            from: waypoints[i]?.name || `Point ${i + 1}`,
            to: waypoints[i + 1]?.name || `Point ${i + 2}`,
            distanceKm: parseFloat((leg.distance / 1000).toFixed(2)),
            durationMins: Math.round(leg.duration / 60),
            summary: leg.summary || 'Highway Corridor'
          })),
          isRealOSRM: true
        };
      }
    }
  } catch (err) {
    console.warn('[OSRM API] Network lookup unavailable, using Haversine road fallback:', err.message);
  }

  // FALLBACK: Calculate Haversine distance with 1.25x road factor multiplier
  let totalKm = 0;
  const legs = [];
  const coords = [];

  for (let i = 0; i < waypoints.length; i++) {
    const current = waypoints[i];
    coords.push([current.lon, current.lat]);

    if (i < waypoints.length - 1) {
      const next = waypoints[i + 1];
      const directKm = calculateDistanceKm(current.lat, current.lon, next.lat, next.lon);
      const roadKm = parseFloat((directKm * 1.25).toFixed(2));
      totalKm += roadKm;
      const legMins = Math.max(5, Math.round(roadKm * 2.2));

      legs.push({
        from: current.name || `Point ${i + 1}`,
        to: next.name || `Point ${i + 2}`,
        distanceKm: roadKm,
        durationMins: legMins,
        summary: 'Estimated Driving Corridor'
      });
    }
  }

  const finalKm = parseFloat(totalKm.toFixed(2));
  return {
    distanceKm: finalKm,
    durationMins: Math.round(finalKm * 2.2),
    geometry: {
      type: 'LineString',
      coordinates: coords
    },
    legs,
    isRealOSRM: false
  };
}

/**
 * Computes an N x N OSRM distance matrix for Google OR-Tools VRP Solver
 */
export async function fetchOSRMTable(waypoints = []) {
  if (!waypoints || waypoints.length === 0) return { matrix: [] };

  const coordString = waypoints
    .map(pt => `${Number(pt.lon).toFixed(6)},${Number(pt.lat).toFixed(6)}`)
    .join(';');

  const url = `https://router.project-osrm.org/table/v1/driving/${coordString}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.code === 'Ok' && json.durations) {
        return {
          durationsSec: json.durations,
          distancesMeters: json.distances || json.durations.map(row => row.map(d => d * 14)) // approx 50 km/h
        };
      }
    }
  } catch (e) {
    console.warn('[OSRM Matrix API] Fallback to distance calculation:', e.message);
  }

  // Fallback Haversine matrix
  const matrix = waypoints.map(from =>
    waypoints.map(to => {
      const direct = calculateDistanceKm(from.lat, from.lon, to.lat, to.lon);
      return Math.round(direct * 1250); // meters with road factor
    })
  );

  return { distancesMeters: matrix };
}
