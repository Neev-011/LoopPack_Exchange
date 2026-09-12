import pg from 'pg';
import { neon, neonConfig } from '@neondatabase/serverless';

const { Pool } = pg;

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
}

let isNeonConnected = false;
let pool = null;
let sqlClient = null;

export function getNeonClient() {
  const connStr = getConnectionString();
  if (connStr && connStr.startsWith('postgres')) {
    if (!sqlClient) {
      try {
        sqlClient = neon(connStr);
        isNeonConnected = true;
      } catch (err) {
        console.error('[Neon DB] sqlClient initialization error:', err.message);
      }
    }
    return sqlClient;
  }
  return null;
}

export function getNeonPool() {
  const connStr = getConnectionString();
  if (connStr && connStr.startsWith('postgres')) {
    if (!pool) {
      try {
        pool = new Pool({
          connectionString: connStr,
          ssl: { rejectUnauthorized: false }
        });
        isNeonConnected = true;
      } catch (err) {
        console.error('[Neon DB] Pool initialization error:', err.message);
      }
    }
    return pool;
  }
  return null;
}

// Initial connection attempt
const initialConn = getConnectionString();
if (initialConn && initialConn.startsWith('postgres')) {
  getNeonClient();
  getNeonPool();
  console.log('[Neon DB] Connecting to Neon Serverless PostgreSQL database...');
} else {
  console.log('[Neon DB] No DATABASE_URL set. To connect Neon Postgres, set DATABASE_URL in backend/.env');
}

/**
 * Auto-initializes PostgreSQL table schemas in Neon DB
 */
