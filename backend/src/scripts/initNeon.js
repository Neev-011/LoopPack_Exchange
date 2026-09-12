import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { neon } from '@neondatabase/serverless';
import fs from 'fs';

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to Neon PostgreSQL Database...');
  const sql = neon(dbUrl);

  // 1. Create Tables
  console.log('Creating PostgreSQL tables: listings, inquiries, users...');
  
  await sql`
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

  await sql`
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

  await sql`
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
  await sql`
    CREATE TABLE IF NOT EXISTS completed_exchanges (
      id VARCHAR(80) PRIMARY KEY,
      listing_id VARCHAR(64) NOT NULL,
      listing_title VARCHAR(255),
      material_type VARCHAR(50) NOT NULL,
      quantity NUMERIC NOT NULL,
      unit VARCHAR(50),
      grade VARCHAR(10),
      distance_km NUMERIC DEFAULT 10,
      buyer_username VARCHAR(100),
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE`;

  await sql`
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

  console.log('✅ Neon PostgreSQL table schemas created successfully!');

  // Seed Users if empty
  const userCount = await sql`SELECT COUNT(*) FROM users`;
  if (parseInt(userCount[0].count, 10) === 0) {
    console.log('Seeding initial demo users into Neon database...');
    const usersFile = path.join(__dirname, '../../data/users.json');
    if (fs.existsSync(usersFile)) {
      const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
      for (const u of usersData) {
        await sql`
          INSERT INTO users (id, username, company_name, email, password, role, role_label, industry, security_question, security_answer, created_at)
          VALUES (
            ${u.id}, ${u.username}, ${u.companyName}, ${u.email}, ${u.password},
            ${u.role || 'supplier'}, ${u.roleLabel || 'B2B Partner'}, ${u.industry || 'Packaging'},
            ${u.securityQuestion || ''}, ${u.securityAnswer || ''}, ${u.createdAt || new Date().toISOString()}
          )
          ON CONFLICT (username) DO NOTHING
        `;
      }
      console.log(`✅ Migrated ${usersData.length} users into Neon Postgres!`);
    }
  }

  // Seed Listings if empty
  const listingCount = await sql`SELECT COUNT(*) FROM listings`;
  if (parseInt(listingCount[0].count, 10) === 0) {
    console.log('Seeding initial material listings into Neon database...');
    const dbFile = path.join(__dirname, '../../data/db.json');
    if (fs.existsSync(dbFile)) {
      const listingsData = JSON.parse(fs.readFileSync(dbFile, 'utf8') || '[]');
      for (const l of listingsData) {
        await sql`
          INSERT INTO listings (id, title, material_type, quantity, unit, grade, location, lat, lon, price, is_free, description, image, created_by, company_name, owner_role, created_at)
          VALUES (
            ${String(l.id)}, ${l.title}, ${l.materialType}, ${l.quantity}, ${l.unit}, ${l.grade},
            ${l.location}, ${l.lat}, ${l.lon}, ${l.price}, ${l.isFree}, ${l.description},
            ${l.image}, ${l.createdBy}, ${l.companyName}, ${l.ownerRole || 'Supplier'}, ${l.createdAt || new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`✅ Migrated ${listingsData.length} material listings into Neon Postgres!`);
    }
  }

  const inquiriesFile = path.join(__dirname, '../../data/inquiries.json');
  if (fs.existsSync(inquiriesFile)) {
    const inquiriesData = JSON.parse(fs.readFileSync(inquiriesFile, 'utf8') || '[]');
    for (const item of inquiriesData) {
      await sql`
        INSERT INTO inquiries (id, listing_id, listing_title, buyer_id, buyer_username, buyer_company, seller_username, message, quantity, status, created_at, updated_at)
        VALUES (${item.id}, ${String(item.listingId)}, ${item.listingTitle || ''}, ${item.buyerId}, ${item.buyerUsername},
          ${item.buyerCompanyName || ''}, ${item.sellerUsername}, ${item.message || ''}, ${item.quantity || 0},
          ${item.status || 'new'}, ${item.createdAt || new Date().toISOString()}, ${item.updatedAt || null})
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
      `;
    }
    console.log(`Migrated ${inquiriesData.length} inquiries into Neon Postgres.`);
  }

  const messagesFile = path.join(__dirname, '../../data/messages.json');
  if (fs.existsSync(messagesFile)) {
    const messagesData = JSON.parse(fs.readFileSync(messagesFile, 'utf8') || '[]');
    for (const item of messagesData) {
      await sql`
        INSERT INTO messages (id, inquiry_id, sender_id, sender_username, sender_company, body, created_at)
        VALUES (${item.id}, ${item.inquiryId}, ${item.senderId}, ${item.senderUsername}, ${item.senderCompanyName || ''}, ${item.body}, ${item.createdAt || new Date().toISOString()})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`Migrated ${messagesData.length} messages into Neon Postgres.`);
  }

  // Verification
  const tables = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `;
  console.log('Tables present in Neon Database:', tables.map(t => t.table_name));

  const totalListings = await sql`SELECT COUNT(*) FROM listings`;
  const totalUsers = await sql`SELECT COUNT(*) FROM users`;
  console.log(`Total listings in Neon: ${totalListings[0].count}`);
  console.log(`Total users in Neon: ${totalUsers[0].count}`);
}

main().catch(err => {
  console.error('Neon initialization failed:', err);
  process.exit(1);
});
