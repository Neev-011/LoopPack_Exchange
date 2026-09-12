import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeAvoidedCarbon } from './services/carbonEngineService.js';
import { searchListingsPostGIS, geocodeLocation } from './services/spatialService.js';

function isValidCoordinatePair(value) {
  return Number.isFinite(Number(value?.lat))
    && Number.isFinite(Number(value?.lon))
    && Number(value.lat) >= -90
    && Number(value.lat) <= 90
    && Number(value.lon) >= -180
    && Number(value.lon) <= 180;
}

function addressToLocationText(address, fallback) {
  return [address?.streetArea, address?.landmark, address?.city, address?.state]
    .filter(Boolean)
    .join(', ') || fallback;
}
import { isNeonConnected, getNeonClient } from './config/neonDb.js';
import { detectMaterialFromImage } from './services/imageDetectionService.js';
import {
  createInquiry,
  deleteInquiriesForListing,
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
import { getCompletedExchanges, recordCompletedExchange } from './services/exchangeService.js';
import { solveOptimizedBackhaulRoute } from './services/vrpSolverService.js';
import { rankLogisticsCandidates } from './services/logisticsCandidateMatchingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../data/db.json');
const ORDERS_FILE = path.join(__dirname, '../data/orders.json');

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
    companyName: req.body?.companyName,
    role: req.body?.role
  };
}

function isCommercialRole(role) {
  return role === 'supplier' || role === 'buyer';
}

