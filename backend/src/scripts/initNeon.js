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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

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
