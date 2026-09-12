import React, { useState, useMemo } from 'react';
import { 
  MapPin, Package, ShieldCheck, Leaf, ArrowRight, Truck, Clock, 
  Sparkles, Navigation, Filter, Layers, DollarSign, CheckCircle, 
  BarChart3, Radio, RefreshCw, Eye, ChevronRight, Droplets, 
  Box, AlertCircle, Info, Zap, Compass, Check, X
} from 'lucide-react';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';

// Enhanced Geo-Spatial Mock Listings with complete spatial vectors, visual specs, and price baselines
const MOCK_LISTINGS = [
  {
    id: 1,
    title: '500x Heavy-Duty Corrugated Boxes',
    materialType: 'cardboard',
    categoryName: 'Cardboard Boxes',
    icon: '📦',
    quantity: 500,
    unit: 'boxes',
    grade: 'A',
    gradeLabel: 'Grade A • Like New',
    conditionScore: 98,
    moisturePercent: 0,
    plyRating: '5-Ply',
    truckloadPct: 35, // % of standard 14ft carrier truck
    location: 'Warehouse District, Sector 4',
    lat: 19.076,
    lon: 72.877,
    distanceKm: 4.2,
    bearingDeg: 35, // Polar coordinate angle on radar
    transitTimeMin: 14,
    price: 15,
    virginPrice: 45, // market cost if bought new
    isFree: false,
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 2,
    title: '120x Euro Wooden Pallets (EPAL-1)',
    materialType: 'pallet',
    categoryName: 'Wooden Pallets',
    icon: '🪵',
    quantity: 120,
    unit: 'pallets',
    grade: 'A',
    gradeLabel: 'Grade A • Heat Treated',
    conditionScore: 94,
    moisturePercent: 3,
    plyRating: 'ISPM-15',
    truckloadPct: 75,
    location: 'Logistics Park, Hub 2',
    lat: 19.120,
    lon: 72.900,
    distanceKm: 8.5,
    bearingDeg: 120,
    transitTimeMin: 22,
    price: 250,
    virginPrice: 650,
    isFree: false,
    image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 3,
    title: '800kg LDPE Commercial Stretch Wrap',
    materialType: 'ldpe',
    categoryName: 'Plastic Wrap',
    icon: '🌀',
    quantity: 800,
    unit: 'kg',
    grade: 'B',
    gradeLabel: 'Grade B • Clean Scrap',
    conditionScore: 82,
    moisturePercent: 1,
    plyRating: 'Baled 100kg',
    truckloadPct: 55,
    location: 'Retail Distribution Hub',
    lat: 19.180,
    lon: 72.840,
    distanceKm: 12.0,
    bearingDeg: 280,
    transitTimeMin: 28,
    price: 0,
    virginPrice: 110,
    isFree: true,
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 4,
    title: '45x HDPE 200L Industrial Chemical Drums',
    materialType: 'hdpe',
    categoryName: 'Plastic Drums',
    icon: '🛢️',
    quantity: 45,
    unit: 'drums',
    grade: 'B',
    gradeLabel: 'Grade B • Triple Rinsed',
    conditionScore: 88,
    moisturePercent: 0,
    plyRating: 'Food Grade',
    truckloadPct: 60,
    location: 'Chemical Industrial Zone',
    lat: 19.050,
    lon: 73.010,
    distanceKm: 18.3,
    bearingDeg: 165,
    transitTimeMin: 38,
    price: 450,
    virginPrice: 1200,
    isFree: false,
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 5,
    title: '300x Sturdy Heavy Parts Bins',
    materialType: 'hdpe',
    categoryName: 'Plastic Drums',
    icon: '🛢️',
    quantity: 300,
    unit: 'crates',
    grade: 'A',
    gradeLabel: 'Grade A • Stackable',
    conditionScore: 96,
    moisturePercent: 0,
    plyRating: 'Reinforced',
    truckloadPct: 40,
    location: 'Auto Ancillary Corridor',
    lat: 19.090,
    lon: 72.860,
    distanceKm: 3.1,
    bearingDeg: 215,
    transitTimeMin: 10,
    price: 85,
    virginPrice: 220,
    isFree: false,
    image: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=600&q=80'
  }
];