app.post('/api/v1/inquiries', async (req, res) => {
  try {
    if (!isCommercialRole(req.body?.role)) {
      return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can contact sellers.' });
    }
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
    const requestedView = req.query.role === 'seller' ? 'seller' : 'buyer';
    if (!isCommercialRole(req.query.userRole)) {
      return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can view inquiries.' });
    }
    const user = { id: req.query.userId, username: req.query.username, companyName: req.query.companyName };
    res.json({ data: await getInquiriesForUser(user, requestedView) });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.patch('/api/v1/inquiries/:id', async (req, res) => {
  try {
    if (!isCommercialRole(req.body?.role)) {
      return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can manage inquiries.' });
    }
    const item = await updateInquiryStatus(req.params.id, requestUser(req), req.body?.status);
    res.json({ status: 'success', data: item });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.patch('/api/v1/listings/:id', async (req, res) => {
  if (!isCommercialRole(req.body?.role)) {
    return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can edit listings.' });
  }
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
    const user = { id: req.query.userId, username: req.query.username, companyName: req.query.companyName, role: req.query.role };
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

app.get('/api/v1/exchanges/completed', async (req, res) => {
  try {
    res.json({ data: await getCompletedExchanges(req.query.buyerUsername) });
  } catch (err) {
    res.status(500).json({ error: `Unable to load completed exchanges: ${err.message}` });
  }
});

app.post('/api/v1/exchanges/completed', async (req, res) => {
  try {
    const exchange = await recordCompletedExchange({
      listing: req.body?.listing,
      buyer: { username: req.body?.username }
    });
    res.status(201).json({ status: 'success', data: exchange });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/orders', async (req, res) => {
  try {
  const { listingId, buyer, quantity, destination, deliveryAddress, paymentMethod, pickupDate, pickupTime, logisticsVehicle, logisticsCandidates, buyerLocation } = req.body || {};
    if (!isCommercialRole(buyer?.role)) {
      return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can purchase materials.' });
    }
    if (!buyer?.id || !buyer?.username || !buyer?.companyName || !buyer?.email) {
      return res.status(401).json({ error: 'Sign in with a complete buyer profile before reserving material.' });
    }
    if (!destination?.trim() || !paymentMethod?.trim()) {
      return res.status(400).json({ error: 'Destination and payment method are required.' });
    }
    const buyerLat = Number(buyerLocation?.lat);
    const buyerLon = Number(buyerLocation?.lon);
    if (!Number.isFinite(buyerLat) || !Number.isFinite(buyerLon) || buyerLat < -90 || buyerLat > 90 || buyerLon < -180 || buyerLon > 180) {
      return res.status(400).json({ error: 'A valid buyer delivery latitude and longitude are required.' });
    }
    const client = getNeonClient();
    const listingRows = client
      ? await client`SELECT * FROM listings WHERE id = ${String(listingId)} LIMIT 1`
      : (await getListings()).filter(item => String(item.id) === String(listingId));
    if (!listingRows.length) return res.status(404).json({ error: 'This material is no longer available.' });
    const sourceListing = listingRows[0];
    const listing = {
      id: sourceListing.id,
      title: sourceListing.title,
      material_type: sourceListing.material_type ?? sourceListing.materialType,
      quantity: Number(sourceListing.quantity),
      unit: sourceListing.unit,
      grade: sourceListing.grade,
      location: sourceListing.location,
      lat: Number(sourceListing.lat),
      lon: Number(sourceListing.lon),
      price: Number(sourceListing.price) || 0,
      created_by: sourceListing.created_by ?? sourceListing.createdBy,
      company_name: sourceListing.company_name ?? sourceListing.companyName,
      owner_role: sourceListing.owner_role ?? sourceListing.ownerRole,
      created_by_email: sourceListing.created_by_email ?? sourceListing.createdByEmail,
      description: sourceListing.description,
      image: sourceListing.image,
      created_at: sourceListing.created_at ?? sourceListing.createdAt
    };
    if (listing.created_by === buyer.username) return res.status(400).json({ error: 'You cannot purchase your own listing.' });
    const requestedQuantity = Number(quantity);
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || requestedQuantity > Number(listing.quantity)) {
      return res.status(400).json({ error: `Quantity must be between 1 and ${listing.quantity}.` });
    }
    const transportDistanceKm = Number(logisticsVehicle?.estimate?.distanceKm);
    const carbon = computeAvoidedCarbon(
      listing.material_type,
      requestedQuantity,
      Number.isFinite(transportDistanceKm) && transportDistanceKm > 0 ? transportDistanceKm : Number(listing.distance_km || 10),
      listing.grade
    );
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
      buyerLocation: { lat: buyerLat, lon: buyerLon },
      deliveryAddress: deliveryAddress || null,
      paymentMethod: paymentMethod.trim(),
      pickupDate: pickupDate || null,
      pickupTime: pickupTime || null,
      status: 'pending',
      logisticsStatus: 'pending',
      logisticsCandidates: Array.isArray(logisticsCandidates) ? logisticsCandidates : [],
      logisticsRequestHistory: [],
      logisticsVehicle: logisticsVehicle
        ? {
            ...logisticsVehicle,
            estimate: {
              ...(logisticsVehicle.estimate || {}),
              distanceKm: transportDistanceKm,
              transportEmissionsKg: carbon.eTransport
            }
          }
        : null,
      transportDistanceKm: carbon.eTransport > 0 ? (carbon.eTransport / ((carbon.totalWeightKg / 1000) * 0.00016)) : null,
      transportEmissionsKg: carbon.eTransport,
      netCO2eAvoided: carbon.netCO2eAvoided,
      listingSnapshot: listing
    };
    if (client) {
      await client`
      INSERT INTO sales_orders (
        id, listing_id, listing_title, seller_username, buyer_id, buyer_username, buyer_company,
  buyer_email, quantity, unit, unit_price, total_price, destination, buyer_location, payment_method,
  pickup_date, pickup_time, delivery_address, status, logistics_status, logistics_vehicle, logistics_candidates, logistics_request_history, transport_distance_km, transport_emissions_kg, net_co2e_avoided, listing_snapshot
      ) VALUES (
        ${order.id}, ${order.listingId}, ${order.listingTitle}, ${order.sellerUsername}, ${order.buyerId},
        ${order.buyerUsername}, ${order.buyerCompany}, ${order.buyerEmail}, ${order.quantity}, ${order.unit},
  ${order.unitPrice}, ${order.totalPrice}, ${order.destination}, ${JSON.stringify(order.buyerLocation)}, ${order.paymentMethod},
        ${order.pickupDate}, ${order.pickupTime}, ${order.deliveryAddress ? JSON.stringify(order.deliveryAddress) : null}, ${order.status}, ${order.logisticsStatus}, ${order.logisticsVehicle ? JSON.stringify(order.logisticsVehicle) : null}, ${JSON.stringify(order.logisticsCandidates)}, ${JSON.stringify(order.logisticsRequestHistory)}, ${order.transportDistanceKm}, ${order.transportEmissionsKg}, ${order.netCO2eAvoided}, ${JSON.stringify(order.listingSnapshot)}
      )
      `;
    } else {
      const orders = readLocalOrders();
      orders.unshift(order);
      writeLocalOrders(orders);
    }
    await recordCompletedExchange({
      listing: {
        id: listing.id,
        title: listing.title,
        materialType: listing.material_type,
        quantity: requestedQuantity,
        unit: listing.unit,
        grade: listing.grade,
        distanceKm: Number.isFinite(transportDistanceKm) && transportDistanceKm > 0
          ? transportDistanceKm
          : Number(listing.distance_km || listing.distanceKm || 10)
      },
      buyer
    });
    if (client) {
      await client`DELETE FROM listings WHERE id = ${order.listingId}`;
    } else {
      const listings = await getListings();
      await saveDatabase(listings.filter(item => String(item.id) !== String(order.listingId)));
    }
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
    let rows = client
      ? req.query.role === 'buyer'
        ? await client`SELECT * FROM sales_orders WHERE buyer_username = ${username} ORDER BY created_at DESC`
        : req.query.role === 'logistics'
          ? await client`SELECT * FROM sales_orders WHERE logistics_vehicle->>'createdBy' = ${username} ORDER BY created_at DESC`
          : await client`SELECT * FROM sales_orders WHERE seller_username = ${username} ORDER BY created_at DESC`
      : readLocalOrders()
        .filter(row => req.query.role === 'buyer'
          ? row.buyerUsername === username
          : req.query.role === 'logistics'
            ? row.logisticsVehicle?.createdBy === username
            : row.sellerUsername === username)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      if (client && req.query.role === 'buyer') {
        const historicalExchanges = await client`
          SELECT * FROM completed_exchanges
          WHERE buyer_username = ${username}
          ORDER BY completed_at DESC
        `;
        const orderListingIds = new Set(rows.map(row => String(row.listing_id ?? row.listingId)));
        const recoveredOrders = historicalExchanges
          .filter(exchange => !orderListingIds.has(String(exchange.listing_id ?? exchange.listingId)))
          .map(exchange => ({
            id: `legacy_${exchange.id}`,
            listingId: exchange.listing_id ?? exchange.listingId,
            listingTitle: exchange.listing_title ?? exchange.listingTitle,
            buyerUsername: username,
            quantity: exchange.quantity,
            unit: exchange.unit,
            totalPrice: null,
            destination: null,
            paymentMethod: null,
            status: 'completed',
            logisticsStatus: null,
            logisticsRequestHistory: [],
            createdAt: exchange.completed_at ?? exchange.completedAt,
            recoveredFromExchange: true
          }));
        rows = [...rows, ...recoveredOrders];
      }
    res.json({ data: rows.map(row => normalizeOrder(row)) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load completed sales.' });
  }
});

app.patch('/api/v1/orders/:id/logistics-status', async (req, res) => {
  try {
    const { username, role, status } = req.body || {};
    if (role !== 'logistics') {
      return res.status(403).json({ error: 'Only logistics partners can update transport requests.' });
    }
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Transport requests can only be accepted or rejected.' });
    }
    const client = getNeonClient();
    if (!client) return res.status(503).json({ error: 'Database is unavailable.' });
    const orders = await client`
      SELECT * FROM sales_orders
      WHERE id = ${req.params.id}
        AND logistics_vehicle->>'createdBy' = ${username}
        AND logistics_status = 'pending'
      LIMIT 1
    `;
    if (!orders.length) {
      return res.status(404).json({ error: 'Pending transport request not found for this logistics partner.' });
    }
    const order = orders[0];
    const currentVehicle = order.logistics_vehicle || {};
    const history = Array.isArray(order.logistics_request_history) ? order.logistics_request_history : [];
    const updatedHistory = [...history, {
      vehicleId: currentVehicle.id,
      vehicleName: currentVehicle.truckName,
      provider: currentVehicle.companyName,
      providerUsername: currentVehicle.createdBy,
      status,
      contactedAt: new Date().toISOString()
    }];

    if (status === 'accepted') {
      const rows = await client`
        UPDATE sales_orders
        SET logistics_status = 'confirmed',
            status = 'logistics_confirmed',
            logistics_request_history = ${JSON.stringify(updatedHistory)}
        WHERE id = ${req.params.id} AND logistics_status = 'pending'
        RETURNING id, logistics_status, status, logistics_vehicle, logistics_request_history
      `;
      return res.json({ status: 'success', data: rows[0] });
    }

    const candidates = Array.isArray(order.logistics_candidates) ? order.logistics_candidates : [];
    const contactedIds = new Set(updatedHistory.map(item => String(item.vehicleId)));
    const nextVehicle = candidates.find(vehicle => !contactedIds.has(String(vehicle.id)));
    if (!nextVehicle) {
      const rows = await client`
        UPDATE sales_orders
        SET logistics_status = 'no_logistics_available',
            status = 'no_logistics_available',
            logistics_request_history = ${JSON.stringify(updatedHistory)}
        WHERE id = ${req.params.id} AND logistics_status = 'pending'
        RETURNING id, logistics_status, status, logistics_request_history
      `;
      return res.json({ status: 'success', data: rows[0] });
    }

    const rows = await client`
      UPDATE sales_orders
      SET logistics_status = 'pending',
          status = 'pending',
          logistics_vehicle = ${JSON.stringify(nextVehicle)},
          logistics_request_history = ${JSON.stringify(updatedHistory)}
      WHERE id = ${req.params.id} AND logistics_status = 'pending'
      RETURNING id, logistics_status, status, logistics_vehicle, logistics_request_history
    `;
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    console.error('[Orders] logistics status update failed:', err.message);
    res.status(500).json({ error: 'Could not update the transport request.' });
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

function readLocalOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]');
  } catch (err) {
    console.error('Error reading local orders:', err);
    return [];
  }
}

function writeLocalOrders(orders) {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function normalizeOrder(row) {
  return {
    id: row.id,
    listingId: row.listing_id ?? row.listingId,
    listingTitle: row.listing_title ?? row.listingTitle,
    sellerUsername: row.seller_username ?? row.sellerUsername,
    buyerId: row.buyer_id ?? row.buyerId,
    buyerUsername: row.buyer_username ?? row.buyerUsername,
    buyerCompany: row.buyer_company ?? row.buyerCompany,
    buyerEmail: row.buyer_email ?? row.buyerEmail,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitPrice: Number(row.unit_price ?? row.unitPrice ?? 0),
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    destination: row.destination,
    deliveryAddress: row.delivery_address ?? row.deliveryAddress,
    paymentMethod: row.payment_method ?? row.paymentMethod,
    status: row.status,
    buyerLocation: row.buyer_location ?? row.buyerLocation,
    pickupDate: row.pickup_date ?? row.pickupDate,
    pickupTime: row.pickup_time ?? row.pickupTime,
    logisticsStatus: row.logistics_status ?? row.logisticsStatus,
    logisticsVehicle: row.logistics_vehicle ?? row.logisticsVehicle,
    logisticsCandidates: row.logistics_candidates ?? row.logisticsCandidates ?? [],
    logisticsRequestHistory: row.logistics_request_history ?? row.logisticsRequestHistory ?? [],
    transportDistanceKm: Number(row.transport_distance_km ?? row.transportDistanceKm),
    transportEmissionsKg: Number(row.transport_emissions_kg ?? row.transportEmissionsKg),
    netCO2eAvoided: Number(row.net_co2e_avoided ?? row.netCO2eAvoided),
    listingSnapshot: row.listing_snapshot ?? row.listingSnapshot,
    createdAt: row.created_at ?? row.createdAt,
    recoveredFromExchange: Boolean(row.recovered_from_exchange ?? row.recoveredFromExchange)
  };
}

async function initDatabaseSchema() {
  const client = getNeonClient();
  if (client) {
    try {
      await client`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT false`;
      await client`ALTER TABLE listings ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Seller Direct'`;
      console.log('[DB Schema] Verified ai_verified and verification_status columns in Neon PostgreSQL.');
    } catch (err) {
      console.warn('[DB Schema] Migration warning:', err.message);
    }
  }
}
initDatabaseSchema();

async function getListings() {
  const client = getNeonClient();
  if (!client) return readDatabase();

  const rows = await client`SELECT * FROM listings ORDER BY created_at DESC`;
  return rows.map(row => {
    const isVerified = row.ai_verified !== null && row.ai_verified !== undefined
      ? Boolean(row.ai_verified)
      : (row.aiVerified !== null && row.aiVerified !== undefined ? Boolean(row.aiVerified) : false);

    return {
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
      aiVerified: isVerified,
      verificationStatus: row.verification_status || (isVerified ? 'AI Verified' : 'Seller Direct'),
      createdAt: row.created_at
    };
  });
}

// Neon is the primary store when configured. JSON is only a local fallback.
async function saveDatabase(listings) {
  const client = getNeonClient();
  if (client) {
    for (const l of listings) {
      try {
        await client`
          INSERT INTO listings (
            id, title, material_type, quantity, unit, grade, location, lat, lon, price, is_free, description, image, created_by, company_name, owner_role, created_by_email, ai_verified, verification_status, created_at
          ) VALUES (
            ${String(l.id)}, ${l.title}, ${l.materialType}, ${l.quantity}, ${l.unit}, ${l.grade || 'A'},
            ${l.location || ''}, ${l.lat || 19.08}, ${l.lon || 72.88}, ${l.price || 0}, ${l.isFree || false}, ${l.description || ''},
            ${l.image || ''}, ${l.createdBy || 'anonymous'}, ${l.companyName || 'B2B Partner'}, ${l.ownerRole || 'Supplier'},
            ${l.createdByEmail || ''}, ${Boolean(l.aiVerified)}, ${l.verificationStatus || (l.aiVerified ? 'AI Verified' : 'Seller Direct')}, ${l.createdAt || new Date().toISOString()}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title, material_type = EXCLUDED.material_type, quantity = EXCLUDED.quantity,
            unit = EXCLUDED.unit, grade = EXCLUDED.grade, location = EXCLUDED.location, lat = EXCLUDED.lat,
            lon = EXCLUDED.lon, price = EXCLUDED.price, is_free = EXCLUDED.is_free, description = EXCLUDED.description,
            image = EXCLUDED.image, created_by = EXCLUDED.created_by, company_name = EXCLUDED.company_name,
            owner_role = EXCLUDED.owner_role, created_by_email = EXCLUDED.created_by_email,
            ai_verified = EXCLUDED.ai_verified, verification_status = EXCLUDED.verification_status
        `;
      } catch (dbErr) {
        console.warn('[DB] SQL insert column fallback:', dbErr.message);
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

  let results = owner
    ? listings
        .filter(item => (item.createdBy || '').toLowerCase() === owner.toLowerCase())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : searchListingsPostGIS(listings, lat, lon, radius);
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
  if (!isCommercialRole(req.body?.role)) {
    return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can post materials.' });
  }

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Number(lat) < -90 || Number(lat) > 90 || Number(lon) < -180 || Number(lon) > 180) {
    return res.status(400).json({ error: 'A valid device latitude and longitude are required for proximity tracking.' });
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
    lat: Number(lat),
    lon: Number(lon),
    distanceKm: 5.0,
    price: Math.max(0, numPrice),
    isFree: numPrice === 0,
    description: description || 'Verified circular packaging material lot.',
    createdBy,
    companyName,
    ownerRole: ownerRole || 'Buyer / Seller Organization',
    createdByEmail: createdByEmail || 'contact@looppack.io',
    aiVerified: req.body.aiVerified !== undefined ? Boolean(req.body.aiVerified) : false,
    verificationStatus: req.body.verificationStatus || (req.body.aiVerified ? 'AI Verified' : 'Seller Direct'),
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
  if (!isCommercialRole(req.body?.role)) {
    return res.status(403).json({ error: 'Only Buyer / Seller Organization accounts can delete listings.' });
  }
  const listings = await getListings();
  const index = listings.findIndex(item => String(item.id) === String(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (!req.body?.username || listings[index].createdBy !== req.body.username) {
    return res.status(403).json({ error: 'Only the listing owner can delete this listing.' });
  }
  const [deleted] = listings.splice(index, 1);
  try {
    await deleteInquiriesForListing(req.params.id);
    await saveDatabase(listings);

    const client = getNeonClient();
    if (client) {
      await client`DELETE FROM listings WHERE id = ${String(req.params.id)}`;
    }
  } catch (error) {
    console.error('[Listing delete failed]:', error.message);
    return res.status(500).json({ error: 'The material could not be deleted completely. Please retry after checking the database connection.' });
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

// 6. Google OR-Tools & OSRM VRP Logistics Backhaul Route Optimizer Endpoint
app.post('/api/v1/logistics/optimize-route', async (req, res) => {
  if (req.body?.role !== 'logistics') {
    return res.status(403).json({ error: 'Only logistics accounts can optimize delivery rides.' });
  }
  try {
    const { pickups, depot, dropFacility, originCity, destinationCity } = req.body || {};

    // 1. Resolve Origin Depot (Geocode if string location is provided)
    let resolvedDepot;
    if (typeof originCity === 'string' && originCity.trim()) {
      const geo = await geocodeLocation(originCity);
      resolvedDepot = { lat: geo.lat, lon: geo.lon, name: `Depot: ${geo.name}`, location: geo.name };
    } else if (depot && depot.lat && depot.lon) {
      resolvedDepot = depot;
    } else {
      const geo = await geocodeLocation('Thane West');
      resolvedDepot = { lat: geo.lat, lon: geo.lon, name: 'Thane Freight Depot', location: geo.name };
    }

    // 2. Resolve Destination Refurbishing / Recycling Hub
    let resolvedDrop;
    if (typeof destinationCity === 'string' && destinationCity.trim()) {
      const geo = await geocodeLocation(destinationCity);
      resolvedDrop = { lat: geo.lat, lon: geo.lon, name: `Drop: ${geo.name}`, address: geo.name };
    } else if (dropFacility && dropFacility.lat && dropFacility.lon) {
      resolvedDrop = dropFacility;
    } else {
      const geo = await geocodeLocation('Mahape Navi Mumbai');
      resolvedDrop = { lat: geo.lat, lon: geo.lon, name: 'GreenPack Refurbishing Hub', address: geo.name };
    }

    // 3. Resolve Pickup Nodes (Use provided or load from actual active DB listings)
    let resolvedPickups = [];
    if (Array.isArray(pickups) && pickups.length > 0) {
      resolvedPickups = await Promise.all(pickups.map(async (p, idx) => {
        if (p.lat && p.lon) return p;
        const geo = await geocodeLocation(p.location || p.address || p.title || 'Mumbai');
        return {
          id: p.id || `p_${idx + 1}`,
          title: p.title || `Pickup ${idx + 1}`,
          location: geo.name,
          lat: geo.lat,
          lon: geo.lon,
          quantity: p.quantity || 100,
          unit: p.unit || 'units',
          materialType: p.materialType || 'packaging'
        };
      }));
    } else {
      // Load actual active marketplace listings from Neon DB / JSON database
      const dbListings = await getListings();
      if (dbListings && dbListings.length > 0) {
        resolvedPickups = await Promise.all(dbListings.slice(0, 5).map(async (item, idx) => {
          let lat = item.lat;
          let lon = item.lon;
          if (!lat || !lon) {
            const geo = await geocodeLocation(item.location || 'Navi Mumbai');
            lat = geo.lat;
            lon = geo.lon;
          }
          return {
            id: String(item.id),
            title: item.title,
            location: item.location || 'Industrial Hub',
            lat,
            lon,
            quantity: item.quantity,
            unit: item.unit,
            materialType: item.materialType
          };
        }));
      } else {
        // Fallback geocoded hubs
        resolvedPickups = [
          { id: 'p1', title: '500 HDPE Drums Lot', location: 'Navi Mumbai Hub', lat: 19.080, lon: 73.010, quantity: 500, unit: 'drums', materialType: 'hdpe' },
          { id: 'p2', title: '1,200 Balewrapped Corrugated Box Lot', location: 'Bhiwandi Gateway', lat: 19.290, lon: 73.060, quantity: 1200, unit: 'kg', materialType: 'cardboard' },
          { id: 'p3', title: '350 Wooden Euro Pallets', location: 'Thane MIDC Industrial', lat: 19.200, lon: 72.980, quantity: 350, unit: 'pallets', materialType: 'pallet' }
        ];
      }
    }

    const result = await solveOptimizedBackhaulRoute(resolvedPickups, resolvedDepot, resolvedDrop);
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('[OR-Tools / OSRM VRP Solver Error]:', err);
    res.status(500).json({ error: `VRP Optimization failed: ${err.message}` });
  }
});

// 7. Logistics Fleet Truck Endpoints
app.post('/api/v1/trucks/match', async (req, res) => {
  try {
    const { vehicles, shipment, options } = req.body || {};
    if (!Array.isArray(vehicles) || !shipment) {
      return res.status(400).json({ error: 'Vehicles and shipment details are required.' });
    }
    const candidates = await rankLogisticsCandidates({ vehicles, shipment, options });
    res.json({ status: 'success', data: candidates });
  } catch (err) {
    console.error('[Logistics Candidate Matching Error]:', err.message);
    res.status(500).json({ error: 'Could not evaluate logistics candidates.' });
  }
});

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
        pickupAddress: r.pickup_address,
        deliveryAddress: r.delivery_address,
        originCoordinates: isValidCoordinatePair({ lat: r.origin_latitude, lon: r.origin_longitude })
          ? { lat: Number(r.origin_latitude), lon: Number(r.origin_longitude) }
          : null,
        destinationCoordinates: isValidCoordinatePair({ lat: r.destination_latitude, lon: r.destination_longitude })
          ? { lat: Number(r.destination_latitude), lon: Number(r.destination_longitude) }
          : null,
        originLatitude: isValidCoordinatePair({ lat: r.origin_latitude, lon: r.origin_longitude }) ? Number(r.origin_latitude) : null,
        originLongitude: isValidCoordinatePair({ lat: r.origin_latitude, lon: r.origin_longitude }) ? Number(r.origin_longitude) : null,
        destinationLatitude: isValidCoordinatePair({ lat: r.destination_latitude, lon: r.destination_longitude }) ? Number(r.destination_latitude) : null,
        destinationLongitude: isValidCoordinatePair({ lat: r.destination_latitude, lon: r.destination_longitude }) ? Number(r.destination_longitude) : null,
        routeCoordinatesAvailable: isValidCoordinatePair({ lat: r.origin_latitude, lon: r.origin_longitude })
          && isValidCoordinatePair({ lat: r.destination_latitude, lon: r.destination_longitude }),
        availableDate: r.available_date,
        availableTime: r.available_time,
        ratePerKm: Number(r.rate_per_km),
        driverName: r.driver_name,
        driverPhone: r.driver_phone,
        status: r.status,
        createdBy: r.created_by,
        companyName: r.company_name,
        companyEmail: r.company_email,
        lat: Number(r.lat),
        lon: Number(r.lon),
        locationUpdatedAt: r.location_updated_at,
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
      { id: 'trk_1', truckName: 'Tata 407 2.5T EV Container', vehicleReg: 'MH-04-FK-8492', capacityTons: 2.5, originCity: 'Mahape, Navi Mumbai', destinationCity: 'Bhiwandi Gateway', originCoordinates: { lat: 19.115, lon: 73.015 }, destinationCoordinates: { lat: 19.2968, lon: 73.0631 }, availableDate: 'Available Today', ratePerKm: 28, driverName: 'Ramesh Sharma', driverPhone: '+91 98201 48291', status: 'available', createdBy: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', companyEmail: 'dispatch@mahindrafreight.com', createdAt: new Date().toISOString() },
      { id: 'trk_2', truckName: 'Eicher 11.10 6.0T High Deck CNG', vehicleReg: 'MH-12-PQ-3104', capacityTons: 6.0, originCity: 'Goregaon East', destinationCity: 'Kurla Yard', originCoordinates: { lat: 19.1663, lon: 72.8526 }, destinationCoordinates: { lat: 19.065, lon: 72.879 }, availableDate: 'Available Tomorrow', ratePerKm: 42, driverName: 'Suresh Kumar', driverPhone: '+91 97182 39102', status: 'available', createdBy: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', companyEmail: 'dispatch@mahindrafreight.com', createdAt: new Date().toISOString() },
      { id: 'trk_3', truckName: 'Ashok Leyland Boss 4.5T EV Container', vehicleReg: 'MH-43-BB-9182', capacityTons: 4.5, originCity: 'Thane West', destinationCity: 'Taloja MIDC', originCoordinates: { lat: 19.2183, lon: 72.9781 }, destinationCoordinates: { lat: 19.0622, lon: 73.1114 }, availableDate: 'Available Today', ratePerKm: 36, driverName: 'Vikram Singh', driverPhone: '+91 98334 19283', status: 'in_transit', createdBy: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', companyEmail: 'dispatch@mahindrafreight.com', createdAt: new Date().toISOString() }
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
    pickupAddress,
    deliveryAddress,
    availableDate,
    availableTime,
    ratePerKm,
    driverName,
    driverPhone,
    createdBy,
    companyName,
    companyEmail,
    lat,
    lon,
    originCoordinates,
    destinationCoordinates
  } = req.body;

  if (!truckName || !vehicleReg || !originCity || !destinationCity) {
    return res.status(400).json({ error: 'Truck Name, Vehicle Registration, Origin City, and Destination City are required.' });
  }

  if (!createdBy || !companyName) {
    return res.status(401).json({ error: 'Sign in with a registered Logistics Carrier account before listing a truck.' });
  }
  if (req.body?.role !== 'logistics') {
    return res.status(403).json({ error: 'Only logistics accounts can list and manage rides.' });
  }
  if (originCoordinates !== undefined && !isValidCoordinatePair(originCoordinates)) {
    return res.status(400).json({ error: 'Origin coordinates must contain valid latitude and longitude values.' });
  }
  if (destinationCoordinates !== undefined && !isValidCoordinatePair(destinationCoordinates)) {
    return res.status(400).json({ error: 'Destination coordinates must contain valid latitude and longitude values.' });
  }

  const cleanCap = Math.max(0.5, Number(capacityTons) || 1);
  const cleanRate = Math.max(0, Number(ratePerKm) || 0);
  const originText = addressToLocationText(pickupAddress, originCity);
  const destinationText = addressToLocationText(deliveryAddress, destinationCity);
  const resolvedOrigin = isValidCoordinatePair(originCoordinates)
    ? { lat: Number(originCoordinates.lat), lon: Number(originCoordinates.lon) }
    : await geocodeLocation(originText, { allowSyntheticFallback: false });
  const resolvedDestination = isValidCoordinatePair(destinationCoordinates)
    ? { lat: Number(destinationCoordinates.lat), lon: Number(destinationCoordinates.lon) }
    : await geocodeLocation(destinationText, { allowSyntheticFallback: false });

  const newTruck = {
    id: `trk_${Date.now()}`,
    truckName,
    vehicleReg,
    capacityTons: cleanCap,
    originCity,
    destinationCity,
    pickupAddress: pickupAddress || null,
    deliveryAddress: deliveryAddress || null,
    availableDate: availableDate || 'Available Now',
    availableTime: availableTime || '09:00',
    ratePerKm: cleanRate,
    driverName: driverName || 'Assigned Carrier Driver',
    driverPhone: driverPhone || '+91 98000 00000',
    status: 'available',
    createdBy,
    companyName,
    companyEmail: companyEmail || 'dispatch@logistics.com',
    lat: resolvedOrigin?.lat ?? (isValidCoordinatePair({ lat, lon }) ? Number(lat) : null),
    lon: resolvedOrigin?.lon ?? (isValidCoordinatePair({ lat, lon }) ? Number(lon) : null),
    originCoordinates: resolvedOrigin,
    destinationCoordinates: resolvedDestination,
    routeCoordinatesAvailable: Boolean(resolvedOrigin && resolvedDestination),
    originLatitude: resolvedOrigin?.lat ?? null,
    originLongitude: resolvedOrigin?.lon ?? null,
    destinationLatitude: resolvedDestination?.lat ?? null,
    destinationLongitude: resolvedDestination?.lon ?? null,
    locationUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const client = getNeonClient();
  if (client) {
    try {
      await client`
        INSERT INTO trucks (
          id, truck_name, vehicle_reg, capacity_tons, origin_city, destination_city, pickup_address, delivery_address, available_date, available_time, rate_per_km, driver_name, driver_phone, status, created_by, company_name, company_email, lat, lon, origin_latitude, origin_longitude, destination_latitude, destination_longitude, location_updated_at, created_at
        ) VALUES (
          ${newTruck.id}, ${newTruck.truckName}, ${newTruck.vehicleReg}, ${newTruck.capacityTons},
          ${newTruck.originCity}, ${newTruck.destinationCity}, ${newTruck.pickupAddress ? JSON.stringify(newTruck.pickupAddress) : null}, ${newTruck.deliveryAddress ? JSON.stringify(newTruck.deliveryAddress) : null}, ${newTruck.availableDate}, ${newTruck.availableTime}, ${newTruck.ratePerKm},
          ${newTruck.driverName}, ${newTruck.driverPhone}, ${newTruck.status}, ${newTruck.createdBy},
          ${newTruck.companyName}, ${newTruck.companyEmail}, ${newTruck.lat}, ${newTruck.lon}, ${newTruck.originCoordinates?.lat ?? null}, ${newTruck.originCoordinates?.lon ?? null}, ${newTruck.destinationCoordinates?.lat ?? null}, ${newTruck.destinationCoordinates?.lon ?? null}, ${newTruck.locationUpdatedAt}, ${newTruck.createdAt}
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

app.patch('/api/v1/trucks/:id/location', async (req, res) => {
  const lat = Number(req.body?.lat);
  const lon = Number(req.body?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }
  const client = getNeonClient();
  if (!client) return res.status(503).json({ error: 'Database is unavailable. Location was not updated.' });
  try {
    const updatedAt = new Date().toISOString();
    const rows = await client`
      UPDATE trucks SET lat = ${lat}, lon = ${lon}, location_updated_at = ${updatedAt}
      WHERE id = ${req.params.id}
      RETURNING id, lat, lon, location_updated_at
    `;
    if (!rows.length) return res.status(404).json({ error: 'Truck listing not found.' });
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: `Unable to update truck location: ${err.message}` });
  }
});

app.delete('/api/v1/trucks/:id', async (req, res) => {
  const { username, role } = req.body || {};
  if (role !== 'logistics') {
    return res.status(403).json({ error: 'Only logistics accounts can remove rides.' });
  }
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

app.patch('/api/v1/trucks/:id/status', async (req, res) => {
  const { username, role, status } = req.body || {};
  if (role !== 'logistics') {
    return res.status(403).json({ error: 'Only logistics accounts can accept or reject rides.' });
  }
  if (!['accepted', 'rejected', 'available'].includes(status)) {
    return res.status(400).json({ error: 'Invalid ride status.' });
  }
  const client = getNeonClient();
  if (!client) return res.status(503).json({ error: 'Database is unavailable.' });
  const rows = await client`
    UPDATE trucks SET status = ${status}
    WHERE id = ${req.params.id} AND created_by = ${username}
    RETURNING id, status
  `;
  if (!rows.length) return res.status(404).json({ error: 'Ride not found or not owned by this logistics account.' });
  res.json({ status: 'success', data: rows[0] });
});

export default app;
