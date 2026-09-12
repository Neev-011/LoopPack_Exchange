# LoopPack Exchange

> **B2B Circular Packaging & Materials Exchange Platform with Eco-Logistics, AI Material Recognition & Embodied Carbon Tracking**  
> *Developed for HackOut'26 — Theme: Circular Carbon Ecosystem*

---

## 👥 Team Details
- **Team Name:** Team one
- **Team Members:**
  - **Jeel Aghera** (Leader)
  - **Neev Katharotiya**
  - **Kashyap Saniyara**
  - **Tatsav Gangani**

---

## 🚀 Overview & Key Features

**LoopPack Exchange** transforms commercial packaging waste (cardboard boxes, wooden pallets, HDPE plastic drums, LDPE stretch wraps) from a costly disposal burden into high-value circular assets.

- 🌿 **AI-Powered Vision Material Scanner:** Powered by Google Gemini Vision AI (`gemini-3.6-flash`). Scans packaging photos in real-time, detects material type, estimates volume & grade (A/B/C), draws AI bounding boxes, and blocks non-packaging spam uploads.
- 🐘 **Neon Serverless PostgreSQL Database:** Enterprise cloud database persistence using `@neondatabase/serverless` and `pg`. Automatically initializes SQL schemas (`listings`, `inquiries`, `users`) with seamless persistent JSON fallback.
- 📍 **B2B Geo-Proximity Marketplace:** PostGIS-inspired spatial indexing that matches local industrial buyers & sellers within customizable search radii.
- 🚛 **Eco-Routed Logistics & Backhaul Optimization:** Vehicle Routing Problem (VRP) solver bridge minimizing empty freight return trips and transport fuel emissions.
- 📊 **Real-Time Embodied Carbon & ESG Engine:** ISO 14044 LCA compliant CO₂e calculation engine with instant ISO-format Scope 3 Audit PDF Certificate export.
- 💼 **Enterprise Account Hub & Inquiries:** Sleek enterprise navigation dropdown for managing owned material listings, buyer/seller inquiries, profile credentials, and security settings.

---

## 📐 Carbon Accounting Formula

$$\text{Net CO}_2\text{e Avoided} = E_{\text{virgin}} - (E_{\text{reprocessing}} + E_{\text{transport}})$$

Where:
- $E_{\text{virgin}}$: Emissions from producing new virgin material.
- $E_{\text{reprocessing}}$: Energy consumed during sorting, washing, and re-conditioning.
- $E_{\text{transport}}$: Transport emissions based on haulage distance and logistics mode.

---

## 🛠️ Repository Structure

```
LoopPack_Exchange/
├── docs/                              # HackOut'26 Report & Technical Specifications
│   ├── HACKOUT_REPORT.html            # Complete standalone HTML report
│   └── HACKOUT_REPORT.md              # Markdown report & specs
├── frontend/                          # React + Vite B2B Web Portal
│   ├── index.html
│   ├── src/
│   │   ├── components/                # Marketplace, AI Scanner, Logistics, Account & Carbon components
│   │   ├── pages/                     # Landing, Marketplace, Create Listing, Carbon Dashboard, Account Hub
│   │   ├── utils/                     # Carbon Engine math, ISO PDF Certificate exporter & spatial calculations
│   │   └── App.jsx
├── backend/                           # Node.js + Express API Gateway
│   ├── index.js                       # Server entry point with dotenv loading & Neon DB initialization
│   ├── .env                           # Environment secrets (GEMINI_API_KEY, DATABASE_URL)
│   └── src/
│       ├── config/                    # Neon PostgreSQL database setup & schema initialization (neonDb.js)
│       ├── controllers/               # API Controllers
│       ├── services/                  # AI Scanner, Carbon engine, Auth & Engagement services
│       └── scripts/                   # DB seed & migration tool (initNeon.js)
└── data/                              # Local JSON database fallback (db.json, users.json, inquiries.json)
```

---

## ⚙️ Quick Start

### 1. Environment Setup (`backend/.env`)

Create or update `backend/.env` with your API credentials:

```env
# Gemini Vision AI API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Neon Serverless PostgreSQL Connection String
DATABASE_URL=postgresql://neondb_owner:password@ep-shiny-haze-aye60at3-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 2. Run Backend (Node.js API)

```bash
cd backend
npm install

# (Optional) Seed Neon DB tables with initial data
node src/scripts/initNeon.js

# Start Express server (runs on http://localhost:5001)
npm run dev
```

### 3. Run Frontend (React + Vite)

```bash
cd frontend
npm install

# Start Vite dev server (runs on http://localhost:3000)
npm run dev
```

---

## 🐘 Neon Database Integration

The backend supports **Neon Serverless PostgreSQL**. When `DATABASE_URL` is set in `backend/.env`:
1. On server startup, `initNeonTables()` automatically creates required PostgreSQL schemas (`listings`, `inquiries`, `users`).
2. Material listings posted or deleted in the app automatically sync with your live Neon PostgreSQL database.
3. If `DATABASE_URL` is omitted, the application operates cleanly using local persistent JSON files (`backend/data/db.json`).

---

## 📄 Documentation

For detailed system specifications, stakeholder matrices, technical flowcharts, and Life Cycle Assessment (LCA) parameters, refer to [docs/HACKOUT_REPORT.md](docs/HACKOUT_REPORT.md) or open [docs/HACKOUT_REPORT.html](docs/HACKOUT_REPORT.html) in your browser.