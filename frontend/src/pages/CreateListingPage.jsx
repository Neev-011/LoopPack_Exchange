import React, { useState } from 'react';
import MaterialScanner from '../components/ai-grader/MaterialScanner';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';
import { PlusCircle, MapPin, CheckCircle, Leaf, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api/v1';

export default function CreateListingPage({ setActiveTab }) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [materialType, setMaterialType] = useState('cardboard');
  const [quantity, setQuantity] = useState(300);
  const [unit, setUnit] = useState('boxes');
  const [grade, setGrade] = useState('A');
  const [price, setPrice] = useState(12);
  const [location, setLocation] = useState('Warehouse District, Sector 4');
  const [description, setDescription] = useState('');
  const [scannedImage, setScannedImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const carbon = calculateAvoidedCarbon(materialType, quantity, 15, grade);

  const handleAIScanResult = (res) => {
    if (res.isPackaging === false) {
      setScannedImage(null);
      setMaterialType('cardboard');
      setGrade('A');
      setErrorMsg('Uploaded photo was rejected as non-packaging. Please upload a valid packaging photo.');
      return;
    }
    setErrorMsg(null);
    if (res.image) setScannedImage(res.image);
    if (res.detectedType) setMaterialType(res.detectedType);
    if (res.suggestedGrade) setGrade(res.suggestedGrade);
    if (res.materialName && !title) setTitle(`100x ${res.materialName}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Please sign in before posting a material so buyers can contact you and you can manage inquiries.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      title: title || `${quantity}x ${materialType.toUpperCase()} Circular Packaging Lot`,
      materialType,
      quantity: Number(quantity),
      unit: unit || (materialType === 'pallet' ? 'pallets' : materialType === 'hdpe' ? 'drums' : materialType === 'ldpe' ? 'kg' : 'boxes'),
      grade,
      price: Number(price),
      location,
      lat: 19.08,
      lon: 72.88,
      description: description || `Verified Grade ${grade} ${materialType} circular scrap lot ready for B2B pickup.`,
      image: scannedImage,
      createdBy: currentUser?.username,
      companyName: currentUser?.companyName,
      ownerRole: currentUser?.roleLabel,
      createdByEmail: currentUser?.email || 'contact@looppack.io',
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      console.log('Listing created on backend API:', data);

      setLoading(false);
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
        if (setActiveTab) setActiveTab('marketplace');
      }, 1800);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Could not save this listing. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800', marginBottom: '8px' }}>
        Post Material to Geo-Marketplace
      </h2>
      <p style={{ color: '#64748B', marginBottom: '24px' }}>
        Convert commercial packaging waste into verified B2B secondary inventory saved directly to database.
      </p>

      {/* AI Scanner Module */}
      <div style={{ marginBottom: '32px' }}>
        <MaterialScanner onScanned={handleAIScanResult} />
      </div>

      {submitted && (
        <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', padding: '16px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={22} color="#10B981" />
          <div>
            <strong style={{ fontSize: '1.05rem' }}>Listing Saved & Indexed in Central Database!</strong>
            <p style={{ fontSize: '0.88rem', margin: 0 }}>Now live on the B2B Geo-Proximity Marketplace for all connected users.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '14px', borderRadius: '10px', marginBottom: '24px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Listing Title</label>
          <input
            type="text"
            placeholder="e.g. 500x Standard Heavy-Duty Corrugated Boxes"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Packaging Material Type</label>
            <select
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
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
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="A">Grade A — Clean / Direct Reuse</option>
              <option value="B">Grade B — Light Wear / Refurbish</option>
              <option value="C">Grade C — Recycling Shredding Stream</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Quantity</label>
            <input
              type="number"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Unit</label>
            <input
              type="text"
              placeholder="boxes / pallets / kg"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Asking Price (₹ / unit)</label>
            <input
              type="number"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Warehouse Pickup Location</label>
          <input
            type="text"
            placeholder="e.g. Warehouse District, Sector 4, Mumbai"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Lot Description & Notes</label>
          <textarea
            rows="3"
            placeholder="Describe packaging condition, pallet dimensions, fluting, or access hours for pickup trucks..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1.05rem', boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Saving Material to Database...
            </>
          ) : (
            <>
              <PlusCircle size={20} /> Post Material to Central Database
            </>
          )}
        </button>
      </form>
    </div>
  );
}
