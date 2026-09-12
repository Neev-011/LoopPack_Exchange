import React, { useState } from 'react';
import MaterialScanner from '../components/ai-grader/MaterialScanner';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';
import { PlusCircle, MapPin, CheckCircle, Leaf, Loader2, RefreshCw, Sparkles, UserCheck } from 'lucide-react';
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
  const [aiVerified, setAiVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const carbon = calculateAvoidedCarbon(materialType, quantity, 15, grade);

  const handleAIScanResult = (res) => {
    if (!res || res.isPackaging === false) {
      if (res && res.image) setScannedImage(res.image);
      setAiVerified(false);
      setErrorMsg('Uploaded photo was not verified as packaging by AI Vision. Flagged as Seller Direct Post.');
      return;
    }
    setErrorMsg(null);
    setAiVerified(true);
    if (res.image) setScannedImage(res.image);
    if (res.detectedType) setMaterialType(res.detectedType);
    if (res.suggestedGrade) setGrade(res.suggestedGrade);
    if (res.materialName && !title) setTitle(`100x ${res.materialName}`);
  };

  const handleDirectPhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setScannedImage(event.target.result);
      setAiVerified(false);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Please sign in before posting a material so buyers can contact you and you can manage inquiries.');
      return;
    }
    if (!['supplier', 'buyer'].includes(currentUser.role)) {
      setErrorMsg('Only Buyer / Seller Organization accounts can post materials.');
      return;
    }
    const cleanQuantity = Math.max(1, Number(quantity) || 1);
    const cleanPrice = Math.max(0, Number(price) || 0);

    if (cleanQuantity <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      title: title || `${cleanQuantity}x ${materialType.toUpperCase()} Circular Packaging Lot`,
      materialType,
      quantity: cleanQuantity,
      unit: unit || (materialType === 'pallet' ? 'pallets' : materialType === 'hdpe' ? 'drums' : materialType === 'ldpe' ? 'kg' : 'boxes'),
      grade,
      price: cleanPrice,
      location,
      lat: 19.08,
      lon: 72.88,
      description: description || `Verified Grade ${grade} ${materialType} circular scrap lot ready for B2B pickup.`,
      image: scannedImage,
      createdBy: currentUser?.username,
      role: currentUser?.role,
      companyName: currentUser?.companyName,
      ownerRole: currentUser?.roleLabel,
      createdByEmail: currentUser?.email || 'contact@looppack.io',
      createdAt: new Date().toISOString(),
      aiVerified: Boolean(aiVerified),
      verificationStatus: aiVerified ? 'AI Verified' : 'Seller Direct'
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

      {/* Verification Status Indicator Banner */}
      <div style={{
        padding: '14px 18px',
        borderRadius: '10px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: aiVerified ? '#ECFDF5' : '#FEF3C7',
        border: aiVerified ? '1px solid #A7F3D0' : '1px solid #FCD34D',
        color: aiVerified ? '#047857' : '#92400E'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {aiVerified ? <Sparkles size={22} color="#059669" /> : <UserCheck size={22} color="#D97706" />}
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.94rem' }}>
              {aiVerified ? '✨ Category & Grade Verified by AI Scanner' : '👤 Direct Seller Listing (Unverified AI)'}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              {aiVerified
                ? 'Material type and quality grade were automatically analyzed and verified via vision AI scanner.'
                : 'This item will be flagged as "Seller Direct Post" on the marketplace unless verified with the AI scanner above.'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAiVerified(!aiVerified)}
          style={{
            fontSize: '0.76rem',
            fontWeight: '800',
            padding: '5px 12px',
            borderRadius: '6px',
            background: aiVerified ? '#D1FAE5' : '#FFFBEB',
            border: aiVerified ? '1px solid #6EE7B7' : '1px solid #FDE68A',
            color: aiVerified ? '#065F46' : '#B45309',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to toggle between AI Verified and Seller Direct status"
        >
          {aiVerified ? '✨ AI Verified' : '👤 Seller Direct'}
        </button>
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
        {/* Item Photo Upload & Preview Section */}
        <div style={{ marginBottom: '24px', background: '#F8FAFC', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <label style={{ display: 'block', fontWeight: '700', fontSize: '0.92rem', color: '#0F172A', marginBottom: '4px' }}>
            📷 Material Item Photo
          </label>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '12px' }}>
            {scannedImage
              ? 'Photo attached to listing. You can change or replace it below.'
              : 'Upload a custom photo of your material to display on the marketplace (or use the AI Vision Scanner above).'}
          </p>

          {scannedImage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CBD5E1', flexShrink: 0 }}>
                <img src={scannedImage} alt="Uploaded packaging" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  color: aiVerified ? '#047857' : '#92400E',
                  background: aiVerified ? '#ECFDF5' : '#FEF3C7',
                  border: aiVerified ? '1px solid #A7F3D0' : '1px solid #FCD34D',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  {aiVerified ? <Sparkles size={14} color="#059669" /> : <UserCheck size={14} color="#D97706" />}
                  {aiVerified ? 'Photo & Category Verified by AI Vision' : 'Seller Direct Custom Photo'}
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={12} /> Replace Photo
                    <input type="file" accept="image/*" onChange={handleDirectPhotoUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleDirectPhotoUpload}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px dashed #CBD5E1',
                  background: 'white',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
        </div>

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

        <div className="responsive-grid-2" style={{ marginBottom: '20px' }}>
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

        <div className="responsive-grid-3" style={{ marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>Quantity</label>
            <input
              type="number"
              min="1"
              step="1"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={quantity}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setQuantity(val);
              }}
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
              min="0"
              step="1"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
              value={price}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                setPrice(val);
              }}
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
