import React from 'react';
import { RefreshCw, ShieldCheck, Route, Leaf, Store, ArrowRight, Zap, Award, CheckCircle } from 'lucide-react';

export default function LandingPage({ setActiveTab }) {
  return (
    <div>
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-badge">
          <Award size={14} /> HackOut'26 Ideation Round Project • Theme: Circular Carbon Ecosystem
        </div>
        <h1 className="hero-title">
          Turn B2B Packaging Waste into <span>High-Value Circular Assets</span>
        </h1>
        <p className="hero-desc">
          Bridge the disconnect between packaging waste generators and material buyers. Powered by AI material grading, PostGIS spatial search, eco-routed backhauls, and ISO 14044 LCA embodied carbon accounting.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }} onClick={() => setActiveTab('marketplace')}>
            <Store size={18} /> Explore Geo-Marketplace
          </button>
          <button className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }} onClick={() => setActiveTab('carbon')}>
            <Leaf size={18} /> View Carbon ESG Engine
          </button>
        </div>
      </div>

      {/* Key Metrics / Highlights */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <RefreshCw size={24} />
          </div>
          <div>
            <div className="stat-value">40%+</div>
            <div className="stat-label">Commercial Waste Diverted</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Leaf size={24} />
          </div>
          <div>
            <div className="stat-value">3.2 Tons</div>
            <div className="stat-label">CO₂e Avoided per Trade</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Route size={24} />
          </div>
          <div>
            <div className="stat-value">35–60%</div>
            <div className="stat-label">Procurement Cost Savings</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="stat-value">ISO 14044</div>
            <div className="stat-label">LCA ESG Certified</div>
          </div>
        </div>
      </div>

      {/* 4 Core Modules */}
      <h2 style={{ fontSize: '1.8rem', color: '#0F172A', marginBottom: '24px', fontWeight: '800' }}>
        Key Platform Modules
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ width: '40px', height: '40px', background: '#ECFDF5', color: '#10B981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Zap size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#0F172A' }}>Module 1: AI Material Grading</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Computer vision photo scanner classifies packaging types (Cardboard, Euro-Pallets, HDPE, LDPE) and assesses quality (Grade A, B, C).
          </p>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ width: '40px', height: '40px', background: '#ECFDF5', color: '#10B981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Store size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#0F172A' }}>Module 2: PostGIS Geo-Marketplace</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Real-time proximity matchmaking connecting warehouses with local recyclers, manufacturers, and SMEs to eliminate long transport legs.
          </p>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ width: '40px', height: '40px', background: '#ECFDF5', color: '#10B981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Route size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#0F172A' }}>Module 3: Eco Backhaul Logistics</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Monetize empty return trips for freight carriers using Vehicle Routing Problem (VRP) algorithms to group multi-stop pickups.
          </p>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ width: '40px', height: '40px', background: '#ECFDF5', color: '#10B981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Leaf size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#0F172A' }}>Module 4: Embodied Carbon Engine</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Mathematical engine based on EPA WARM & Ecoinvent LCA factors. Generates downloadable Scope 3 ESG certificates.
          </p>
        </div>
      </div>
    </div>
  );
}
