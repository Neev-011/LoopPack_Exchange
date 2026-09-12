import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNeonClient } from '../config/neonDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const EXCHANGES_FILE = path.join(DATA_DIR, 'exchanges.json');

function localRead() {
  if (!fs.existsSync(EXCHANGES_FILE)) return [];
  return JSON.parse(fs.readFileSync(EXCHANGES_FILE, 'utf8') || '[]');
}

function localWrite(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EXCHANGES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeExchange(row) {
  return {
    id: row.id,
    listingId: row.listing_id ?? row.listingId,
    listingTitle: row.listing_title ?? row.listingTitle,
    materialType: row.material_type ?? row.materialType,
    quantity: Number(row.quantity),
    unit: row.unit,
    grade: row.grade,
    distanceKm: Number(row.distance_km ?? row.distanceKm ?? 10),
    buyerUsername: row.buyer_username ?? row.buyerUsername ?? null,
    completedAt: row.completed_at ?? row.completedAt
  };
}

export async function recordCompletedExchange({ listing, buyer }) {
  const quantity = Number(listing?.quantity);
  if (!listing?.id || !listing.materialType || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('A valid listing is required to complete an exchange.');
  }

  const exchange = {
    id: `exchange_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    listingId: String(listing.id),
    listingTitle: listing.title || 'Packaging material exchange',
    materialType: listing.materialType,
    quantity,
    unit: listing.unit || 'units',
    grade: listing.grade || 'A',
    distanceKm: Number(listing.distanceKm) || 10,
    buyerUsername: buyer?.username || null,
    completedAt: new Date().toISOString()
  };

  const client = getNeonClient();
  if (client) {
    await client`INSERT INTO completed_exchanges (id, listing_id, listing_title, material_type, quantity, unit, grade, distance_km, buyer_username, completed_at) VALUES (${exchange.id}, ${exchange.listingId}, ${exchange.listingTitle}, ${exchange.materialType}, ${exchange.quantity}, ${exchange.unit}, ${exchange.grade}, ${exchange.distanceKm}, ${exchange.buyerUsername}, ${exchange.completedAt})`;
  } else {
    const exchanges = localRead();
    exchanges.unshift(exchange);
    localWrite(exchanges);
  }

  return exchange;
}

export async function getCompletedExchanges(buyerUsername) {
  const client = getNeonClient();
  if (client) {
    const rows = buyerUsername
      ? await client`SELECT * FROM completed_exchanges WHERE buyer_username = ${buyerUsername} ORDER BY completed_at ASC`
      : await client`SELECT * FROM completed_exchanges ORDER BY completed_at ASC`;
    return rows.map(normalizeExchange);
  }
  return localRead()
    .filter(item => !buyerUsername || item.buyerUsername === buyerUsername)
    .map(normalizeExchange);
}