export default function MarketplacePage() {
  const [dbListings, setDbListings] = useState(MOCK_LISTINGS);
  const [filterType, setFilterType] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [maxRadius, setMaxRadius] = useState(25); // km
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [claimedItem, setClaimedItem] = useState(null);

  // Fetch live listings from backend API
  React.useEffect(() => {
    async function fetchBackendListings() {
      try {
        const res = await fetch('http://localhost:5001/api/v1/listings');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            // Format backend items with icons and radar properties
            const formatted = json.data.map((item, idx) => ({
              id: item.id || idx + 1,
              title: item.title,
              materialType: item.materialType,
              categoryName: item.materialType === 'pallet' ? 'Wooden Pallets' : item.materialType === 'hdpe' ? 'HDPE Drums' : item.materialType === 'ldpe' ? 'LDPE Wrap' : 'Cardboard Boxes',
              icon: item.materialType === 'pallet' ? '🪵' : item.materialType === 'hdpe' ? '🛢️' : item.materialType === 'ldpe' ? '🌀' : '📦',
              quantity: item.quantity || 100,
              unit: item.unit || 'units',
              grade: item.grade || 'A',
              gradeLabel: `Grade ${item.grade || 'A'}`,
              conditionScore: item.grade === 'A' ? 95 : 82,
              moisturePercent: 2,
              plyRating: 'Standard B2B',
              truckloadPct: Math.min(95, Math.max(20, Math.floor((item.quantity / 500) * 100))),
              location: item.location || 'Warehouse District',
              lat: item.lat || 19.08,
              lon: item.lon || 72.88,
              distanceKm: item.distanceKm || 5.0,
              bearingDeg: (idx * 65 + 35) % 360,
              transitTimeMin: Math.max(10, Math.round(item.distanceKm * 2.5)),
              price: item.price || 0,
              virginPrice: (item.price || 20) * 3,
              isFree: item.isFree || item.price === 0,
              image: item.image || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
            }));
            setDbListings(formatted);
          }
        }
      } catch (err) {
        console.warn('Backend API fetch offline, using mock listings fallback:', err);
      }
    }
    fetchBackendListings();
  }, []);

  // Filter listings based on category, grade, and proximity radius
  const filteredListings = useMemo(() => {
    return dbListings.filter(item => {
      const matchType = filterType === 'all' || item.materialType === filterType;
      const matchGrade = gradeFilter === 'all' || item.grade === gradeFilter;
      const matchRadius = item.distanceKm <= maxRadius;
      return matchType && matchGrade && matchRadius;
    });
  }, [dbListings, filterType, gradeFilter, maxRadius]);

  // Aggregate non-verbal statistics for current view
  const stats = useMemo(() => {
    let totalCO2 = 0;
    let totalTrees = 0;
    let totalSavedRupees = 0;
    const distanceBins = { close: 0, mid: 0, far: 0 };

    filteredListings.forEach(item => {
      const carbon = calculateAvoidedCarbon(item.materialType, item.quantity, item.distanceKm, item.grade);
      totalCO2 += carbon.netCO2eAvoided;
      totalTrees += parseFloat(carbon.treesEquivalent);
      const savingsPerUnit = Math.max(0, item.virginPrice - item.price);
      totalSavedRupees += savingsPerUnit * item.quantity;

      if (item.distanceKm <= 5) distanceBins.close++;
      else if (item.distanceKm <= 12) distanceBins.mid++;
      else distanceBins.far++;
    });

    return {
      totalCO2: Math.round(totalCO2),
      totalTrees: Math.round(totalTrees),
      totalSavedRupees,
      distanceBins,
      count: filteredListings.length
    };
  }, [filteredListings]);

  const handleClaim = (item) => {
    setClaimedItem(item);
    setTimeout(() => {
      setClaimedItem(null);
    }, 3500);
  };

  const activeFocus = hoveredItem || selectedItem;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* 1. Header with clear, accessible title and radius control */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: '24px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              background: '#ECFDF5', 
              color: '#059669', 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              border: '1px solid #A7F3D0'
            }}>
              <Radio size={14} className="animate-pulse" /> LIVE PROXIMITY RADAR
            </span>
            <span style={{ color: '#64748B', fontSize: '0.82rem' }}>Origin Hub: Mumbai Logistics (19.07°N, 72.87°E)</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' }}>
            Geo-Proximity B2B Marketplace <span style={{ color: '#10B981' }}>📍</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            Showing available B2B packaging material lots within your spatial transit zone.
          </p>
        </div>

        {/* Proximity Radius Slider */}
        <div style={{ 
          background: 'white', 
          padding: '12px 18px', 
          borderRadius: '12px', 
          border: '1px solid #E2E8F0', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
              Radius Search
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0F5132' }}>
              {maxRadius} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748B' }}>km</span>
            </span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="1"
            value={maxRadius} 
            onChange={(e) => setMaxRadius(Number(e.target.value))}
            style={{ width: '130px', accentColor: '#10B981', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* 2. Top-Level Non-Verbal Graph & Metric Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Metric 1: Carbon Ring Meter */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: 'white',
          padding: '18px 20px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)'
        }}>
          {/* Circular SVG Gauge */}
          <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#334155"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10B981"
                strokeWidth="3.5"
                strokeDasharray={`${Math.min(100, (stats.totalCO2 / 1200) * 100)}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={18} color="#34D399" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
              Avoided CO₂e
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34D399', lineHeight: 1.1 }}>
              {stats.totalCO2.toLocaleString()} <span style={{ fontSize: '0.78rem', color: '#CBD5E1', fontWeight: '500' }}>kg</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#A7F3D0', marginTop: '3px' }}>
              🌳 ~{stats.totalTrees} trees absorption
            </div>
          </div>
        </div>

        {/* Metric 2: Distance Distribution Histogram */}
        <div style={{
          background: 'white',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
              Distance Spread
            </span>
            <MapPin size={15} color="#64748B" />
          </div>

          {/* Micro Bar Histogram */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '44px', marginTop: '6px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ 
                width: '100%', 
                height: `${Math.max(8, stats.distanceBins.close * 14)}px`, 
                background: '#10B981', 
                borderRadius: '4px 4px 0 0' 
              }} />
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600' }}>&lt;5km</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ 
                width: '100%', 
                height: `${Math.max(8, stats.distanceBins.mid * 14)}px`, 
                background: '#3B82F6', 
                borderRadius: '4px 4px 0 0' 
              }} />
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600' }}>5-12km</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ 
                width: '100%', 
                height: `${Math.max(8, stats.distanceBins.far * 14)}px`, 
                background: '#F59E0B', 
                borderRadius: '4px 4px 0 0' 
              }} />
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600' }}>&gt;12km</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Procurement Savings Index */}
        <div style={{
          background: 'white',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '1.2rem',
            border: '1px solid #A7F3D0'
          }}>
            ₹
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
              Economic Savings
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0F172A', lineHeight: 1.1 }}>
              ₹{(stats.totalSavedRupees / 1000).toFixed(1)}k <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700' }}>Saved</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px' }}>
              vs. New Virgin Packaging
            </div>
          </div>
        </div>

        {/* Metric 4: Active Listings in Zone */}
        <div style={{
          background: 'white',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#F1F5F9',
            color: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Package size={22} color="#0F172A" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
              Available Lots
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0F172A', lineHeight: 1.1 }}>
              {stats.count} <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>Lots Ready</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '3px' }}>
              100% Verified Circular
            </div>
          </div>
        </div>
      </div>

      {/* Claim Notification Banner */}
      {claimedItem && (
        <div style={{ 
          background: '#0F5132', 
          color: 'white', 
          padding: '16px 22px', 
          borderRadius: '12px', 
          marginBottom: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 8px 20px rgba(15, 81, 50, 0.25)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#34D399', color: '#0F5132', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={22} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                Pickup Reserved! Driver Dispatched 🚚
              </div>
              <div style={{ fontSize: '0.82rem', color: '#A7F3D0' }}>
                Assigned backhaul truck on {claimedItem.location} route. ETA: {claimedItem.transitTimeMin} mins.
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '8px' }}>
            #{claimedItem.id}-DISPATCH
          </span>
        </div>
      )}

      {/* 3. Visual Filter Controls (Icons + Clear Badges) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '12px', 
        marginBottom: '24px', 
        flexWrap: 'wrap',
        background: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0'
      }}>
        {/* Category Visual Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilterType('all')} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filterType === 'all' ? '2px solid #10B981' : '1px solid #E2E8F0',
              background: filterType === 'all' ? '#ECFDF5' : '#F8FAFC',
              color: filterType === 'all' ? '#047857' : '#475569',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            All Scrap ({MOCK_LISTINGS.length})
          </button>
          <button 
            onClick={() => setFilterType('cardboard')} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filterType === 'cardboard' ? '2px solid #10B981' : '1px solid #E2E8F0',
              background: filterType === 'cardboard' ? '#ECFDF5' : '#F8FAFC',
              color: filterType === 'cardboard' ? '#047857' : '#475569',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📦</span> Boxes (Cardboard)
          </button>
          <button 
            onClick={() => setFilterType('pallet')} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filterType === 'pallet' ? '2px solid #10B981' : '1px solid #E2E8F0',
              background: filterType === 'pallet' ? '#ECFDF5' : '#F8FAFC',
              color: filterType === 'pallet' ? '#047857' : '#475569',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🪵</span> Pallets (Wood)
          </button>
          <button 
            onClick={() => setFilterType('hdpe')} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filterType === 'hdpe' ? '2px solid #10B981' : '1px solid #E2E8F0',
              background: filterType === 'hdpe' ? '#ECFDF5' : '#F8FAFC',
              color: filterType === 'hdpe' ? '#047857' : '#475569',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🛢️</span> Drums (HDPE)
          </button>
          <button 
            onClick={() => setFilterType('ldpe')} 
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filterType === 'ldpe' ? '2px solid #10B981' : '1px solid #E2E8F0',
              background: filterType === 'ldpe' ? '#ECFDF5' : '#F8FAFC',
              color: filterType === 'ldpe' ? '#047857' : '#475569',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🌀</span> Wrap (LDPE)
          </button>
        </div>

        {/* Grade Quality Quick Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Quality:
          </span>
          <button 
            onClick={() => setGradeFilter('all')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: gradeFilter === 'all' ? '#0F172A' : 'transparent',
              color: gradeFilter === 'all' ? 'white' : '#475569',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            All
          </button>
          <button 
            onClick={() => setGradeFilter('A')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #A7F3D0',
              background: gradeFilter === 'A' ? '#059669' : '#ECFDF5',
              color: gradeFilter === 'A' ? 'white' : '#047857',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🟢 Grade A (Like New)
          </button>
          <button 
            onClick={() => setGradeFilter('B')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #FDE68A',
              background: gradeFilter === 'B' ? '#D97706' : '#FEF3C7',
              color: gradeFilter === 'B' ? 'white' : '#B45309',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🟡 Grade B (Usable)
          </button>
        </div>
      </div>

      {/* 4. Split-Screen Layout: Geo Proximity Radar (Left) & Non-Verbal Cards Grid (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Interactive PostGIS Proximity Radar Map */}
        <div style={{
          background: '#0F172A',
          color: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #1E293B',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.18)',
          position: 'sticky',
          top: '90px'
        }}>
          {/* Radar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={20} color="#34D399" />
              <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '0.5px' }}>
                SPATIAL PROXIMITY RADAR
              </span>
            </div>
            <span style={{ 
              fontSize: '0.72rem', 
              color: '#34D399', 
              background: 'rgba(16, 185, 129, 0.15)', 
              padding: '3px 8px', 
              borderRadius: '6px',
              fontWeight: '700',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              POSTGIS 25KM
            </span>
          </div>

          {/* SVG Radar Display */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            aspectRatio: '1 / 1', 
            background: 'radial-gradient(circle at center, #1E293B 0%, #0B1120 70%, #030712 100%)',
            borderRadius: '50%',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Rotating Radar Scanner Sweep Effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'conic-gradient(from 0deg at 50% 50%, rgba(16, 185, 129, 0.18) 0deg, transparent 60deg, transparent 360deg)',
              borderRadius: '50%',
              animation: 'spin 6s linear infinite',
              pointerEvents: 'none'
            }} />

            {/* Radar Concentric Distance Rings & Crosshairs */}
            <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
              {/* Distance Rings (5km, 10km, 18km, 25km) */}
              <circle cx="200" cy="200" r="45" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />
              <circle cx="200" cy="200" r="90" fill="none" stroke="rgba(255, 255, 255, 0.12)" />
              <circle cx="200" cy="200" r="135" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="4 4" />
              <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(16, 185, 129, 0.25)" />

              {/* Crosshairs */}
              <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
              <line x1="200" y1="20" x2="200" y2="380" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

              {/* Distance Labels */}
              <text x="204" y="152" fill="#64748B" fontSize="10" fontWeight="700">5 KM</text>
              <text x="204" y="107" fill="#64748B" fontSize="10" fontWeight="700">10 KM</text>
              <text x="204" y="62" fill="#64748B" fontSize="10" fontWeight="700">18 KM</text>
              <text x="204" y="24" fill="#10B981" fontSize="10" fontWeight="800">25 KM (MAX)</text>

              {/* Active Vector Line to hovered/selected item */}
              {activeFocus && (
                (() => {
                  const radiusScale = 180 / 25; // 25km = 180px radius
                  const r = activeFocus.distanceKm * radiusScale;
                  const rad = (activeFocus.bearingDeg - 90) * (Math.PI / 180);
                  const targetX = 200 + r * Math.cos(rad);
                  const targetY = 200 + r * Math.sin(rad);

                  return (
                    <g>
                      <line 
                        x1="200" 
                        y1="200" 
                        x2={targetX} 
                        y2={targetY} 
                        stroke="#34D399" 
                        strokeWidth="2" 
                        strokeDasharray="4 4"
                      />
                      <circle cx={targetX} cy={targetY} r="14" fill="rgba(52, 211, 153, 0.2)" stroke="#34D399" strokeWidth="1.5" />
                    </g>
                  );
                })()
              )}

              {/* Origin Hub (User's Warehouse) */}
              <circle cx="200" cy="200" r="7" fill="#10B981" />
              <circle cx="200" cy="200" r="14" fill="none" stroke="#34D399" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="7;18;7" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.5s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Placed Interactive Material Nodes */}
            {filteredListings.map(item => {
              // Convert polar coords (distanceKm, bearingDeg) to CSS % on radar
              const radiusScale = 45 / 25; // 25km max = 45% radius from center
              const r = item.distanceKm * radiusScale;
              const rad = (item.bearingDeg - 90) * (Math.PI / 180);
              const leftPct = 50 + r * Math.cos(rad);
              const topPct = 50 + r * Math.sin(rad);

              const isSelected = activeFocus?.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isSelected ? '38px' : '30px',
                    height: isSelected ? '38px' : '30px',
                    borderRadius: '50%',
                    background: item.grade === 'A' ? '#059669' : '#D97706',
                    border: isSelected ? '3px solid white' : '2px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: isSelected 
                      ? '0 0 16px #10B981, 0 4px 10px rgba(0,0,0,0.5)' 
                      : '0 2px 8px rgba(0,0,0,0.4)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isSelected ? '1rem' : '0.85rem',
                    cursor: 'pointer',
                    zIndex: isSelected ? 20 : 10,
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                  title={`${item.title} (${item.distanceKm} km)`}
                >
                  {item.icon}
                </button>
              );
            })}

            {/* Radar Center Legend Badge */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(6px)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              color: '#94A3B8',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              🟢 Center: Your Origin Hub
            </div>
          </div>

          {/* Active Node Quick Info HUD */}
          {activeFocus ? (
            <div style={{
              marginTop: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#F8FAFC' }}>
                  {activeFocus.icon} {activeFocus.title}
                </span>
                <span style={{ 
                  background: activeFocus.grade === 'A' ? '#059669' : '#D97706',
                  color: 'white', 
                  fontSize: '0.7rem', 
                  fontWeight: '800', 
                  padding: '2px 8px', 
                  borderRadius: '10px' 
                }}>
                  Grade {activeFocus.grade}
                </span>
              </div>

              {/* Spatial Vector Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                <div style={{ background: '#0F172A', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>DISTANCE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#34D399' }}>
                    {activeFocus.distanceKm} km
                  </div>
                </div>
                <div style={{ background: '#0F172A', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>TRANSIT</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#60A5FA' }}>
                    ~{activeFocus.transitTimeMin}m
                  </div>
                </div>
                <div style={{ background: '#0F172A', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>LOAD FILL</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#F59E0B' }}>
                    {activeFocus.truckloadPct}%
                  </div>
                </div>
              </div>

              {/* Quick Book Button */}
              <button 
                onClick={() => handleClaim(activeFocus)}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: 'linear-gradient(135deg, #10B981, #047857)',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Truck size={16} /> Instant Dispatch to Node
              </button>
            </div>
          ) : (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed #334155',
              fontSize: '0.78rem',
              color: '#94A3B8',
              textAlign: 'center'
            }}>
              Hover or tap any radar node to view spatial route vectors.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Non-Verbal Graph-Driven Material Cards */}
        <div>
          {filteredListings.length === 0 ? (
            <div style={{
              background: 'white',
              padding: '48px 24px',
              borderRadius: '16px',
              textAlign: 'center',
              border: '1px solid #E2E8F0'
            }}>
              <Package size={48} color="#94A3B8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#0F172A', marginBottom: '8px' }}>
                No materials in this proximity radius
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '16px' }}>
                Increase the search slider above to 25 km or select 'All Scrap' to see more supply nodes.
              </p>
              <button 
                className="btn-primary"
                onClick={() => { setMaxRadius(25); setFilterType('all'); setGradeFilter('all'); }}
              >
                Reset Distance to 25 KM
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {filteredListings.map(item => {
                const carbon = calculateAvoidedCarbon(item.materialType, item.quantity, item.distanceKm, item.grade);
                const isSelected = activeFocus?.id === item.id;
                const savingsPct = Math.round(((item.virginPrice - item.price) / item.virginPrice) * 100);

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      border: isSelected ? '2px solid #10B981' : '1px solid #E2E8F0',
                      boxShadow: isSelected ? '0 8px 24px rgba(16, 185, 129, 0.18)' : '0 2px 10px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease-in-out',
                      transform: isSelected ? 'translateY(-3px)' : 'none'
                    }}
                  >
                    {/* Card Media Header */}
                    <div style={{ position: 'relative', height: '170px', background: '#F1F5F9' }}>
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />

                      {/* Distance & Transit Pill */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(6px)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <MapPin size={13} color="#34D399" /> {item.distanceKm} km • ⏱️ ~{item.transitTimeMin}m
                      </div>

                      {/* Grade Quality Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: item.grade === 'A' ? '#059669' : '#D97706',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}>
                        {item.grade === 'A' ? '🟢 Grade A (Like New)' : '🟡 Grade B (Recycle)'}
                      </div>

                      {/* Truckload Volume Capacity Bar */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'white'
                      }}>
                        <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                          <Truck size={14} color="#60A5FA" /> Load Fill: {item.truckloadPct}% of 14ft Truck
                        </span>
                        <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.truckloadPct}%`, height: '100%', background: '#60A5FA', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Title & Quantity */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0F172A', lineHeight: 1.25 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '3px' }}>
                            📍 {item.location}
                          </div>
                        </div>
                      </div>

                      {/* NON-VERBAL SPECIFICATION ROW (Replaces messy paragraphs) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        background: '#F8FAFC',
                        padding: '10px',
                        borderRadius: '10px',
                        marginBottom: '14px',
                        border: '1px solid #E2E8F0'
                      }}>
                        {/* Quality Ring Score */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700' }}>QUALITY</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: item.conditionScore >= 90 ? '#059669' : '#D97706' }}>
                            {item.conditionScore}%
                          </div>
                        </div>

                        {/* Moisture Level */}
                        <div style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700' }}>MOISTURE</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0284C7' }}>
                            {item.moisturePercent}% Dry
                          </div>
                        </div>

                        {/* Spec Standard */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700' }}>SPEC</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                            {item.plyRating}
                          </div>
                        </div>
                      </div>

                      {/* LCA CARBON FLOW GRAPH BAR */}
                      <div style={{
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#065F46', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Leaf size={14} /> Avoided: {carbon.netCO2eAvoided} kg CO₂e
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>
                            🌳 ~{carbon.treesEquivalent} Trees
                          </span>
                        </div>

                        {/* Stacked LCA Bar: Virgin vs Reprocess vs Freight */}
                        <div style={{ 
                          height: '6px', 
                          background: '#D1FAE5', 
                          borderRadius: '3px', 
                          display: 'flex', 
                          overflow: 'hidden' 
                        }}>
                          <div style={{ width: '85%', background: '#10B981' }} title="Virgin Material Saved" />
                          <div style={{ width: '12%', background: '#F59E0B' }} title="Reprocessing Overhead" />
                          <div style={{ width: '3%', background: '#3B82F6' }} title="Transport Emissions" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#047857', marginTop: '4px' }}>
                          <span>Offset: +{carbon.eVirgin}kg</span>
                          <span>Transit: -{carbon.eTransport}kg</span>
                        </div>
                      </div>

                      {/* CARD FOOTER: Visual Price Comparison & Claim Action */}
                      <div style={{ 
                        marginTop: 'auto', 
                        paddingTop: '12px', 
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        {/* Price & Savings Meter */}
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                            {item.isFree ? 'ZERO COST' : 'B2B REUSE PRICE'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: '800', color: item.isFree ? '#059669' : '#0F172A' }}>
                              {item.isFree ? 'FREE' : `₹${item.price}`}
                            </span>
                            {!item.isFree && (
                              <span style={{ fontSize: '0.8rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                                ₹{item.virginPrice} new
                              </span>
                            )}
                          </div>
                          {!item.isFree && (
                            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '800', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                              Save {savingsPct}% vs New
                            </span>
                          )}
                        </div>

                        {/* Claim / Book Button */}
                        <button
                          onClick={() => handleClaim(item)}
                          style={{
                            background: 'linear-gradient(135deg, #10B981, #047857)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Book Pickup <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