export async function initNeonTables() {
  const client = getNeonClient();
  if (!client) {
    return false;
  }

  try {
    // 1. Listings Table
    await client`
      CREATE TABLE IF NOT EXISTS listings (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        material_type VARCHAR(50) NOT NULL,
        quantity NUMERIC NOT NULL,
        unit VARCHAR(50) DEFAULT 'units',
        grade VARCHAR(10) DEFAULT 'A',
        location VARCHAR(255),
        lat NUMERIC,
        lon NUMERIC,
        price NUMERIC DEFAULT 0,
        is_free BOOLEAN DEFAULT FALSE,
        description TEXT,
        image TEXT,
        created_by VARCHAR(100),
        company_name VARCHAR(255),
        owner_role VARCHAR(100),
        created_by_email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client`ALTER TABLE listings ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255)`;

    // 2. Inquiries Table
    await client`
      CREATE TABLE IF NOT EXISTS inquiries (
        id VARCHAR(64) PRIMARY KEY,
        listing_id VARCHAR(64),
        listing_title VARCHAR(255),
        buyer_id VARCHAR(64),
        buyer_username VARCHAR(100),
        buyer_company VARCHAR(255),
        seller_username VARCHAR(100),
        message TEXT,
        quantity NUMERIC,
        status VARCHAR(50) DEFAULT 'new',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE
      )
    `;
    await client`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE`;

    await client`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(80) PRIMARY KEY,
        inquiry_id VARCHAR(64) NOT NULL,
        sender_id VARCHAR(64) NOT NULL,
        sender_username VARCHAR(100) NOT NULL,
        sender_company VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Remove legacy orphan rows before enforcing cascading ownership relationships.
    await client`DELETE FROM messages WHERE NOT EXISTS (SELECT 1 FROM inquiries WHERE inquiries.id = messages.inquiry_id)`;
    await client`DELETE FROM inquiries WHERE listing_id IS NULL OR NOT EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id)`;
    await client`ALTER TABLE inquiries ALTER COLUMN listing_id SET NOT NULL`;
    try {
      await client`ALTER TABLE inquiries ADD CONSTRAINT inquiries_listing_fk FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE`;
    } catch (error) {
      if (!/already exists/i.test(error.message)) throw error;
    }
    try {
      await client`ALTER TABLE messages ADD CONSTRAINT messages_inquiry_fk FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE`;
    } catch (error) {
      if (!/already exists/i.test(error.message)) throw error;
    }

    await client`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id VARCHAR(80) PRIMARY KEY,
        listing_id VARCHAR(64) NOT NULL,
        listing_title VARCHAR(255) NOT NULL,
        seller_username VARCHAR(100) NOT NULL,
        buyer_id VARCHAR(64) NOT NULL,
        buyer_username VARCHAR(100) NOT NULL,
        buyer_company VARCHAR(255) NOT NULL,
        buyer_email VARCHAR(255),
        quantity NUMERIC NOT NULL,
        unit VARCHAR(50),
        unit_price NUMERIC DEFAULT 0,
        total_price NUMERIC DEFAULT 0,
        destination TEXT NOT NULL,
        pickup_date VARCHAR(40),
        pickup_time VARCHAR(20),
        delivery_address JSONB,
        payment_method VARCHAR(80) NOT NULL,
        status VARCHAR(40) DEFAULT 'completed',
        logistics_status VARCHAR(40) DEFAULT 'pending',
        logistics_vehicle JSONB,
        logistics_candidates JSONB,
        logistics_request_history JSONB DEFAULT '[]'::jsonb,
        transport_distance_km NUMERIC,
        transport_emissions_kg NUMERIC,
        net_co2e_avoided NUMERIC,
        listing_snapshot JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS logistics_status VARCHAR(40) DEFAULT 'pending'`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS logistics_vehicle JSONB`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS logistics_candidates JSONB`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS logistics_request_history JSONB DEFAULT '[]'::jsonb`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS transport_distance_km NUMERIC`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS transport_emissions_kg NUMERIC`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS net_co2e_avoided NUMERIC`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS pickup_date VARCHAR(40)`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS pickup_time VARCHAR(20)`;
    await client`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivery_address JSONB`;
    await client`DELETE FROM sales_orders WHERE NOT EXISTS (SELECT 1 FROM listings WHERE listings.id = sales_orders.listing_id)`;
    try {
      await client`ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_listing_fk FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE`;
    } catch (error) {
      if (!/already exists/i.test(error.message)) throw error;
    }

    // 4. Users Table
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'supplier',
        role_label VARCHAR(100),
        industry VARCHAR(255),
        security_question TEXT,
        security_answer TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Trucks Table
    await client`
      CREATE TABLE IF NOT EXISTS trucks (
        id VARCHAR(64) PRIMARY KEY,
        truck_name VARCHAR(255) NOT NULL,
        vehicle_reg VARCHAR(100) NOT NULL,
        capacity_tons NUMERIC NOT NULL,
        origin_city VARCHAR(255) NOT NULL,
        destination_city VARCHAR(255) NOT NULL,
        pickup_address JSONB,
        delivery_address JSONB,
        available_date VARCHAR(100),
        available_time VARCHAR(50),
        rate_per_km NUMERIC DEFAULT 0,
        driver_name VARCHAR(100),
        driver_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'available',
        created_by VARCHAR(100) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        company_email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client`ALTER TABLE trucks ADD COLUMN IF NOT EXISTS available_time VARCHAR(50)`;
    await client`ALTER TABLE trucks ADD COLUMN IF NOT EXISTS pickup_address JSONB`;
    await client`ALTER TABLE trucks ADD COLUMN IF NOT EXISTS delivery_address JSONB`;

    isNeonConnected = true;
    console.log('[Neon DB] PostgreSQL tables (listings, inquiries, messages, sales_orders, users, trucks) verified/created successfully!');
    return true;
  } catch (err) {
    console.error('[Neon DB] Table initialization error:', err.message);
    return false;
  }
}

/**
 * Execute custom SQL query against Neon DB
 */
export async function queryNeon(text, params = []) {
  const p = getNeonPool();
  if (p) {
    const res = await p.query(text, params);
    return res.rows;
  }
  return null;
}

export function checkIsNeonConnected() {
  return !!getNeonClient();
}

export { isNeonConnected };
