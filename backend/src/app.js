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

app.post('/api/v1/inquiries', async (req, res) => {
  try {
    const inquiry = await createInquiry({
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

app.get('/api/v1/inquiries', async (req, res) => {
  try {
    const user = { id: req.query.userId, username: req.query.username, companyName: req.query.companyName };
    res.json({ data: await getInquiriesForUser(user, req.query.role === 'seller' ? 'seller' : 'buyer') });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.patch('/api/v1/inquiries/:id', async (req, res) => {
  try {
    const item = await updateInquiryStatus(req.params.id, requestUser(req), req.body?.status);
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

  if (req.body.quantity !== undefined) {
    const q = Number(req.body.quantity);
    if (isNaN(q) || q <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number greater than 0.' });
    }
  }

  if (req.body.price !== undefined) {
    const p = Number(req.body.price);
    if (isNaN(p) || p < 0) {
      return res.status(400).json({ error: 'Price cannot be a negative number.' });
    }
  }

  const editable = ['title', 'quantity', 'unit', 'grade', 'price', 'location', 'description'];
  editable.forEach(field => {
    if (req.body[field] !== undefined) listings[index][field] = field === 'quantity' || field === 'price'
      ? Math.max(field === 'quantity' ? 1 : 0, Number(req.body[field]))
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

app.get('/api/v1/inquiries/:id/messages', async (req, res) => {
  try {
    const user = { id: req.query.userId, username: req.query.username, companyName: req.query.companyName };
    res.json({ data: await getMessages(req.params.id, user) });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.post('/api/v1/inquiries/:id/messages', async (req, res) => {
  try {
    const message = await sendMessage(req.params.id, requestUser(req), req.body?.body);
    res.status(201).json({ status: 'success', data: message });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.post('/api/v1/orders', async (req, res) => {
  try {
    const { listingId, buyer, quantity, destination, paymentMethod } = req.body || {};
    if (!buyer?.id || !buyer?.username || !buyer?.companyName || !buyer?.email) {
      return res.status(401).json({ error: 'Sign in with a complete buyer profile before reserving material.' });
    }
    if (!destination?.trim() || !paymentMethod?.trim()) {
      return res.status(400).json({ error: 'Destination and payment method are required.' });
    }
    const client = getNeonClient();
    if (!client) return res.status(503).json({ error: 'Database is unavailable. The order was not created.' });
    const rows = await client`SELECT * FROM listings WHERE id = ${String(listingId)} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'This material is no longer available.' });
    const listing = rows[0];
    if (listing.created_by === buyer.username) return res.status(400).json({ error: 'You cannot purchase your own listing.' });
    const requestedQuantity = Number(quantity);
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || requestedQuantity > Number(listing.quantity)) {
      return res.status(400).json({ error: `Quantity must be between 1 and ${listing.quantity}.` });
    }
    const order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      listingId: String(listing.id),
      listingTitle: listing.title,
      sellerUsername: listing.created_by,
      buyerId: buyer.id,
      buyerUsername: buyer.username,
      buyerCompany: buyer.companyName,
      buyerEmail: buyer.email,
      quantity: requestedQuantity,
      unit: listing.unit,
      unitPrice: Number(listing.price) || 0,
      totalPrice: (Number(listing.price) || 0) * requestedQuantity,
      destination: destination.trim(),
      paymentMethod: paymentMethod.trim(),
      status: 'completed',
      listingSnapshot: listing
    };
    await client`
      INSERT INTO sales_orders (
        id, listing_id, listing_title, seller_username, buyer_id, buyer_username, buyer_company,
        buyer_email, quantity, unit, unit_price, total_price, destination, payment_method,
        status, listing_snapshot
      ) VALUES (
        ${order.id}, ${order.listingId}, ${order.listingTitle}, ${order.sellerUsername}, ${order.buyerId},
        ${order.buyerUsername}, ${order.buyerCompany}, ${order.buyerEmail}, ${order.quantity}, ${order.unit},
        ${order.unitPrice}, ${order.totalPrice}, ${order.destination}, ${order.paymentMethod},
        ${order.status}, ${JSON.stringify(order.listingSnapshot)}
      )
    `;
    await client`DELETE FROM listings WHERE id = ${order.listingId}`;
    res.status(201).json({ status: 'success', data: order });
  } catch (err) {
    console.error('[Orders] checkout failed:', err.message);
    res.status(500).json({ error: 'Could not complete this reservation. Please try again.' });
  }
});

app.get('/api/v1/orders', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) return res.status(401).json({ error: 'A signed-in user is required.' });
    const client = getNeonClient();
    if (!client) return res.json({ data: [] });
    const rows = await client`SELECT * FROM sales_orders WHERE seller_username = ${username} ORDER BY created_at DESC`;
    res.json({ data: rows.map(row => ({
      id: row.id, listingId: row.listing_id, listingTitle: row.listing_title,
      sellerUsername: row.seller_username, buyerId: row.buyer_id, buyerUsername: row.buyer_username,
      buyerCompany: row.buyer_company, buyerEmail: row.buyer_email, quantity: Number(row.quantity),
      unit: row.unit, unitPrice: Number(row.unit_price), totalPrice: Number(row.total_price),
      destination: row.destination, paymentMethod: row.payment_method, status: row.status,
      listingSnapshot: row.listing_snapshot, createdAt: row.created_at
    })) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load completed sales.' });
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
    createdByEmail: row.created_by_email || '',
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
          id, title, material_type, quantity, unit, grade, location, lat, lon, price, is_free, description, image, created_by, company_name, owner_role, created_by_email, created_at
        ) VALUES (
          ${String(l.id)}, ${l.title}, ${l.materialType}, ${l.quantity}, ${l.unit}, ${l.grade || 'A'},
          ${l.location || ''}, ${l.lat || 19.08}, ${l.lon || 72.88}, ${l.price || 0}, ${l.isFree || false}, ${l.description || ''},
          ${l.image || ''}, ${l.createdBy || 'anonymous'}, ${l.companyName || 'B2B Partner'}, ${l.ownerRole || 'Supplier'},
          ${l.createdByEmail || ''}, ${l.createdAt || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, material_type = EXCLUDED.material_type, quantity = EXCLUDED.quantity,
          unit = EXCLUDED.unit, grade = EXCLUDED.grade, location = EXCLUDED.location, lat = EXCLUDED.lat,
          lon = EXCLUDED.lon, price = EXCLUDED.price, is_free = EXCLUDED.is_free, description = EXCLUDED.description,
          image = EXCLUDED.image, created_by = EXCLUDED.created_by, company_name = EXCLUDED.company_name,
          owner_role = EXCLUDED.owner_role, created_by_email = EXCLUDED.created_by_email
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
app.get('/api/v1/auth/demo-users', async (req, res) => {
  res.json({ status: 'success', data: await getAllDemoUsers() });
});

app.post('/api/v1/auth/check-username', async (req, res) => {
  const result = await checkUsername(req.body?.username);
  res.json(result);
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const user = await authenticateUser(req.body);
    res.json({ status: 'success', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ status: 'success', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/forgot-password', async (req, res) => {
  try {
    const user = await resetPassword(req.body);
    res.json({ status: 'success', message: 'Password updated successfully. You are now logged in.', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/forgot-username', async (req, res) => {
  try {
    const result = await recoverUsername(req.body);
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/v1/auth/profile', async (req, res) => {
  try {
    const user = await updateUserProfile(req.body);
    res.json({ status: 'success', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/auth/change-password', async (req, res) => {
  try {
    const user = await changeUserPassword(req.body);
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
    ownerRole,
    createdByEmail
  } = req.body;

  if (!title || !materialType) {
    return res.status(400).json({ error: 'Title and materialType are required.' });
  }
  if (!createdBy || !companyName) {
    return res.status(401).json({ error: 'Sign in before posting so you can manage your listing and buyer inquiries.' });
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number greater than 0.' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price cannot be a negative number.' });
  }

  const listings = await getListings();

  const newListing = {
    id: Date.now(),
    title,
    materialType: materialType || 'cardboard',
    quantity: numQty,
    unit: unit || (materialType === 'pallet' ? 'pallets' : materialType === 'hdpe' ? 'drums' : materialType === 'ldpe' ? 'kg' : 'boxes'),
    grade: grade || 'A',
    location: location || 'Warehouse Hub, Zone A',
    lat: Number(lat) || 19.08,
    lon: Number(lon) || 72.88,
    distanceKm: 5.0,
    price: Math.max(0, numPrice),
    isFree: numPrice === 0,
    description: description || 'Verified circular packaging material lot.',
    createdBy,
    companyName,
    ownerRole: ownerRole || 'Packaging Generator / Supplier',
    createdByEmail: createdByEmail || 'contact@looppack.io',
    image: image || (materialType === 'pallet' 
      ? 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80'
      : materialType === 'hdpe'
      ? 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
      : materialType === 'ldpe'
      ? 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'),
    createdAt: req.body.createdAt || new Date().toISOString()
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

// 7. Logistics Fleet Truck Endpoints
app.get('/api/v1/trucks', async (req, res) => {
  const client = getNeonClient();
  if (client) {
    try {
      const owner = req.query.owner;
      const rows = owner
        ? await client`SELECT * FROM trucks WHERE created_by = ${owner} ORDER BY created_at DESC`
        : await client`SELECT * FROM trucks ORDER BY created_at DESC`;

      const data = rows.map(r => ({
        id: r.id,
        truckName: r.truck_name,
        vehicleReg: r.vehicle_reg,
        capacityTons: Number(r.capacity_tons),
        originCity: r.origin_city,
        destinationCity: r.destination_city,
        availableDate: r.available_date,
        ratePerKm: Number(r.rate_per_km),
        driverName: r.driver_name,
        driverPhone: r.driver_phone,
        status: r.status,
        createdBy: r.created_by,
        companyName: r.company_name,
        companyEmail: r.company_email,
        createdAt: r.created_at
      }));
      return res.json({ total: data.length, data });
    } catch (err) {
      console.error('[Neon DB Trucks Read Error]:', err.message);
    }
  }

  // Fallback preset trucks
  res.json({
    total: 3,
    data: [
      { id: 'trk_1', truckName: 'Tata 407 2.5T EV Container', vehicleReg: 'MH-04-FK-8492', capacityTons: 2.5, originCity: 'Mahape, Navi Mumbai', destinationCity: 'Bhiwandi Gateway', availableDate: 'Available Today', ratePerKm: 28, driverName: 'Ramesh Sharma', driverPhone: '+91 98201 48291', status: 'available', createdBy: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', companyEmail: 'dispatch@mahindrafreight.com', createdAt: new Date().toISOString() },
      { id: 'trk_2', truckName: 'Eicher 11.10 6.0T High Deck CNG', vehicleReg: 'MH-12-PQ-3104', capacityTons: 6.0, originCity: 'Goregaon East', destinationCity: 'Kurla Yard', availableDate: 'Available Tomorrow', ratePerKm: 42, driverName: 'Suresh Kumar', driverPhone: '+91 97182 39102', status: 'available', createdBy: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', companyEmail: 'dispatch@mahindrafreight.com', createdAt: new Date().toISOString() },
      { id: 'trk_3', truckName: 'Ashok Leyland Boss 4.5T EV Container', vehicleReg: 'MH-43-BB-9182', capacityTons: 4.5, originCity: 'Thane West', destinationCity: 'Taloja MIDC', availableDate: 'Available Today', ratePerKm: 36, driverName: 'Vikram Singh', driverPhone: '+91 98334 19283', status: 'in_transit', createdBy: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', companyEmail: 'dispatch@mahindrafreight.com', createdAt: new Date().toISOString() }
    ]
  });
});

app.post('/api/v1/trucks', async (req, res) => {
  const {
    truckName,
    vehicleReg,
    capacityTons,
    originCity,
    destinationCity,
    availableDate,
    ratePerKm,
    driverName,
    driverPhone,
    createdBy,
    companyName,
    companyEmail
  } = req.body;

  if (!truckName || !vehicleReg || !originCity || !destinationCity) {
    return res.status(400).json({ error: 'Truck Name, Vehicle Registration, Origin City, and Destination City are required.' });
  }

  if (!createdBy || !companyName) {
    return res.status(401).json({ error: 'Sign in with a registered Logistics Carrier account before listing a truck.' });
  }

  const cleanCap = Math.max(0.5, Number(capacityTons) || 1);
  const cleanRate = Math.max(0, Number(ratePerKm) || 0);

  const newTruck = {
    id: `trk_${Date.now()}`,
    truckName,
    vehicleReg,
    capacityTons: cleanCap,
    originCity,
    destinationCity,
    availableDate: availableDate || 'Available Now',
    ratePerKm: cleanRate,
    driverName: driverName || 'Assigned Carrier Driver',
    driverPhone: driverPhone || '+91 98000 00000',
    status: 'available',
    createdBy,
    companyName,
    companyEmail: companyEmail || 'dispatch@logistics.com',
    createdAt: new Date().toISOString()
  };

  const client = getNeonClient();
  if (client) {
    try {
      await client`
        INSERT INTO trucks (
          id, truck_name, vehicle_reg, capacity_tons, origin_city, destination_city, available_date, rate_per_km, driver_name, driver_phone, status, created_by, company_name, company_email, created_at
        ) VALUES (
          ${newTruck.id}, ${newTruck.truckName}, ${newTruck.vehicleReg}, ${newTruck.capacityTons},
          ${newTruck.originCity}, ${newTruck.destinationCity}, ${newTruck.availableDate}, ${newTruck.ratePerKm},
          ${newTruck.driverName}, ${newTruck.driverPhone}, ${newTruck.status}, ${newTruck.createdBy},
          ${newTruck.companyName}, ${newTruck.companyEmail}, ${newTruck.createdAt}
        )
      `;
    } catch (err) {
      console.error('[Neon DB Truck Insert Error]:', err.message);
    }
  }

  console.log(`[API] New Truck Listed by @${newTruck.createdBy} (${newTruck.companyName}): Reg ${newTruck.vehicleReg} - ${newTruck.truckName}`);

  res.status(201).json({
    status: 'success',
    message: 'Truck listed successfully on Logistics Carrier Network!',
    data: newTruck
  });
});

app.delete('/api/v1/trucks/:id', async (req, res) => {
  const { username } = req.body || {};
  const client = getNeonClient();
  if (client) {
    try {
      await client`DELETE FROM trucks WHERE id = ${req.params.id}`;
      return res.json({ status: 'success', message: 'Truck listing deleted.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json({ status: 'success', message: 'Truck listing deleted.' });
});

export default app;
