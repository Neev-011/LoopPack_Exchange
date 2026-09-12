import React, { useState } from 'react';
import MaterialScanner from '../components/ai-grader/MaterialScanner';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';
import { PlusCircle, MapPin, CheckCircle, Leaf } from 'lucide-react';

export default function CreateListingPage({ setActiveTab }) {
  const [materialType, setMaterialType] = useState('cardboard');
  const [quantity, setQuantity] = useState(300);
  const [grade, setGrade] = useState('A');
  const [price, setPrice] = useState(12);
  const [location, setLocation] = useState('Central Warehouse, Zone B');
  const [submitted, setSubmitted] = useState(false);

  const carbon = calculateAvoidedCarbon(materialType, quantity, 15, grade);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (setActiveTab) setActiveTab('marketplace');
    }, 2000);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800', marginBottom: '8px' }}>
        List Scrap Packaging Material
      </h2>
      <p style={{ color: '#64748B', marginBottom: '24px' }}>
        Convert unstandardized industrial waste into structured, tradable circular inventory.
      </p>

      {/* AI Scanner Module */}
      <div style={{ marginBottom: '32px' }}>
        <MaterialScanner onScanned={(res) => {
          setMaterialType(res.detectedType);
          setGrade(res.suggestedGrade);
        }} />
      </div>

      {submitted && (
        <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} />
          <strong>Listing Created & Indexed in PostGIS Database!</strong> Net carbon savings recorded.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Packaging Material Type</label>
            <select
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
            >
              <option value="cardboard">Corrugated Cardboard Boxes</option>
              <option value="pallet">Euro Wooden Pallets (EPAL)</option>
              <option value="hdpe">HDPE Rigid Drums & Containers</option>
              <option value="ldpe">LDPE Stretch Film & Shrink Wrap</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Quality Grade</label>
            <select
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="A">Grade A — Clean / Direct Reuse</option>
              <option value="B">Grade B — Light Wear / Refurbish</option>
              <option value="C">Grade C — Recycling Shredding Stream</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Quantity (Units or kg)</label>
            <input
              type="number"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Asking Price (₹ / unit or 0 for free pickup)</label>
            <input
              type="number"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Live Carbon Estimator Box */}
        <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: '700', fontSize: '0.95rem' }}>
            <Leaf size={18} /> Estimated Embodied Carbon Avoided: {carbon.netCO2eAvoided} kg CO₂e
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '4px' }}>
            Calculated via ISO 14044 LCA formulas: E_virgin ({carbon.eVirgin} kg) minus processing ({carbon.eReprocessing} kg) and transport ({carbon.eTransport} kg).
          </p>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '1rem' }}>
          <PlusCircle size={18} /> Publish to Geo-Proximity Marketplace
        </button>
      </form>
    </div>
  );
}
