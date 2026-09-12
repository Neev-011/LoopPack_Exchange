# On-Route / Corridor Matching Analysis

**Project:** LoopPack Exchange  
**Date:** 13 September 2026  
**Scope:** Architecture and codebase investigation only

No application code or database schema was modified for this analysis.

## Executive summary

The project has useful foundations for a future on-route matching mode:

- Existing strict route matching.
- Listing latitude/longitude.
- Buyer delivery coordinates.
- Structured addresses.
- Leaflet map components.
- OSRM road routing.
- Nominatim/local city geocoding.
- JSONB fields that can temporarily hold route-match metadata.

However, the active buyer logistics matcher is currently text-based and does not calculate real road detours. Before enabling corridor matching, the application needs a reliable coordinate contract for all four points:

```text
A = truck origin
B = truck destination
P = shipment pickup
D = shipment delivery
```

The project is therefore **partially prepared**, but not ready to safely activate corridor matching yet.

## 1. Current route matching

The active matcher is:

[`frontend/src/services/logisticsMatchingService.js`](D:/hackout_3/LoopPack_Exchange/frontend/src/services/logisticsMatchingService.js)

Important functions:

- `hasSharedLocationToken()`
- `getRouteScore()`
- `rankLogisticsVehicles()`
- `materialWeightTons()`
- `isDateCompatible()`
- `isTimeCompatible()`
- `calculateLogisticsEstimate()`

The current strict rule is:

```text
vehicle origin matches seller pickup
AND
vehicle destination matches buyer delivery
```

Matching uses shared text tokens such as `morbi`, `mumbai`, or `ahmedabad`. It does not currently evaluate intermediate stops or road geometry.

The buyer reservation flow is in:

[`frontend/src/pages/MarketplacePage.jsx`](D:/hackout_3/LoopPack_Exchange/frontend/src/pages/MarketplacePage.jsx)

It:

1. Loads vehicles from `/api/v1/trucks`.
2. Calls `rankLogisticsVehicles()`.
3. Selects the first ranked vehicle.
4. Sends the selected vehicle and ranked candidates to `/api/v1/orders`.

## 2. Existing coordinates

### Material listings

Listings have `lat` and `lon` fields. They are used for marketplace radius filtering and distance display.

Relevant files:

