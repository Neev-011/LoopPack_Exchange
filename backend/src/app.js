import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeAvoidedCarbon } from './services/carbonEngineService.js';
import { searchListingsPostGIS } from './services/spatialService.js';
import { isNeonConnected, getNeonClient } from './config/neonDb.js';
import { detectMaterialFromImage } from './services/imageDetectionService.js';
import {
  createInquiry,
  getInquiriesForUser,
  updateInquiryStatus,
  getMessages,
  sendMessage
} from './services/engagementService.js';
import {
  getAllDemoUsers,
  checkUsername,
  authenticateUser,
  registerUser,
  resetPassword,
  recoverUsername,
  updateUserProfile,
  changeUserPassword
} from './services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../data/db.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/v1/ai/detect-material', async (req, res) => {
  try {
    const result = await detectMaterialFromImage(req.body?.image, req.body?.fileName);
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('[AI detection] failed:', err.message);
    res.status(err.statusCode || 502).json({ error: err.message });
  }
});

function requestUser(req) {
  return {
    id: req.body?.userId,
    username: req.body?.username,
    companyName: req.body?.companyName
  };
}

app.post('/api/v1/inquiries', (req, res) => {
  try {
    const inquiry = createInquiry({
      listing: req.body?.listing,
      buyer: requestUser(req),
      message: req.body?.message,
      quantity: req.body?.quantity
    });
    res.status(201).json({ status: 'success', data: inquiry });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.get('/api/v1/inquiries', (req, res) => {
  try {
    const user = { id: req.query.userId, username: req.query.username, companyName: req.query.companyName };
    res.json({ data: getInquiriesForUser(user, req.query.role === 'seller' ? 'seller' : 'buyer') });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.patch('/api/v1/inquiries/:id', (req, res) => {
  try {
    const item = updateInquiryStatus(req.params.id, requestUser(req), req.body?.status);
    res.json({ status: 'success', data: item });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.patch('/api/v1/listings/:id', async (req, res) => {
  const listings = await getListings();
  const index = listings.findIndex(item => String(item.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Listing not found.' });
  if (!req.body?.username || listings[index].createdBy !== req.body.username) {
    return res.status(403).json({ error: 'Only the listing owner can edit this listing.' });
  }
  const editable = ['title', 'quantity', 'unit', 'grade', 'price', 'location', 'description'];
  editable.forEach(field => {
    if (req.body[field] !== undefined) listings[index][field] = field === 'quantity' || field === 'price'
      ? Number(req.body[field])
      : req.body[field];
  });
  listings[index].isFree = Number(listings[index].price) === 0;
  listings[index].updatedAt = new Date().toISOString();
  try {
    await saveDatabase([listings[index]]);
    res.json({ status: 'success', data: listings[index] });
  } catch (err) {
    res.status(500).json({ error: `Unable to save listing: ${err.message}` });
  }
});

app.get('/api/v1/inquiries/:id/messages', (req, res) => {
  try {
    const user = { id: req.query.userId, username: req.query.username, companyName: req.query.companyName };
    res.json({ data: getMessages(req.params.id, user) });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.post('/api/v1/inquiries/:id/messages', (req, res) => {
  try {
    const message = sendMessage(req.params.id, requestUser(req), req.body?.body);
    res.status(201).json({ status: 'success', data: message });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

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

async function getListings() {
  const client = getNeonClient();
  if (!client) return readDatabase();

  const rows = await client`SELECT * FROM listings ORDER BY created_at DESC`;
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    materialType: row.material_type,
    quantity: Number(row.quantity),
    unit: row.unit,
    grade: row.grade,
    location: row.location,
    lat: Number(row.lat),
    lon: Number(row.lon),
    price: Number(row.price),
    isFree: row.is_free,
    description: row.description,
    image: row.image,
    createdBy: row.created_by,
    companyName: row.company_name,
    ownerRole: row.owner_role,
    createdAt: row.created_at
  }));
}

// Neon is the primary store when configured. JSON is only a local fallback.
async function saveDatabase(listings) {
  const client = getNeonClient();
  if (client) {
    for (const l of listings) {
      await client`
        INSERT INTO listings (
          id, title, material_type, quantity, unit, grade, location, lat, lon, price, is_free, description, image, created_by, company_name, owner_role, created_at
        ) VALUES (
          ${String(l.id)}, ${l.title}, ${l.materialType}, ${l.quantity}, ${l.unit}, ${l.grade || 'A'},
          ${l.location || ''}, ${l.lat || 19.08}, ${l.lon || 72.88}, ${l.price || 0}, ${l.isFree || false}, ${l.description || ''},
          ${l.image || ''}, ${l.createdBy || 'anonymous'}, ${l.companyName || 'B2B Partner'}, ${l.ownerRole || 'Supplier'},
          ${l.createdAt || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, material_type = EXCLUDED.material_type, quantity = EXCLUDED.quantity,
          unit = EXCLUDED.unit, grade = EXCLUDED.grade, location = EXCLUDED.location, lat = EXCLUDED.lat,
          lon = EXCLUDED.lon, price = EXCLUDED.price, is_free = EXCLUDED.is_free, description = EXCLUDED.description,
          image = EXCLUDED.image, created_by = EXCLUDED.created_by, company_name = EXCLUDED.company_name,
          owner_role = EXCLUDED.owner_role
      `;
    }
    return;
  }

  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(listings, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Error saving local database: ${err.message}`);
  }
}

// 1. Health check
app.get('/api/v1/health', async (req, res) => {
  const listings = await getListings();
  res.json({
    status: 'OK',
    system: 'LoopPack Exchange B2B API Gateway',
    database: isNeonConnected ? 'Neon Serverless PostgreSQL Database Active' : 'Persistent JSON Database Active',
    neonDatabaseConnected: isNeonConnected,
    totalListings: listings.length,
    envConfig: {
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      databaseUrlConfigured: !!process.env.DATABASE_URL
    }
  });
});

// 2. Auth Endpoints
app.get('/api/v1/auth/demo-users', (req, res) => {
  res.json({ status: 'success', data: getAllDemoUsers() });
});

app.post('/api/v1/auth/check-username', (req, res) => {
  const result = checkUsername(req.body?.username);
  res.json(result);
});

app.post('/api/v1/auth/login', (req, res) => {
  try {
    const user = authenticateUser(req.body);
    res.json({ status: 'success', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/register', (req, res) => {
  try {
    const user = registerUser(req.body);
    res.status(201).json({ status: 'success', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/forgot-password', (req, res) => {
  try {
    const user = resetPassword(req.body);
    res.json({ status: 'success', message: 'Password updated successfully. You are now logged in.', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/forgot-username', (req, res) => {
  try {
    const result = recoverUsername(req.body);
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/v1/auth/profile', (req, res) => {
  try {
    const user = updateUserProfile(req.body);
    res.json({ status: 'success', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/change-password', (req, res) => {
  try {
    const user = changeUserPassword(req.body);
    res.json({ status: 'success', user, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Fetch Listings (Spatial / Filtered / Multi-User Owned)
app.get('/api/v1/listings', async (req, res) => {
  const listings = await getListings();
  const lat = parseFloat(req.query.lat) || 19.076;
  const lon = parseFloat(req.query.lon) || 72.877;
  const radius = parseFloat(req.query.radiusKm) || 50;
  const owner = req.query.owner;

  let results = searchListingsPostGIS(listings, lat, lon, radius);
  if (owner) {
    results = results.filter(item => (item.createdBy || '').toLowerCase() === owner.toLowerCase());
  }
  res.json({ total: results.length, data: results });
});

// 4. POST New Material Listing to Database with User Attribution
app.post('/api/v1/listings', async (req, res) => {
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
    image,
    createdBy,
    companyName,
    ownerRole
  } = req.body;

  if (!title || !materialType) {
    return res.status(400).json({ error: 'Title and materialType are required.' });
  }
  if (!createdBy || !companyName) {
    return res.status(401).json({ error: 'Sign in before posting so you can manage your listing and buyer inquiries.' });
  }

  const listings = await getListings();

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
    createdBy,
    companyName,
    ownerRole: ownerRole || 'Packaging Generator / Supplier',
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
  await saveDatabase([newListing]);

  console.log(`[API] New Material Listing Posted by @${newListing.createdBy} (${newListing.companyName}): ID ${newListing.id} - ${newListing.title}`);

  res.status(201).json({
    status: 'success',
    message: 'Material listing saved to database!',
    data: newListing,
    carbonSavings: carbon
  });
});

app.delete('/api/v1/listings/:id', async (req, res) => {
  const listings = await getListings();
  const index = listings.findIndex(item => String(item.id) === String(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (!req.body?.username || listings[index].createdBy !== req.body.username) {
    return res.status(403).json({ error: 'Only the listing owner can delete this listing.' });
  }
  const [deleted] = listings.splice(index, 1);
  await saveDatabase(listings);

  const client = getNeonClient();
  if (client) {
    try {
      await client`DELETE FROM listings WHERE id = ${String(req.params.id)}`;
    } catch (e) {
      console.error('[Neon DB Delete Error]:', e.message);
    }
  }

  console.log(`[API] Material listing deleted by @${req.body.username}: ID ${deleted.id}`);
  return res.json({ status: 'success', message: 'Material listing deleted.', data: deleted });
});

// 5. ISO Carbon Accounting Endpoint
app.post('/api/v1/carbon/calculate', (req, res) => {
  const { materialType, quantity, distanceKm, grade } = req.body;
  const result = computeAvoidedCarbon(materialType, quantity, distanceKm, grade);
  res.json(result);
});

// 6. Eco-Logistics Route Optimization
app.post('/api/v1/logistics/optimize-route', async (req, res) => {
  const listings = await getListings();
  const route = solveOptimizedBackhaulRoute(listings);
  res.json(route);
});

export default app;
