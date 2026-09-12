import express from 'express';
import cors from 'cors';
import { computeAvoidedCarbon } from './services/carbonEngineService.js';
import { searchListingsPostGIS } from './services/spatialService.js';
import { solveOptimizedBackhaulRoute } from './services/vrpSolverService.js';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory mock DB
const mockListings = [
  { id: 1, title: '500x Standard Heavy-Duty Corrugated Boxes', materialType: 'cardboard', quantity: 500, grade: 'A', lat: 19.076, lon: 72.877, price: 15 },
  { id: 2, title: '120x Heavy Wooden Euro Pallets (EPAL-1)', materialType: 'pallet', quantity: 120, grade: 'A', lat: 19.12, lon: 72.90, price: 250 },
  { id: 3, title: '800kg LDPE Commercial Stretch Wrap Scrap', materialType: 'ldpe', quantity: 800, grade: 'B', lat: 19.18, lon: 72.84, price: 0 }
];

// 1. Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', system: 'LoopPack Exchange B2B API Gateway' });
});

// 2. Spatial PostGIS Listings Query
app.get('/api/v1/listings', (req, res) => {
  const lat = parseFloat(req.query.lat) || 19.076;
  const lon = parseFloat(req.query.lon) || 72.877;
  const radius = parseFloat(req.query.radiusKm) || 25;
  const results = searchListingsPostGIS(mockListings, lat, lon, radius);
  res.json({ total: results.length, data: results });
});

// 3. Post New Listing
app.post('/api/v1/listings', (req, res) => {
  const listing = { id: Date.now(), ...req.body };
  const carbon = computeAvoidedCarbon(listing.materialType, listing.quantity || 100, 10, listing.grade || 'A');
  mockListings.push(listing);
  res.status(201).json({ status: 'created', data: listing, carbonSavings: carbon });
});

// 4. ISO Carbon Accounting Engine Endpoint
app.post('/api/v1/carbon/calculate', (req, res) => {
  const { materialType, quantity, distanceKm, grade } = req.body;
  const result = computeAvoidedCarbon(materialType, quantity, distanceKm, grade);
  res.json(result);
});

// 5. Eco-Logistics Route Optimization
app.post('/api/v1/logistics/optimize-route', (req, res) => {
  const { pickupNodes } = req.body;
  const route = solveOptimizedBackhaulRoute(pickupNodes || mockListings);
  res.json(route);
});

export default app;
