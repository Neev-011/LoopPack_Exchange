import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin, Package, ShieldCheck, Leaf, ArrowRight, Truck,
  CheckCircle, RefreshCw, Check, X, Building2, Calendar, FileText, Info, Award, DollarSign, MessageSquare
} from 'lucide-react';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api/v1';

const MOCK_FALLBACK_LISTINGS = [
  {
    id: 1,
    title: '500x Standard Heavy-Duty Corrugated Boxes',
    materialType: 'cardboard',
    quantity: 500,
    unit: 'boxes',
    grade: 'A',
    location: 'Warehouse District, Sector 4, Mumbai',
    distanceKm: 4.2,
    price: 15,
    isFree: false,
    description: 'Once-used heavy duty 5-ply shipping boxes from electronics imports. Clean condition, zero oil or moisture damage.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 2,
    title: '120x Heavy Wooden Euro Pallets (EPAL-1)',
    materialType: 'pallet',
    quantity: 120,
    unit: 'pallets',
    grade: 'A',
    location: 'Logistics Park, Hub 2, Thane',
    distanceKm: 8.5,
    price: 250,
    isFree: false,
    description: 'Heat-treated ISPM 15 compliant Euro pallets. Suitable for high-density rack storage and international freight.',
    image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 3,
    title: '800kg LDPE Commercial Stretch Wrap Scrap',
    materialType: 'ldpe',
    quantity: 800,
    unit: 'kg',
    grade: 'B',
    location: 'Retail Distribution Hub, Navi Mumbai',
    distanceKm: 12.0,
    price: 0,
    isFree: true,
    description: 'Clear pallet stretch wrap baled into 100kg bales. Free pickup offered for instant clearance.',
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 4,
    title: '45x HDPE 200L Industrial Chemical Drums',
    materialType: 'hdpe',
    quantity: 45,
    unit: 'drums',
    grade: 'B',
    location: 'Chemical Industrial Zone, Taloja',
    distanceKm: 18.3,
    price: 450,
    isFree: false,
    description: 'Triple-rinsed food grade high-density polyethylene blue drums with tight head caps.',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
  }
];

function normalizeListing(listing) {
  return {
    ...listing,
    createdBy: listing.createdBy || 'marketplace_supplier',
    companyName: listing.companyName || 'Marketplace Supplier'
  };
}

