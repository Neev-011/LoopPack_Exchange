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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 3. Users Table
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

    isNeonConnected = true;
    console.log('[Neon DB] PostgreSQL tables (listings, inquiries, users) verified/created successfully!');
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
