import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeAvoidedCarbon } from './services/carbonEngineService.js';
import { searchListingsPostGIS } from './services/spatialService.js';
import { solveOptimizedBackhaulRoute } from './services/vrpSolverService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../data/db.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to read DB from disk
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading DB file:', err);
    return [];
  }
}

// Helper to save DB to disk
function saveDatabase(listings) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(listings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// 1. Health check
app.get('/api/v1/health', (req, res) => {
  const listings = readDatabase();
  res.json({
    status: 'OK',
    system: 'LoopPack Exchange B2B API Gateway',
    database: 'Persistent JSON Database Active',
    totalListings: listings.length
  });
});

// 2. Fetch Listings (Spatial / Filtered)
app.get('/api/v1/listings', (req, res) => {
  const listings = readDatabase();
  const lat = parseFloat(req.query.lat) || 19.076;
  const lon = parseFloat(req.query.lon) || 72.877;
  const radius = parseFloat(req.query.radiusKm) || 50;

  const results = searchListingsPostGIS(listings, lat, lon, radius);
  res.json({ total: results.length, data: results });
});

// 3. POST New Material Listing to Database
app.post('/api/v1/listings', (req, res) => {
  const {
    title,
    materialType,
    quantity,
    unit,
    grade,
    price,
    location,
    lat,
    lon,
    description,
    image
  } = req.body;

  if (!title || !materialType) {
    return res.status(400).json({ error: 'Title and materialType are required.' });
  }

  const listings = readDatabase();

  const newListing = {
    id: Date.now(),
    title,
    materialType: materialType || 'cardboard',
    quantity: Number(quantity) || 100,
    unit: unit || (materialType === 'pallet' ? 'pallets' : materialType === 'hdpe' ? 'drums' : materialType === 'ldpe' ? 'kg' : 'boxes'),
    grade: grade || 'A',
    location: location || 'Warehouse Hub, Zone A',
    lat: Number(lat) || 19.08,
    lon: Number(lon) || 72.88,
    distanceKm: 5.0,
    price: Number(price) || 0,
    isFree: Number(price) === 0,
    description: description || 'Verified circular packaging material lot.',
    image: image || (materialType === 'pallet' 
      ? 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80'
      : materialType === 'hdpe'
      ? 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
      : materialType === 'ldpe'
      ? 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'),
    createdAt: new Date().toISOString()
  };

  // Calculate carbon avoided
  const carbon = computeAvoidedCarbon(newListing.materialType, newListing.quantity, 10, newListing.grade);

  listings.unshift(newListing);
  saveDatabase(listings);

  console.log(`[API] New Material Listing Posted: ID ${newListing.id} - ${newListing.title}`);

  res.status(201).json({
    status: 'success',
    message: 'Material listing saved to database!',
    data: newListing,
    carbonSavings: carbon
  });
});

// 4. ISO Carbon Accounting Endpoint
app.post('/api/v1/carbon/calculate', (req, res) => {
  const { materialType, quantity, distanceKm, grade } = req.body;
  const result = computeAvoidedCarbon(materialType, quantity, distanceKm, grade);
  res.json(result);
});

// 5. Eco-Logistics Route Optimization
app.post('/api/v1/logistics/optimize-route', (req, res) => {
  const listings = readDatabase();
  const route = solveOptimizedBackhaulRoute(listings);
  res.json(route);
});

export default app;