export default function MarketplacePage() {
  const { currentUser } = useAuth();
  const [dbListings, setDbListings] = useState(() => MOCK_FALLBACK_LISTINGS.map(normalizeListing));
  const [filterType, setFilterType] = useState('all');
  const [maxRadius, setMaxRadius] = useState(25);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [claimedItem, setClaimedItem] = useState(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [reserving, setReserving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const isOwnListing = selectedProduct
    && currentUser?.username
    && selectedProduct.createdBy === currentUser.username;

  useEffect(() => {
    setInquiryMessage('');
    setInquirySent(false);
  }, [selectedProduct?.id]);

  // Fetch live database listings from Neon PostgreSQL
  const fetchListings = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/listings`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setDbListings(json.data.map(normalizeListing));
        }
      }
    } catch (err) {
      console.warn('Backend fetch offline, showing local listings:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const filteredListings = useMemo(() => {
    return dbListings.filter(item => {
      const matchType = filterType === 'all' || item.materialType === filterType;
      const matchRadius = (item.distanceKm || 5) <= maxRadius;
      return matchType && matchRadius;
    });
  }, [dbListings, filterType, maxRadius]);

  const handleConfirmReserve = async (item) => {
    if (!currentUser) {
      setClaimedItem({ title: 'Please sign in before completing an exchange.', location: 'B2B Account' });
      return;
    }
    setReserving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/exchanges/completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing: item, username: currentUser?.username || null })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not complete this exchange.');
      setSelectedProduct(null);
      setClaimedItem(item);
      setTimeout(() => setClaimedItem(null), 3500);
    } catch (error) {
      setClaimedItem({ title: error.message, location: 'Exchange' });
    } finally {
      setReserving(false);
    }
  };

  const sendInquiry = async () => {
    if (!currentUser) {
      setClaimedItem({ title: 'Please sign in before contacting a seller.', location: 'B2B Account' });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing: selectedProduct,
          userId: currentUser.id,
          username: currentUser.username,
          companyName: currentUser.companyName,
          message: inquiryMessage,
          quantity: selectedProduct.quantity
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send inquiry.');
      setInquirySent(true);
      setInquiryMessage('');
    } catch (error) {
      setClaimedItem({ title: error.message, location: 'Inquiry' });
    }
  };

  return (
    <div>
      {/* Clean Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800' }}>
            Geo-Proximity B2B Marketplace 📍
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
            Click any product card to view full specifications, photos, and reserve pickup.
          </p>
        </div>

        {/* Search Radius Slider */}
        <div style={{
          background: 'white',
          padding: '10px 18px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
              Distance Radius: <strong style={{ color: '#0F5132' }}>{maxRadius} km</strong>
            </span>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxRadius}
              onChange={(e) => setMaxRadius(Number(e.target.value))}
              style={{ width: '120px', accentColor: '#10B981', cursor: 'pointer' }}
            />
          </div>
        </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          className={`btn-secondary ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
          style={{ background: filterType === 'all' ? '#0F5132' : 'white', color: filterType === 'all' ? 'white' : '#475569' }}
        >
          All Materials ({dbListings.length})
        </button>
        <button
          className={`btn-secondary ${filterType === 'cardboard' ? 'active' : ''}`}
          onClick={() => setFilterType('cardboard')}
          style={{ background: filterType === 'cardboard' ? '#0F5132' : 'white', color: filterType === 'cardboard' ? 'white' : '#475569' }}
        >
          📦 Cardboard
        </button>
        <button
          className={`btn-secondary ${filterType === 'pallet' ? 'active' : ''}`}
          onClick={() => setFilterType('pallet')}
          style={{ background: filterType === 'pallet' ? '#0F5132' : 'white', color: filterType === 'pallet' ? 'white' : '#475569' }}
        >
          🪵 Wooden Pallets
        </button>
        <button
          className={`btn-secondary ${filterType === 'hdpe' ? 'active' : ''}`}
          onClick={() => setFilterType('hdpe')}
          style={{ background: filterType === 'hdpe' ? '#0F5132' : 'white', color: filterType === 'hdpe' ? 'white' : '#475569' }}
        >
          🛢️ HDPE Drums
        </button>
        <button
          className={`btn-secondary ${filterType === 'ldpe' ? 'active' : ''}`}
          onClick={() => setFilterType('ldpe')}
          style={{ background: filterType === 'ldpe' ? '#0F5132' : 'white', color: filterType === 'ldpe' ? 'white' : '#475569' }}
        >
          🌀 LDPE Stretch Wrap
        </button>
      </div>

      {/* Reservation Confirmation Banner */}
      {claimedItem && (
        <div style={{
          background: '#0F5132',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 6px 20px rgba(15,81,50,0.25)'
        }}>
          <CheckCircle size={22} color="#34D399" />
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>Pickup Order Reserved!</div>
            <div style={{ fontSize: '0.85rem', color: '#A7F3D0' }}>
              Backhaul truck assigned to {claimedItem.location} for {claimedItem.title}.
            </div>
          </div>
        </div>
      )}

      {/* Full Width Material Cards Grid */}
      {filteredListings.length === 0 ? (
        <div style={{ background: 'white', padding: '48px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <Package size={44} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.15rem', color: '#0F172A', marginBottom: '6px' }}>No packaging lots within {maxRadius} km</h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Try expanding the distance radius slider above.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredListings.map(item => {
            const carbon = calculateAvoidedCarbon(item.materialType || 'cardboard', item.quantity || 100, item.distanceKm || 5, item.grade || 'A');

            return (
              <div
                key={item.id}
                className="item-card"
                onClick={() => setSelectedProduct(item)}
                style={{ cursor: 'pointer' }}
              >
                {/* Uploaded Product Photo */}
                <div className="card-header-img">
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className={`card-badge grade-badge-${(item.grade || 'A').toLowerCase()}`}>
                    Grade {item.grade || 'A'} • {item.grade === 'A' ? 'Direct Reuse' : 'Recycle Ready'}
                  </div>
                </div>

                {/* Useful Product Information */}
                <div className="card-body">
                  <div className="card-title">{item.title}</div>
                  <div className="card-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="#10B981" /> {item.distanceKm || 5} km away ({item.location || 'Warehouse Zone'})
                    </span>
                  </div>

                  {/* Seller & Listing Date Metadata */}
                  <div style={{ fontSize: '0.82rem', color: '#64748B', margin: '6px 0 10px', display: 'flex', flexDirection: 'column', gap: '3px', background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                    <span style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Building2 size={13} color="#3B82F6" /> {item.companyName || 'B2B Partner'} <span style={{ color: '#059669', fontWeight: '600' }}>(@{item.createdBy})</span>
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: '#2563EB', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✉️ {item.createdByEmail || `contact@${item.createdBy}.com`}
                      </span>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '12px' }}>
                    <strong>Quantity:</strong> {item.quantity} {item.unit || 'units'}
                  </div>

                  {/* Avoided Carbon Tag */}
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.82rem', color: '#047857' }}>
                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Leaf size={14} /> Avoided Carbon: {carbon.netCO2eAvoided} kg CO₂e
                    </div>
                  </div>

                  <div className="card-footer">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '600' }}>
                        {item.isFree || item.price === 0 ? 'Zero-Cost Clearance' : 'Asking Price'}
                      </div>
                      <div className="card-price">
                        {item.isFree || item.price === 0 ? 'FREE' : `₹${item.price} / ${item.unit || 'unit'}`}
                      </div>
                    </div>

                    <button
                      className="btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(item);
                      }}
                    >
                      View Details & Reserve <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED PRODUCT SPECIFICATION & B2B CLAIM MODAL */}
      {selectedProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={() => setSelectedProduct(null)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            border: '1px solid #E2E8F0'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Media */}
            <div style={{ position: 'relative', height: '260px', background: '#0F172A' }}>
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>

              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: selectedProduct.grade === 'A' ? '#059669' : '#D97706',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '800'
              }}>
                Grade {selectedProduct.grade || 'A'} Verified • {selectedProduct.grade === 'A' ? 'Direct B2B Reuse' : 'Recycling Stream'}
              </div>
            </div>

            {/* Modal Body Specs */}
            <div style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                {selectedProduct.title}
              </h3>

              <div style={{ display: 'flex', gap: '16px', color: '#64748B', fontSize: '0.9rem', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={16} color="#10B981" /> {selectedProduct.distanceKm || 5} km away ({selectedProduct.location})
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={16} color="#3B82F6" /> {selectedProduct.quantity} {selectedProduct.unit || 'units'}
                </span>
              </div>

              {/* Price & Value Highlight Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Asking Price</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F5132' }}>
                    {selectedProduct.isFree || selectedProduct.price === 0 ? 'FREE CLEARANCE' : `₹${selectedProduct.price} / ${selectedProduct.unit || 'unit'}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Total Lot Price</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A' }}>
                    {selectedProduct.isFree || selectedProduct.price === 0 ? '₹0' : `₹${(selectedProduct.price * selectedProduct.quantity).toLocaleString()}`}
                  </div>
                </div>
              </div>

              {/* Avoided Carbon Breakdown Box */}
              {(() => {
                const carbon = calculateAvoidedCarbon(selectedProduct.materialType || 'cardboard', selectedProduct.quantity || 100, selectedProduct.distanceKm || 5, selectedProduct.grade || 'A');
                return (
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '16px', borderRadius: '10px', marginBottom: '20px', color: '#047857' }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Leaf size={18} /> ISO 14044 Avoided Carbon: {carbon.netCO2eAvoided} kg CO₂e
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      🌳 Equivalent to planting <strong>~{carbon.treesEquivalent} mature trees/year</strong> or displacing <strong>~{carbon.carKmEquivalent} km of freight travel</strong>.
                    </div>
                  </div>
                );
              })()}

              {/* Seller & Listing Origin Verification Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', color: '#475569', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="#10B981" /> Verified Seller & Origin Specifications
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem', color: '#334155' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>SELLER ORGANIZATION</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{selectedProduct.companyName || 'B2B Circular Partner'}</strong>
                    <div style={{ color: '#059669', fontSize: '0.82rem', fontWeight: '600' }}>@{selectedProduct.createdBy} ({selectedProduct.ownerRole || 'Supplier'})</div>
                  </div>

                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>CONTACT CORPORATE EMAIL</span>
                    <strong style={{ color: '#2563EB', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                      ✉️ {selectedProduct.createdByEmail || `contact@${selectedProduct.createdBy}.com`}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>LISTING DATE</span>
                    <strong style={{ color: '#0F172A' }}>
                      📅 {new Date(selectedProduct.createdAt || Date.now()).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>PICKUP LOCATION</span>
                    <strong style={{ color: '#0F172A' }}>
                      📍 {selectedProduct.location} ({selectedProduct.distanceKm || 5} km)
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>Product & Pickup Description</h4>
                <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                  {selectedProduct.description || 'Verified circular packaging material lot ready for B2B pickup.'}
                </p>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px', color: '#0F172A' }}>
                  {isOwnListing ? 'Your posted material' : 'Contact the seller'}
                </h4>
                {isOwnListing ? (
                  <p style={{ color: '#64748B', margin: 0 }}>
                    This is your listing. Buyer inquiries and chat messages are available in My Materials.
                  </p>
                ) : inquirySent ? (
                  <p style={{ color: '#047857', margin: 0 }}>Inquiry sent. The seller can respond from their Relationship Hub.</p>
                ) : (
                  <>
                    <textarea rows="3" value={inquiryMessage} onChange={e => setInquiryMessage(e.target.value)} placeholder="Ask about availability, pickup timing, condition, or pricing..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #CBD5E1', marginBottom: 8 }} />
                    <button className="btn-secondary" onClick={sendInquiry} disabled={!inquiryMessage.trim()}><MessageSquare size={15} /> Send inquiry & open chat</button>
                  </>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', fontSize: '1rem' }}
                  onClick={() => handleConfirmReserve(selectedProduct)}
                  disabled={reserving}
                >
                  <Truck size={18} /> {reserving ? 'Completing exchange...' : 'Reserve Lot & Dispatch Pickup'}
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                  onClick={() => setSelectedProduct(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
