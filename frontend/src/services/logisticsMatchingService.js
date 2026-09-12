function materialWeightTons(quantity, unit) {
  const normalizedUnit = String(unit || '').toLowerCase();
  if (normalizedUnit.includes('kg')) return Number(quantity) / 1000;
  if (normalizedUnit.includes('pallet')) return Number(quantity) * 0.02;
  if (normalizedUnit.includes('drum')) return Number(quantity) * 0.05;
  return Number(quantity) * 0.01;
}

function tokens(value) {
  return String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}

function hasSharedLocationToken(first, second) {
  const firstTokens = tokens(first);
  const secondTokens = tokens(second);
  return firstTokens.some(token => secondTokens.includes(token));
}

function getRouteScore(sellerLocation, buyerDestination, vehicle) {
  const pickupMatch = hasSharedLocationToken(sellerLocation, vehicle.originCity);
  const destinationMatch = hasSharedLocationToken(buyerDestination, vehicle.destinationCity);
  if (pickupMatch && destinationMatch) return 30;
  if (pickupMatch || destinationMatch) return 15;
  return 0;
}

function isDateCompatible(requiredDate, availableDate) {
  if (!requiredDate || !availableDate || availableDate === 'Available Today') return true;
  return availableDate === requiredDate;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function isTimeCompatible(requiredTime, availableTime) {
  if (!requiredTime || !availableTime) return true;
  const requestedMinutes = timeToMinutes(requiredTime);
  const availableMinutes = timeToMinutes(availableTime);
  if (requestedMinutes === null || availableMinutes === null) return false;
  return Math.abs(requestedMinutes - availableMinutes) <= 120;
}

function estimateDistance(sellerLocation, buyerDestination, vehicle, routeScore) {
  const routeLength = String(vehicle.originCity || '').length + String(vehicle.destinationCity || '').length;
  return routeScore >= 30
    ? Math.max(10, Math.round(routeLength * 1.4))
    : Math.max(25, Math.round(routeLength * 2.5));
}

export function validateLogisticsEstimate({ sellerLocation, buyerDestination, vehicle }) {
  if (!String(sellerLocation || '').trim() || !String(buyerDestination || '').trim()) return 'Seller pickup location and buyer delivery location are required.';
  const capacity = Number(vehicle?.capacityTons);
  if (!Number.isFinite(capacity) || capacity <= 0) return 'The selected logistics vehicle must have a valid payload capacity.';
  const ratePerKm = Number(vehicle?.ratePerKm);
  if (!Number.isFinite(ratePerKm) || ratePerKm < 0) return 'The selected logistics vehicle must have a valid price per km.';
  const routeScore = getRouteScore(sellerLocation, buyerDestination, vehicle);
  const distanceKm = estimateDistance(sellerLocation, buyerDestination, vehicle, routeScore);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 'Could not calculate a valid estimated distance for this route.';
  return null;
}

export function calculateLogisticsEstimate({ sellerLocation, buyerDestination, vehicle }) {
  const validationError = validateLogisticsEstimate({ sellerLocation, buyerDestination, vehicle });
  if (validationError) throw new Error(validationError);
  const routeScore = getRouteScore(sellerLocation, buyerDestination, vehicle);
  const distanceKm = estimateDistance(sellerLocation, buyerDestination, vehicle, routeScore);
  const ratePerKm = Number(vehicle.ratePerKm);
  return {
    distanceKm,
    ratePerKm,
    transportCost: distanceKm * ratePerKm,
    isEstimate: true
  };
}

export function rankLogisticsVehicles({ vehicles, sellerLocation, buyerDestination, quantity, unit, requiredDate, requiredTime }) {
  const requiredCapacity = materialWeightTons(quantity, unit);
  const eligibleVehicles = vehicles.filter(vehicle => {
    const status = String(vehicle.status || 'available').toLowerCase();
    return status === 'available'
      && Number(vehicle.capacityTons) >= requiredCapacity
      && isDateCompatible(requiredDate, vehicle.availableDate)
      && isTimeCompatible(requiredTime, vehicle.availableTime)
      && getRouteScore(sellerLocation, buyerDestination, vehicle) > 0;
  });

  return eligibleVehicles
    .map(vehicle => {
      const routeScore = getRouteScore(sellerLocation, buyerDestination, vehicle);
      if (validateLogisticsEstimate({ sellerLocation, buyerDestination, vehicle })) return null;
      const estimate = calculateLogisticsEstimate({ sellerLocation, buyerDestination, vehicle });
      const estimatedDistanceKm = estimate.distanceKm;
      const estimatedCost = estimate.transportCost;
      const availabilityScore = (isDateCompatible(requiredDate, vehicle.availableDate) ? 1 : 0)
        + (isTimeCompatible(requiredTime, vehicle.availableTime) ? 1 : 0);
      return {
        ...vehicle,
        estimatedDistanceKm,
        estimatedCost,
        suitabilityScore: routeScore + availabilityScore,
        scoreBreakdown: { route: routeScore, availability: availabilityScore },
        matchReason: 'Compatible capacity, route, and availability'
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.estimatedCost - second.estimatedCost
      || second.suitabilityScore - first.suitabilityScore
      || String(first.id).localeCompare(String(second.id)));
}