- [`backend/src/config/neonDb.js`](D:/hackout_3/LoopPack_Exchange/backend/src/config/neonDb.js)
- [`backend/src/app.js`](D:/hackout_3/LoopPack_Exchange/backend/src/app.js)
- [`backend/src/services/spatialService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/spatialService.js)

### Logistics vehicles

The `trucks` table has:

```text
lat
lon
location_updated_at
```

These appear to represent a vehicle or current location. They should not automatically be treated as two route endpoint coordinates.

The route itself is stored primarily as:

```text
origin_city
destination_city
pickup_address
delivery_address
```

The application does not currently guarantee separate coordinate pairs for truck origin and truck destination.

### Buyer delivery

Orders support:

```text
buyer_location JSONB
delivery_address JSONB
```

The backend validates buyer latitude and longitude when an order is submitted.

## 3. Existing map and routing integrations

### Leaflet map UI

Used by:

- [`frontend/src/components/common/RouteMap.jsx`](D:/hackout_3/LoopPack_Exchange/frontend/src/components/common/RouteMap.jsx)
- [`frontend/src/components/common/LocationPicker.jsx`](D:/hackout_3/LoopPack_Exchange/frontend/src/components/common/LocationPicker.jsx)

Leaflet renders maps but does not calculate routes itself.

### OpenStreetMap tiles

`RouteMap.jsx` displays OpenStreetMap tiles through:

```text
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### OSRM road routing

The backend contains:

[`backend/src/services/osrmService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/osrmService.js)

It calls the public OSRM service and supports:

- Multi-waypoint driving routes.
- Road distance.
- Duration.
- Route geometry.
- Per-leg distances.
- Distance matrices.

It can conceptually support both:

```text
A → B
```

and:

```text
A → P → D → B
```

The service falls back to Haversine distance multiplied by a road factor if OSRM is unavailable.

### Geocoding

The backend contains `geocodeLocation()` in:

[`backend/src/services/spatialService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/spatialService.js)

It uses:

1. A local city coordinate dictionary.
2. OpenStreetMap Nominatim.
3. A deterministic fallback coordinate for unknown strings.

The fallback coordinate is not reliable enough for operational detour decisions.

## 4. Current road-distance behavior

The active buyer matcher does **not** calculate actual road distance. Its estimate is based on the lengths of the vehicle origin and destination strings:

```js
const routeLength =
  String(vehicle.originCity || '').length +
  String(vehicle.destinationCity || '').length;
```

This is suitable only as a simple placeholder estimate.

Real road distance is available in `osrmService.js`, but that service is currently used separately by the VRP/route functionality and is not part of the active buyer matching decision.

`RouteMap.jsx` also calls OSRM directly from the browser, but that use is for route visualization, not authoritative matching.

## 5. Address-to-coordinate readiness

The reusable address structure is:

[`frontend/src/components/common/AddressForm.jsx`](D:/hackout_3/LoopPack_Exchange/frontend/src/components/common/AddressForm.jsx)

It stores:

```js
{
  state,
  city,
  streetArea,
  landmark
}
```

This is a useful input structure, but it does not itself persist coordinates.

The current system can convert location strings to coordinates through `geocodeLocation()`. City-level conversion is supported by the local lookup table. More detailed street and landmark locations may use Nominatim or the deterministic fallback.

For safe corridor matching, the system should not silently use synthetic fallback coordinates. It should either:

- use a trusted stored coordinate,
- use a successful geocoding result with known confidence, or
- mark the location as unavailable for corridor matching.

## 6. Transaction and logistics model readiness

Orders already contain JSON-capable fields:

```text
logistics_vehicle JSONB
logistics_candidates JSONB
delivery_address JSONB
buyer_location JSONB
listing_snapshot JSONB
```

The selected vehicle is stored as a snapshot. This means an initial corridor result could be stored additively inside the vehicle snapshot or a future transport-plan object.

For example:

```js
{
  mode: 'on_route',
  baseRoute: {
    origin: { lat, lon },
    destination: { lat, lon }
  },
  shipmentStops: {
    pickup: { lat, lon },
    delivery: { lat, lon }
  },
  detourKm: 24.6,
  baseDistanceKm: 280.1,
  combinedDistanceKm: 304.7
}
```

There is currently no dedicated first-class transport-stop model containing:

- Ordered stops.
- Stop type.
- Stop status.
- Detour calculation.
- Route-feasibility result.

For a first experiment, JSON metadata could be sufficient. If the workflow later tracks individual stops and statuses, a dedicated transport plan and transport-stop model would be preferable.

## 7. Recommended future corridor algorithm

The future concept is:

```text
Truck route: A → B
Shipment:    P → D
Candidate:    A → P → D → B
```

Conceptually calculate:

```text
baseDistance = roadDistance(A, B)
combinedDistance = roadDistance(A, P, D, B)
detour = combinedDistance - baseDistance
```

A future reusable evaluator could receive:

```js
evaluateCorridorMatch({
  truck: {
    origin: { lat, lon },
    destination: { lat, lon },
    capacityTons,
    availableDate,
    availableTime
  },
  shipment: {
    pickup: { lat, lon },
    delivery: { lat, lon },
    requiredCapacityTons,
    requestedDate,
    requestedTime
  },
  options: {
    maxDetourKm,
    maxDetourPercent
  }
})
```

It should return a clear result such as:

```text
DIRECT_MATCH
ON_ROUTE_MATCH
INCOMPATIBLE
```

The evaluator should require:

1. Vehicle availability.
2. Enough remaining capacity.
3. Shipment pickup near the truck corridor.
4. Shipment delivery near the truck corridor.
5. Correct travel direction.
6. Pickup before delivery.
7. Detour within the configured kilometer or percentage threshold.
8. Compatible time windows.

Exact route matches should remain a separate mode and should normally rank ahead of on-route matches.

## 8. Travel direction and stop ordering

A corridor match must not only minimize distance. It must confirm that:

```text
A → P → D → B
```

is the correct order.

Examples that should be rejected:

```text
A → D → P → B
```

or a shipment whose pickup and delivery are located on opposite sides of the truck route in a way that requires a large detour.

A future implementation should:

1. Calculate the base route `A → B`.
2. Calculate the inserted-stop route `A → P → D → B`.
3. Check that P and D are sufficiently close to the base route.
4. Check that P occurs before D along the base route.
5. Reject reverse-direction and large-detour cases.

Straight-line distance alone is not sufficient because highways, bridges, and road topology can make nearby points require substantial detours.

## 9. Files that would eventually change

### Matching

[`frontend/src/services/logisticsMatchingService.js`](D:/hackout_3/LoopPack_Exchange/frontend/src/services/logisticsMatchingService.js)

The current strict matcher should remain intact. Corridor matching should preferably be implemented as a separate mode or service because it is asynchronous and depends on routing.

Recommended future location:

```text
backend/src/services/corridorMatchingService.js
```

### Routing

[`backend/src/services/osrmService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/osrmService.js)

Reuse:

- `fetchOSRMRoute([A, B])`
- `fetchOSRMRoute([A, P, D, B])`
- Route legs.
- Durations.
- Fallback metadata.

The routing layer would need clear timeout, caching, and fallback policies.

### Coordinates and geocoding

[`backend/src/services/spatialService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/spatialService.js)

Potential responsibilities:

- Normalize structured addresses.
- Resolve city and street locations.
- Reuse local coordinate lookup before external geocoding.
- Reject low-confidence synthetic coordinates for operational matching.

### Vehicle API

[`backend/src/app.js`](D:/hackout_3/LoopPack_Exchange/backend/src/app.js)

Potential changes:

- Return explicit truck-origin coordinates.
- Return explicit truck-destination coordinates.
- Preserve structured pickup and delivery addresses.
- Validate route endpoint coordinates.

The existing `trucks.lat` and `trucks.lon` fields must first be given a clear semantic meaning.

### Buyer reservation

[`frontend/src/pages/MarketplacePage.jsx`](D:/hackout_3/LoopPack_Exchange/frontend/src/pages/MarketplacePage.jsx)

Potential changes:

- Provide structured shipment coordinates to the matching service.
- Display whether the result is an exact or on-route match.
- Display detour and estimated transport cost.
- Keep routing details concise for the buyer.

### Database

No database change is required for this investigation.

A production implementation may eventually need:

- Transport plan.
- Ordered stops.
- Match mode.
- Detour distance.
- Route calculation timestamp.
- Route source and fallback indicator.
- Per-stop statuses.

## 10. Readiness assessment

### Existing strengths

- Listing coordinates exist.
- Buyer delivery coordinates exist.
- Structured addresses exist.
- Local city coordinate lookup exists.
- Geocoding service exists.
- Leaflet maps exist.
- OSRM road routing exists.
- OSRM multi-waypoint routes exist.
- JSONB snapshots can hold future route metadata.

### Current blockers

1. Truck origin and destination coordinates are not modeled as separate, guaranteed coordinate pairs.
2. Structured truck addresses do not consistently include persisted coordinates.
3. Material pickup coordinates are not consistently passed into the active matcher.
4. Buyer coordinates exist in the order flow, but current matching primarily uses text destinations.
5. OSRM is not part of the active buyer matching decision.
6. There is no route-progress calculation for stop ordering.
7. The active distance estimate is synthetic.
8. Synthetic geocoding fallback coordinates are unsafe for detour decisions.

## Recommended implementation sequence

Before implementing corridor matching:

1. Define the coordinate contract for truck origin, truck destination, shipment pickup, and buyer delivery.
2. Clarify whether existing truck `lat` and `lon` represent current position or a route endpoint.
3. Persist or reliably derive separate coordinates for A, B, P, and D.
4. Prevent synthetic fallback coordinates from being used for operational matching.
5. Add a backend corridor evaluator that reuses `osrmService.js`.
6. Add tests for:
   - Exact route.
   - Correct-direction on-route shipment.
   - Pickup after delivery.
   - Reverse direction.
   - Excessive detour.
   - Insufficient capacity.
   - Time-window incompatibility.
   - OSRM failure and fallback behavior.
7. Keep strict direct matching and corridor matching as separate modes.
8. Only then expose `ON_ROUTE_MATCH` in the reservation UI.

## Final conclusion

The LoopPack project has routing and coordinate infrastructure that can support a future corridor-matching feature, but the active logistics matcher is not ready to use it safely today.

The first prerequisite is reliable coordinates for:

```text
A = truck origin
B = truck destination
P = shipment pickup
D = shipment delivery
```

After that data contract is established, the existing OSRM service can support the conceptual comparison:

```text
Distance(A → P → D → B) - Distance(A → B)
```

No VRP implementation, map API addition, or database redesign is required for the initial architecture direction.

---

# Coordinate Contract Preparation Report

**Date:** 13 September 2026  
**Scope:** Preparing logistics vehicle data for future corridor matching

## Implementation status

The minimum safe coordinate-contract improvements have been implemented.

On-route/corridor matching has **not** been implemented.

No new map provider, routing library, or VRP implementation was added.

## Existing coordinate meaning

Before this change:

- `trucks.lat` and `trucks.lon` represented the logistics vehicle's current/origin location.
- The truck destination had no separate stored coordinates.
- `pickupAddress` and `deliveryAddress` existed as structured JSON fields, but were not converted into separate route coordinate pairs.

The existing `lat` and `lon` fields remain intact and continue to represent the origin/current location for backward compatibility.

## Files changed

- [`backend/src/app.js`](D:/hackout_3/LoopPack_Exchange/backend/src/app.js)
- [`backend/src/services/spatialService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/spatialService.js)
- [`backend/src/config/neonDb.js`](D:/hackout_3/LoopPack_Exchange/backend/src/config/neonDb.js)
- [`backend/src/scripts/initNeon.js`](D:/hackout_3/LoopPack_Exchange/backend/src/scripts/initNeon.js)

The frontend logistics form was not changed. It already submits structured pickup and delivery addresses and remains compatible with the updated API.

## Database changes

Four additive nullable columns were added to the `trucks` table:

```text
origin_latitude
origin_longitude
destination_latitude
destination_longitude
```

The following existing fields were preserved:

```text
origin_city
destination_city
pickup_address
delivery_address
lat
lon
```

Existing records are not deleted or destructively rewritten.

For older records:

- Existing `lat` and `lon` values are copied into `origin_latitude` and `origin_longitude` when available.
- Destination coordinates remain unavailable until the destination can be reliably resolved.
- No synthetic destination coordinate is invented.

Both runtime schema initialization and standalone Neon initialization were updated.

## Coordinate resolution

When `POST /api/v1/trucks` receives a vehicle route:

1. The structured pickup address is converted into a location string.
2. The structured delivery address is converted into a location string.
3. The existing `geocodeLocation()` infrastructure is used.
4. Synthetic fallback coordinates are disabled for operational route coordinates.
5. If a reliable coordinate cannot be obtained, that endpoint is stored as unavailable.

The local coordinate lookup now includes Morbi:

```text
Ahmedabad → 23.0225, 72.5714
Morbi     → 22.8173, 70.8377
```

Ahmedabad and Morbi resolution was verified successfully.

## API changes

### `POST /api/v1/trucks`

The endpoint now resolves and stores both route endpoints.

The response includes fields such as:

```json
{
  "originCity": "Ahmedabad",
  "originCoordinates": {
    "lat": 23.0225,
    "lon": 72.5714
  },
  "originLatitude": 23.0225,
  "originLongitude": 72.5714,
  "destinationCity": "Morbi",
  "destinationCoordinates": {
    "lat": 22.8173,
    "lon": 70.8377
  },
  "destinationLatitude": 22.8173,
  "destinationLongitude": 70.8377,
  "routeCoordinatesAvailable": true
}
```

### `GET /api/v1/trucks`

The API now exposes:

- `originCoordinates`
- `destinationCoordinates`
- `originLatitude`
- `originLongitude`
- `destinationLatitude`
- `destinationLongitude`
- `routeCoordinatesAvailable`

Existing API fields remain unchanged.

## Validation

Coordinate validation checks that:

- Values are numeric.
- Latitude is between `-90` and `90`.
- Longitude is between `-180` and `180`.
- Invalid explicitly supplied coordinate objects are rejected.
- Synthetic fallback coordinates are not trusted as truck route coordinates.

## Ahmedabad → Morbi manual test

1. Log in as a Logistics Partner.
2. Open **Eco-Logistics**.
3. Create a vehicle listing.
4. Select:

   ```text
   Pickup State: Gujarat
   Pickup City: Ahmedabad
   Delivery State: Gujarat
   Delivery City: Morbi
   ```

5. Complete the pickup and delivery address fields.
6. Submit the vehicle.
7. Request:

   ```text
   GET http://localhost:5001/api/v1/trucks
   ```

8. Confirm the response contains:

   ```text
   originCity: Ahmedabad
   originCoordinates: { lat: 23.0225, lon: 72.5714 }

   destinationCity: Morbi
   destinationCoordinates: { lat: 22.8173, lon: 70.8377 }

   routeCoordinatesAvailable: true
   ```

## Behavior when geocoding fails

If a reliable coordinate cannot be obtained:

- Existing city and address fields remain usable.
- The vehicle is not assigned fake route coordinates.
- The affected coordinate is returned as `null`.
- `routeCoordinatesAvailable` becomes `false`.
- The vehicle remains available for existing non-corridor functionality.
- Future corridor matching should exclude the vehicle until its coordinates are resolved.

## Corridor matching status

Corridor matching remains intentionally unimplemented.

The following were not changed:

- Strict route matching.
- Route ranking.
- VRP logic.
- OSRM routing behavior.
- Existing vehicle availability behavior.
- Existing structured address fields.

## Validation completed

- Backend syntax checks passed.
- Backend diagnostics passed.
- Frontend diagnostics passed.
- Frontend production build passed.
- Ahmedabad and Morbi coordinate resolution was verified.

---

# First On-Route / Corridor Matching Implementation Report

**Date:** 13 September 2026  
**Scope:** Isolated backend corridor-matching service and tests

## Implementation status

The first isolated backend version of On-Route / Corridor Matching has been implemented.

The following were intentionally not changed:

- Existing strict frontend route matching.
- Existing exact-match behavior.
- Buyer UI.
- Reservation flow.
- Vehicle ranking.
- Automatic vehicle assignment.
- Transport requests.
- Accept/Reject behavior.
- Database schema.
- VRP logic.
- Map providers.

## Files created

- [`backend/src/services/corridorMatchingService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/corridorMatchingService.js)
- [`backend/src/services/corridorMatchingService.test.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/corridorMatchingService.test.js)

No existing frontend matcher, reservation logic, vehicle ranking, transport request logic, database schema, or buyer UI was modified.

## Service API

The new reusable function is:

```js
evaluateCorridorMatch({
  truck,
  shipment,
  options
})
```

The service also supports an injectable `routeFetcher` dependency so tests can use deterministic OSRM-shaped route responses without depending on live network availability.

## Matching modes

The service returns:

```text
DIRECT_MATCH
ON_ROUTE_MATCH
INCOMPATIBLE
```

### Direct match

Returns `DIRECT_MATCH` when:

- Shipment pickup matches the truck origin within the exact-point tolerance.
- Shipment delivery matches the truck destination within the exact-point tolerance.

The existing direct route behavior is preserved as a separate result mode.

### On-route match

Returns `ON_ROUTE_MATCH` when:

- The truck is available.
- Truck capacity is sufficient.
- Availability date is compatible.
- Availability time is compatible.
- All four route coordinates are valid.
- OSRM returns real routes.
- Shipment pickup and delivery are close to the truck's base route.
- Pickup occurs before delivery in the truck's travel direction.
- The detour satisfies both configured thresholds.

## OSRM usage

The service reuses:

```js
fetchOSRMRoute()
```

from [`backend/src/services/osrmService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/osrmService.js).

It calculates:

```text
Base route:     A → B
Inserted route: A → P → D → B
```

If OSRM returns its fallback result with:

```js
isRealOSRM: false
```

the candidate is rejected as:

```text
ROUTE_UNAVAILABLE
```

This prevents fallback or synthetic geometry from being used for operational corridor decisions.

## Detour calculation

The service calculates:

```text
detourKm = combinedDistanceKm - baseDistanceKm
```

and:

```text
detourPercent = (detourKm / baseDistanceKm) × 100
```

Invalid or zero-length base routes are rejected before calculating a percentage.

## Direction and corridor checks

The base OSRM route geometry is treated as a polyline.

For both shipment pickup and delivery, the service calculates:

- Distance from the point to the base route.
- Progression distance along the base route.

The service rejects a shipment when:

```text
pickup progression >= delivery progression
```

This prevents reverse-direction shipments and cases where delivery would occur before pickup along the truck route.

The service also rejects stops that are too far from the base corridor.

## Thresholds

Thresholds are configured centrally in:

```js
CORRIDOR_MATCH_DEFAULTS
```

Current MVP values:

```js
{
  maxDetourKm: 40,
  maxDetourPercent: 15,
  maxCorridorDistanceKm: 25,
  exactPointToleranceKm: 0.5
}
```

A corridor candidate must satisfy both detour limits:

```text
detourKm <= 40
AND
detourPercent <= 15%
```

The corridor-distance threshold and exact-point tolerance are configurable as well.

## Tests

Added seven automated tests:

1. Exact route → `DIRECT_MATCH`
2. Small-detour route → `ON_ROUTE_MATCH`
3. Wrong direction → `INCOMPATIBLE`
4. Excessive detour → `INCOMPATIBLE`
5. Insufficient capacity → `INCOMPATIBLE`
6. Missing coordinates → `INCOMPATIBLE`
7. OSRM fallback/failure → `INCOMPATIBLE`

All tests passed:

```text
7 tests passed
```

Backend syntax validation and diagnostics also passed.

## Current limitations

- The service is not connected to the buyer UI.
- It is not connected to vehicle ranking or automatic assignment.
- It does not implement VRP.
- It does not track already allocated capacity across multiple shipments.
- Capacity validation compares the new shipment requirement against the truck's declared capacity.
- Corridor distance uses the OSRM base-route geometry and the configurable proximity threshold.
- OSRM network failures intentionally produce `INCOMPATIBLE`.
- No synthetic coordinate fallback is accepted for corridor decisions.

---

# Backend Candidate-Selection Integration Report

**Date:** 13 September 2026  
**Scope:** Backend classification and ranking integration

## Implementation status

The backend candidate-selection flow now classifies and ranks logistics vehicles as:

```text
DIRECT_MATCH
ON_ROUTE_MATCH
INCOMPATIBLE
```

The existing frontend strict matcher and direct-match behavior were not rewritten.

The following were intentionally not changed:

- Buyer UI.
- Reservation UI.
- Automatic transport requests.
- Transport request status workflow.
- Accept/Reject behavior.
- Database schema.
- VRP logic.
- Map providers.

## Files changed

- [`backend/src/app.js`](D:/hackout_3/LoopPack_Exchange/backend/src/app.js)
- [`backend/src/services/corridorMatchingService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/corridorMatchingService.js)
- [`backend/src/services/logisticsCandidateMatchingService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/logisticsCandidateMatchingService.js)
- [`backend/src/services/corridorMatchingService.test.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/corridorMatchingService.test.js)
- [`backend/src/services/logisticsCandidateMatchingService.test.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/logisticsCandidateMatchingService.test.js)

## New backend endpoint

Added:

```text
POST /api/v1/trucks/match
```

Example request:

```json
{
  "vehicles": [],
  "shipment": {
    "pickupCity": "Morbi",
    "deliveryCity": "Mumbai",
    "pickup": {
      "lat": 22.8173,
      "lon": 70.8377
    },
    "delivery": {
      "lat": 19.076,
      "lon": 72.8777
    },
    "requiredCapacityTons": 2,
    "requestedDate": "2026-09-13",
    "requestedTime": "09:00"
  },
  "options": {}
}
```

The endpoint returns only compatible candidates.

## Direct matching

Direct matching is evaluated first using:

- Normalized `originCity` versus shipment `pickupCity`.
- Normalized `destinationCity` versus shipment `deliveryCity`.
- Coordinate equality within the existing `0.5 km` tolerance when coordinates are supplied.

Direct matches:

- Do not require OSRM.
- Remain valid if OSRM is unavailable.
- Are classified as `DIRECT_MATCH`.

## On-route matching

Vehicles that are not direct matches are passed to:

```js
evaluateCorridorMatch()
```

from [`backend/src/services/corridorMatchingService.js`](D:/hackout_3/LoopPack_Exchange/backend/src/services/corridorMatchingService.js).

A candidate is classified as `ON_ROUTE_MATCH` only when the corridor service confirms:

- Vehicle is available.
- Capacity is sufficient.
- Date is compatible.
- Time is compatible.
- All coordinates are valid.
- OSRM returns real route data.
- Shipment stops are near the truck corridor.
- Pickup occurs before delivery.
- Detour is within both configured thresholds.

Text-only partial route matching cannot bypass the corridor evaluator.

## Incompatible candidates

Candidates classified as:

```text
INCOMPATIBLE
```

are removed from the returned candidate list.

OSRM failure or fallback results do not produce an on-route match.

## Candidate result shape

Each returned candidate includes:

```json
{
  "vehicle": {},
  "matchMode": "ON_ROUTE_MATCH",
  "matchReason": "Shipment can be added with an acceptable detour.",
  "baseDistanceKm": 280,
  "combinedDistanceKm": 304.6,
  "detourKm": 24.6,
  "detourPercent": 8.8,
  "estimatedCost": 9747.2
}
```

Direct candidates return:

```json
{
  "matchMode": "DIRECT_MATCH",
  "detourKm": 0,
  "detourPercent": 0
}
```

Direct route distance fields remain `null` unless they were already supplied by the vehicle data. No distance is fabricated.

## Ranking

Candidates are ranked in this order:

1. `DIRECT_MATCH`
2. `ON_ROUTE_MATCH`
3. Lower detour for on-route matches.
4. Lower estimated transport cost.
5. Stable vehicle ID.

For on-route candidates, estimated cost is calculated as:

```text
ratePerKm × combinedDistanceKm
```

## Tests

Added integration tests for:

1. Direct match ranking ahead of an on-route match.
2. Removing non-direct candidates that fail corridor evaluation.
3. Allowing valid direct matching when OSRM is unavailable.

The existing corridor service tests were also rerun.

Validation result:

```text
10 tests passed
```

Backend syntax checks passed for:

- `app.js`
- `corridorMatchingService.js`
- `logisticsCandidateMatchingService.js`

## Performance considerations

The integration currently evaluates non-direct candidates concurrently with `Promise.all()`.

Each non-direct candidate may produce:

- One OSRM request for `A → B`.
- One OSRM request for `A → P → D → B`.

Many vehicles can therefore create many routing requests. Before connecting this endpoint to the buyer UI, recommended improvements are:

- Limit the number of candidates evaluated.
- Cache base routes for vehicles with the same route.
- Add concurrency control.
- Add route-result caching.
- Move matching fully server-side instead of trusting frontend-submitted vehicle snapshots.

No buyer UI, reservation flow, automatic assignment, transport request workflow, or Accept/Reject behavior was changed.

# Buyer UI Matcher Integration

## Scope

The buyer reservation flow now calls the backend authoritative matcher when the buyer selects **Find Transportation**. The existing strict frontend matcher remains available as a reusable service, but it is no longer used to choose reservation candidates in `MarketplacePage.jsx`.

## Shipment request construction

The UI sends `POST /api/v1/trucks/match` with:

- Seller listing `lat` / `lon` as shipment pickup coordinates.
- The confirmed buyer `buyerCoordinates` as delivery coordinates.
- The structured delivery city, with the existing destination text as a fallback label.
- The selected quantity converted to tons through the existing `materialWeightTons()` conversion.
- The selected pickup date and time.
- Each loaded vehicle's separate origin and destination coordinates. Legacy `lat` / `lon` are used only as a real numeric origin fallback; no synthetic coordinates are created.

If seller pickup coordinates or confirmed buyer coordinates are unavailable, matching is not attempted and the buyer receives a clear coordinate-unavailable message.

## Result display

Only candidates returned by the backend are displayed. Each result shows:

- Vehicle name.
- `Direct Match` or `On-Route Match`.
- Vehicle route.
- Estimated transport cost when returned.
- Base route, combined route, and detour values for on-route matches.

The first backend-ranked candidate is visually marked `Recommended`; the UI does not create a transport request during matching.

## States

The reservation modal now supports:

- `Finding transportation...` while the backend request is running.
- `No suitable transportation found` when the response is empty.
- `Unable to find transportation` with a buyer-safe message when the API fails.
- A compact list of compatible backend candidates on success.

The purchase button remains gated until a successful backend match is available, preserving the existing reservation flow without adding Accept/Reject, fallback-provider, payment, or schema behavior.

## Files changed

- `frontend/src/pages/MarketplacePage.jsx`
- `frontend/src/services/logisticsMatchingService.js`

No database schema, corridor service, candidate service, buyer UI outside the reservation flow, or map provider was changed.

## Validation

Passed:

- Frontend diagnostics for the changed files.
- Frontend production build.
- Backend syntax checks.
- Existing corridor and candidate integration tests: `10 passed`.

## Remaining limitations

The current endpoint receives vehicle snapshots from the frontend, as designed by the existing backend integration. OSRM request volume and server-side vehicle authority should be improved in a later hardening step. Direct candidates may have no distance value when the backend vehicle data does not already include one; the UI does not fabricate a distance.

# Final Consolidated Implementation Output

## What was implemented

The buyer reservation flow in `MarketplacePage.jsx` is connected to the backend logistics matcher:

```text
POST /api/v1/trucks/match
```

The backend is now the source of truth for compatible logistics candidates and ranking. The frontend no longer uses its older synchronous matcher to choose vehicles for the reservation flow.

## Request data

The frontend sends real application data:

- Seller listing coordinates for shipment pickup.
- Confirmed buyer coordinates for shipment delivery.
- Structured delivery city and address data.
- Selected material quantity converted to tons.
- Requested pickup date.
- Requested pickup time.
- Vehicle origin and destination coordinates.

Synthetic or invented coordinates are not used. If required coordinates are missing, matching is stopped with a clear message.

## Results shown to the buyer

Only backend-compatible vehicles are displayed. Each result can show:

- Vehicle name.
- `Direct Match` or `On-Route Match`.
- Vehicle route.
- Estimated transport cost.
- Base route distance.
- Combined route distance.
- Additional detour distance and percentage.

The first backend-ranked candidate is marked **Recommended**, but no transport request is automatically created.

## UI states

The reservation modal supports:

1. `Finding transportation...`
2. `Recommended Transportation`
3. `No suitable transportation found`
4. `Unable to find transportation`

The purchase action remains disabled until a successful backend match is returned.

## Scope preserved

The following were not changed:

- Buyer payment behavior.
- Accept / Reject workflow.
- Automatic transport request creation.
- Fallback provider assignment.
- Vehicle database schema.
- Corridor matching algorithm.
- Candidate ranking service.
- VRP.
- Map providers.

## Files changed for the final integration

- `frontend/src/pages/MarketplacePage.jsx`
- `frontend/src/services/logisticsMatchingService.js`
- `CORRIDOR_MATCHING_ANALYSIS.md`

## Validation

Completed successfully:

- Frontend diagnostics.
- Frontend production build.
- Backend syntax validation.
- Corridor and candidate integration tests.

Final automated test result:

```text
10 tests passed
```

## Known limitations

- The current endpoint receives vehicle snapshots from the frontend.
- Non-direct matching can generate multiple OSRM requests for multiple vehicles.
- Direct matches may not have a distance value when no reliable distance was supplied by the backend.
- No browser-based manual flow was run because the application server was not running during validation.
