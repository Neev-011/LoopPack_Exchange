# LoopPack Exchange

> **B2B Circular Packaging & Materials Exchange Platform with Eco-Logistics & Embodied Carbon Tracking**  
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
**LoopPack Exchange** transforms commercial packaging waste (cardboard, pallets, plastic drums, shrink wraps) from a costly disposal burden into a high-value secondary resource.

- 🌿 **AI-Assisted Material Listing & Grading:** Computer vision & quality grading (Grade A/B/C).
- 📍 **B2B Geo-Proximity Marketplace:** PostGIS spatial indexing matching local buyers & sellers.
- 🚛 **Eco-Routed Logistics & Backhaul Optimization:** Minimizing empty freight returns & pickup fuel usage.
- 📊 **Real-Time Embodied Carbon & ESG Engine:** ISO 14044 LCA compliant CO₂e savings & Scope 3 certificates.

---

## 📐 Carbon Accounting Formula
$$\text{Net CO}_2\text{e Avoided} = E_{\text{virgin}} - (E_{\text{reprocessing}} + E_{\text{transport}})$$

---

## 🛠️ Repository Structure

```
LoopPack_Exchange/
├── docs/                              # HackOut'26 Report & Specifications
│   ├── HACKOUT_REPORT.html            # Complete standalone HTML report
│   └── HACKOUT_REPORT.md              # Markdown report & specs
├── frontend/                          # React + Vite B2B Web Portal
│   ├── index.html
│   ├── src/
│   │   ├── components/                # Marketplace, AI Scanner, Logistics & Carbon components
│   │   ├── pages/                     # Landing, Marketplace, Create Listing, Logistics & Carbon pages
│   │   ├── utils/                     # Carbon Engine math & spatial calculations
│   │   └── App.jsx
├── backend/                           # Node.js + Express API Gateway
│   ├── index.js
│   └── src/
│       ├── controllers/               # Route logic
│       ├── services/                  # Carbon engine, Spatial Matcher, VRP solver bridge
│       └── routes/                    # API endpoints
└── scripts/                           # Mock seed data & testing scripts
    └── seed_data.js
```

---

## ⚙️ Quick Start

### 1. Run Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### 2. Run Backend (Node.js API)
```bash
cd backend
npm install
npm run dev
```

---

## 📄 Documentation
For detailed system specs, stakeholder matrices, technical flowcharts, and Life Cycle Assessment (LCA) parameters, refer to [docs/HACKOUT_REPORT.md](docs/HACKOUT_REPORT.md) or open [docs/HACKOUT_REPORT.html](docs/HACKOUT_REPORT.html) in your browser.